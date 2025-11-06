# SymbiHelp - Pregnancy & Labor Comfort Management System

A comprehensive full-stack application designed to support expectant mothers through their pregnancy journey, providing evidence-based techniques for labor comfort, health risk assessment, and healthcare provider collaboration.

## 🌟 Key Features

### 🔐 Authentication & User Management
- **JWT-based Authentication**: Secure login with token validation
- **Role-Based Access Control**: Mother, Nurse, and Admin dashboards
- **Session Management**: Persistent login with AsyncStorage
- **Password Security**: Bcrypt hashing with password change functionality
- **Profile Management**: User profile and settings management
- **Nurse Credential Verification**: Secure nurse registration with credential validation

### 🤰 Mother Features
- **Health Data Management**: Track vital signs, due date, health history
- **Pregnancy Timeline**: Week-by-week progress with baby development info
- **Gamification**: Points, levels, badges, and milestone tracking
- **Consent Controls**: Manage data sharing with healthcare providers
- **Health Logging**: Comprehensive health data input and tracking
- **Appointment Scheduling**: Book and manage appointments with assigned nurses
- **Reschedule Management**: Accept or reject nurse reschedule requests

### 🏥 Nurse Features
- **Patient Management**: Assign and track mother assignments
- **Health Monitoring**: Access patient health data and trends
- **Risk Prediction**: Use patient data for ML-based risk assessment
- **Real-time Updates**: Live patient health information
- **Assignment System**: Manage mother-nurse relationships
- **Appointment Management**: View and manage appointments with assigned mothers
- **Reschedule Requests**: Request appointment reschedules with time manipulation
- **Calendar View**: Visual calendar reference for upcoming appointments

### 👨‍💼 Admin Features
- **Analytics Dashboard**: User statistics, performance metrics
- **Time Period Filtering**: Week, month, year views
- **Recent Activity**: Real-time user engagement tracking
- **User Management**: Complete user administration
- **Performance Monitoring**: App usage and health metrics
- **Forum Moderation**: Flag/unflag posts and comments, manage content
- **Top Contributors**: Track and display forum engagement

### 🧘‍♀️ Labor Comfort Techniques
- **Lamaze Breathing**: 5-step breathing technique guide with videos
- **Ball Birthing**: 6 core exercises with scientific rationale
- **Yoga Birthing**: Pregnancy-safe yoga positions
- **Shiatsu Techniques**: Pressure point therapy for pain relief
- **Interactive Tutorials**: Step-by-step guided demonstrations

### 🧠 Health Risk Assessment
- **ML Integration**: Real-time health risk prediction using Logistic Regression
- **Visual Risk Meter**: Interactive circular progress indicator
- **Data Sources**: Manual input or patient data integration
- **Personalized Recommendations**: AI-generated health advice using Groq
- **Historical Tracking**: Complete prediction history

### 📚 Assessment & Learning
- **Interactive Tests**: 15-question randomized quizzes
- **Real-time Feedback**: Immediate correct/incorrect indicators
- **Progress Tracking**: Visual progress bars and scoring
- **Educational Content**: Detailed explanations for each answer
- **Gamification**: Points and achievement system

### 🤖 AI Assistant
- **24/7 Chatbot**: Pregnancy-focused intelligent assistant
- **Personalized Responses**: Context-aware recommendations
- **Markdown Support**: Rich text formatting
- **Conversation History**: Persistent chat memory
- **Groq Integration**: Advanced AI capabilities with Llama 3.1

### 📅 Appointment Scheduling
- **Calendar Integration**: Interactive date and time selection
- **Device Sync**: Native calendar integration
- **Conflict Prevention**: Automatic scheduling validation (one appointment per timeslot per nurse)
- **Status Management**: Pending, approved, reschedule_requested, cancelled states
- **Role-based Access**: Mothers can book, nurses can view and reschedule
- **Reschedule Workflow**: Nurses can request reschedules, mothers can accept/reject

