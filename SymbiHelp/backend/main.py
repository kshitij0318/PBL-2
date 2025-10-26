from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import pandas as pd
import numpy as np
import pickle
from http import HTTPStatus
from groq import Groq
from dotenv import load_dotenv
import os
import bcrypt
import jwt
from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy import func
from functools import wraps
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file in the same directory as main.py
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Environment variables
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
DATABASE_URL = os.getenv('DATABASE_URL')
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
ENV = os.getenv('FLASK_ENV', 'production')  # 'development' or 'production'

# Validate environment variables with detailed logging
missing_vars = []
if not DATABASE_URL:
    missing_vars.append('DATABASE_URL')
if not JWT_SECRET_KEY:
    missing_vars.append('JWT_SECRET_KEY')
if not GROQ_API_KEY:
    missing_vars.append('GROQ_API_KEY')
if missing_vars:
    logger.error(f"Missing environment variables: {', '.join(missing_vars)}")
    raise Exception(f"Missing environment variables: {', '.join(missing_vars)}")

# Configure Groq AI provider
groq_client = None
if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        logger.info("Groq client configured successfully")
    except Exception as e:
        logger.error(f"Failed to configure Groq client: {str(e)}")
        groq_client = None

app = Flask(__name__)

# Configure CORS to allow all origins
CORS(app, resources={
    r"/*": {
        "origins": "*",  # Allow all origins
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
    role = db.Column(db.String(50), default='mother', nullable=False)  # 'nurse', 'admin', 'mother'
    due_date = db.Column(db.Date, nullable=True)  # New field for mother's due date
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_admin = db.Column(db.Boolean, default=False)
    share_consent = db.Column(db.Boolean, default=False)  # Consent for data sharing with nurses
    test_results = db.relationship('TestResult', backref='user', lazy=True)
    test_scores = db.relationship('TestScore', backref='user', lazy=True)
    health_logs = db.relationship('MotherHealthLog', backref='user', lazy=True)

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
    score = db.Column(db.Integer, nullable=False)  # User's achieved score
    max_score = db.Column(db.Integer, default=15, nullable=False)  # Fixed maximum score of 15
    test_date = db.Column(db.DateTime, default=datetime.utcnow)  # Date and time of test
    topics = db.Column(db.JSON, nullable=True)

    def __repr__(self):
        return f"<TestScore {self.id} for User {self.user_id}>"

class MotherHealthLog(db.Model):
    __tablename__ = 'mother_health_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    data = db.Column(db.JSON, nullable=False)  # Store health data as JSON
    consent_shared = db.Column(db.Boolean, default=False)  # Consent for sharing with nurses

    def __repr__(self):
        return f"<MotherHealthLog {self.id} for User {self.user_id}>"

class NurseMotherAssignment(db.Model):
    __tablename__ = 'nurse_mother_assignments'
    id = db.Column(db.Integer, primary_key=True)
    nurse_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    mother_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Ensure unique nurse-mother pairs
    __table_args__ = (db.UniqueConstraint('nurse_id', 'mother_id', name='unique_nurse_mother'),)
    
    def __repr__(self):
        return f"<NurseMotherAssignment {self.id}: Nurse {self.nurse_id} -> Mother {self.mother_id}>"

# Appointments model
class Appointment(db.Model):
    __tablename__ = 'appointments'
    id = db.Column(db.Integer, primary_key=True)
    mother_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    nurse_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date_time = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)
    notes = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'mother_id': self.mother_id,
            'nurse_id': self.nurse_id,
            'date_time': self.date_time.isoformat(),
            'status': self.status,
            'notes': self.notes or ''
        }

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

# Utility function for AI recommendation using Groq
def get_ai_recommendation(input_data, predicted_risk):
    try:
        prompt = (
            "You are a medical assistant specializing in maternal health. Based on the following patient data and predicted risk, "
            "give personalized, practical recommendations without diagnosis, under 150 words.\n\n"
            f"Age: {input_data['Age']}\n"
            f"SystolicBP: {input_data['SystolicBP']}\n"
            f"DiastolicBP: {input_data['DiastolicBP']}\n"
            f"Blood Sugar: {input_data['BS']}\n"
            f"Body Temp: {input_data['BodyTemp']}\n"
            f"Heart Rate: {input_data.get('HeartRate', 0)}\n"
            f"Predicted Risk: {predicted_risk}"
        )

        if groq_client:
            chat = groq_client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a helpful medical assistant."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=350,
            )
            return (chat.choices[0].message.content or "").strip()
        else:
            return get_fallback_recommendation(input_data, predicted_risk)
        
    except Exception as e:
        logger.error(f"Error generating Groq recommendation: {str(e)}")
        logger.info("Falling back to basic recommendations")
        return get_fallback_recommendation(input_data, predicted_risk)

