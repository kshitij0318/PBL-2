# Push Notifications Setup Guide

This guide explains how to set up and use push notifications in the SymbiHelp app.

## 📱 Overview

The app now supports push notifications using Expo's notification service. Users can receive notifications when:
- Admin sends announcements
- Important health updates are available
- Test results are ready
- Custom notifications are triggered

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This will install:
- `expo-notifications` - For handling notifications
- `expo-device` - For device detection

### 2. Backend Setup

The backend already includes all necessary endpoints. Make sure to install Python dependencies:

```bash
cd backend
pip install -r requirements.txt
```

### 3. Build and Run

For iOS/Android (physical devices required for push notifications):
```bash
expo run:ios
# or
expo run:android
```

For web (notifications not supported on web):
```bash
npm run web-signin
```

## 🔧 How It Works

### Automatic Registration

1. When a user logs in, the app automatically:
   - Requests notification permissions
   - Registers for push notifications
   - Gets an Expo Push Token
   - Sends the token to your backend

2. The token is stored securely in the database linked to the user account

### Sending Notifications

#### For Admins (via API)

Admins can send notifications to users via the API endpoint:

```bash
POST /notifications/send
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Health Update",
  "body": "Your test results are ready!",
  "user_ids": [],  // Empty array = send to all users
  "data": {
    "screen": "Progress",
    "params": {}
  }
}
```

#### Example: Send to Specific Users

```json
{
  "title": "Reminder",
  "body": "Don't forget to complete your daily assessment",
  "user_ids": [1, 5, 10],
  "data": {
    "screen": "Test"
  }
}
```

### Notification Handling

- **Foreground**: Notifications are shown as alerts when app is open
- **Background**: Notifications appear in the notification tray
- **Tapped**: App navigates to the screen specified in `data.screen`

## 📝 API Endpoints

### Register Push Token
```
POST /notifications/register-token
Authorization: Bearer <token>
{
  "push_token": "ExponentPushToken[...]",
  "platform": "ios" | "android"
}
```

### Send Notification (Admin Only)
```
POST /notifications/send
Authorization: Bearer <admin_token>
{
  "title": "Notification Title",
  "body": "Notification body text",
  "user_ids": [],  // Optional: specific user IDs
  "data": {}       // Optional: navigation data
}
```

### Unregister Push Token
```
POST /notifications/unregister-token
Authorization: Bearer <token>
{
  "push_token": "ExponentPushToken[...]"  // Optional
}
```

## 🎯 Testing Push Notifications

### Using Expo Push Notification Tool

1. Get a user's push token from the database or logs
2. Visit: https://expo.dev/notifications
3. Enter the Expo Push Token
4. Send a test notification

### Using cURL

```bash
curl -H "Content-Type: application/json" \
     -X POST "https://exp.host/--/api/v2/push/send" \
     -d '{
       "to": "ExponentPushToken[YOUR_TOKEN]",
       "title": "Test Notification",
       "body": "This is a test!",
       "sound": "default"
     }'
```

## 🔐 Security

- Only authenticated users can register tokens
- Only admins can send notifications
- Tokens are automatically unregistered on sign out
- Tokens are linked to user accounts

## 📱 Platform Support

- ✅ **iOS**: Full support (requires physical device)
- ✅ **Android**: Full support (requires physical device)
- ❌ **Web**: Not supported (gracefully degrades)

## 🐛 Troubleshooting

### Notifications Not Working?

1. **Check permissions**: Ensure notifications are enabled in device settings
2. **Physical device**: Push notifications only work on physical devices, not simulators
3. **Token registration**: Check backend logs to verify token is registered
4. **Expo account**: Ensure your Expo project ID matches in `app.json`

### Common Issues

- **"Must use physical device"**: Push notifications require a real device
- **"Permission denied"**: User needs to enable notifications in device settings
- **Token not registered**: Check backend logs and network requests

## 📚 Additional Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Push Notification Tool](https://expo.dev/notifications)
- [Push Notification Best Practices](https://docs.expo.dev/versions/latest/sdk/notifications/#best-practices)