### 💬 Community Forum
- **Anonymous Posting**: Post and comment anonymously (optional)
- **Real-time Updates**: Socket.IO for live updates
- **Content Moderation**: Automatic profanity detection and flagging
- **Admin Moderation**: Flag/unflag posts and comments
- **Like System**: Engage with posts through likes
- **Role-based Visibility**: Admins see author identity, others see anonymous

### 📊 Data Visualization
- **Health Trends**: Line charts for blood pressure trends
- **Progress Charts**: Bar charts for health metrics
- **Risk Visualization**: Interactive risk meters
- **Timeline Charts**: Pregnancy progress visualization

## 🛠️ Technical Stack

### **Frontend (React Native/Expo)**
- **Core Framework**: React Native with Expo
- **Navigation**: React Navigation with role-based routing
- **State Management**: Context API for authentication and theming
- **Data Persistence**: AsyncStorage for local data storage
- **UI Components**: Custom responsive components with React Native StyleSheet
- **Data Visualization**: React Native Chart Kit for health trends
- **Calendar Integration**: React Native Calendars for appointment scheduling
- **AI Integration**: Groq API for chatbot functionality
- **Markdown Support**: React Native Markdown Display
- **Gradients**: Expo Linear Gradient for UI effects
- **Real-time Communication**: Socket.IO client for forum updates

### **Backend (Python Flask)**
- **Web Framework**: Flask with CORS support
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Machine Learning**: scikit-learn with Logistic Regression
- **AI Integration**: Groq API (primary) for AI recommendations and chat
- **Data Processing**: pandas and numpy for data manipulation
- **Model Persistence**: pickle for ML model storage
- **API Architecture**: RESTful API with comprehensive endpoints
- **Real-time Communication**: Flask-SocketIO for forum updates
- **Content Moderation**: Automated profanity detection and flagging

### **Database & Storage**
- **Primary Database**: PostgreSQL for production
- **Data Models**: User, HealthLog, TestResult, Assignment, Appointment, Post, Comment
- **Migrations**: Automated database schema updates
- **Data Validation**: Input sanitization and validation
- **Audit Logging**: Comprehensive activity tracking

### **AI & Machine Learning**
- **Health Prediction**: Logistic Regression model
- **Data Preprocessing**: Automated scaling and normalization
- **AI Chatbot**: Groq-powered natural language processing (Llama 3.1 70B)
- **Personalization**: Context-aware recommendations
- **Model Training**: Maternal health dataset

## 📱 Application Architecture

### **Role-Based Navigation**
The application features dynamic navigation based on user roles:
- **Unauthenticated Users**: Sign In, Sign Up screens
- **Mothers**: Mother Dashboard, Health Management, Pregnancy Timeline, Appointment Scheduling
- **Nurses**: Patient Tracking, Health Monitoring, Appointment Management, Quick Actions Bar
- **Admins**: Analytics Dashboard, User Management, Forum Moderation, Statistics

### **Key Screens**

#### **Authentication & Profile**
- `SignInScreen.js` - User login with email/password validation
- `SignUpScreen.js` - User registration with role selection and nurse credential verification
- `ProfileScreen.js` - User profile and settings management with password change

#### **Role-Based Dashboards**
- `MotherDashboard.js` - Health data management, due date tracking, upcoming appointments
- `AdminDashboard.js` - Analytics, user statistics, forum moderation, performance metrics
- `HomeScreen.js` - General user home with technique access (nurses have quick actions bar)

#### **Health & Monitoring**
- `PredictScreen.js` - ML-powered health risk prediction
- `PregnancyTimeline.js` - Week-by-week pregnancy progress
- `PatientTracking.js` - Nurse patient management system with appointment display

