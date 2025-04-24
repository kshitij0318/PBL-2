# Pregnancy & Labor Comfort App

A comprehensive mobile application designed to support expectant mothers through their pregnancy journey, providing evidence-based techniques for labor comfort and health risk assessment.

## 🌟 Features

- **Authentication System**
  - Secure user registration and login
  - Profile management
  - Persistent session handling with JWT tokens
  - Automatic token validation and refresh

- **Labor Comfort Techniques**
  - Breathing exercises (Lamaze)
  - Movement and positioning guidance
  - Yoga poses for pregnancy
  - Shiatsu pressure point techniques
  - Interactive tutorials and demonstrations

- **Health Risk Assessment**
  - Personalized health risk prediction using machine learning
  - Comprehensive health metrics tracking (Age, Blood Pressure, Blood Sugar, etc.)
  - Evidence-based risk analysis with visual risk meter
  - Personalized recommendations based on risk level

- **Progress Tracking**
  - Assessment tests
  - Progress monitoring
  - Personalized feedback
  - Visual progress indicators

- **AI-Powered Chat Assistant**
  - Pregnancy-related questions and answers
  - Personalized advice based on user data
  - 24/7 support for common concerns

## 🛠️ Technical Stack

- **Frontend**
  - React Native
  - Expo
  - React Navigation
  - AsyncStorage for local data persistence
  - React Native SVG for visualizations
  - Markdown support for formatted text

- **Backend**
  - Python Flask
  - Machine Learning models for risk prediction
  - RESTful API architecture
  - JWT authentication
  - SQLite database

- **Authentication**
  - JWT (JSON Web Tokens)
  - Secure password hashing
  - Session management
  - Token-based API access

## 📱 Screens

1. **Authentication Screens**
   - Sign In
   - Sign Up
   - Profile Management

2. **Main Screens**
   - Home Dashboard
   - Breathing Techniques (Lamaze)
   - Movement Guide (Ball Birthing)
   - Yoga Sessions
   - Shiatsu Techniques
   - Health Risk Prediction
   - Assessment Tests
   - Chat Assistant
   - Progress Tracking

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Studio (for Android development)
- Python 3.8+ (for backend development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pregnancy-labor-app.git
   cd pregnancy-labor-app
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   # or
   yarn install
   ```

3. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   cd backend
   python main.py
   ```

5. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   # or
   yarn start
   ```

6. Run on your preferred platform:
   ```bash
   # For iOS
   npm run ios
   # For Android
   npm run android
   ```

## 🔧 Environment Setup

1. Create a `.env` file in the frontend directory
2. Add the following environment variables:
   ```
   API_URL=https://symbihelp.onrender.com
   ```

## 📦 Project Structure

```
PBL-2/
├── frontend/
│   ├── screens/              # Screen components
│   ├── components/           # Reusable components
│   ├── utils/               # Utility functions and contexts
│   ├── assets/             # Images, fonts, and other static files
│   ├── navigation/         # Navigation configuration
│   └── App.js             # Root component
├── backend/
│   ├── main.py            # Main Flask application
│   ├── models/            # Machine learning models
│   ├── data/              # Training and test data
│   └── requirements.txt   # Python dependencies
└── README.md              # Project documentation
```

## 🔐 Authentication Flow

1. User registration with email and password
2. Secure login with JWT token generation
3. Token stored in AsyncStorage as part of userInfo object
4. Token included in Authorization header for all API requests
5. Automatic token validation on app startup
6. Secure token-based session management

## 🧠 Health Risk Prediction

The application uses a machine learning model to predict pregnancy health risks based on the following metrics:

- Age
- Systolic Blood Pressure
- Diastolic Blood Pressure
- Blood Sugar Level
- Body Temperature
- Heart Rate

The prediction process:
1. User enters health metrics in the prediction screen
2. Data is sent to the backend API with authentication
3. Backend processes the data through the ML model
4. Risk level is determined (Low, Medium, High)
5. Personalized recommendations are generated
6. Results are displayed with a visual risk meter
7. Prediction history is stored for tracking

## 🎨 UI/UX Features

- Modern and clean interface
- Intuitive navigation
- Responsive design
- Accessibility support
- Visual risk indicators
- Interactive tutorials
- Progress tracking visualizations

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Medical professionals who provided expertise
- Open-source community
- Contributors and maintainers

## 📞 Support

For support, email support@yourdomain.com or create an issue in the repository.

## 🔄 Updates

- Latest update: April 24, 2024
- Version: 1.0.0
- Changelog: See [CHANGELOG.md](CHANGELOG.md)
