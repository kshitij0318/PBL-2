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
from sqlalchemy.exc import IntegrityError, OperationalError
from functools import wraps
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Environment variables
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
DATABASE_URL = os.getenv('DATABASE_URL')
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
ENV = os.getenv('FLASK_ENV', 'production')  # 'development' or 'production'

# Validate environment variables
if not all([GEMINI_API_KEY, DATABASE_URL, JWT_SECRET_KEY]):
    logger.error("Missing environment variables")
    raise Exception("Missing environment variables")

# Configure Gemini API
try:
    genai.configure(api_key=GEMINI_API_KEY)
except Exception as e:
    logger.error(f"Failed to configure Gemini API: {str(e)}")
    raise Exception(f"Failed to configure Gemini API: {str(e)}")

app = Flask(__name__)

# Configure CORS
allowed_origins = [
    "https://symbihelp.onrender.com",
    "https://your-frontend-domain.com"  # Replace with actual frontend URL
]
if ENV == 'development':
    allowed_origins.append("http://localhost:8081")  # Allow localhost for dev

CORS(app, resources={
    r"/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Configure SQLAlchemy for Aiven PostgreSQL
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL.replace("postgres://", "postgresql://")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'connect_args': {'sslmode': 'require'}
}

db = SQLAlchemy(app)

# Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_admin = db.Column(db.Boolean, default=False)
    test_results = db.relationship('TestResult', backref='user', lazy=True)
    test_scores = db.relationship('TestScore', backref='user', lazy=True)

    def __repr__(self):
        return f"<User {self.email}>"

class TestResult(db.Model):
    __tablename__ = 'test_results'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    score = db.Column(db.Float, nullable=False)
    test_date = db.Column(db.DateTime, default=datetime.utcnow)
    risk_level = db.Column(db.String(50), nullable=False)
    details = db.Column(db.JSON, nullable=True)

    def __repr__(self):
        return f"<TestResult {self.id} for User {self.user_id}>"

class TestScore(db.Model):
    __tablename__ = 'test_scores'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    total = db.Column(db.Integer, nullable=False)
    test_date = db.Column(db.DateTime, default=datetime.utcnow)
    topics = db.Column(db.JSON, nullable=True)

    def __repr__(self):
        return f"<TestScore {self.id} for User {self.user_id}>"

# Load the scaler and model
try:
    with open('scaler.pkl', 'rb') as f:
        scaler = pickle.load(f)
    with open('logistic_regression_model.pkl', 'rb') as f:
        model = pickle.load(f)
except FileNotFoundError as e:
    logger.error(f"Model or scaler file not found: {str(e)}")
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
        logger.error(f"Error generating Gemini recommendation: {str(e)}")
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
        logger.error(f"Error generating Gemini chat response: {str(e)}")
        return f"Error generating chat response: {str(e)}"

# Initialize database
def init_database():
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database tables created successfully")
        except OperationalError as e:
            logger.error(f"Database initialization error: {str(e)}")
            raise Exception(f"Database initialization error: {str(e)}")

init_database()

# Authentication decorator to handle OPTIONS requests
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return jsonify({}), HTTPStatus.OK  # Allow preflight requests
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'status': 'error',
                'message': 'Authorization token is required'
            }), HTTPStatus.UNAUTHORIZED
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            request.user_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({
                'status': 'error',
                'message': 'Token has expired'
            }), HTTPStatus.UNAUTHORIZED
        except jwt.InvalidTokenError:
            return jsonify({
                'status': 'error',
                'message': 'Invalid token'
            }), HTTPStatus.UNAUTHORIZED
        return f(*args, **kwargs)
    return decorated

