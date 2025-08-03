const path = require('path');

module.exports = {
  entry: './src/amazon.js',
  output: {
    filename: 'amazon.bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
}; 