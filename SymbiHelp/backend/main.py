from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import pandas as pd
import numpy as np
import pickle
from http import HTTPStatus
import google.generativeai as genai
from dotenv import load_dotenv
import os
import bcrypt
import jwt
from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')
DB_NAME = os.getenv('DB_NAME')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_SSL_MODE = os.getenv('DB_SSL_MODE')
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')

# Validate environment variables
if not all([GEMINI_API_KEY, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL_MODE, JWT_SECRET_KEY]):
    raise Exception("Missing environment variables")

# Configure Gemini API
genai.configure(api_key=GEMINI_API_KEY)

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure SQLAlchemy for Aiven PostgreSQL
app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    f"?sslmode={DB_SSL_MODE}&sslrootcert=ca.pem"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Define User model
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<User {self.email}>"

# Load the scaler and model
try:
    with open('scaler.pkl', 'rb') as f:
        scaler = pickle.load(f)
    with open('logistic_regression_model.pkl', 'rb') as f:
        model = pickle.load(f)
except FileNotFoundError as e:
    raise Exception(f"Model or scaler file not found: {str(e)}")

# Risk mapping
risk_mapping = {0: 'Low Risk', 1: 'High/Mid Risk'}

# Utility function for Gemini recommendation
def get_gemini_recommendation(input_data, predicted_risk):
    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        prompt = """
        You are a medical assistant specializing in maternal health. Based on the following patient data and predicted risk level, provide personalized health recommendations. Include advice on lifestyle changes, medical follow-ups, and any urgent actions if necessary. Ensure the recommendations are clear, concise, and tailored to the input parameters. Do not provide a diagnosis, only recommendations based on the data.

        Patient Data:
        - Age: {age}
        - Systolic Blood Pressure: {sys_bp} mmHg
        - Diastolic Blood Pressure: {dia_bp} mmHg
        - Blood Sugar: {bs} mmol/L
        - Body Temperature: {temp} °F
        - Heart Rate: {hr} bpm
        - Predicted Risk Level: {risk}

        Provide recommendations in a concise paragraph (max 150 words).
        """
        formatted_prompt = prompt.format(
            age=input_data['Age'],
            sys_bp=input_data['SystolicBP'],
            dia_bp=input_data['DiastolicBP'],
            bs=input_data['BS'],
            temp=input_data['BodyTemp'],
            hr=input_data['HeartRate'],
            risk=predicted_risk
        )
        response = model.generate_content(formatted_prompt)
        return response.text.strip()
    except Exception as e:
        return f"Error generating recommendation: {str(e)}"

# Utility function for Gemini chatbot
def get_gemini_chat_response(query):
    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        prompt = """
        You are a knowledgeable and friendly chatbot specializing in maternal health and general wellness. Answer the following query clearly and concisely, providing accurate information or guidance. If the query is unrelated to health, provide a helpful response within your knowledge scope. Keep the response under 200 words.

        Query: {query}
        """
        formatted_prompt = prompt.format(query=query)
        response = model.generate_content(formatted_prompt)
        return response.text.strip()
    except Exception as e:
        return f"Error generating chat response: {str(e)}"

# Initialize and seed database
def seed_database():
    with app.app_context():
        # Create tables
        try:
            db.create_all()
            print("Database tables created successfully")
        except Exception as e:
            print(f"Error creating database tables: {str(e)}")
            return

        # Check if users table is empty
        if not User.query.first():
            # Dummy users
            dummy_users = [
                {
                    'email': 'alice@example.com',
                    'password': 'password123',
                    'full_name': 'Alice Smith'
                },
                {
                    'email': 'bob@example.com',
                    'password': 'secure456',
                    'full_name': 'Bob Johnson'
                },
                {
                    'email': 'carol@example.com',
                    'password': 'mypassword789',
                    'full_name': 'Carol Williams'
                }
            ]
            
            for user_data in dummy_users:
                hashed_password = bcrypt.hashpw(
                    user_data['password'].encode('utf-8'), bcrypt.gensalt()
                ).decode('utf-8')
                user = User(
                    email=user_data['email'],
                    password=hashed_password,
                    full_name=user_data['full_name']
                )
                db.session.add(user)
            
            try:
                db.session.commit()
                print("Dummy users seeded successfully")
            except Exception as e:
                db.session.rollback()
                print(f"Error seeding dummy users: {str(e)}")

