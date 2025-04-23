module.exports = function (api) {
    api.cache(true); // Cache the configuration for better performance
    return {
      presets: ['babel-preset-expo'], // Use the Expo Babel preset
      plugins: [
        'react-native-reanimated/plugin',
        [
          'module:react-native-dotenv', // Add react-native-dotenv plugin
          {
            moduleName: '@env', // Use '@env' to access environment variables
            path: '.env', // Path to your .env file
            blacklist: null,
            whitelist: null,
            safe: false,
            allowUndefined: true,
          },
        ],
      ],
    };
  };