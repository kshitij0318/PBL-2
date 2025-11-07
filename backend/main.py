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
from sqlalchemy import func, text
from functools import wraps
import logging
from pathlib import Path
from flask_socketio import SocketIO
from better_profanity import profanity
import re

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
ENV = os.getenv('FLASK_ENV', 'production').lower()  # 'development' or 'production'

# Environment specific settings
IS_DEVELOPMENT = ENV == 'development'

# Validate environment variables with detailed logging
missing_vars = []
if not DATABASE_URL:
    missing_vars.append('DATABASE_URL')
if not JWT_SECRET_KEY:
    missing_vars.append('JWT_SECRET_KEY')
if not GROQ_API_KEY:
    missing_vars.append('GROQ_API_KEY')
    logger.warning("GROQ_API_KEY not found in environment. AI features will be disabled.")
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
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize profanity filter
try:
    profanity.load_censor_words()
except Exception:
    pass

# Handle OPTIONS requests for CORS preflight
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        response = jsonify({})
        if IS_DEVELOPMENT:
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8081')
        else:
            response.headers.add('Access-Control-Allow-Origin', 'https://your-frontend-domain.com')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 200

# Configure CORS based on environment
if IS_DEVELOPMENT:
    # In development, allow all origins for easier testing
    CORS(app, resources={
        r"/*": {
            "origins": ["http://localhost:8081", "http://127.0.0.1:8081"],
            "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
            "supports_credentials": True,
            "expose_headers": ["Content-Disposition"]
        }
    })
else:
    # In production, restrict to your frontend domain
    CORS(app, resources={
        r"/*": {
            "origins": ["https://your-frontend-domain.com"],  # Replace with your actual frontend domain
            "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
            "supports_credentials": True,
            "expose_headers": ["Content-Disposition"]
        }
    })

# Configure SQLAlchemy
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL.replace("postgres://", "postgresql://")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configure SSL based on environment
if IS_DEVELOPMENT:
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'connect_args': {
            'sslmode': 'disable',  # Disable SSL for local development
            'connect_timeout': 5
        }
    }
else:
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'connect_args': {
            'sslmode': 'require',  # Require SSL in production
            'connect_timeout': 5
        }
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
    birthdate = db.Column(db.Date, nullable=True)  # Birth date for calculating age
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_admin = db.Column(db.Boolean, default=False)
    share_consent = db.Column(db.Boolean, default=False)  # Consent for data sharing with nurses
    is_muted = db.Column(db.Boolean, default=False)
    muted_until = db.Column(db.DateTime, nullable=True)
    is_banned = db.Column(db.Boolean, default=False)
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

# Forum Models
class Post(db.Model):
    __tablename__ = 'posts'
    id = db.Column(db.Integer, primary_key=True)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    author_role = db.Column(db.String(50), nullable=False)
    is_anonymous = db.Column(db.Boolean, default=False, nullable=False)
    content = db.Column(db.Text, nullable=False)
    like_count = db.Column(db.Integer, default=0, nullable=False)
    is_flagged = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PostLike(db.Model):
    __tablename__ = 'post_likes'
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('post_id', 'user_id', name='unique_post_like'),)

class Comment(db.Model):
    __tablename__ = 'comments'
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    author_role = db.Column(db.String(50), nullable=False)
    is_anonymous = db.Column(db.Boolean, default=False, nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_flagged = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ModerationFlag(db.Model):
    __tablename__ = 'moderation_flags'
    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(20), nullable=False)  # 'post' or 'comment'
    entity_id = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(50), nullable=False)
    actor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    details = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Appointments model