#### **Learning & Techniques**
- `TestScreen.js` - Interactive assessment with 15 questions
- `LamazeBreathing.js` - 5-step breathing technique guide
- `BallBirthing.js` - 6 core birthing ball exercises
- `YogaBirthing.js` - Pregnancy-safe yoga positions
- `Shiatsu.js` - Pressure point therapy techniques

#### **Communication & Scheduling**
- `ChatBotScreen.js` - AI assistant with markdown support
- `AppointmentScheduling.js` - Calendar integration and scheduling
- `ProgressScreen.js` - Progress tracking and achievements
- `ForumScreen.js` - Community forum with anonymous posting

#### **Utility Screens**
- `MeditationScreen.js` - Relaxation and mindfulness
- `ScoreDisplay.js` - Test results and analysis
- `NurseAppointments.js` - Nurse appointment management with reschedule functionality

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v14 or higher)
- npm or yarn package manager
- Expo CLI
- Python 3.8+ (for backend development)
- PostgreSQL database
- iOS Simulator (Mac) or Android Studio (Android)
- Groq API key (for AI features)

### **Quick Start**

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/symbihelp-app.git
   cd symbihelp-app
   ```

2. **Backend Setup**
   ```bash
   cd backend
   
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Set up environment variables
   python setup_env.py  # Or manually create .env file from env_template.txt
   
   # Run database migrations
   python run_all_migrations.py
   
   # Start the server
   python main.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   
   # Install dependencies
   npm install
   
   # Create .env file with API URL
   echo "API_URL=http://localhost:5000" > .env
   echo "EXPO_PUBLIC_API_URL=http://localhost:5000" >> .env
   
   # Start development server
   npm start
   ```

4. **Run on device**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   
   # Web
   npm run web
   ```

### **Environment Configuration**

#### **Frontend (.env)**
```bash
API_URL=http://localhost:5000
EXPO_PUBLIC_API_URL=http://localhost:5000
```

#### **Backend (.env)**
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# JWT Secret Key (generate a secure random string)
JWT_SECRET_KEY=your_jwt_secret_key_here

# Groq API Key (required for AI functionality)
# Get your API key from https://console.groq.com/
GROQ_API_KEY=your_groq_api_key_here

# Flask Environment
FLASK_ENV=development

