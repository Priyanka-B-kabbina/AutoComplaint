const path = require('path');

module.exports = {
  entry: {
    universal_extractor: './content_scripts/universal_extractor.js',
    consumer_portal: './content_scripts/consumer_portal.js',
    distilbert_classifier: './src/distilbert-mnli-classifier.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  chrome: '80' // Adjust based on your minimum supported Chrome version
                },
                modules: false
              }]
            ]
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js'],
    fallback: {
      "fs": false,
      "path": false,
      "crypto": false,
      "stream": false,
      "buffer": false,
      "util": false
    },
    alias: {
      '@xenova/transformers': '@xenova/transformers/dist/transformers.min.js'
    }
  },
  optimization: {
    minimize: true,
    usedExports: true
  }
};