# Fallback recommendation system when Groq API is unavailable
def get_fallback_recommendation(input_data, predicted_risk):
    try:
        age = int(input_data['Age'])
        sys_bp = int(input_data['SystolicBP'])
        dia_bp = int(input_data['DiastolicBP'])
        bs = int(input_data['BS'])
        temp = float(input_data['BodyTemp'])
        hr = int(input_data.get('HeartRate', 0)) # Handle case where HeartRate might be missing
        
        recommendations = []
        
        # Age-based recommendations
        if age < 18:
            recommendations.append("Young maternal age requires specialized care and monitoring.")
        elif age > 35:
            recommendations.append("Advanced maternal age increases risk factors - consider additional monitoring.")
        
        # Blood pressure recommendations
        if sys_bp > 140 or dia_bp > 90:
            recommendations.append("Elevated blood pressure detected - monitor regularly and consult healthcare provider.")
        elif sys_bp < 90 or dia_bp < 60:
            recommendations.append("Low blood pressure - ensure adequate hydration and monitor for dizziness.")
        
        # Blood sugar recommendations
        if bs > 7.8:
            recommendations.append("Elevated blood sugar levels - monitor diet and consider glucose testing.")
        
        # Temperature recommendations
        if temp > 100.4:
            recommendations.append("Elevated body temperature - monitor for signs of infection.")
        
        # Heart rate recommendations
        if hr > 100:
            recommendations.append("Elevated heart rate - ensure adequate rest and monitor for stress.")
        elif hr < 60:
            recommendations.append("Low heart rate - monitor for symptoms and consult if concerned.")
        
        # Risk level specific recommendations
        if 'high' in predicted_risk.lower():
            recommendations.append("High risk level detected - immediate medical consultation recommended.")
        elif 'medium' in predicted_risk.lower():
            recommendations.append("Moderate risk level - regular monitoring and follow-up appointments advised.")
        else:
            recommendations.append("Low risk level - continue with regular prenatal care routine.")
        
        if not recommendations:
            recommendations.append("Continue with regular prenatal care and monitoring.")
        
        return " ".join(recommendations)
        
    except Exception as e:
        logger.error(f"Error generating fallback recommendation: {str(e)}")
        return "Continue with regular prenatal care and consult your healthcare provider for personalized advice."

# Utility function for chatbot using Groq
def get_chat_response(query):
    try:
        prompt = (
            "You are a knowledgeable and friendly chatbot specializing in maternal health and general wellness. "
            "Answer clearly and concisely within 180 words.\n\n"
            f"User question: {query}"
        )
        if groq_client:
            chat = groq_client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=400,
            )
            return (chat.choices[0].message.content or "").strip()
        else:
            return "AI service is not configured."
    except Exception as e:
        logger.error(f"Error generating chat response: {str(e)}")
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