# Optional: Server Port
PORT=5000
```

## 📦 Project Structure

```
PBL-2-kshitij/
├── frontend/                    # React Native/Expo mobile app
│   ├── screens/                # Screen components
│   │   ├── Auth/              # Authentication screens
│   │   ├── Main/              # Main app screens
│   │   └── Admin/             # Admin-specific screens
│   ├── components/             # Reusable UI components
│   │   ├── ChartWrapper.js    # Chart component wrapper
│   │   └── ScoreDisplay.js    # Score display component
│   ├── utils/                 # Utility functions and contexts
│   │   ├── AuthContext.js     # Authentication context
│   │   ├── ThemeContext.js    # Theme management
│   │   ├── ResponsiveComponents.js  # Responsive UI components
│   │   └── suppressChartWarnings.js  # Chart warning suppression
│   ├── assets/               # Images, fonts, and static files
│   ├── navigation/           # Navigation configuration
│   ├── App.js               # Root component
│   └── package.json         # Frontend dependencies
├── backend/                   # Python Flask API
│   ├── main.py              # Main Flask application
│   ├── requirements.txt     # Python dependencies
│   ├── *.pkl               # Machine learning models
│   ├── *.csv               # Training datasets
│   ├── migrate_*.py        # Database migrations
│   ├── run_all_migrations.py  # Run all migrations
│   ├── setup_env.py        # Environment setup utility
│   └── env_template.txt    # Environment variables template
├── README.md                # Main project documentation
└── package.json            # Root package.json (if needed)
```

## 🔐 Authentication & Security

### **Authentication Flow**
1. **User Registration**: Email, password, and role selection
2. **Nurse Verification**: Nurses must provide credential ("nurse_hid") during registration
3. **JWT Token Generation**: Secure token with user information
4. **Token Storage**: Persistent storage in AsyncStorage
5. **API Authentication**: Token included in Authorization header
6. **Role-Based Access**: Dynamic navigation based on user role
7. **Session Management**: Automatic token validation and refresh

### **Security Features**
- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure token-based authentication
- **Input Validation**: Client and server-side validation
- **CORS Protection**: Controlled cross-origin access
- **Data Encryption**: Sensitive data protection
- **Content Moderation**: Automated profanity detection
- **Audit Logging**: Comprehensive activity tracking

## 🧠 Health Risk Assessment

### **Machine Learning Model**
- **Algorithm**: Logistic Regression
- **Training Data**: Maternal Health Risk Dataset
- **Features**: Age, Blood Pressure, Blood Sugar, Body Temperature, Heart Rate
- **Output**: Risk Level (Low, Mid, High) with confidence score

### **Prediction Process**
1. **Data Input**: User enters health metrics or uses patient data
2. **Data Preprocessing**: Scaling and normalization using pre-trained scaler
3. **ML Prediction**: Logistic regression model processes the data
4. **Risk Assessment**: Risk level determination with confidence score
5. **AI Recommendations**: Personalized advice using Groq AI
6. **Visual Display**: Interactive risk meter and trend charts
7. **Data Storage**: Prediction history and health logs

## 📅 Appointment System

### **Appointment Workflow**
1. **Mother Books Appointment**: Selects date, time, and adds notes
2. **Nurse Assignment**: Appointment is assigned to mother's assigned nurse
3. **Conflict Prevention**: System ensures only one appointment per timeslot per nurse
4. **Status Management**: Pending → Approved → Completed/Cancelled
5. **Reschedule Requests**: Nurses can request reschedules, mothers can accept/reject
6. **Calendar Integration**: Appointments sync with device calendar

### **Reschedule Workflow**
1. **Nurse Requests Reschedule**: Selects new date and time, adds notes
2. **Status Change**: Appointment status becomes "reschedule_requested"
3. **Mother Notification**: Mother sees reschedule request in dashboard
4. **Mother Response**: Accept (appointment confirmed) or Reject (appointment reset to pending)
5. **Rejection Handling**: If rejected, mother can book new appointment

## 💬 Forum System

### **Features**
- **Anonymous Posting**: Users can post and comment anonymously
- **Real-time Updates**: Socket.IO for live updates
- **Content Moderation**: Automatic profanity detection
- **Admin Moderation**: Flag/unflag posts and comments
- **Like System**: Engage with posts
- **Role-based Visibility**: Admins see author identity

### **Moderation**
- **Automatic Detection**: Profanity and inappropriate content flagged
- **Admin Actions**: Flag/unflag posts and comments
- **Audit Logging**: All moderation actions logged
- **User Management**: Mute and ban functionality

## 🎨 User Experience Features

### **Design Principles**
- **Modern Interface**: Clean, intuitive design with gradients
- **Role-Based UI**: Customized interface for each user type
- **Responsive Design**: Works on devices 4.7" to 12.9"
- **Accessibility**: WCAG 2.1 AA compliance
- **Visual Feedback**: Interactive elements and progress indicators

### **Navigation & Usability**
- **Dynamic Navigation**: Role-based screen routing
- **Intuitive Flow**: Logical user journey design
- **Quick Access**: Easy access to frequently used features (nurse quick actions bar)
- **Offline Support**: Cached data for core features
- **Error Recovery**: Graceful failure handling

## 📊 Performance & Monitoring

### **Performance Metrics**
- **Load Time**: < 3 seconds initial app load
- **Navigation**: < 500ms screen transitions
- **API Response**: < 2 seconds for most requests
- **Memory Usage**: Optimized for mobile devices
- **Database Queries**: Optimized with proper indexing

### **Monitoring Features**
- **Health Checks**: API status monitoring
- **Error Tracking**: Comprehensive error logging
- **Usage Analytics**: Feature utilization metrics
- **Performance Monitoring**: Response time tracking
- **User Engagement**: App usage patterns

## 🧪 Testing & Quality Assurance

### **Test Coverage**
- **Unit Tests**: Component and function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete user journey testing
- **ML Model Tests**: Prediction accuracy testing
- **Performance Tests**: Load and stress testing

### **Quality Assurance**
- **Code Review**: Peer review process
- **Linting**: ESLint and Prettier integration
- **Security Audits**: Regular security assessments
- **Accessibility Testing**: Screen reader compatibility
- **Cross-Platform Testing**: iOS and Android compatibility

## 🔄 Database Migrations

### **Migration System**
- **Automated Migrations**: Schema update automation
- **Data Preservation**: Safe data migration
- **Version Control**: Migration version tracking

### **Running Migrations**
```bash
# Run all migrations
cd backend
python run_all_migrations.py

