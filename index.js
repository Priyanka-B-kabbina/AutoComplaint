
// AutoComplaint Chrome Extension Entry Point
// This file is used by Replit to start the development environment

const path = require('path');
const { spawn } = require('child_process');

console.log('AutoComplaint Chrome Extension Development Environment');
console.log('================================================');
console.log('');
console.log('This is a Chrome Extension project. To use it:');
console.log('1. Run "npm run build" to build the extension');
console.log('2. Load the extension in Chrome Developer Mode');
console.log('3. Point to this directory as an unpacked extension');
console.log('');
console.log('Building the extension now...');

// Run webpack build
const webpack = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true
});

webpack.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Extension built successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Open Chrome and go to chrome://extensions/');
    console.log('2. Enable "Developer mode"');
    console.log('3. Click "Load unpacked" and select this directory');
    console.log('');
    console.log('Extension files:');
    console.log('- manifest.json: Extension configuration');
    console.log('- popup.html/js/css: Extension popup interface');
    console.log('- dist/amazon.bundle.js: Bundled content script');
    console.log('- content_scripts/: Content scripts for web pages');
  } else {
    console.error('❌ Build failed with code:', code);
  }
});

// Keep the process running
setInterval(() => {
  // Keep alive
}, 30000);