# Routes
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

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        new_user = User(
            email=email,
            password=hashed_password,
            full_name=full_name
        )
        db.session.add(new_user)

        try:
            db.session.commit()
            logger.info(f"User registered: {email}")
        except IntegrityError:
            db.session.rollback()
            logger.warning(f"Registration failed: Email already exists - {email}")
            return jsonify({
                'status': 'error',
                'message': 'Email already exists'
            }), HTTPStatus.BAD_REQUEST

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
        logger.error(f"Error registering user: {str(e)}")
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

        user = User.query.filter_by(email=email).first()
        if not user:
            logger.warning(f"Login failed: User not found - {email}")
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), HTTPStatus.UNAUTHORIZED

        if not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
            logger.warning(f"Login failed: Invalid password for {email}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid password'
            }), HTTPStatus.UNAUTHORIZED

        token = jwt.encode({
            'user_id': user.id,
            'email': user.email,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, JWT_SECRET_KEY, algorithm='HS256')

        logger.info(f"User logged in: {email}")
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'token': token,
            'user': {'id': user.id, 'email': user.email, 'full_name': user.full_name}
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error logging in: {str(e)}")
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

        logger.info("Dummy predictions generated successfully")
        return jsonify({
            'status': 'success',
            'predictions': results
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error making dummy predictions: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error making predictions: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/predict', methods=['POST'])
@require_auth
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), HTTPStatus.BAD_REQUEST

        features = [
            float(data.get('Age', 0)),
            float(data.get('SystolicBP', 0)),
            float(data.get('DiastolicBP', 0)),
            float(data.get('BS', 0)),
            float(data.get('BodyTemp', 0)),
            float(data.get('HeartRate', 0))
        ]

        scaled_features = scaler.transform([features])
        prediction = model.predict(scaled_features)[0]
        probability = model.predict_proba(scaled_features)[0][1]
        risk_level = risk_mapping[prediction]

        recommendation = get_gemini_recommendation(data, risk_level)

        test_result = TestResult(
            user_id=request.user_id,
            score=float(probability * 100),
            risk_level=risk_level,
            details={
                'age': features[0],
                'systolic_bp': features[1],
                'diastolic_bp': features[2],
                'blood_sugar': features[3],
                'body_temp': features[4],
                'heart_rate': features[5]
            }
        )
        db.session.add(test_result)
        db.session.commit()

        logger.info(f"Prediction made for user_id {request.user_id}: {risk_level}")
        return jsonify({
            'status': 'success',
            'prediction': risk_level,
            'probability': float(probability * 100),
            'recommendation': recommendation,
            'test_result_id': test_result.id
        }), HTTPStatus.OK

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error making prediction: {str(e)}")
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

        logger.info("Chat response generated successfully")
        return jsonify({
            'status': 'success',
            'response': response
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error processing chat query: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error processing query: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/test-results', methods=['POST'])
@require_auth
def save_test_result():
    try:
        data = request.get_json()
        if not data or not all(key in data for key in ['score', 'risk_level']):
            return jsonify({
                'status': 'error',
                'message': 'Score and risk_level are required'
            }), HTTPStatus.BAD_REQUEST

        new_test_result = TestResult(
            user_id=request.user_id,
            score=data['score'],
            risk_level=data['risk_level'],
            details=data.get('details', {})
        )
        db.session.add(new_test_result)
        db.session.commit()

        logger.info(f"Test result saved for user_id {request.user_id}")
        return jsonify({
            'status': 'success',
            'message': 'Test result saved successfully',
            'test_result': {
                'id': new_test_result.id,
                'score': new_test_result.score,
                'test_date': new_test_result.test_date.isoformat(),
                'risk_level': new_test_result.risk_level
            }
        }), HTTPStatus.CREATED

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving test result: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error saving test result: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/test-results', methods=['GET'])
@require_auth
def get_test_results():
    try:
        test_results = TestResult.query.filter_by(user_id=request.user_id).order_by(TestResult.test_date.desc()).all()
        
        results = [{
            'id': result.id,
            'score': result.score,
            'test_date': result.test_date.isoformat(),
            'risk_level': result.risk_level,
            'details': result.details
        } for result in test_results]

        logger.info(f"Test results retrieved for user_id {request.user_id}")
        return jsonify({
            'status': 'success',
            'test_results': results
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving test results: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving test results: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/test-scores', methods=['POST'])
@require_auth
def save_test_score():
    try:
        data = request.get_json()
        if not data or not all(key in data for key in ['score', 'total']):
            return jsonify({
                'status': 'error',
                'message': 'Score and total are required'
            }), HTTPStatus.BAD_REQUEST

        new_test_score = TestScore(
            user_id=request.user_id,
            score=data['score'],
            total=data['total'],
            topics=data.get('topics', {})
        )
        db.session.add(new_test_score)
        db.session.commit()

        logger.info(f"Test score saved for user_id {request.user_id}")
        return jsonify({
            'status': 'success',
            'message': 'Test score saved successfully',
            'test_score': {
                'id': new_test_score.id,
                'score': new_test_score.score,
                'total': new_test_score.total,
                'test_date': new_test_score.test_date.isoformat(),
                'topics': new_test_score.topics
            }
        }), HTTPStatus.CREATED

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving test score: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error saving test score: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/test-scores', methods=['GET'])
@require_auth
def get_test_scores():
    try:
        test_scores = TestScore.query.filter_by(user_id=request.user_id).order_by(TestScore.test_date.desc()).all()
        
        results = [{
            'id': score.id,
            'score': score.score,
            'total': score.total,
            'test_date': score.test_date.isoformat(),
            'topics': score.topics
        } for score in test_scores]

        logger.info(f"Test scores retrieved for user_id {request.user_id}")
        return jsonify({
            'status': 'success',
            'test_scores': results
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving test scores: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving test scores: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/admin/stats', methods=['GET'])
@require_auth
def get_admin_stats():
    try:
        user = User.query.get(request.user_id)
        if not user or not user.is_admin:
            logger.warning(f"Unauthorized admin stats access attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access'
            }), HTTPStatus.FORBIDDEN

        total_users = User.query.count()
        time_period = request.args.get('period', 'week')
        now = datetime.utcnow()
        
        if time_period == 'week':
            start_date = now - timedelta(days=7)
        elif time_period == 'month':
            start_date = now - timedelta(days=30)
        elif time_period == 'year':
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=7)
            
        test_scores = TestScore.query.filter(TestScore.test_date >= start_date).all()
        if test_scores:
            avg_score = sum(score.score for score in test_scores) / len(test_scores)
            total_tests = len(test_scores)
        else:
            avg_score = 0
            total_tests = 0
            
        topic_performance = {
            'Ball Birthing': 0,
            'Shiatsu': 0,
            'Yoga Techniques': 0,
            'Lamaze Breathing': 0
        }
        
        test_scores_with_topics = TestScore.query.filter(
            TestScore.test_date >= start_date,
            TestScore.topics.isnot(None)
        ).all()
        
        if test_scores_with_topics:
            topic_counts = {
                'Ball Birthing': 0,
                'Shiatsu': 0,
                'Yoga Techniques': 0,
                'Lamaze Breathing': 0
            }
            
            for score in test_scores_with_topics:
                if score.topics:
                    for topic, topic_score in score.topics.items():
                        if topic in topic_performance:
                            topic_performance[topic] += topic_score
                            topic_counts[topic] += 1
            
            for topic in topic_performance:
                if topic_counts[topic] > 0:
                    topic_performance[topic] = round(topic_performance[topic] / topic_counts[topic], 2)
                else:
                    topic_performance[topic] = 0
            
        recent_activity = TestScore.query.order_by(TestScore.test_date.desc()).limit(5).all()
        recent_activity_data = []
        
        for activity in recent_activity:
            user = User.query.get(activity.user_id)
            recent_activity_data.append({
                'user_name': user.full_name if user else 'Unknown User',
                'score': activity.score,
                'total': activity.total,
                'date': activity.test_date.isoformat()
            })
            
        logger.info(f"Admin stats retrieved by user_id {request.user_id}")
        return jsonify({
            'status': 'success',
            'data': {
                'total_users': total_users,
                'average_score': round(avg_score, 2),
                'total_tests': total_tests,
                'time_period': time_period,
                'topic_performance': topic_performance,
                'recent_activity': recent_activity_data
            }
        }), HTTPStatus.OK
        
    except Exception as e:
        logger.error(f"Error retrieving admin stats: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving admin stats: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=ENV == 'development')