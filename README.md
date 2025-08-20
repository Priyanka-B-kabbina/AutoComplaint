# 🤖 AutoComplaint Chrome Extension

**Intelligent e-commerce order data extraction and consumer complaint form automation**

## 🎯 Overview

AutoComplaint is a Chrome extension that uses machine learning to automatically extract order information from any e-commerce website and fill consumer complaint forms on government portals.

## ✨ Key Features

- **Universal Extraction**: Works on ANY e-commerce platform (Amazon, Flipkart, etc.)
- **ML-Powered**: Uses DistilBERT MNLI for intelligent order page classification
- **Smart Form Filling**: Automatically fills consumer complaint forms with extracted data
- **Adaptive**: No hardcoded site-specific logic - fully pattern-based and ML-driven

## 🏗️ Architecture

- **Extension**: Chrome extension with popup interface
- **Content Scripts**: Universal data extraction and form filling
- **ML Models**: Out-of-box models for classification and extraction
- **Training Suite**: Separate project for model development and testing

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Build Extension**:
   ```bash
   npm run build
   ```

3. **Load in Chrome**:
   - Open Chrome Extensions (chrome://extensions/)
   - Enable Developer Mode
   - Click "Load unpacked" and select this directory

4. **Use Extension**:
   - Visit any e-commerce order page
   - Click the extension icon to extract order data
   - Navigate to a consumer complaint portal
   - Click "Fill Form" to auto-populate fields

## 📁 Project Structure

```
AutoComplaint/
├── src/
│   ├── universal-extractor.js      # Core ML-based extraction logic
│   ├── ner-extractor.js           # Named entity recognition
│   └── distilbert-mnli-classifier.js # Zero-shot classification
├── content_scripts/
│   ├── universal_extractor.js     # Content script integration
│   └── consumer_portal_enhanced.js # Form filling logic
├── tests/                         # Test files
├── assets/                        # Extension icons and images
├── manifest.json                  # Extension configuration
├── popup.html/css/js              # Extension popup interface
└── webpack.config.js              # Build configuration
```

## 🧠 Machine Learning

The extension uses:
- **DistilBERT MNLI**: Zero-shot classification for order page detection
- **Regex-based NER**: Named entity extraction for order details
- **Pattern Recognition**: Adaptive field detection for form filling

See `ML_ARCHITECTURE_GUIDE.md` for detailed ML implementation.

## 🛠️ Development

For detailed technical implementation, see `TECHNICAL_IMPLEMENTATION_GUIDE.md`.

### Build Commands
- `npm run build` - Build for production
- `npm run dev` - Build for development with watch mode
- `npm test` - Run tests

### Chrome Extension Development
- Use the VS Code task "Open Chrome Extension in Developer Mode" for quick testing
- Extension reloads automatically during development

## 🔧 Configuration

The extension works out-of-the-box with no configuration required. All ML models are embedded and run locally for privacy.

## 📝 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Built with ❤️ for consumer rights and e-commerce transparency**