# Call seeding function at startup
seed_database()

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data or not all(key in data for key in ['email', 'password', 'full_name']):
            return jsonify({
                'status': 'error',
                'message': 'Email, password, and full_name are required'
            }), HTTPStatus.BAD_REQUEST

        email = data['email']
        password = data['password']
        full_name = data['full_name']

        # Validate inputs
        if not isinstance(email, str) or not isinstance(password, str) or not isinstance(full_name, str):
            return jsonify({
                'status': 'error',
                'message': 'Invalid input types'
            }), HTTPStatus.BAD_REQUEST
        if not email.strip() or not password.strip() or not full_name.strip():
            return jsonify({
                'status': 'error',
                'message': 'Inputs cannot be empty'
            }), HTTPStatus.BAD_REQUEST

        # Hash the password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Create new user
        new_user = User(email=email, password=hashed_password, full_name=full_name)
        db.session.add(new_user)

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({
                'status': 'error',
                'message': 'Email already exists'
            }), HTTPStatus.BAD_REQUEST

        # Generate JWT
        token = jwt.encode({
            'user_id': new_user.id,
            'email': new_user.email,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, JWT_SECRET_KEY, algorithm='HS256')

        return jsonify({
            'status': 'success',
            'message': 'User registered successfully',
            'token': token,
            'user': {'id': new_user.id, 'email': new_user.email, 'full_name': new_user.full_name}
        }), HTTPStatus.CREATED

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': f'Error registering user: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data or not all(key in data for key in ['email', 'password']):
            return jsonify({
                'status': 'error',
                'message': 'Email and password are required'
            }), HTTPStatus.BAD_REQUEST

        email = data['email']
        password = data['password']

        # Validate inputs
        if not isinstance(email, str) or not isinstance(password, str):
            return jsonify({
                'status': 'error',
                'message': 'Invalid input types'
            }), HTTPStatus.BAD_REQUEST
        if not email.strip() or not password.strip():
            return jsonify({
                'status': 'error',
                'message': 'Inputs cannot be empty'
            }), HTTPStatus.BAD_REQUEST

        # Find user
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), HTTPStatus.UNAUTHORIZED

        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
            return jsonify({
                'status': 'error',
                'message': 'Invalid password'
            }), HTTPStatus.UNAUTHORIZED

        # Generate JWT
        token = jwt.encode({
            'user_id': user.id,
            'email': user.email,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, JWT_SECRET_KEY, algorithm='HS256')

        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'token': token,
            'user': {'id': user.id, 'email': user.email, 'full_name': user.full_name}
        }), HTTPStatus.OK

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error logging in: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/predict_dummy', methods=['GET'])
def predict_dummy():
    try:
        dummy_data = pd.DataFrame({
            'Age': [25, 30, 35, 28, 40],
            'SystolicBP': [120, 140, 130, 110, 150],
            'DiastolicBP': [80, 90, 85, 70, 95],
            'BS': [6.5, 7.8, 6.0, 5.5, 8.2],
            'BodyTemp': [98, 99, 98, 97, 100],
            'HeartRate': [70, 80, 75, 65, 85]
        })

        dummy_data_scaled = scaler.transform(dummy_data)
        predictions = model.predict(dummy_data_scaled)
        predicted_risks = [risk_mapping[pred] for pred in predictions]

        results = dummy_data.to_dict(orient='records')
        for i, result in enumerate(results):
            result['Predicted_Risk'] = predicted_risks[i]

        return jsonify({
            'status': 'success',
            'predictions': results
        }), HTTPStatus.OK

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error making predictions: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No input data provided'
            }), HTTPStatus.BAD_REQUEST

        required_features = ['Age', 'SystolicBP', 'DiastolicBP', 'BS', 'BodyTemp', 'HeartRate']
        if not all(feature in data for feature in required_features):
            return jsonify({
                'status': 'error',
                'message': f'Missing required features: {required_features}'
            }), HTTPStatus.BAD_REQUEST

        input_data = pd.DataFrame([{
            'Age': float(data['Age']),
            'SystolicBP': float(data['SystolicBP']),
            'DiastolicBP': float(data['DiastolicBP']),
            'BS': float(data['BS']),
            'BodyTemp': float(data['BodyTemp']),
            'HeartRate': float(data['HeartRate'])
        }])

        input_data_scaled = scaler.transform(input_data)
        prediction = model.predict(input_data_scaled)[0]
        predicted_risk = risk_mapping[prediction]

        recommendation = get_gemini_recommendation(data, predicted_risk)

        return jsonify({
            'status': 'success',
            'prediction': {
                'input': data,
                'Predicted_Risk': predicted_risk,
                'Recommendation': recommendation
            }
        }), HTTPStatus.OK

    except ValueError as ve:
        return jsonify({
            'status': 'error',
            'message': f'Invalid input data format: {str(ve)}'
        }), HTTPStatus.BAD_REQUEST
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error making prediction: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({
                'status': 'error',
                'message': 'No query provided'
            }), HTTPStatus.BAD_REQUEST

        query = data['query']
        if not isinstance(query, str) or not query.strip():
            return jsonify({
                'status': 'error',
                'message': 'Query must be a non-empty string'
            }), HTTPStatus.BAD_REQUEST

        response = get_gemini_chat_response(query)

        return jsonify({
            'status': 'success',
            'response': response
        }), HTTPStatus.OK

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error processing query: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)