# Pregnancy & Labor Comfort App

A comprehensive mobile application designed to support expectant mothers through their pregnancy journey, providing evidence-based techniques for labor comfort and health risk assessment.

## 🌟 Features

- **Authentication System**
  - Secure user registration and login
  - Profile management
  - Persistent session handling

- **Labor Comfort Techniques**
  - Breathing exercises (Lamaze)
  - Movement and positioning guidance
  - Yoga poses for pregnancy
  - Shiatsu pressure point techniques
  - Interactive tutorials and demonstrations

- **Health Risk Assessment**
  - Personalized health risk prediction
  - Comprehensive health metrics tracking
  - Evidence-based risk analysis

- **Progress Tracking**
  - Assessment tests
  - Progress monitoring
  - Personalized feedback

## 🛠️ Technical Stack

- **Frontend**
  - React Native
  - Expo
  - React Navigation
  - AsyncStorage for local data persistence

- **Backend**
  - Node.js
  - Express.js
  - RESTful API architecture

- **Authentication**
  - JWT (JSON Web Tokens)
  - Secure password hashing
  - Session management

## 📱 Screens

1. **Authentication Screens**
   - Sign In
   - Sign Up
   - Profile Management

2. **Main Screens**
   - Home Dashboard
   - Breathing Techniques
   - Movement Guide
   - Yoga Sessions
   - Shiatsu Techniques
   - Health Risk Prediction
   - Assessment Tests

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Studio (for Android development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pregnancy-labor-app.git
   cd pregnancy-labor-app
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

4. Run on your preferred platform:
   ```bash
   # For iOS
   npm run ios
   # For Android
   npm run android
   ```

## 🔧 Environment Setup

1. Create a `.env` file in the root directory
2. Add the following environment variables:
   ```
   API_URL=your_backend_api_url
   ```

## 📦 Project Structure

```
PBL-2/
├── screens/              # Screen components
├── components/           # Reusable components
├── utils/               # Utility functions and contexts
├── assets/             # Images, fonts, and other static files
├── navigation/         # Navigation configuration
└── App.js             # Root component
```

## 🔐 Authentication Flow

1. User registration with email and password
2. Secure login with JWT token generation
3. Token-based session management
4. Automatic token refresh mechanism

## 🎨 UI/UX Features

- Modern and clean interface
- Intuitive navigation
- Responsive design
- Accessibility support
- Dark/Light mode support

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

- Latest update: [Date]
- Version: 1.0.0
- Changelog: See [CHANGELOG.md](CHANGELOG.md)
