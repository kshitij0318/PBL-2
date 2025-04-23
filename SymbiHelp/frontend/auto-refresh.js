#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Clear the Metro bundler cache
console.log('🧹 Clearing Metro bundler cache...');
try {
  const cacheDir = path.join(__dirname, 'node_modules', '.cache');
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('✅ Cache cleared successfully');
  } else {
    console.log('ℹ️ No cache directory found');
  }
} catch (error) {
  console.error('❌ Error clearing cache:', error.message);
}

// Start the Expo development server with auto-refresh
console.log('🚀 Starting Expo development server with auto-refresh...');
const expoProcess = spawn('npx', ['expo', 'start', '--clear'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    FAST_REFRESH: 'true',
    EXPO_NO_CACHE: 'true'
  }
});

// Handle process termination
expoProcess.on('close', (code) => {
  console.log(`Expo process exited with code ${code}`);
  process.exit(code);
});

// Handle errors
expoProcess.on('error', (err) => {
  console.error('Failed to start Expo:', err);
  process.exit(1);
}); 