# Individual migrations (if needed)
python migrate_add_role.py
python migrate_add_appointment_fields.py
python migrate_add_moderation_fields.py
```

## 🚀 Deployment

### **Production Deployment Checklist**
1. Set production environment variables
2. Configure production database
3. Set up SSL certificates
4. Configure reverse proxy (nginx)
5. Set up monitoring and logging
6. Test all endpoints
7. Deploy with zero downtime

### **Backend Deployment**
- Use Gunicorn or similar WSGI server
- Set `FLASK_ENV=production`
- Configure production database
- Set secure JWT secret key
- Enable HTTPS

### **Frontend Deployment**
- Build production bundle
- Configure API URL for production
- Set up CDN for assets
- Enable caching
- Configure analytics

## 🤝 Contributing

### **Development Guidelines**
- **Code Style**: Follow established patterns and conventions
- **Documentation**: Comprehensive code comments and documentation
- **Testing**: Maintain test coverage for new features
- **Security**: Follow security best practices
- **Performance**: Optimize for mobile devices

### **Pull Request Process**
1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Implement changes with tests
4. Update documentation
5. Submit pull request with description
6. Address review feedback
7. Merge after approval

## 📞 Support & Contact

### **Technical Support**
- **Documentation**: Comprehensive guides available
- **Issue Tracking**: GitHub issues for bug reports
- **Community**: Developer community forums
- **Direct Support**: Technical team contact

### **User Support**
- **In-App Help**: Built-in assistance features
- **FAQ Section**: Common questions and answers
- **Video Tutorials**: Step-by-step guides
- **Live Chat**: Real-time support during business hours

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<<<<<<< HEAD
=======
## 👥 Authors

- **Development Team**: SymbiHelp Development Team
- **Medical Advisors**: Healthcare professionals and experts
- **Contributors**: Open source community contributors

## 🙏 Acknowledgments

- **Medical Professionals**: Clinical expertise and validation
- **Open Source Community**: Libraries, frameworks, and tools
- **Beta Testers**: User feedback and testing
- **Research Community**: Maternal health research and data
- **Development Team**: Continuous improvement and innovation

## 🔄 Updates & Roadmap

### **Current Version**: 1.0.0
### **Last Updated**: December 2024

### **Recent Updates**
- Comprehensive role-based access control
- Advanced health risk prediction with ML
- AI-powered chatbot integration (Groq)
- Appointment scheduling system with reschedule workflow
- Gamification and progress tracking
- Real-time health monitoring
- Community forum with moderation
- Nurse credential verification
- Password change functionality
- Mobile-responsive UI improvements

### **Future Roadmap**
- Enhanced AI capabilities
- Advanced analytics and reporting
- Integration with wearable devices
- Multi-language support
- Telemedicine features
- Advanced health insights
- Push notifications
- Video consultation features

---

>>>>>>> 934fe24 (chore: Clean up project for production readiness)
**SymbiHelp** - Empowering expectant mothers through technology and healthcare innovation.