class Appointment(db.Model):
    __tablename__ = 'appointments'
    id = db.Column(db.Integer, primary_key=True)
    mother_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    nurse_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    requested_date = db.Column(db.DateTime, nullable=False)  # Original requested date
    date_time = db.Column(db.DateTime, nullable=True)  # Final approved date (can be null if pending)
    status = db.Column(db.String(20), default='pending', nullable=False)  # pending, approved, reschedule_requested, cancelled
    notes = db.Column(db.Text, nullable=True)
    reschedule_notes = db.Column(db.Text, nullable=True)  # Notes from nurse when requesting reschedule
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'mother_id': self.mother_id,
            'nurse_id': self.nurse_id,
            'requested_date': self.requested_date.isoformat(),
            'date_time': self.date_time.isoformat() if self.date_time else None,
            'status': self.status,
            'notes': self.notes or '',
            'reschedule_notes': self.reschedule_notes or '',
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
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
        if not groq_client:
            logger.error("Groq client is not configured")
            return "AI service is not configured. Please contact support."
        
        prompt = (
            "You are a knowledgeable and friendly chatbot specializing in maternal health and general wellness. "
            "Answer clearly and concisely within 180 words. Be helpful, empathetic, and provide accurate information.\n\n"
            f"User question: {query}"
        )
        
        logger.info(f"Generating chat response using Groq API for query: {query[:50]}...")
        chat = groq_client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                messages=[
                {"role": "system", "content": "You are a helpful maternal health assistant. Provide accurate, empathetic, and practical advice."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=400,
            )
        
        response = (chat.choices[0].message.content or "").strip()
        logger.info(f"Successfully generated chat response (length: {len(response)})")
        return response
        
    except Exception as e:
        logger.error(f"Error generating chat response with Groq: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return f"I apologize, but I'm having trouble processing your request right now. Please try again in a moment."

# Initialize database
def init_database():
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database tables created successfully")
            # Ensure new moderation columns and forum tables exist (idempotent)
            try:
                with db.engine.connect() as conn:
                    conn.execute(text("""
                        ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS birthdate DATE;
                        ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT FALSE;
                        ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP NULL;
                        ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
                    """))
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS posts (
                            id SERIAL PRIMARY KEY,
                            author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            author_role VARCHAR(50) NOT NULL,
                            is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
                            content TEXT NOT NULL,
                            like_count INTEGER DEFAULT 0 NOT NULL,
                            is_flagged BOOLEAN DEFAULT FALSE NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """))
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS post_likes (
                            id SERIAL PRIMARY KEY,
                            post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT unique_post_like UNIQUE (post_id, user_id)
                        );
                    """))
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS comments (
                            id SERIAL PRIMARY KEY,
                            post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                            author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            author_role VARCHAR(50) NOT NULL,
                            is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
                            content TEXT NOT NULL,
                            is_flagged BOOLEAN DEFAULT FALSE NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """))
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS moderation_flags (
                            id SERIAL PRIMARY KEY,
                            entity_type VARCHAR(20) NOT NULL,
                            entity_id INTEGER NOT NULL,
                            reason VARCHAR(255) NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """))
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS audit_logs (
                            id SERIAL PRIMARY KEY,
                            action VARCHAR(50) NOT NULL,
                            actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            details JSONB NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """))
                    conn.commit()
                    logger.info("Ensured forum schema and moderation columns exist")
            except Exception as e:
                logger.warning(f"Schema ensure step skipped/failed: {str(e)}")
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

def is_admin_user(user: 'User') -> bool:
    return bool(user and (user.is_admin or user.role == 'admin'))

SLUR_REGEXES = [
    re.compile(r"\b(kike|wetback|chink|spic|nigger|faggot)\b", re.IGNORECASE),
]

def moderate_text(text: str) -> dict:
    if not isinstance(text, str):
        return { 'rejected': True, 'reason': 'invalid_content' }
    for rx in SLUR_REGEXES:
        if rx.search(text or ''):
            return { 'rejected': True, 'reason': 'slur_detected' }
    flagged = profanity.contains_profanity(text or '')
    return { 'rejected': False, 'flagged': flagged, 'reason': 'profanity' if flagged else None }

def serialize_post(post: 'Post', viewer: 'User') -> dict:
    author = User.query.get(post.author_id)
    can_view_identity = is_admin_user(viewer)
    if post.is_anonymous and not can_view_identity:
        display_name = f"Anonymous — {post.author_role.capitalize()}"
    else:
        display_name = author.full_name if author else 'Unknown'
    
    # Get comment count for this post
    comment_count = Comment.query.filter(Comment.post_id == post.id).count()
    
    # Check if current user has liked this post
    user_liked = PostLike.query.filter_by(post_id=post.id, user_id=viewer.id).first() is not None
    
    return {
        'id': post.id,
        'content': post.content,
        'created_at': post.created_at.isoformat(),
        'updated_at': post.updated_at.isoformat() if post.updated_at else None,
        'like_count': post.like_count,
        'comment_count': comment_count,
        'user_liked': user_liked,
        'author_role': post.author_role,
        'is_anonymous': post.is_anonymous,
        'display_name': display_name,
        'author_id': post.author_id if can_view_identity else None,
        'is_owner': viewer.id == post.author_id,
        'can_admin': is_admin_user(viewer),
        'is_flagged': post.is_flagged
    }

def serialize_comment(comment: 'Comment', viewer: 'User') -> dict:
    author = User.query.get(comment.author_id)
    can_view_identity = is_admin_user(viewer)
    if comment.is_anonymous and not can_view_identity:
        display_name = f"Anonymous — {comment.author_role.capitalize()}"
    else:
        display_name = author.full_name if author else 'Unknown'
    return {
        'id': comment.id,
        'post_id': comment.post_id,
        'content': comment.content,
        'created_at': comment.created_at.isoformat(),
        'updated_at': comment.updated_at.isoformat() if comment.updated_at else None,
        'author_role': comment.author_role,
        'is_anonymous': comment.is_anonymous,
        'display_name': display_name,
        'author_id': comment.author_id if can_view_identity else None,
        'is_owner': viewer.id == comment.author_id,
        'can_admin': is_admin_user(viewer),
        'is_flagged': comment.is_flagged
    }

# Root endpoint
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'status': 'success',
        'message': 'Welcome to SymbiHelp API'
    }), HTTPStatus.OK

# Forum Endpoints
@app.route('/api/forum/posts', methods=['GET'])
@require_auth
def list_forum_posts():
    try:
        viewer = User.query.get(request.user_id)
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        posts = Post.query.order_by(Post.created_at.desc()).offset(offset).limit(min(100, max(1, limit))).all()
        return jsonify({
            'status': 'success',
            'posts': [serialize_post(p, viewer) for p in posts]
        }), HTTPStatus.OK
    except Exception as e:
        logger.error(f"Error listing posts: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to list posts'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/api/forum/posts', methods=['POST'])
@require_auth
def create_forum_post():
    try:
        user = User.query.get(request.user_id)
        # Enforce moderation restrictions
        if user.is_banned:
            return jsonify({'status': 'error', 'message': 'You are banned from posting'}), HTTPStatus.FORBIDDEN
        if user.is_muted and (not user.muted_until or user.muted_until > datetime.utcnow()):
            return jsonify({'status': 'error', 'message': 'You are muted and cannot post'}), HTTPStatus.FORBIDDEN
        data = request.get_json() or {}
        content = (data.get('content') or '').strip()
        is_anonymous = bool(data.get('is_anonymous', False))
        if not content:
            return jsonify({'status': 'error', 'message': 'Content is required'}), HTTPStatus.BAD_REQUEST
        moderation = moderate_text(content)
        if moderation.get('rejected'):
            try:
                socketio.emit('forum:moderation_alert', {'severity': 'high', 'type': 'slur', 'content_preview': content[:80], 'actor_id': user.id, 'actor_role': user.role})
            except Exception:
                pass
            return jsonify({'status': 'error', 'message': 'Content contains prohibited language'}), HTTPStatus.BAD_REQUEST
        post = Post(
            author_id=user.id,
            author_role=user.role,
            is_anonymous=is_anonymous,
            content=content,
            is_flagged=bool(moderation.get('flagged', False))
        )
        db.session.add(post)
        db.session.flush()
        if moderation.get('flagged'):
            db.session.add(ModerationFlag(entity_type='post', entity_id=post.id, reason=moderation.get('reason', 'profanity')))
            try:
                socketio.emit('forum:moderation_alert', {'severity': 'medium', 'type': 'profanity', 'post_id': post.id, 'actor_id': user.id, 'actor_role': user.role})
            except Exception:
                pass
        db.session.add(AuditLog(action='post_create', actor_id=user.id, details={'post_id': post.id}))
        db.session.commit()
        payload = serialize_post(post, user)
        try:
            socketio.emit('forum:new_post', payload, broadcast=True)
        except Exception:
            pass
        return jsonify({'status': 'success', 'post': payload}), HTTPStatus.CREATED
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating post: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to create post'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/api/forum/posts/<int:post_id>/like', methods=['POST'])
@require_auth
def like_post(post_id: int):
    try:
        user = User.query.get(request.user_id)
        post = Post.query.get(post_id)
        if not post:
            return jsonify({'status': 'error', 'message': 'Post not found'}), HTTPStatus.NOT_FOUND
        # prevent duplicate like
        existing = PostLike.query.filter_by(post_id=post_id, user_id=user.id).first()
        if existing:
            return jsonify({'status': 'success', 'like_count': post.like_count}), HTTPStatus.OK
        like = PostLike(post_id=post_id, user_id=user.id)
        post.like_count = (post.like_count or 0) + 1
        db.session.add(like)
        db.session.add(AuditLog(action='post_like', actor_id=user.id, details={'post_id': post_id}))
        db.session.commit()
        payload = { 'post_id': post_id, 'like_count': post.like_count }
        try:
            socketio.emit('forum:like', payload, broadcast=True)
        except Exception:
            pass
        return jsonify({'status': 'success', **payload}), HTTPStatus.OK
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error liking post: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to like post'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/api/forum/posts/<int:post_id>/comments', methods=['GET'])
@require_auth
def list_comments(post_id: int):
    try:
        viewer = User.query.get(request.user_id)
        post = Post.query.get(post_id)
        if not post:
            return jsonify({'status': 'error', 'message': 'Post not found'}), HTTPStatus.NOT_FOUND
        comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.asc()).all()
        return jsonify({'status': 'success', 'comments': [serialize_comment(c, viewer) for c in comments]}), HTTPStatus.OK
    except Exception as e:
        logger.error(f"Error listing comments: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to list comments'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/api/forum/posts/<int:post_id>/comments', methods=['POST'])
@require_auth
def create_comment(post_id: int):
    try:
        user = User.query.get(request.user_id)
        post = Post.query.get(post_id)
        if not post:
            return jsonify({'status': 'error', 'message': 'Post not found'}), HTTPStatus.NOT_FOUND
        if user.is_banned:
            return jsonify({'status': 'error', 'message': 'You are banned from commenting'}), HTTPStatus.FORBIDDEN
        if user.is_muted and (not user.muted_until or user.muted_until > datetime.utcnow()):
            return jsonify({'status': 'error', 'message': 'You are muted and cannot comment'}), HTTPStatus.FORBIDDEN
        data = request.get_json() or {}
        content = (data.get('content') or '').strip()
        is_anonymous = bool(data.get('is_anonymous', False))
        if not content:
            return jsonify({'status': 'error', 'message': 'Content is required'}), HTTPStatus.BAD_REQUEST
        moderation = moderate_text(content)
        if moderation.get('rejected'):
            try:
                socketio.emit('forum:moderation_alert', {'severity': 'high', 'type': 'slur', 'content_preview': content[:80], 'actor_id': user.id, 'actor_role': user.role})
            except Exception:
                pass
            return jsonify({'status': 'error', 'message': 'Content contains prohibited language'}), HTTPStatus.BAD_REQUEST
        comment = Comment(
            post_id=post_id,
            author_id=user.id,
            author_role=user.role,
            is_anonymous=is_anonymous,
            content=content,
            is_flagged=bool(moderation.get('flagged', False))
        )
        db.session.add(comment)
        db.session.flush()
        if moderation.get('flagged'):
            db.session.add(ModerationFlag(entity_type='comment', entity_id=comment.id, reason=moderation.get('reason', 'profanity')))
            try:
                socketio.emit('forum:moderation_alert', {'severity': 'medium', 'type': 'profanity', 'comment_id': comment.id, 'actor_id': user.id, 'actor_role': user.role})
            except Exception:
                pass
        db.session.add(AuditLog(action='comment_create', actor_id=user.id, details={'post_id': post_id, 'comment_id': comment.id}))
        db.session.commit()
        payload = serialize_comment(comment, user)
        try:
            socketio.emit('forum:new_comment', payload, broadcast=True)
        except Exception:
            pass
        return jsonify({'status': 'success', 'comment': payload}), HTTPStatus.CREATED
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating comment: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to create comment'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/api/forum/posts/<int:post_id>/history', methods=['GET'])
@require_auth
def post_history(post_id: int):
    try:
        viewer = User.query.get(request.user_id)
        if not is_admin_user(viewer):
            return jsonify({'status': 'error', 'message': 'Admin only'}), HTTPStatus.FORBIDDEN
        post = Post.query.get(post_id)
        if not post:
            return jsonify({'status': 'error', 'message': 'Post not found'}), HTTPStatus.NOT_FOUND
        audits = AuditLog.query.filter(AuditLog.details['post_id'].astext.cast(db.Integer) == post_id).order_by(AuditLog.created_at.asc()).all()
        flags = ModerationFlag.query.filter_by(entity_type='post', entity_id=post_id).all()
        return jsonify({
            'status': 'success',
            'history': {
                'audits': [{ 'id': a.id, 'action': a.action, 'actor_id': a.actor_id, 'details': a.details, 'created_at': a.created_at.isoformat() } for a in audits],
                'flags': [{ 'id': f.id, 'reason': f.reason, 'created_at': f.created_at.isoformat() } for f in flags]
            }
        }), HTTPStatus.OK
    except Exception as e:
        logger.error(f"Error getting post history: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to get history'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/api/forum/posts/<int:post_id>', methods=['DELETE'])
@require_auth
def delete_post(post_id: int):
    try:
        user = User.query.get(request.user_id)
        post = Post.query.get(post_id)
        if not post:
            return jsonify({'status': 'error', 'message': 'Post not found'}), HTTPStatus.NOT_FOUND
        if not (is_admin_user(user) or post.author_id == user.id):
            return jsonify({'status': 'error', 'message': 'Forbidden'}), HTTPStatus.FORBIDDEN
        db.session.add(AuditLog(action='post_delete', actor_id=user.id, details={'post_id': post_id}))
        db.session.delete(post)
        db.session.commit()
        try:
            socketio.emit('forum:post_deleted', {'post_id': post_id}, broadcast=True)
        except Exception:
            pass
        return jsonify({'status': 'success'}), HTTPStatus.OK
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting post: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to delete post'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/api/forum/posts/<int:post_id>', methods=['PATCH'])
@require_auth
def update_post(post_id: int):
    try:
        user = User.query.get(request.user_id)
        post = Post.query.get(post_id)
        if not post:
            return jsonify({'status': 'error', 'message': 'Post not found'}), HTTPStatus.NOT_FOUND
        if not (is_admin_user(user) or post.author_id == user.id):
            return jsonify({'status': 'error', 'message': 'Forbidden'}), HTTPStatus.FORBIDDEN
        data = request.get_json() or {}
        new_content = (data.get('content') or '').strip()
        if not new_content:
            return jsonify({'status': 'error', 'message': 'Content is required'}), HTTPStatus.BAD_REQUEST
        moderation = moderate_text(new_content)
        if moderation.get('rejected'):
            return jsonify({'status': 'error', 'message': 'Content contains prohibited language'}), HTTPStatus.BAD_REQUEST
        post.content = new_content
        post.is_flagged = bool(moderation.get('flagged', False))
        db.session.add(post)
        db.session.add(AuditLog(action='post_update', actor_id=user.id, details={'post_id': post_id}))
        if moderation.get('flagged'):
            db.session.add(ModerationFlag(entity_type='post', entity_id=post.id, reason=moderation.get('reason', 'profanity')))
        db.session.commit()
        payload = serialize_post(post, user)
        try:
            socketio.emit('forum:post_updated', payload, broadcast=True)
        except Exception:
            pass
        return jsonify({'status': 'success', 'post': payload}), HTTPStatus.OK
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating post: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to update post'}), HTTPStatus.INTERNAL_SERVER_ERROR

# Admin Moderation Endpoints
@app.route('/admin/forum/active-chatters', methods=['GET'])
@require_auth
def admin_active_chatters():
    user = User.query.get(request.user_id)
    if not is_admin_user(user):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), HTTPStatus.FORBIDDEN
    since = datetime.utcnow() - timedelta(days=7)
    # Gather distinct users from posts and comments in last 7 days
    post_users = db.session.query(Post.author_id).filter(Post.created_at >= since).distinct().all()
    comment_users = db.session.query(Comment.author_id).filter(Comment.created_at >= since).distinct().all()
    user_ids = {uid for (uid,) in post_users} | {uid for (uid,) in comment_users}
    results = []
    for uid in user_ids:
        u = User.query.get(uid)
        if not u:
            continue
        count_posts = Post.query.filter(Post.author_id == uid, Post.created_at >= since).count()
        count_comments = Comment.query.filter(Comment.author_id == uid, Comment.created_at >= since).count()
        results.append({
            'user_id': uid,
            'full_name': u.full_name,
            'email': u.email,
            'role': u.role,
            'posts': count_posts,
            'comments': count_comments,
            'is_muted': u.is_muted,
            'muted_until': u.muted_until.isoformat() if u.muted_until else None,
            'is_banned': u.is_banned,
        })
    return jsonify({'status': 'success', 'chatters': results}), HTTPStatus.OK

def _admin_only():
    viewer = User.query.get(request.user_id)
    if not is_admin_user(viewer):
        return None, (jsonify({'status': 'error', 'message': 'Unauthorized'}), HTTPStatus.FORBIDDEN)
    return viewer, None

@app.route('/admin/forum/warn-user', methods=['POST'])
@require_auth
def admin_warn_user():
    viewer, err = _admin_only()
    if err:
        return err
    data = request.get_json() or {}
    target_id = data.get('user_id')
    reason = data.get('reason', 'policy_violation')
    if not target_id:
        return jsonify({'status': 'error', 'message': 'user_id required'}), HTTPStatus.BAD_REQUEST
    db.session.add(AuditLog(action='moderation_warn', actor_id=viewer.id, details={'target_id': target_id, 'reason': reason}))
    db.session.commit()
    try:
        socketio.emit('forum:moderation_alert', {'severity': 'info', 'type': 'warn', 'target_id': target_id, 'reason': reason})
    except Exception:
        pass
    return jsonify({'status': 'success'}), HTTPStatus.OK

@app.route('/admin/forum/mute-user', methods=['POST'])
@require_auth
def admin_mute_user():
    viewer, err = _admin_only()
    if err:
        return err
    data = request.get_json() or {}
    target_id = data.get('user_id')
    minutes = int(data.get('minutes', 60))
    if not target_id:
        return jsonify({'status': 'error', 'message': 'user_id required'}), HTTPStatus.BAD_REQUEST
    u = User.query.get(target_id)
    if not u:
        return jsonify({'status': 'error', 'message': 'User not found'}), HTTPStatus.NOT_FOUND
    u.is_muted = True
    u.muted_until = datetime.utcnow() + timedelta(minutes=minutes)
    db.session.add(u)
    db.session.add(AuditLog(action='moderation_mute', actor_id=viewer.id, details={'target_id': target_id, 'minutes': minutes}))
    db.session.commit()
    try:
        socketio.emit('forum:moderation_alert', {'severity': 'warning', 'type': 'mute', 'target_id': target_id, 'until': u.muted_until.isoformat()})
    except Exception:
        pass
    return jsonify({'status': 'success', 'muted_until': u.muted_until.isoformat()}), HTTPStatus.OK

@app.route('/admin/forum/ban-user', methods=['POST'])
@require_auth
def admin_ban_user():
    viewer, err = _admin_only()
    if err:
        return err
    data = request.get_json() or {}
    target_id = data.get('user_id')
    if not target_id:
        return jsonify({'status': 'error', 'message': 'user_id required'}), HTTPStatus.BAD_REQUEST
    u = User.query.get(target_id)
    if not u:
        return jsonify({'status': 'error', 'message': 'User not found'}), HTTPStatus.NOT_FOUND
    u.is_banned = True
    db.session.add(u)
    db.session.add(AuditLog(action='moderation_ban', actor_id=viewer.id, details={'target_id': target_id}))
    db.session.commit()
    try:
        socketio.emit('forum:moderation_alert', {'severity': 'high', 'type': 'ban', 'target_id': target_id})
    except Exception:
        pass
    return jsonify({'status': 'success'}), HTTPStatus.OK

@app.route('/admin/forum/unban-user', methods=['POST'])
@require_auth
def admin_unban_user():
    viewer, err = _admin_only()
    if err:
        return err
    data = request.get_json() or {}
    target_id = data.get('user_id')
    if not target_id:
        return jsonify({'status': 'error', 'message': 'user_id required'}), HTTPStatus.BAD_REQUEST
    u = User.query.get(target_id)
    if not u:
        return jsonify({'status': 'error', 'message': 'User not found'}), HTTPStatus.NOT_FOUND
    u.is_banned = False
    db.session.add(u)
    db.session.add(AuditLog(action='moderation_unban', actor_id=viewer.id, details={'target_id': target_id}))
    db.session.commit()
    try:
        socketio.emit('forum:moderation_alert', {'severity': 'info', 'type': 'unban', 'target_id': target_id})
    except Exception:
        pass
    return jsonify({'status': 'success'}), HTTPStatus.OK

@app.route('/admin/forum/unmute-user', methods=['POST'])
@require_auth
def admin_unmute_user():
    viewer, err = _admin_only()
    if err:
        return err
    data = request.get_json() or {}
    target_id = data.get('user_id')
    if not target_id:
        return jsonify({'status': 'error', 'message': 'user_id required'}), HTTPStatus.BAD_REQUEST
    u = User.query.get(target_id)
    if not u:
        return jsonify({'status': 'error', 'message': 'User not found'}), HTTPStatus.NOT_FOUND
    u.is_muted = False
    u.muted_until = None
    db.session.add(u)
    db.session.add(AuditLog(action='moderation_unmute', actor_id=viewer.id, details={'target_id': target_id}))
    db.session.commit()
    try:
        socketio.emit('forum:moderation_alert', {'severity': 'info', 'type': 'unmute', 'target_id': target_id})
    except Exception:
        pass
    return jsonify({'status': 'success'}), HTTPStatus.OK

@app.route('/admin/forum/posts', methods=['GET'])
@require_auth
def admin_list_posts():
    viewer, err = _admin_only()
    if err:
        return err
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        status_filter = request.args.get('status', 'all')  # all, flagged
        
        query = Post.query
        
        if status_filter == 'flagged':
            query = query.filter(Post.is_flagged == True)
        
        posts = query.order_by(Post.created_at.desc()).offset(offset).limit(min(100, max(1, limit))).all()
        
        results = []
        for post in posts:
            author = User.query.get(post.author_id)
            results.append({
                'id': post.id,
                'content': post.content,
                'author_name': author.full_name if author else 'Unknown',
                'author_email': author.email if author else 'Unknown',
                'author_role': post.author_role,
                'created_at': post.created_at.isoformat(),
                'updated_at': post.updated_at.isoformat() if post.updated_at else None,
                'like_count': post.like_count or 0,
                'is_flagged': post.is_flagged,
                'is_anonymous': post.is_anonymous,
            })
        
        return jsonify({'status': 'success', 'posts': results}), HTTPStatus.OK
    except Exception as e:
        logger.error(f"Error listing admin posts: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'status': 'error', 'message': f'Failed to list posts: {str(e)}'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/admin/forum/comments', methods=['GET'])
@require_auth
def admin_list_comments():
    viewer, err = _admin_only()
    if err:
        return err
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        status_filter = request.args.get('status', 'all')  # all, flagged
        
        query = Comment.query
        
        if status_filter == 'flagged':
            query = query.filter(Comment.is_flagged == True)
        
        comments = query.order_by(Comment.created_at.desc()).offset(offset).limit(min(100, max(1, limit))).all()
        
        results = []
        for comment in comments:
            author = User.query.get(comment.author_id)
            post = Post.query.get(comment.post_id)
            results.append({
                'id': comment.id,
                'content': comment.content,
                'post_id': comment.post_id,
                'post_content': post.content[:100] + '...' if post and len(post.content) > 100 else post.content if post else 'Unknown',
                'author_name': author.full_name if author else 'Unknown',
                'author_email': author.email if author else 'Unknown',
                'author_role': comment.author_role,
                'created_at': comment.created_at.isoformat(),
                'is_flagged': comment.is_flagged,
                'is_anonymous': comment.is_anonymous,
            })
        
        return jsonify({'status': 'success', 'comments': results}), HTTPStatus.OK
    except Exception as e:
        logger.error(f"Error listing admin comments: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to list comments'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/admin/forum/analytics', methods=['GET'])
@require_auth
def admin_forum_analytics():
    viewer, err = _admin_only()
    if err:
        return err
    try:
        period = request.args.get('period', 'week')  # week, month, year
        
        if period == 'week':
            since = datetime.utcnow() - timedelta(days=7)
        elif period == 'month':
            since = datetime.utcnow() - timedelta(days=30)
        else:  # year
            since = datetime.utcnow() - timedelta(days=365)
        
        # Get analytics data
        total_posts = Post.query.count()
        total_comments = Comment.query.count()
        posts_period = Post.query.filter(Post.created_at >= since).count()
        comments_period = Comment.query.filter(Comment.created_at >= since).count()
        flagged_posts = Post.query.filter(Post.is_flagged == True).count()
        flagged_comments = Comment.query.filter(Comment.is_flagged == True).count()
        
        # Active users in period
        active_users = db.session.query(
            db.func.count(db.distinct(Post.author_id))
        ).filter(Post.created_at >= since).scalar() or 0
        
        # Top contributors
        top_posters = db.session.query(
            Post.author_id,
            db.func.count(Post.id).label('post_count')
        ).filter(Post.created_at >= since).group_by(Post.author_id).order_by(db.desc('post_count')).limit(5).all()
        
        top_contributors = []
        for author_id, post_count in top_posters:
            author = User.query.get(author_id)
            if author:
                comment_count = Comment.query.filter(Comment.author_id == author_id, Comment.created_at >= since).count()
                top_contributors.append({
                    'user_id': author_id,
                    'name': author.full_name,
                    'role': author.role,
                    'posts': post_count,
                    'comments': comment_count,
                })
        
        return jsonify({
            'status': 'success',
            'analytics': {
                'period': period,
                'total_posts': total_posts,
                'total_comments': total_comments,
                'posts_this_period': posts_period,
                'comments_this_period': comments_period,
                'flagged_posts': flagged_posts,
                'flagged_comments': flagged_comments,
                'active_users': active_users,
                'top_contributors': top_contributors,
            }
        }), HTTPStatus.OK
    except Exception as e:
        logger.error(f"Error getting forum analytics: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to get analytics'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/admin/forum/flag-post/<int:post_id>', methods=['POST'])
@require_auth
def admin_flag_post(post_id: int):
    viewer, err = _admin_only()
    if err:
        return err
    try:
        post = Post.query.get(post_id)
        if not post:
            return jsonify({'status': 'error', 'message': 'Post not found'}), HTTPStatus.NOT_FOUND
        
        data = request.get_json() or {}
        reason = data.get('reason', 'admin_flagged')
        
        post.is_flagged = True
        db.session.add(post)
        db.session.add(ModerationFlag(entity_type='post', entity_id=post_id, reason=reason))
        db.session.add(AuditLog(action='admin_flag_post', actor_id=viewer.id, details={'post_id': post_id, 'reason': reason}))
        db.session.commit()
        
        try:
            socketio.emit('forum:post_flagged', {'post_id': post_id, 'reason': reason}, broadcast=True)
        except Exception:
            pass
        
        return jsonify({'status': 'success'}), HTTPStatus.OK
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error flagging post: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to flag post'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/admin/forum/unflag-post/<int:post_id>', methods=['POST'])
@require_auth
def admin_unflag_post(post_id: int):
    viewer, err = _admin_only()
    if err:
        return err
    try:
        post = Post.query.get(post_id)
        if not post:
            return jsonify({'status': 'error', 'message': 'Post not found'}), HTTPStatus.NOT_FOUND
        
        post.is_flagged = False
        db.session.add(post)
        # Remove moderation flags
        ModerationFlag.query.filter_by(entity_type='post', entity_id=post_id).delete()
        db.session.add(AuditLog(action='admin_unflag_post', actor_id=viewer.id, details={'post_id': post_id}))
        db.session.commit()
        
        try:
            socketio.emit('forum:post_unflagged', {'post_id': post_id}, broadcast=True)
        except Exception:
            pass
        
        return jsonify({'status': 'success'}), HTTPStatus.OK
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error unflagging post: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to unflag post'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/admin/forum/flag-comment/<int:comment_id>', methods=['POST'])
@require_auth
def admin_flag_comment(comment_id: int):
    viewer, err = _admin_only()
    if err:
        return err
    try:
        comment = Comment.query.get(comment_id)
        if not comment:
            return jsonify({'status': 'error', 'message': 'Comment not found'}), HTTPStatus.NOT_FOUND
        
        data = request.get_json() or {}
        reason = data.get('reason', 'admin_flagged')
        
        comment.is_flagged = True
        db.session.add(comment)
        db.session.add(ModerationFlag(entity_type='comment', entity_id=comment_id, reason=reason))
        db.session.add(AuditLog(action='admin_flag_comment', actor_id=viewer.id, details={'comment_id': comment_id, 'reason': reason}))
        db.session.commit()
        
        try:
            socketio.emit('forum:comment_flagged', {'comment_id': comment_id, 'reason': reason}, broadcast=True)
        except Exception:
            pass
        
        return jsonify({'status': 'success'}), HTTPStatus.OK
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error flagging comment: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to flag comment'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/admin/forum/unflag-comment/<int:comment_id>', methods=['POST'])
@require_auth
def admin_unflag_comment(comment_id: int):
    viewer, err = _admin_only()
    if err:
        return err
    try:
        comment = Comment.query.get(comment_id)
        if not comment:
            return jsonify({'status': 'error', 'message': 'Comment not found'}), HTTPStatus.NOT_FOUND
        
        comment.is_flagged = False
        db.session.add(comment)
        # Remove moderation flags
        ModerationFlag.query.filter_by(entity_type='comment', entity_id=comment_id).delete()
        db.session.add(AuditLog(action='admin_unflag_comment', actor_id=viewer.id, details={'comment_id': comment_id}))
        db.session.commit()
        
        try:
            socketio.emit('forum:comment_unflagged', {'comment_id': comment_id}, broadcast=True)
        except Exception:
            pass
        
        return jsonify({'status': 'success'}), HTTPStatus.OK
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error unflagging comment: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Failed to unflag comment'}), HTTPStatus.INTERNAL_SERVER_ERROR

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

        # Validate role - admin signup is not allowed
        valid_roles = ['nurse', 'mother']
        if role not in valid_roles:
            return jsonify({
                'status': 'error',
                'message': 'Invalid role. Must be one of: nurse, mother'
            }), HTTPStatus.BAD_REQUEST
        
        # Verify nurse credential if role is nurse
        if role == 'nurse':
            nurse_credential = data.get('nurse_credential')
            if not nurse_credential or nurse_credential.strip() != 'nurse_hid':
                logger.warning(f"Invalid nurse credential attempt for email: {email}")
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid nurse credential. Only authorized personnel can sign up as nurses.'
                }), HTTPStatus.FORBIDDEN

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
        if not user or (not user.is_admin and user.role != 'admin'):
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
        if not user or (not user.is_admin and user.role != 'admin'):
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

@app.route('/update-birthdate', methods=['POST'])
@require_auth
def update_birthdate():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'mother':
            logger.warning(f"Unauthorized birthdate update attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only mothers can update birthdate.'
            }), HTTPStatus.FORBIDDEN

        data = request.get_json()
        birthdate_str = data.get('birthdate')
        
        if not birthdate_str:
            return jsonify({
                'status': 'error',
                'message': 'Birthdate is required'
            }), HTTPStatus.BAD_REQUEST

        try:
            birthdate = datetime.strptime(birthdate_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Invalid date format. Use YYYY-MM-DD'
            }), HTTPStatus.BAD_REQUEST

        # Check if birthdate is in the future
        if birthdate > datetime.now().date():
            return jsonify({
                'status': 'error',
                'message': 'Birthdate cannot be in the future'
            }), HTTPStatus.BAD_REQUEST

        user.birthdate = birthdate
        db.session.commit()

        logger.info(f"Birthdate updated for user_id {request.user_id}: {birthdate}")
        return jsonify({
            'status': 'success',
            'message': 'Birthdate updated successfully',
            'birthdate': birthdate.isoformat()
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error updating birthdate for user_id {request.user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error updating birthdate: {str(e)}'
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

@app.route('/get-profile', methods=['GET'])
@require_auth
def get_profile():
    """Get user profile for any role (mother, nurse, admin)"""
    try:
        user = User.query.get(request.user_id)
        if not user:
            logger.warning(f"Profile access attempt for non-existent user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'User not found.'
            }), HTTPStatus.NOT_FOUND

        profile_data = {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'created_at': user.created_at.isoformat() if user.created_at else None,
        }

        # Add role-specific data
        if user.role == 'mother':
            assignment = NurseMotherAssignment.query.filter_by(mother_id=user.id).first()
            assigned_nurse = None
            if assignment:
                nurse = User.query.get(assignment.nurse_id)
                if nurse:
                    assigned_nurse = {
                        'id': nurse.id,
                        'full_name': nurse.full_name,
                        'email': nurse.email
                    }
            profile_data.update({
                'due_date': user.due_date.isoformat() if user.due_date else None,
                'birthdate': user.birthdate.isoformat() if user.birthdate else None,
                'has_assigned_nurse': assignment is not None,
                'assigned_nurse': assigned_nurse
            })
        elif user.role == 'nurse':
            # Get assigned mothers count
            assignments = NurseMotherAssignment.query.filter_by(nurse_id=user.id).all()
            profile_data.update({
                'assigned_mothers_count': len(assignments)
            })

        logger.info(f"Profile retrieved for user_id {request.user_id}, role: {user.role}")
        return jsonify({
            'status': 'success',
            'profile': profile_data
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving profile for user_id {request.user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving profile: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/get-mother-profile', methods=['GET'])
@require_auth
def get_mother_profile():
    """Legacy endpoint - redirects to get-profile for mothers"""
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'mother':
            logger.warning(f"Unauthorized mother profile access attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only mothers can view their profile.'
            }), HTTPStatus.FORBIDDEN

        # Check if mother has assigned nurse
        assignment = NurseMotherAssignment.query.filter_by(mother_id=user.id).first()
        assigned_nurse = None
        if assignment:
            nurse = User.query.get(assignment.nurse_id)
            if nurse:
                assigned_nurse = {
                    'id': nurse.id,
                    'full_name': nurse.full_name,
                    'email': nurse.email
                }

        profile_data = {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'due_date': user.due_date.isoformat() if user.due_date else None,
            'birthdate': user.birthdate.isoformat() if user.birthdate else None,
            'created_at': user.created_at.isoformat(),
            'has_assigned_nurse': assignment is not None,
            'assigned_nurse': assigned_nurse
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
@app.route('/admin/mothers', methods=['GET', 'OPTIONS'])
@require_auth
def get_all_mothers_admin():
    try:
        user = User.query.get(request.user_id)
        if not user or (not user.is_admin and user.role != 'admin'):
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

@app.route('/admin/nurses', methods=['GET', 'OPTIONS'])
@require_auth
def get_all_nurses_admin():
    try:
        user = User.query.get(request.user_id)
        if not user or (not user.is_admin and user.role != 'admin'):
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
        if not user or (not user.is_admin and user.role != 'admin'):
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
        if not user or (not user.is_admin and user.role != 'admin'):
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

@app.route('/admin/test-results', methods=['GET'])
@require_auth
def get_all_test_results_admin():
    """Get all test scores (quiz results) with nurse and mother information for admin dashboard"""
    try:
        user = User.query.get(request.user_id)
        if not user or (not user.is_admin and user.role != 'admin'):
            logger.warning(f"Unauthorized access attempt to get all test results by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only admins can view all test results.'
            }), HTTPStatus.FORBIDDEN

        # Get all test scores (quiz results)
        test_scores = TestScore.query.order_by(TestScore.test_date.desc()).limit(100).all()
        
        results_with_users = []
        for score_record in test_scores:
            # Get user information
            test_user = User.query.get(score_record.user_id)
            if not test_user:
                continue
                
            # Determine who performed the test
            performed_by = 'Self'
            if test_user.role == 'nurse':
                # If a nurse took the test, show it as the nurse
                performed_by = test_user.full_name
            elif test_user.role == 'mother':
                # If a mother took the test, check if she's assigned to a nurse
                assignment = NurseMotherAssignment.query.filter_by(mother_id=score_record.user_id).first()
                if assignment:
                    nurse = User.query.get(assignment.nurse_id)
                    performed_by = f"Nurse: {nurse.full_name}" if nurse else 'Nurse Assigned'
            
            results_with_users.append({
                'id': score_record.id,
                'user_id': score_record.user_id,
                'user_name': test_user.full_name,
                'user_email': test_user.email,
                'score': score_record.score,
                'max_score': score_record.max_score,
                'test_date': score_record.test_date.isoformat(),
                'performed_by': performed_by,
                'user_role': test_user.role
            })

        logger.info(f"All test scores retrieved by admin user_id {request.user_id}, count: {len(results_with_users)}")
        return jsonify({
            'status': 'success',
            'test_results': results_with_users
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving all test results: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error retrieving test results: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/nurse/import-health-data', methods=['POST'])
@require_auth
def nurse_import_health_data():
    """Allow nurses to import health data for their assigned mothers"""
    try:
        nurse = User.query.get(request.user_id)
        if not nurse or nurse.role != 'nurse':
            logger.warning(f"Unauthorized health data import attempt by user_id {request.user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized access. Only nurses can import health data.'
            }), HTTPStatus.FORBIDDEN

        data = request.get_json()
        mother_id = data.get('mother_id')
        health_data = data.get('health_data')
        
        if not mother_id or not health_data:
            return jsonify({
                'status': 'error',
                'message': 'mother_id and health_data are required'
            }), HTTPStatus.BAD_REQUEST

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

        # Get mother
        mother = User.query.get(mother_id)
        if not mother or not mother.share_consent:
            return jsonify({
                'status': 'error',
                'message': 'Mother has not given consent for data sharing'
            }), HTTPStatus.FORBIDDEN

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
            user_id=mother_id,
            data=health_data,
            consent_shared=True
        )
        
        db.session.add(health_log)
        db.session.commit()

        logger.info(f"Health data imported by nurse {request.user_id} for mother {mother_id}")
        return jsonify({
            'status': 'success',
            'message': 'Health data imported successfully',
            'log_id': health_log.id
        }), HTTPStatus.CREATED

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error importing health data: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error importing health data: {str(e)}'
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

@app.route('/update-profile', methods=['POST'])
@require_auth
def update_profile():
    try:
        user = User.query.get(request.user_id)
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized'
            }), HTTPStatus.UNAUTHORIZED

        data = request.get_json() or {}
        full_name = data.get('full_name')
        email = data.get('email')
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        updated_fields = []
        
        # Update full name
        if full_name:
            user.full_name = full_name.strip()
            updated_fields.append('full_name')
        
        # Update email
        if email:
            # Check if email is already taken by another user
            existing_user = User.query.filter(User.email == email.strip().lower(), User.id != user.id).first()
            if existing_user:
                return jsonify({
                    'status': 'error',
                    'message': 'Email is already in use'
                }), HTTPStatus.BAD_REQUEST
            user.email = email.strip().lower()
            updated_fields.append('email')
        
        # Update password if provided
        if new_password:
            if not current_password:
                return jsonify({
                    'status': 'error',
                    'message': 'Current password is required to change password'
                }), HTTPStatus.BAD_REQUEST
            
            if new_password != confirm_password:
                return jsonify({
                    'status': 'error',
                    'message': 'New password and confirm password do not match'
                }), HTTPStatus.BAD_REQUEST
            
            if len(new_password) < 6:
                return jsonify({
                    'status': 'error',
                    'message': 'New password must be at least 6 characters long'
                }), HTTPStatus.BAD_REQUEST
            
            # Verify current password
            def is_bcrypt_hash(value: str) -> bool:
                try:
                    return isinstance(value, str) and value.startswith(('$2a$', '$2b$', '$2y$')) and len(value) >= 60
                except Exception:
                    return False
            
            password_ok = False
            if is_bcrypt_hash(user.password):
                try:
                    password_ok = bcrypt.checkpw(current_password.encode('utf-8'), user.password.encode('utf-8'))
                except Exception as e:
                    logger.error(f"Bcrypt check failed for user_id {request.user_id}: {str(e)}")
                    password_ok = False
            else:
                # Legacy: stored password is plaintext
                password_ok = (current_password == user.password)
            
            if not password_ok:
                return jsonify({
                    'status': 'error',
                    'message': 'Current password is incorrect'
                }), HTTPStatus.UNAUTHORIZED
            
            # Hash and update password
            user.password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            updated_fields.append('password')
        
        if not updated_fields:
            return jsonify({
                'status': 'error',
                'message': 'At least one field (full_name, email, or password) is required'
            }), HTTPStatus.BAD_REQUEST

        db.session.commit()

        logger.info(f"Profile updated for user_id {request.user_id}, updated fields: {', '.join(updated_fields)}")
        return jsonify({
            'status': 'success',
            'message': 'Profile updated successfully',
            'user': {
                'id': user.id,
                'full_name': user.full_name,
                'email': user.email,
                'role': user.role,
            }
        }), HTTPStatus.OK

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating profile for user_id {request.user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error updating profile: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

# Appointment scheduling endpoints
@app.route('/schedule-appointment', methods=['POST'])
@require_auth
def schedule_appointment():
    try:
        data = request.get_json() or {}
        user = User.query.get(request.user_id)
        if not user:
            return jsonify({'status': 'error', 'message': 'Unauthorized'}), HTTPStatus.UNAUTHORIZED

        # For mothers: auto-link to assigned nurse
        if user.role == 'mother':
            mother_id = user.id
            # Find assigned nurse
            assignment = NurseMotherAssignment.query.filter_by(mother_id=mother_id).first()
            if not assignment:
                return jsonify({
                    'status': 'error', 
                    'message': 'No nurse assigned. Please contact an administrator to assign a nurse.'
                }), HTTPStatus.BAD_REQUEST
            nurse_id = assignment.nurse_id
            requested_date_str = data.get('requested_date') or data.get('date_time')
            notes = data.get('notes', '')
        else:
            # For nurses/admins scheduling on behalf
            mother_id = data.get('mother_id')
            nurse_id = data.get('nurse_id') or (user.id if user.role == 'nurse' else None)
            requested_date_str = data.get('requested_date') or data.get('date_time')
            notes = data.get('notes', '')

        if not mother_id or not nurse_id or not requested_date_str:
            return jsonify({'status': 'error', 'message': 'mother_id, nurse_id and requested_date are required'}), HTTPStatus.BAD_REQUEST

        if user.role == 'nurse' and user.id != int(nurse_id):
            return jsonify({'status': 'error', 'message': 'Nurses can only schedule appointments for themselves'}), HTTPStatus.FORBIDDEN

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
            # Handle date parsing - simplified and robust approach
            if not requested_date_str:
                return jsonify({'status': 'error', 'message': 'Date is required'}), HTTPStatus.BAD_REQUEST
            
            # Log the received date string for debugging
            logger.info(f"Received date string: '{requested_date_str}', type: {type(requested_date_str)}")
            
            # Convert to string and strip whitespace
            date_str = str(requested_date_str).strip()
            logger.info(f"Processing date string: '{date_str}'")
            
            # Try multiple parsing strategies
            requested_dt = None
            parse_error = None
            
            # Strategy 1: Use strptime - most reliable, works with all Python versions
            try:
                # Remove timezone and milliseconds for strptime
                date_part = date_str
                
                # Remove Z if present
                if date_part.endswith('Z'):
                    date_part = date_part[:-1]
                    logger.info(f"Removed Z, date_part: '{date_part}'")
                
                # Remove timezone offset (+00:00 or -05:00)
                if '+' in date_part:
                    date_part = date_part.split('+')[0]
                    logger.info(f"Removed + timezone, date_part: '{date_part}'")
                elif date_part.count('-') >= 4:
                    # Has timezone like -05:00, find the last occurrence before timezone
                    # Format: YYYY-MM-DDTHH:MM:SS-MM:SS
                    parts = date_part.rsplit('-', 2)
                    if len(parts) == 3 and ':' in parts[2]:
                        # Last part is timezone (e.g., '05:00')
                        date_part = parts[0]
                        logger.info(f"Removed - timezone, date_part: '{date_part}'")
                
                # Remove milliseconds if present
                if '.' in date_part:
                    date_part = date_part.split('.')[0]
                    logger.info(f"Removed milliseconds, date_part: '{date_part}'")
                
                # Try parsing with strptime - this is the most reliable method
                requested_dt = datetime.strptime(date_part, '%Y-%m-%dT%H:%M:%S')
                logger.info(f"Successfully parsed date using strptime: {requested_dt}")
            except ValueError as e:
                parse_error = f"strptime failed: {str(e)}"
                logger.warning(f"{parse_error}, date_part was: '{date_part}'")
            
            # Strategy 2: Try fromisoformat if strptime failed (Python 3.7+)
            if not requested_dt:
                try:
                    # Handle Z format by replacing with +00:00
                    if date_str.endswith('Z'):
                        date_str_iso = date_str[:-1] + '+00:00'
                    else:
                        date_str_iso = date_str
                    
                    # Remove milliseconds if present (fromisoformat can be picky)
                    if '.' in date_str_iso and '+' in date_str_iso:
                        # Has both milliseconds and timezone
                        parts = date_str_iso.split('+')
                        if '.' in parts[0]:
                            date_str_iso = parts[0].split('.')[0] + '+' + parts[1]
                    elif '.' in date_str_iso:
                        date_str_iso = date_str_iso.split('.')[0]
                    
                    requested_dt = datetime.fromisoformat(date_str_iso)
                    logger.info(f"Successfully parsed date using fromisoformat: {requested_dt}")
                except (ValueError, AttributeError) as e:
                    parse_error = f"fromisoformat failed: {str(e)}"
                    logger.warning(parse_error)
            
            # If all strategies failed
            if not requested_dt:
                logger.error(f"All date parsing strategies failed. Received: '{requested_date_str}', Last error: {parse_error}")
                return jsonify({
                    'status': 'error', 
                    'message': f'Invalid date format. Received: {requested_date_str}. Please use ISO format (YYYY-MM-DDTHH:MM:SSZ).'
                }), HTTPStatus.BAD_REQUEST
                
            logger.info(f"Successfully parsed date: {requested_dt}, type: {type(requested_dt)}")
            
        except Exception as e:
            logger.error(f"Date parsing exception: {str(e)}, received: {requested_date_str}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return jsonify({
                'status': 'error', 
                'message': f'Invalid date format. Please use ISO format (YYYY-MM-DDTHH:MM:SSZ). Error: {str(e)}'
            }), HTTPStatus.BAD_REQUEST

        # Check for conflicts: Only one appointment per timeslot for a particular nurse
        # Multiple bookings allowed but for separate time slots
        # Check if nurse already has an approved appointment at this exact time
        conflict = Appointment.query.filter(
            Appointment.nurse_id == nurse_id,
            Appointment.date_time.isnot(None),
            Appointment.date_time == requested_dt,
            Appointment.status == 'approved'
        ).first()
        if conflict:
            logger.warning(f"Time slot conflict: Nurse {nurse_id} already has an approved appointment at {requested_dt}")
            return jsonify({
                'status': 'error', 
                'message': 'This time slot is already booked. Please select a different time.'
            }), HTTPStatus.CONFLICT
        
        # Also check for pending appointments at the same time for the same nurse
        pending_conflict = Appointment.query.filter(
            Appointment.nurse_id == nurse_id,
            Appointment.requested_date == requested_dt,
            Appointment.status == 'pending'
        ).first()
        if pending_conflict:
            logger.warning(f"Pending conflict: Nurse {nurse_id} already has a pending appointment at {requested_dt}")
            return jsonify({
                'status': 'error', 
                'message': 'A pending appointment request already exists for this time slot. Please select a different time.'
            }), HTTPStatus.CONFLICT

        # Validate datetime object
        if not isinstance(requested_dt, datetime):
            logger.error(f"requested_dt is not a datetime object: {type(requested_dt)}, value: {requested_dt}")
            return jsonify({
                'status': 'error', 
                'message': 'Invalid date format. Date parsing failed.'
            }), HTTPStatus.BAD_REQUEST
        
        logger.info(f"Creating appointment with date: {requested_dt}, type: {type(requested_dt)}")
        
        try:
            appt = Appointment(
                mother_id=mother_id, 
                nurse_id=nurse_id, 
                requested_date=requested_dt,
                date_time=None,  # Will be set when approved
                status='pending', 
                notes=notes or ''
            )
            db.session.add(appt)
            db.session.commit()
        
            logger.info(f"Appointment request created: ID {appt.id}, Mother {mother_id}, Nurse {nurse_id}")
            
            # Try to convert to dict, handle any errors
            try:
                appointment_dict = appt.to_dict()
            except Exception as dict_error:
                logger.error(f"Error converting appointment to dict: {str(dict_error)}")
                # Return basic appointment info if to_dict fails
                appointment_dict = {
                    'id': appt.id,
                    'mother_id': appt.mother_id,
                    'nurse_id': appt.nurse_id,
                    'requested_date': requested_dt.isoformat(),
                    'date_time': None,
                    'status': appt.status,
                    'notes': appt.notes or '',
                    'reschedule_notes': appt.reschedule_notes or '',
                    'created_at': appt.created_at.isoformat() if appt.created_at else None,
                    'updated_at': appt.updated_at.isoformat() if appt.updated_at else None
                }
            
            return jsonify({'status': 'success', 'appointment': appointment_dict}), HTTPStatus.CREATED
        except Exception as db_error:
            db.session.rollback()
            logger.error(f"Database error creating appointment: {str(db_error)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise  # Re-raise to be caught by outer exception handler

    except Exception as e:
        db.session.rollback()
        import traceback
        error_trace = traceback.format_exc()
        error_message = str(e)
        logger.error(f"Error scheduling appointment: {error_message}\nTraceback: {error_trace}")
        
        # Return detailed error in development, user-friendly in production
        import os
        is_dev = os.getenv('FLASK_ENV') == 'development' or os.getenv('FLASK_DEBUG') == '1'
        
        # Return detailed error message for debugging
        # In development, always show the actual error
        if is_dev:
            user_message = f'Error: {error_message}'
        else:
            # In production, return user-friendly messages
            if 'date' in error_message.lower() or 'time' in error_message.lower():
                user_message = 'Invalid date or time format. Please try again.'
            elif 'consent' in error_message.lower():
                user_message = 'Please enable "Share with Nurses" in your dashboard first.'
            elif 'database' in error_message.lower() or 'sql' in error_message.lower():
                user_message = 'Database error. Please try again.'
            else:
                user_message = 'Failed to schedule appointment. Please try again.'
        
        return jsonify({
            'status': 'error', 
            'message': user_message,
            'error_details': error_message,  # Always include for debugging
            'error_type': type(e).__name__
        }), HTTPStatus.INTERNAL_SERVER_ERROR


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
        elif user.role == 'admin':
            # Admins can see all appointments
            pass
        elif mother_id:
            query = query.filter_by(mother_id=int(mother_id))
        elif nurse_id:
            query = query.filter_by(nurse_id=int(nurse_id))

        # Enrich with user names for admin and nurse views
        appts = query.order_by(Appointment.created_at.desc()).all()
        results = []
        for apt in appts:
            apt_dict = apt.to_dict()
            if user.role == 'admin':
                mother = User.query.get(apt.mother_id)
                nurse = User.query.get(apt.nurse_id)
                apt_dict['mother_name'] = mother.full_name if mother else 'Unknown'
                apt_dict['nurse_name'] = nurse.full_name if nurse else 'Unknown'
            elif user.role == 'nurse':
                # Nurses need to see mother's name
                mother = User.query.get(apt.mother_id)
                apt_dict['mother_name'] = mother.full_name if mother else 'Unknown'
            results.append(apt_dict)
        
        return jsonify({'status': 'success', 'appointments': results}), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error retrieving appointments: {str(e)}")
        return jsonify({'status': 'error', 'message': f'Error retrieving appointments: {str(e)}'}), HTTPStatus.INTERNAL_SERVER_ERROR


@app.route('/approve-appointment', methods=['POST'])
@require_auth
def approve_appointment():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'nurse':
            return jsonify({'status': 'error', 'message': 'Unauthorized. Only nurses can approve appointments.'}), HTTPStatus.FORBIDDEN

        data = request.get_json() or {}
        appointment_id = data.get('appointment_id')
        approved_date_str = data.get('approved_date')  # Optional: nurse can suggest different date
        
        if not appointment_id:
            return jsonify({'status': 'error', 'message': 'appointment_id is required'}), HTTPStatus.BAD_REQUEST

        appt = Appointment.query.get(appointment_id)
        if not appt:
            return jsonify({'status': 'error', 'message': 'Appointment not found'}), HTTPStatus.NOT_FOUND

        if appt.nurse_id != user.id:
            return jsonify({'status': 'error', 'message': 'You can only approve appointments assigned to you'}), HTTPStatus.FORBIDDEN

        # Use approved_date if provided, otherwise use requested_date
        if approved_date_str:
            try:
                approved_dt = datetime.fromisoformat(approved_date_str.replace('Z', '+00:00'))
            except Exception:
                return jsonify({'status': 'error', 'message': 'Invalid approved_date format'}), HTTPStatus.BAD_REQUEST
        else:
            approved_dt = appt.requested_date

        # Check for conflicts
        conflict = Appointment.query.filter(
            Appointment.id != appointment_id,
            Appointment.date_time == approved_dt,
            ((Appointment.nurse_id == appt.nurse_id) | (Appointment.mother_id == appt.mother_id)),
            Appointment.status == 'approved'
        ).first()
        if conflict:
            return jsonify({'status': 'error', 'message': 'Selected time conflicts with another approved appointment'}), HTTPStatus.CONFLICT

        appt.status = 'approved'
        appt.date_time = approved_dt
        appt.updated_at = datetime.utcnow()
        db.session.commit()

        logger.info(f"Appointment {appointment_id} approved by nurse {user.id}")
        return jsonify({'status': 'success', 'appointment': appt.to_dict()}), HTTPStatus.OK

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error approving appointment: {str(e)}")
        return jsonify({'status': 'error', 'message': f'Error approving appointment: {str(e)}'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/reschedule-appointment', methods=['POST'])
@require_auth
def reschedule_appointment():
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'nurse':
            return jsonify({'status': 'error', 'message': 'Unauthorized. Only nurses can request reschedules.'}), HTTPStatus.FORBIDDEN

        data = request.get_json() or {}
        appointment_id = data.get('appointment_id')
        alternate_date_str = data.get('alternate_date')
        reschedule_notes = data.get('reschedule_notes', '')

        if not appointment_id or not alternate_date_str:
            return jsonify({'status': 'error', 'message': 'appointment_id and alternate_date are required'}), HTTPStatus.BAD_REQUEST

        appt = Appointment.query.get(appointment_id)
        if not appt:
            return jsonify({'status': 'error', 'message': 'Appointment not found'}), HTTPStatus.NOT_FOUND

        if appt.nurse_id != user.id:
            return jsonify({'status': 'error', 'message': 'You can only reschedule appointments assigned to you'}), HTTPStatus.FORBIDDEN

        # Parse alternate_date using the same robust parsing logic as schedule_appointment
        try:
            alternate_date_str_clean = str(alternate_date_str).strip()
            alternate_dt = None
            
            # Strategy 1: Use strptime - most reliable
            try:
                date_part = alternate_date_str_clean
                if date_part.endswith('Z'):
                    date_part = date_part[:-1]
                if '+' in date_part:
                    date_part = date_part.split('+')[0]
                elif date_part.count('-') >= 4:
                    parts = date_part.rsplit('-', 2)
                    if len(parts) == 3 and ':' in parts[2]:
                        date_part = parts[0]
                if '.' in date_part:
                    date_part = date_part.split('.')[0]
                alternate_dt = datetime.strptime(date_part, '%Y-%m-%dT%H:%M:%S')
            except ValueError:
                pass
            
            # Strategy 2: Try fromisoformat
            if not alternate_dt:
                try:
                    if alternate_date_str_clean.endswith('Z'):
                        alternate_date_str_iso = alternate_date_str_clean[:-1] + '+00:00'
                    else:
                        alternate_date_str_iso = alternate_date_str_clean
                    if '.' in alternate_date_str_iso and '+' in alternate_date_str_iso:
                        parts = alternate_date_str_iso.split('+')
                        if '.' in parts[0]:
                            alternate_date_str_iso = parts[0].split('.')[0] + '+' + parts[1]
                    elif '.' in alternate_date_str_iso:
                        alternate_date_str_iso = alternate_date_str_iso.split('.')[0]
                    alternate_dt = datetime.fromisoformat(alternate_date_str_iso)
                except (ValueError, AttributeError):
                    pass
            
            if not alternate_dt:
                return jsonify({'status': 'error', 'message': 'Invalid alternate_date format'}), HTTPStatus.BAD_REQUEST
        except Exception as e:
            return jsonify({'status': 'error', 'message': 'Invalid alternate_date format'}), HTTPStatus.BAD_REQUEST

        appt.status = 'reschedule_requested'
        appt.reschedule_notes = reschedule_notes
        appt.date_time = alternate_dt  # Store suggested alternate date
        appt.updated_at = datetime.utcnow()
        db.session.commit()

        logger.info(f"Appointment {appointment_id} reschedule requested by nurse {user.id}")
        return jsonify({'status': 'success', 'appointment': appt.to_dict()}), HTTPStatus.OK

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error requesting reschedule: {str(e)}")
        return jsonify({'status': 'error', 'message': f'Error requesting reschedule: {str(e)}'}), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/respond-to-reschedule', methods=['POST'])
@require_auth
def respond_to_reschedule():
    """Allow mothers to accept or reject reschedule requests from nurses"""
    try:
        user = User.query.get(request.user_id)
        if not user or user.role != 'mother':
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized. Only mothers can respond to reschedule requests.'
            }), HTTPStatus.FORBIDDEN

        data = request.get_json() or {}
        appointment_id = data.get('appointment_id')
        action = data.get('action')  # 'accept' or 'reject'

        if not appointment_id or not action:
            return jsonify({
                'status': 'error',
                'message': 'appointment_id and action are required'
            }), HTTPStatus.BAD_REQUEST

        if action not in ['accept', 'reject']:
            return jsonify({
                'status': 'error',
                'message': 'action must be either "accept" or "reject"'
            }), HTTPStatus.BAD_REQUEST

        appt = Appointment.query.get(appointment_id)
        if not appt:
            return jsonify({
                'status': 'error',
                'message': 'Appointment not found'
            }), HTTPStatus.NOT_FOUND

        if appt.mother_id != user.id:
            return jsonify({
                'status': 'error',
                'message': 'You can only respond to reschedule requests for your own appointments'
            }), HTTPStatus.FORBIDDEN

        if appt.status != 'reschedule_requested':
            return jsonify({
                'status': 'error',
                'message': 'This appointment does not have a pending reschedule request'
            }), HTTPStatus.BAD_REQUEST

        if action == 'accept':
            # Accept the reschedule - update status to approved with the new date_time
            appt.status = 'approved'
            # The date_time should already be set by the nurse's reschedule request
            if not appt.date_time:
                return jsonify({
                    'status': 'error',
                    'message': 'Reschedule date not found. Please contact support.'
                }), HTTPStatus.BAD_REQUEST
            
            db.session.commit()
            
            logger.info(f"Mother {user.id} accepted reschedule for appointment {appointment_id}")
            return jsonify({
                'status': 'success',
                'message': 'Reschedule request accepted successfully',
                'appointment': {
                    'id': appt.id,
                    'status': appt.status,
                    'date_time': appt.date_time.isoformat() if appt.date_time else None,
                }
            }), HTTPStatus.OK

        else:  # reject
            # Reject the reschedule - revert to pending status and clear reschedule date
            appt.status = 'pending'
            appt.date_time = None  # Clear the reschedule date
            appt.reschedule_notes = None  # Clear reschedule notes
            
            db.session.commit()
            
            logger.info(f"Mother {user.id} rejected reschedule for appointment {appointment_id}")
            return jsonify({
                'status': 'success',
                'message': 'Reschedule request rejected',
                'appointment': {
                    'id': appt.id,
                    'status': appt.status,
                }
            }), HTTPStatus.OK

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error responding to reschedule for user_id {request.user_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error responding to reschedule: {str(e)}'
        }), HTTPStatus.INTERNAL_SERVER_ERROR

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
    host = '0.0.0.0' if not IS_DEVELOPMENT else '127.0.0.1'
    
    # Print startup information
    print(f"\n{'='*50}")
    print(f"Starting server in {'DEVELOPMENT' if IS_DEVELOPMENT else 'PRODUCTION'} mode")
    print(f"Environment: {ENV}")
    print(f"Database URL: {'Set' if DATABASE_URL else 'Not set'}")
    print(f"GROQ API Key: {'Set' if GROQ_API_KEY else 'Not set'}")
    print(f"JWT Secret: {'Set' if JWT_SECRET_KEY else 'Not set'}")
    print(f"Server running on: http://{host}:{port}")
    print("="*50 + "\n")
    
    socketio.run(app, host=host, port=port, debug=IS_DEVELOPMENT, allow_unsafe_werkzeug=True)