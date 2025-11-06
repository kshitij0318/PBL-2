// Constants for user roles and navigation
// These values should not be changed as they control the core navigation logic

export const USER_ROLES = {
  ADMIN: 'admin',
  MOTHER: 'mother',
  NURSE: 'nurse'
};

export const ROUTE_NAMES = {
  SIGN_IN: 'SignIn',
  SIGN_UP: 'SignUp',
  HOME: 'Home',
  MOTHER_DASHBOARD: 'MotherDashboard',
  ADMIN_DASHBOARD: 'AdminDashboard',
  TEST: 'Test',
  PROGRESS: 'Progress',
  CHAT_BOT: 'ChatBot',
  PREDICT: 'Predict',
  PROFILE: 'Profile',
  MEDITATION: 'Meditation',
  PREGNANCY_TIMELINE: 'PregnancyTimeline',
  BALL_BIRTHING: 'BallBirthing',
  LAMAZE_BREATHING: 'LamazeBreathing',
  SHIATSU: 'Shiatsu',
  YOGA_BIRTHING: 'YogaBirthing',
  PATIENT_TRACKING: 'PatientTracking'
};

// Role-based route mapping - DO NOT CHANGE THIS LOGIC
export const ROLE_ROUTES = {
  [USER_ROLES.ADMIN]: {
    initialRoute: ROUTE_NAMES.ADMIN_DASHBOARD,
    availableScreens: [
      ROUTE_NAMES.ADMIN_DASHBOARD,
      ROUTE_NAMES.PATIENT_TRACKING,
      ROUTE_NAMES.SIGN_IN
    ]
  },
  [USER_ROLES.MOTHER]: {
    initialRoute: ROUTE_NAMES.MOTHER_DASHBOARD,
    availableScreens: [
      ROUTE_NAMES.MOTHER_DASHBOARD,
      ROUTE_NAMES.HOME,
      ROUTE_NAMES.TEST,
      ROUTE_NAMES.PROGRESS,
      ROUTE_NAMES.CHAT_BOT,
      ROUTE_NAMES.PREDICT,
      ROUTE_NAMES.PROFILE,
      ROUTE_NAMES.MEDITATION,
      ROUTE_NAMES.PREGNANCY_TIMELINE,
      ROUTE_NAMES.BALL_BIRTHING,
      ROUTE_NAMES.LAMAZE_BREATHING,
      ROUTE_NAMES.SHIATSU,
      ROUTE_NAMES.YOGA_BIRTHING,
      ROUTE_NAMES.SIGN_IN
    ]
  },
  [USER_ROLES.NURSE]: {
    initialRoute: ROUTE_NAMES.HOME,
    availableScreens: [
      ROUTE_NAMES.HOME,
      ROUTE_NAMES.TEST,
      ROUTE_NAMES.PROGRESS,
      ROUTE_NAMES.CHAT_BOT,
      ROUTE_NAMES.PREDICT,
      ROUTE_NAMES.PROFILE,
      ROUTE_NAMES.MEDITATION,
      ROUTE_NAMES.PREGNANCY_TIMELINE,
      ROUTE_NAMES.BALL_BIRTHING,
      ROUTE_NAMES.LAMAZE_BREATHING,
      ROUTE_NAMES.SHIATSU,
      ROUTE_NAMES.YOGA_BIRTHING,
      ROUTE_NAMES.SIGN_IN
    ]
  }
};

// Default route for unauthenticated users
export const DEFAULT_ROUTE = 'Splash';

// Validation function to ensure role is valid
export const isValidRole = (role) => {
  return Object.values(USER_ROLES).includes(role);
};

// Function to get route configuration for a role
export const getRouteConfig = (role) => {
  if (!isValidRole(role)) {
    // Default to nurse route if role is invalid
    return ROLE_ROUTES[USER_ROLES.NURSE];
  }
  return ROLE_ROUTES[role];
};

// Function to determine initial route based on user info
export const getInitialRoute = (userInfo) => {
  if (!userInfo || !userInfo.token) {
    return DEFAULT_ROUTE;
  }

  const userRole = (userInfo.role || '').toString().toLowerCase();
  const isAdmin = userRole === USER_ROLES.ADMIN || userInfo.is_admin === true;

  if (isAdmin) {
    return ROLE_ROUTES[USER_ROLES.ADMIN].initialRoute;
  } else if (userRole === USER_ROLES.MOTHER) {
    return ROLE_ROUTES[USER_ROLES.MOTHER].initialRoute;
  } else {
    return ROLE_ROUTES[USER_ROLES.NURSE].initialRoute;
  }
};

// Function to get available screens for a role
export const getAvailableScreens = (userInfo) => {
  if (!userInfo || !userInfo.token) {
    return [ROUTE_NAMES.SIGN_IN, ROUTE_NAMES.SIGN_UP];
  }

  const userRole = (userInfo.role || '').toString().toLowerCase();
  const isAdmin = userRole === USER_ROLES.ADMIN || userInfo.is_admin === true;

  if (isAdmin) {
    return ROLE_ROUTES[USER_ROLES.ADMIN].availableScreens;
  } else if (userRole === USER_ROLES.MOTHER) {
    return ROLE_ROUTES[USER_ROLES.MOTHER].availableScreens;
  } else {
    return ROLE_ROUTES[USER_ROLES.NURSE].availableScreens;
  }
};
