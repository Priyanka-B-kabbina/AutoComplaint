# Extension Integration Guide

## Lightweight Order Classifier Integration

This guide explains how to integrate the trained ML model into your Chrome extension.

### Overview

The lightweight classifier (`lightweight-classifier.js`) provides:
- **Inference-only** classification (no training in the extension)
- **Fallback rule-based** classification when ML models aren't available
- **Flexible model loading** from local or remote sources
- **Minimal dependencies** for extension environment

### Integration Steps

#### 1. Copy the Classifier

Copy `lightweight-classifier.js` to your extension's source directory:

```bash
cp training-suite/models/order-classifier/extension-export/lightweight-classifier.js src/
```

#### 2. Update Manifest (if needed)

Ensure your `manifest.json` includes the classifier in content scripts:

```json
{
  "content_scripts": [
    {
      "matches": ["*://*/*"],
      "js": [
        "src/lightweight-classifier.js",
        "src/amazon.js"
      ]
    }
  ]
}
```

#### 3. Replace Training Logic

Replace the training-heavy `CustomOrderClassifier` in your content script with:

```javascript
// Initialize the lightweight classifier
const orderClassifier = new LightweightOrderClassifier();

// Load model (optional - will use fallback if not available)
orderClassifier.loadModel('http://localhost:3001/model.json');

// Use in your extraction logic
async function isOrderPage() {
  const result = await orderClassifier.classifyPage();
  console.log('Page classification:', result);
  return result.isOrder && result.confidence > 0.7;
}
```

#### 4. Model Loading Options

**Option A: Local Model Server**
```javascript
// Start the model server from training-suite
// npm run serve-model
await orderClassifier.loadModel('http://localhost:3001/model.json');
```

**Option B: Bundled Model** (if model is small enough)
```javascript
// Copy model files to extension directory
await orderClassifier.loadModel(chrome.runtime.getURL('models/model.json'));
```

**Option C: Fallback Only**
```javascript
// Just use rule-based classification
await orderClassifier.loadModel(); // No URL = fallback mode
```

### Usage Examples

#### Basic Page Classification

```javascript
async function checkIfOrderPage() {
  const result = await orderClassifier.classifyPage();
  
  if (result.isOrder && result.confidence > 0.8) {
    console.log('✅ High confidence order page detected');
    return true;
  } else if (result.isOrder && result.confidence > 0.6) {
    console.log('⚠️ Possible order page detected');
    return true; // Or false, depending on your tolerance
  } else {
    console.log('❌ Not an order page');
    return false;
  }
}
```

#### Text Classification

```javascript
async function classifyText(text) {
  const result = await orderClassifier.classify(text);
  return {
    isOrder: result.isOrder,
    confidence: result.confidence,
    method: result.method
  };
}
```

#### Advanced Usage with Error Handling

```javascript
async function smartOrderDetection() {
  try {
    // First try ML-based classification
    const result = await orderClassifier.classifyPage();
    
    console.log(\`Classification result: \${result.method} method, \${(result.confidence * 100).toFixed(1)}% confidence\`);
    
    // Use different thresholds based on method
    if (result.method === 'ml') {
      return result.isOrder && result.confidence > 0.7;
    } else if (result.method === 'rules') {
      return result.isOrder && result.confidence > 0.8;
    } else {
      // Fallback to heuristics
      return detectOrderPageHeuristics();
    }
    
  } catch (error) {
    console.error('Classification failed:', error);
    return detectOrderPageHeuristics(); // Ultimate fallback
  }
}

function detectOrderPageHeuristics() {
  // Your existing rule-based detection logic
  const url = window.location.href;
  return /order|invoice|receipt|confirmation/.test(url.toLowerCase());
}
```

### Model Updates

#### Updating the Model

1. **Retrain the model** in the training-suite:
   ```bash
   cd training-suite
   npm run train
   ```

2. **Test the new model**:
   ```bash
   npm run serve-model
   npm run test-web
   ```

3. **Deploy to extension**:
   - For local server: Model automatically updates
   - For bundled: Copy new model files to extension directory
   - For remote: Upload model to your hosting service

#### Versioning

Track model versions in your code:

```javascript
const MODEL_VERSION = '1.2.0';
const MODEL_URL = \`https://your-server.com/models/v\${MODEL_VERSION}/model.json\`;

await orderClassifier.loadModel(MODEL_URL);
```

### Performance Optimization

#### Lazy Loading

```javascript
let classifierPromise = null;

function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const classifier = new LightweightOrderClassifier();
      await classifier.loadModel();
      return classifier;
    })();
  }
  return classifierPromise;
}

// Usage
async function checkPage() {
  const classifier = await getClassifier();
  return await classifier.classifyPage();
}
```

#### Caching Results

```javascript
const pageClassificationCache = new Map();

async function getCachedClassification(url) {
  if (pageClassificationCache.has(url)) {
    return pageClassificationCache.get(url);
  }
  
  const result = await orderClassifier.classifyPage();
  pageClassificationCache.set(url, result);
  
  // Clear cache after 5 minutes
  setTimeout(() => pageClassificationCache.delete(url), 5 * 60 * 1000);
  
  return result;
}
```

### Troubleshooting

#### Common Issues

1. **Model Loading Fails**
   - Check console for error messages
   - Verify model server is running
   - Ensure CORS is properly configured
   - Falls back to rule-based classification

2. **Low Accuracy**
   - Check confidence thresholds
   - Verify training data quality
   - Consider retraining with more data
   - Review page content extraction

3. **Performance Issues**
   - Use lazy loading
   - Cache classification results
   - Reduce model complexity
   - Use rule-based fallback for simple cases

#### Debug Mode

Enable debug logging:

```javascript
// Add to your content script
orderClassifier.debug = true;

// Or check classification details
const result = await orderClassifier.classifyPage();
console.log('Classification details:', result);
```

### Best Practices

1. **Always have a fallback** - Don't rely solely on ML
2. **Set appropriate confidence thresholds** - Higher for critical actions
3. **Monitor performance** - Log classification times and accuracy
4. **Update models regularly** - Retrain with new data
5. **Test thoroughly** - Verify on different sites and scenarios

### Next Steps

1. Replace the training logic in your main extension file
2. Test the lightweight classifier on various order pages
3. Set up model serving infrastructure if needed
4. Implement monitoring and feedback collection
5. Plan for regular model updates and improvements