# Root endpoint
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'status': 'success',
        'message': 'Welcome to SymbiHelp API'
    }), HTTPStatus.OK

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

        # Normalize email
        email = data['email'].strip().lower()
        password = data['password']
        full_name = data['full_name']
        role = data.get('role', 'mother')  # Default to 'mother' if not provided

        # Validate role
        valid_roles = ['nurse', 'admin', 'mother']
        if role not in valid_roles:
            return jsonify({
                'status': 'error',
                'message': 'Invalid role. Must be one of: nurse, admin, mother'
            }), HTTPStatus.BAD_REQUEST

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
            full_name=full_name,
            role=role
        )
        db.session.add(new_user)

        try:
            db.session.commit()
            logger.info(f"User registered: {email} with role: {role}")
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
            'role': new_user.role,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, JWT_SECRET_KEY, algorithm='HS256')

        return jsonify({
            'status': 'success',
            'message': 'User registered successfully',
            'token': token,
            'user': {
                'id': new_user.id, 
                'email': new_user.email, 
                'full_name': new_user.full_name,
                'role': new_user.role,
                'is_admin': new_user.is_admin
            }
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

        # Normalize email for lookup (case-insensitive)
        email = data['email'].strip().lower()
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

        # Case-insensitive email matching to support legacy rows
        user = User.query.filter(func.lower(User.email) == email).first()
        if not user:
            logger.warning(f"Login failed: User not found - {email}")
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), HTTPStatus.UNAUTHORIZED

        # Support legacy plaintext passwords by detecting non-bcrypt hashes and migrating on successful login
        def is_bcrypt_hash(value: str) -> bool:
            try:
                return isinstance(value, str) and value.startswith(('$2a$', '$2b$', '$2y$')) and len(value) >= 60
            except Exception:
                return False

        password_ok = False
        if is_bcrypt_hash(user.password):
            try:
                password_ok = bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8'))
            except Exception as e:
                logger.error(f"Bcrypt check failed for {email}: {str(e)}")
                password_ok = False
        else:
            # Legacy: stored password is plaintext. Compare directly and then migrate to bcrypt.
            if password == user.password:
                password_ok = True
                try:
                    user.password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    db.session.commit()
                    logger.info(f"Migrated legacy password to bcrypt for {email}")
                except Exception as e:
                    db.session.rollback()
                    logger.error(f"Failed migrating password for {email}: {str(e)}")
            else:
                password_ok = False

        if not password_ok:
            logger.warning(f"Login failed: Invalid password for {email}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid password'
            }), HTTPStatus.UNAUTHORIZED

        token = jwt.encode({
            'user_id': user.id,
            'email': user.email,
            'role': user.role,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, JWT_SECRET_KEY, algorithm='HS256')

        logger.info(f"User logged in: {email} with role: {user.role}")
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'is_admin': user.is_admin
            }
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

        # Check if using mother health log data
        use_mother_data = data.get('use_mother_data', False)
        mother_id = data.get('mother_id')
        
        if use_mother_data and mother_id:
            # Verify nurse has access to this mother
            user = User.query.get(request.user_id)
            if not user or user.role != 'nurse':
                return jsonify({
                    'status': 'error',
                    'message': 'Unauthorized access. Only nurses can use mother data.'
                }), HTTPStatus.FORBIDDEN
            
            # Check if mother is assigned to this nurse
            assignment = NurseMotherAssignment.query.filter_by(
                nurse_id=request.user_id, 
                mother_id=mother_id
            ).first()
            
            if not assignment:
                return jsonify({
                    'status': 'error',
                    'message': 'Mother is not assigned to this nurse'
                }), HTTPStatus.FORBIDDEN
            
            # Get mother's latest health log
            mother = User.query.get(mother_id)
            if not mother or not mother.share_consent:
                return jsonify({
                    'status': 'error',
                    'message': 'Mother has not given consent for data sharing'
                }), HTTPStatus.FORBIDDEN
            
            latest_log = MotherHealthLog.query.filter_by(user_id=mother_id)\
                .order_by(MotherHealthLog.timestamp.desc()).first()
            
            if not latest_log:
                return jsonify({
                    'status': 'error',
                    'message': 'No health data available for this mother'
                }), HTTPStatus.NOT_FOUND
            
            # Use mother's health data
            log_data = latest_log.data
            features = [
                float(log_data.get('Age', 0)),
                float(log_data.get('SystolicBP', 0)),
                float(log_data.get('DiastolicBP', 0)),
                float(log_data.get('BS', 0)),
                float(log_data.get('BodyTemp', 0)),
                float(log_data.get('HeartRate', 0))
            ]
            
            # Store the prediction under the mother's user ID
            prediction_user_id = mother_id
        else:
            # Use manual input data
            features = [
                float(data.get('Age', 0)),
                float(data.get('SystolicBP', 0)),
                float(data.get('DiastolicBP', 0)),
                float(data.get('BS', 0)),
                float(data.get('BodyTemp', 0)),
                float(data.get('HeartRate', 0))
            ]
            prediction_user_id = request.user_id

        scaled_features = scaler.transform([features])
        prediction = model.predict(scaled_features)[0]
        probability = model.predict_proba(scaled_features)[0][1]
        risk_level = risk_mapping[prediction]

        try:
            recommendation = get_ai_recommendation(data, risk_level)
            logger.info(f"Recommendation generated successfully for risk level: {risk_level}")
        except Exception as e:
            logger.error(f"Error getting recommendation: {str(e)}")
            recommendation = "Unable to generate personalized recommendations at this time. Please consult your healthcare provider."

        test_result = TestResult(
            user_id=prediction_user_id,
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

        logger.info(f"Prediction made for user_id {prediction_user_id} by nurse {request.user_id}: {risk_level}")
        return jsonify({
            'status': 'success',
            'prediction': risk_level,
            'probability': float(probability * 100),
            'recommendation': recommendation,
            'test_result_id': test_result.id,
            'used_mother_data': use_mother_data,
            'mother_id': mother_id if use_mother_data else None
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

        # Optional personalization: include latest risk if Authorization header provided
        personalization = ""
        try:
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
                user_id = payload.get('user_id')
                user = User.query.get(user_id)
                if user and user.role == 'mother':
                    latest_test = TestResult.query.filter_by(user_id=user.id).order_by(TestResult.test_date.desc()).first()
                    if latest_test:
                        personalization = (
                            f"\n\nLatest known risk for you: {latest_test.risk_level} (score {latest_test.score}). "
                            f"Date: {latest_test.test_date.isoformat()}"
                        )
        except Exception:
            personalization = ""

        response = get_chat_response(query + personalization)

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
        if not data or 'score' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Score is required'
            }), HTTPStatus.BAD_REQUEST

        score = data['score']
        if not isinstance(score, (int, float)) or score < 0 or score > 15:
            return jsonify({
                'status': 'error',
                'message': 'Score must be a number between 0 and 15'
            }), HTTPStatus.BAD_REQUEST

        new_test_score = TestScore(
            user_id=request.user_id,
            score=int(score),  # Convert to integer
            max_score=15  # Fixed maximum score out of 15
        )
        db.session.add(new_test_score)
        db.session.commit()

        logger.info(f"New test score saved for user_id {request.user_id}: {score}/15 at {new_test_score.test_date.isoformat()}")
        return jsonify({
            'status': 'success',
            'message': 'Test score saved successfully',
            'test_score': {
                'id': new_test_score.id,
                'score': new_test_score.score,
                'max_score': new_test_score.max_score,
                'test_date': new_test_score.test_date.isoformat(),
                'topics': new_test_score.topics
            }
        }), HTTPStatus.CREATED

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving test score for user_id {request.user_id}: {str(e)}")
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
            'max_score': score.max_score,
            'test_date': score.test_date.isoformat(),
            'topics': score.topics
        } for score in test_scores]

        logger.info(f"Multiple test scores retrieved for user_id {request.user_id}: {len(results)} entries")
        return jsonify({
            'status': 'success',
            'test_scores': results
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving test scores for user_id {request.user_id}: {str(e)}")
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
                'max_score': activity.max_score,
                'date': activity.test_date.isoformat()
            })
            
        logger.info(f"Admin stats retrieved by user_id {request.user_id} with {total_tests} tests in period {time_period}")
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
        logger.error(f"Error retrieving admin stats for user_id {request.user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving admin stats: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/admin/users', methods=['GET'])
@require_auth
def get_all_users():
    try:
        user = User.query.get(request.user_id)
        if not user or not user.is_admin:
            logger.warning(f"Unauthorized users list access attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access'
            }), HTTPStatus.FORBIDDEN

        users = User.query.all()
        user_list = [{
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'is_admin': user.is_admin,
            'created_at': user.created_at.isoformat()
        } for user in users]

        logger.info(f"User list retrieved by admin user_id {request.user_id}")
        return jsonify({
            'status': 'success',
            'users': user_list
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving user list for user_id {request.user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving user list: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

# Mother Dashboard Endpoints
@app.route('/update-due-date', methods=['POST'])
@require_auth
def update_due_date():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'mother':
            logger.warning(f"Unauthorized due date update attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only mothers can update due date.'
            }), HTTPStatus.FORBIDDEN

        data = request.get_json()
        due_date_str = data.get('due_date')
        
        if not due_date_str:
            return jsonify({
                'status': 'error',
                'message': 'Due date is required'
            }), HTTPStatus.BAD_REQUEST

        try:
            due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Invalid date format. Use YYYY-MM-DD'
            }), HTTPStatus.BAD_REQUEST

        user.due_date = due_date
        db.session.commit()

        logger.info(f"Due date updated for user_id {request.user_id}: {due_date}")
        return jsonify({
            'status': 'success',
            'message': 'Due date updated successfully',
            'due_date': due_date.isoformat()
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error updating due date for user_id {request.user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error updating due date: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/update-health-log', methods=['POST'])
@require_auth
def update_health_log():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'mother':
            logger.warning(f"Unauthorized health log update attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only mothers can update health logs.'
            }), HTTPStatus.FORBIDDEN

        data = request.get_json()
        health_data = data.get('health_data')
        consent_shared = data.get('consent_shared', False)
        
        if not health_data:
            return jsonify({
                'status': 'error',
                'message': 'Health data is required'
            }), HTTPStatus.BAD_REQUEST

        # Validate required health data fields
        required_fields = ['Age', 'SystolicBP', 'DiastolicBP', 'BS', 'BodyTemp', 'HeartRate']
        for field in required_fields:
            if field not in health_data or not health_data[field]:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), HTTPStatus.BAD_REQUEST

        # Create new health log entry
        health_log = MotherHealthLog(
            user_id=request.user_id,
            data=health_data,
            consent_shared=consent_shared
        )
        
        db.session.add(health_log)
        db.session.commit()

        logger.info(f"Health log created for user_id {request.user_id}")
        return jsonify({
            'status': 'success',
            'message': 'Health log updated successfully',
            'log_id': health_log.id
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error updating health log for user_id {request.user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error updating health log: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/get-health-logs', methods=['GET'])
@require_auth
def get_health_logs():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'mother':
            logger.warning(f"Unauthorized health logs access attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only mothers can view their health logs.'
            }), HTTPStatus.FORBIDDEN

        # Get health logs for the user, ordered by most recent first
        health_logs = MotherHealthLog.query.filter_by(user_id=request.user_id)\
            .order_by(MotherHealthLog.timestamp.desc()).all()

        logs_data = []
        for log in health_logs:
            logs_data.append({
                'id': log.id,
                'timestamp': log.timestamp.isoformat(),
                'data': log.data,
                'consent_shared': log.consent_shared
            })

        logger.info(f"Health logs retrieved for user_id {request.user_id}: {len(logs_data)} logs")
        return jsonify({
            'status': 'success',
            'logs': logs_data
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving health logs for user_id {request.user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving health logs: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/get-mother-profile', methods=['GET'])
@require_auth
def get_mother_profile():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'mother':
            logger.warning(f"Unauthorized mother profile access attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only mothers can view their profile.'
            }), HTTPStatus.FORBIDDEN

        profile_data = {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'due_date': user.due_date.isoformat() if user.due_date else None,
            'created_at': user.created_at.isoformat()
        }

        logger.info(f"Mother profile retrieved for user_id {request.user_id}")
        return jsonify({
            'status': 'success',
            'profile': profile_data
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving mother profile for user_id {request.user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving mother profile: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/get-timeline', methods=['GET'])
@require_auth
def get_timeline():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'mother':
            logger.warning(f"Unauthorized timeline access attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only mothers can view their timeline.'
            }), HTTPStatus.FORBIDDEN

        if not user.due_date:
            return jsonify({
                'status': 'error',
                'message': 'Due date not set. Please set your due date first.'
            }), HTTPStatus.BAD_REQUEST

        # Calculate current pregnancy week
        today = datetime.now().date()
        pregnancy_start = user.due_date - timedelta(days=280)  # 40 weeks = 280 days
        current_week = min(40, max(1, ((today - pregnancy_start).days // 7) + 1))

        # Get health logs for trends
        health_logs = MotherHealthLog.query.filter_by(user_id=request.user_id)\
            .order_by(MotherHealthLog.timestamp.desc()).limit(10).all()

        # Prepare health trends data
        health_trends = []
        for log in health_logs:
            health_trends.append({
                'date': log.timestamp.strftime('%Y-%m-%d'),
                'systolic_bp': log.data.get('SystolicBP', 0),
                'diastolic_bp': log.data.get('DiastolicBP', 0),
                'blood_sugar': log.data.get('BS', 0),
                'body_temp': log.data.get('BodyTemp', 0),
                'heart_rate': log.data.get('HeartRate', 0)
            })

        # Get ML risk prediction if available
        latest_test = TestResult.query.filter_by(user_id=request.user_id)\
            .order_by(TestResult.test_date.desc()).first()
        
        risk_level = latest_test.risk_level if latest_test else 'low'
        risk_factors = latest_test.details.get('risk_factors', []) if latest_test else []

        timeline_data = {
            'current_week': current_week,
            'due_date': user.due_date.isoformat(),
            'pregnancy_start': pregnancy_start.isoformat(),
            'health_trends': health_trends,
            'risk_level': risk_level,
            'risk_factors': risk_factors,
            'total_weeks': 40
        }

        logger.info(f"Timeline data retrieved for user_id {request.user_id}, current week: {current_week}")
        return jsonify({
            'status': 'success',
            'timeline': timeline_data
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving timeline for user_id {request.user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving timeline: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/update-gamification', methods=['POST'])
@require_auth
def update_gamification():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'mother':
            logger.warning(f"Unauthorized gamification update attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only mothers can update gamification.'
            }), HTTPStatus.FORBIDDEN

        data = request.get_json()
        action = data.get('action')  # 'weekly_checkin', 'milestone_reached', etc.
        week_number = data.get('week_number')
        points = data.get('points', 0)

        # Store gamification data in AsyncStorage equivalent (could be extended to database)
        # For now, we'll return success and let the frontend handle storage
        
        logger.info(f"Gamification update for user_id {request.user_id}: {action} for week {week_number}")
        return jsonify({
            'status': 'success',
            'message': 'Gamification updated successfully',
            'action': action,
            'week_number': week_number,
            'points': points
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error updating gamification for user_id {request.user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error updating gamification: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

# Admin endpoints for mother-nurse assignment management
@app.route('/admin/mothers', methods=['GET'])
@require_auth
def get_all_mothers_admin():
    try:
        user = User.query.get(request.user_id)
        if not user or not user.is_admin:
            logger.warning(f"Unauthorized access attempt to get all mothers by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only admins can view all mothers.'
            }), HTTPStatus.FORBIDDEN

        # Get all mothers with their consent status and assignment info
        mothers = User.query.filter_by(role='mother').all()
        mother_list = []
        
        for mother in mothers:
            # Check if mother is assigned to any nurse
            assignment = NurseMotherAssignment.query.filter_by(mother_id=mother.id).first()
            assigned_nurse = None
            if assignment:
                nurse = User.query.get(assignment.nurse_id)
                assigned_nurse = {
                    'id': nurse.id,
                    'full_name': nurse.full_name,
                    'email': nurse.email,
                    'assigned_at': assignment.assigned_at.isoformat()
                } if nurse else None

            mother_list.append({
                'id': mother.id,
                'full_name': mother.full_name,
                'email': mother.email,
                'role': mother.role,
                'due_date': mother.due_date.isoformat() if mother.due_date else None,
                'share_consent': mother.share_consent,
                'created_at': mother.created_at.isoformat(),
                'assigned_nurse': assigned_nurse
            })

        logger.info(f"All mothers retrieved by admin user_id {request.user_id}, count: {len(mother_list)}")
        return jsonify({
            'status': 'success',
            'mothers': mother_list
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving mother list: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving mother list: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/admin/nurses', methods=['GET'])
@require_auth
def get_all_nurses_admin():
    try:
        user = User.query.get(request.user_id)
        if not user or not user.is_admin:
            logger.warning(f"Unauthorized access attempt to get all nurses by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only admins can view all nurses.'
            }), HTTPStatus.FORBIDDEN

        # Get all nurses with their assignment info
        nurses = User.query.filter_by(role='nurse').all()
        nurse_list = []
        
        for nurse in nurses:
            # Get assigned mothers count
            assigned_count = NurseMotherAssignment.query.filter_by(nurse_id=nurse.id).count()
            
            nurse_list.append({
                'id': nurse.id,
                'full_name': nurse.full_name,
                'email': nurse.email,
                'role': nurse.role,
                'created_at': nurse.created_at.isoformat(),
                'assigned_mothers_count': assigned_count
            })

        logger.info(f"All nurses retrieved by admin user_id {request.user_id}, count: {len(nurse_list)}")
        return jsonify({
            'status': 'success',
            'nurses': nurse_list
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving nurse list: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving nurse list: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

# Nurse endpoints for viewing only assigned mothers
@app.route('/nurse/assigned-mothers', methods=['GET'])
@require_auth
def get_nurse_assigned_mothers():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'nurse':
            logger.warning(f"Unauthorized access attempt to get assigned mothers by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only nurses can view assigned mothers.'
            }), HTTPStatus.FORBIDDEN

        # Get all mothers assigned to this nurse
        assignments = NurseMotherAssignment.query.filter_by(nurse_id=request.user_id).all()
        assigned_mothers = []
        
        for assignment in assignments:
            mother = User.query.get(assignment.mother_id)
            if mother and mother.share_consent:
                # Get latest health log
                latest_log = MotherHealthLog.query.filter_by(user_id=mother.id)\
                    .order_by(MotherHealthLog.timestamp.desc()).first()
                
                # Get health trends (last 10 logs)
                health_logs = MotherHealthLog.query.filter_by(user_id=mother.id)\
                    .order_by(MotherHealthLog.timestamp.desc()).limit(10).all()
                
                health_trends = []
                for log in health_logs:
                    health_trends.append({
                        'date': log.timestamp.strftime('%Y-%m-%d'),
                        'systolic_bp': log.data.get('SystolicBP', 0),
                        'diastolic_bp': log.data.get('DiastolicBP', 0),
                        'blood_sugar': log.data.get('BS', 0),
                        'body_temp': log.data.get('BodyTemp', 0),
                        'heart_rate': log.data.get('HeartRate', 0)
                    })

                assigned_mothers.append({
                    'id': mother.id,
                    'full_name': mother.full_name,
                    'email': mother.email,
                    'due_date': mother.due_date.isoformat() if mother.due_date else None,
                    'assigned_at': assignment.assigned_at.isoformat(),
                    'latest_health_log': latest_log.data if latest_log else None,
                    'health_trends': health_trends
                })

        logger.info(f"Assigned mothers retrieved for nurse_id {request.user_id}, count: {len(assigned_mothers)}")
        return jsonify({
            'status': 'success',
            'assigned_mothers': assigned_mothers
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving assigned mothers: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving assigned mothers: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

# Admin assignment endpoints
@app.route('/admin/assign-mother', methods=['POST'])
@require_auth
def admin_assign_mother():
    try:
        user = User.query.get(request.user_id)
        if not user or not user.is_admin:
            logger.warning(f"Unauthorized mother assignment attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only admins can assign mothers to nurses.'
            }), HTTPStatus.FORBIDDEN

        data = request.get_json()
        mother_id = data.get('mother_id')
        nurse_id = data.get('nurse_id')
        
        if not mother_id or not nurse_id:
            return jsonify({
                'status': 'error',
                'message': 'Mother ID and Nurse ID are required'
            }), HTTPStatus.BAD_REQUEST

        # Check if mother exists and has given consent
        mother = User.query.get(mother_id)
        if not mother or mother.role != 'mother':
            return jsonify({
                'status': 'error',
                'message': 'Invalid mother ID'
            }), HTTPStatus.BAD_REQUEST

        # Check if nurse exists
        nurse = User.query.get(nurse_id)
        if not nurse or nurse.role != 'nurse':
            return jsonify({
                'status': 'error',
                'message': 'Invalid nurse ID'
            }), HTTPStatus.BAD_REQUEST

        if not mother.share_consent:
            return jsonify({
                'status': 'error',
                'message': 'Mother has not given consent for data sharing'
            }), HTTPStatus.FORBIDDEN

        # Check if assignment already exists for this specific nurse-mother pair
        existing_assignment = NurseMotherAssignment.query.filter_by(
            nurse_id=nurse_id, 
            mother_id=mother_id
        ).first()
        
        if existing_assignment:
            return jsonify({
                'status': 'error',
                'message': 'Mother is already assigned to this nurse'
            }), HTTPStatus.CONFLICT

        # Check if mother is already assigned to another nurse
        mother_assigned_to_other = NurseMotherAssignment.query.filter_by(
            mother_id=mother_id
        ).first()
        
        if mother_assigned_to_other:
            return jsonify({
                'status': 'error',
                'message': 'Mother is already assigned to another nurse. Please remove the existing assignment first.'
            }), HTTPStatus.CONFLICT

        # Create new assignment
        new_assignment = NurseMotherAssignment(
            nurse_id=nurse_id,
            mother_id=mother_id
        )
        db.session.add(new_assignment)
        db.session.commit()

        logger.info(f"Mother {mother_id} assigned to nurse {nurse_id} by admin {request.user_id}")
        return jsonify({
            'status': 'success',
            'message': 'Mother assigned successfully',
            'assignment': {
                'mother_id': mother_id,
                'nurse_id': nurse_id,
                'mother_name': mother.full_name,
                'nurse_name': nurse.full_name,
                'assigned_at': new_assignment.assigned_at.isoformat()
            }
        }), HTTPStatus.OK

    except IntegrityError:
        db.session.rollback()
        logger.error(f"Integrity error assigning mother {mother_id} to nurse {nurse_id}")
        return jsonify({
            'status': 'error',
            'message': 'Assignment failed due to constraint violation'
        }), HTTPStatus.CONFLICT
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error assigning mother {mother_id} to nurse {nurse_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error assigning mother: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/admin/remove-assignment', methods=['POST'])
@require_auth
def admin_remove_assignment():
    try:
        user = User.query.get(request.user_id)
        if not user or not user.is_admin:
            logger.warning(f"Unauthorized assignment removal attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only admins can remove assignments.'
            }), HTTPStatus.FORBIDDEN

        data = request.get_json()
        mother_id = data.get('mother_id')
        nurse_id = data.get('nurse_id')
        
        if not mother_id or not nurse_id:
            return jsonify({
                'status': 'error',
                'message': 'Mother ID and Nurse ID are required'
            }), HTTPStatus.BAD_REQUEST

        # Find and remove the assignment
        assignment = NurseMotherAssignment.query.filter_by(
            nurse_id=nurse_id, 
            mother_id=mother_id
        ).first()
        
        if not assignment:
            return jsonify({
                'status': 'error',
                'message': 'Assignment not found'
            }), HTTPStatus.NOT_FOUND

        # Get names for logging
        mother = User.query.get(mother_id)
        nurse = User.query.get(nurse_id)
        
        # Remove the assignment
        db.session.delete(assignment)
        db.session.commit()

        logger.info(f"Assignment removed: Mother {mother_id} ({mother.full_name if mother else 'Unknown'}) from Nurse {nurse_id} ({nurse.full_name if nurse else 'Unknown'}) by admin {request.user_id}")
        return jsonify({
            'status': 'success',
            'message': 'Assignment removed successfully',
            'removed_assignment': {
                'mother_id': mother_id,
                'nurse_id': nurse_id,
                'mother_name': mother.full_name if mother else 'Unknown',
                'nurse_name': nurse.full_name if nurse else 'Unknown'
            }
        }), HTTPStatus.OK

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error removing assignment: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error removing assignment: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

# Legacy nurse assignment endpoint (deprecated - nurses can no longer assign themselves)
@app.route('/assign-mother', methods=['POST'])
@require_auth
def assign_mother():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'nurse':
            logger.warning(f"Unauthorized mother assignment attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only admins can assign mothers to nurses.'
            }), HTTPStatus.FORBIDDEN

        return jsonify({
            'status': 'error',
            'message': 'This endpoint is deprecated. Only admins can assign mothers to nurses. Please contact an administrator.'
        }), HTTPStatus.FORBIDDEN

    except Exception as e:
        logger.error(f"Error in deprecated assign-mother endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

# Legacy nurse removal endpoint (deprecated - nurses can no longer remove assignments)
@app.route('/remove-mother', methods=['POST'])
@require_auth
def remove_mother():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'nurse':
            logger.warning(f"Unauthorized mother removal attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only admins can remove mother assignments.'
            }), HTTPStatus.FORBIDDEN

        return jsonify({
            'status': 'error',
            'message': 'This endpoint is deprecated. Only admins can remove mother assignments. Please contact an administrator.'
        }), HTTPStatus.FORBIDDEN

    except Exception as e:
        logger.error(f"Error in deprecated remove-mother endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

# Legacy endpoint - redirects to new nurse-specific endpoint
@app.route('/get-assigned-mothers', methods=['GET'])
@require_auth
def get_assigned_mothers():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'nurse':
            logger.warning(f"Unauthorized access attempt to get assigned mothers by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only nurses can view assigned mothers.'
            }), HTTPStatus.FORBIDDEN

        # Redirect to the new nurse-specific endpoint
        return get_nurse_assigned_mothers()

    except Exception as e:
        logger.error(f"Error in legacy get-assigned-mothers endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/update-consent', methods=['POST'])
@require_auth
def update_consent():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'mother':
            logger.warning(f"Unauthorized consent update attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only mothers can update consent.'
            }), HTTPStatus.FORBIDDEN

        data = request.get_json()
        consent = data.get('consent')
        
        if consent is None:
            return jsonify({
                'status': 'error',
                'message': 'Consent value is required'
            }), HTTPStatus.BAD_REQUEST

        # Update consent
        user.share_consent = bool(consent)
        db.session.commit()

        logger.info(f"Consent updated for user_id {request.user_id}: {consent}")
        return jsonify({
            'status': 'success',
            'message': 'Consent updated successfully',
            'share_consent': user.share_consent
        }), HTTPStatus.OK

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating consent for user_id {request.user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error updating consent: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

# Appointment scheduling endpoints
@app.route('/schedule-appointment', methods=['POST'])
@require_auth
def schedule_appointment():
    try:
        data = request.get_json() or {}
        mother_id = data.get('mother_id')
        nurse_id = data.get('nurse_id')
        date_time_str = data.get('date_time')
        notes = data.get('notes', '')

        if not mother_id or not nurse_id or not date_time_str:
            return jsonify({'status': 'error', 'message': 'mother_id, nurse_id and date_time are required'}), HTTPStatus.BAD_REQUEST

        user = User.query.get(request.user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'Unauthorized'}), HTTPStatus.UNAUTHORIZED

        if user.role == 'mother' and user.id != int(mother_id):
            return jsonify({'status': 'error', 'message': 'Mothers can only schedule their own appointments'}), HTTPStatus.FORBIDDEN
        if user.role == 'nurse' and user.id != int(nurse_id):
            return jsonify({'status': 'error', 'message': 'Nurses can only schedule their own appointments'}), HTTPStatus.FORBIDDEN

        mother = User.query.get(mother_id)
        nurse = User.query.get(nurse_id)
        if not mother or mother.role != 'mother' or not nurse or nurse.role != 'nurse':
            return jsonify({'status': 'error', 'message': 'Invalid mother or nurse id'}), HTTPStatus.BAD_REQUEST

        if not mother.share_consent:
            return jsonify({'status': 'error', 'message': 'Mother has not given consent for scheduling'}), HTTPStatus.FORBIDDEN

        if user.role == 'nurse':
            assignment = NurseMotherAssignment.query.filter_by(nurse_id=nurse_id, mother_id=mother_id).first()
            if not assignment:
                return jsonify({'status': 'error', 'message': 'Mother is not assigned to this nurse'}), HTTPStatus.FORBIDDEN

        try:
            appt_dt = datetime.fromisoformat(date_time_str)
        except Exception:
            return jsonify({'status': 'error', 'message': 'Invalid date_time format. Use ISO format.'}), HTTPStatus.BAD_REQUEST

        conflict = Appointment.query.filter(
            Appointment.date_time == appt_dt,
            ((Appointment.nurse_id == nurse_id) | (Appointment.mother_id == mother_id)),
            Appointment.status != 'cancelled'
        ).first()
        if conflict:
            return jsonify({'status': 'error', 'message': 'Selected time is not available'}), HTTPStatus.CONFLICT

        appt = Appointment(mother_id=mother_id, nurse_id=nurse_id, date_time=appt_dt, status='pending', notes=notes)
        db.session.add(appt)
        db.session.commit()
        return jsonify({'status': 'success', 'appointment': appt.to_dict()}), HTTPStatus.CREATED

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error scheduling appointment: {str(e)}")
        return jsonify({'status': 'error', 'message': f'Error scheduling appointment: {str(e)}'}), HTTPStatus.INTERNAL_SERVER_ERROR


@app.route('/get-appointments', methods=['GET'])
@require_auth
def get_appointments():
    try:
        user = User.query.get(request.user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'Unauthorized'}), HTTPStatus.UNAUTHORIZED

        mother_id = request.args.get('mother_id')
        nurse_id = request.args.get('nurse_id')

        query = Appointment.query
        if user.role == 'mother':
            query = query.filter_by(mother_id=user.id)
        elif user.role == 'nurse':
            query = query.filter_by(nurse_id=user.id)
        elif mother_id:
            query = query.filter_by(mother_id=int(mother_id))
        elif nurse_id:
            query = query.filter_by(nurse_id=int(nurse_id))

        appts = query.order_by(Appointment.date_time.desc()).all()
        return jsonify({'status': 'success', 'appointments': [a.to_dict() for a in appts]}), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving appointments: {str(e)}")
        return jsonify({'status': 'error', 'message': f'Error retrieving appointments: {str(e)}'}), HTTPStatus.INTERNAL_SERVER_ERROR


@app.route('/update-appointment', methods=['POST'])
@require_auth
def update_appointment():
    try:
        data = request.get_json() or {}
        appointment_id = data.get('id')
        status = data.get('status')
        notes = data.get('notes', None)

        if not appointment_id or status not in ['confirmed', 'cancelled']:
            return jsonify({'status': 'error', 'message': 'id and valid status are required'}), HTTPStatus.BAD_REQUEST

        appt = Appointment.query.get(appointment_id)
        if not appt:
            return jsonify({'status': 'error', 'message': 'Appointment not found'}), HTTPStatus.NOT_FOUND

        user = User.query.get(request.user_id)
        if user.role == 'mother' and appt.mother_id != user.id:
            return jsonify({'status': 'error', 'message': 'Not allowed'}), HTTPStatus.FORBIDDEN
        if user.role == 'nurse' and appt.nurse_id != user.id:
            return jsonify({'status': 'error', 'message': 'Not allowed'}), HTTPStatus.FORBIDDEN

        appt.status = status
        if notes is not None:
            appt.notes = notes
        db.session.commit()
        return jsonify({'status': 'success', 'appointment': appt.to_dict()}), HTTPStatus.OK

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating appointment: {str(e)}")
        return jsonify({'status': 'error', 'message': f'Error updating appointment: {str(e)}'}), HTTPStatus.INTERNAL_SERVER_ERROR

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=ENV == 'development')