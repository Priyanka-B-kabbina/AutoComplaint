# AutoComplaint Custom Classifier Training Guide

This document explains how to train and use the custom order detection classifier in the AutoComplaint extension.

## Overview

The AutoComplaint extension now includes a custom-trained neural network classifier that can distinguish between order/invoice pages and other web pages. This replaces the previous zero-shot classification approach with a more accurate, domain-specific model.

## Files Structure

```
├── src/amazon.js                 # Main extraction logic with custom classifier
├── training_data.jsonl           # Training dataset (JSONL format)
├── classifier_trainer.js         # Standalone training script
└── README_CLASSIFIER.md          # This guide
```

## Training Data Format

The training data is stored in `training_data.jsonl` in JSON Lines format:

```jsonl
{"text": "Order #AMZ-123456 Total: $49.99 Delivery Date: March 15, 2024", "label": "order"}
{"text": "Welcome to our online store! Browse thousands of products", "label": "non-order"}
```

Each line contains:
- `text`: The text content to classify
- `label`: Either "order" (for order/invoice pages) or "non-order" (for other pages)

## Training the Classifier

### Automatic Training (Recommended)

The classifier trains automatically when the extension loads:

1. **First Load**: If no saved model exists, it will train a new model using the training data
2. **Subsequent Loads**: It will load the previously saved model from browser storage
3. **Fallback**: If training fails, it falls back to the zero-shot classifier

### Manual Training

You can manually train the classifier using the browser console:

```javascript
// Train the classifier (only if not already trained)
await window.trainClassifier();

// Force retrain with latest data
await window.trainClassifier(true);

// Check training status
window.getClassifierStatus();
```

### Using the Training Script

For more comprehensive training and testing:

```javascript
// Load the training script in your page, then:

// Train the model
await window.trainOrderClassifier();

// Evaluate model performance
await window.evaluateOrderClassifier();

// Retrain with latest data
await window.retrainOrderClassifier();
```

## Testing the Classifier

### Quick Testing

```javascript
// Test with sample text
await window.testClassifier("Order #12345 Total: $99.99");
// Returns: { success: true, result: { label: "order", confidence: 0.85, scores: [0.15, 0.85] } }

await window.testClassifier("Welcome to our website");
// Returns: { success: true, result: { label: "non-order", confidence: 0.92, scores: [0.92, 0.08] } }
```

### Comprehensive Testing

```javascript
// Run full evaluation suite
const evaluation = await window.evaluateOrderClassifier();
console.log('Accuracy:', evaluation.testResults.accuracy + '%');
```

## Model Architecture

The custom classifier uses a simple neural network:

```
Input (Text) → Tokenization → Embedding Layer (128d) 
→ Global Average Pooling → Dense Layer (64, ReLU) 
→ Dropout (0.5) → Dense Layer (32, ReLU) 
→ Output Layer (2, Softmax)
```

**Training Parameters:**
- Epochs: 10
- Batch Size: 8
- Optimizer: Adam
- Loss: Categorical Crossentropy
- Train/Validation Split: 80/20

## Adding Training Data

To improve the classifier, add more examples to `training_data.jsonl`:

1. **Order Examples**: Include various order confirmations, invoices, receipts, shipping confirmations
2. **Non-Order Examples**: Include product pages, home pages, account pages, help pages

Example additions:
```jsonl
{"text": "Shipping Confirmation: Your order #ABC123 has been shipped", "label": "order"}
{"text": "Customer Support: How can we help you today?", "label": "non-order"}
{"text": "Digital Receipt: Transaction ID TR789456 Amount: $67.89", "label": "order"}
```

After adding data, retrain the model:
```javascript
await window.retrainOrderClassifier();
```

## Performance Monitoring

### Checking Model Status

```javascript
const status = window.getClassifierStatus();
console.log(status);
// {
//   trained: true,
//   isTraining: false,
//   modelExists: true
// }
```

### Performance Metrics

The evaluation script provides detailed metrics:
- **Accuracy**: Overall percentage of correct predictions
- **Individual Results**: Detailed breakdown of each test case
- **Confidence Scores**: Model confidence for each prediction

## Troubleshooting

### Model Not Training

1. **Check Training Data**: Ensure `training_data.jsonl` is accessible
2. **Browser Storage**: Clear browser storage if needed: `localStorage.clear()`
3. **Memory Issues**: Refresh page if training fails due to memory constraints

### Low Accuracy

1. **Add More Data**: Include more diverse examples in training data
2. **Balance Dataset**: Ensure roughly equal examples of "order" and "non-order"
3. **Quality Check**: Review training data for labeling errors

### Fallback Behavior

If the custom classifier fails, the system automatically falls back to:
1. Zero-shot classification with predefined labels
2. Rule-based extraction as last resort

## Integration with Main Extension

The custom classifier integrates seamlessly with the existing extraction pipeline:

1. **Page Classification**: Determines if a page contains order information
2. **High Confidence**: Proceeds with detailed field extraction
3. **Low Confidence**: Skips extraction or uses fallback methods

## Advanced Usage

### Custom Training Data Sources

You can load training data from different sources:

```javascript
// Custom training data
const customData = [
  {"text": "...", "label": "order"},
  {"text": "...", "label": "non-order"}
];

// Train with custom data
const extractor = window.AutoComplaintExtractor;
await extractor.classifier.trainClassifier(customData);
```

### Model Export/Import

Models are automatically saved to browser's IndexedDB via TensorFlow.js:

```javascript
// Save model manually
await extractor.classifier.saveModel('localstorage://my-custom-model');

// Load model manually  
await extractor.classifier.loadModel('localstorage://my-custom-model');
```

## Next Steps

1. **Collect Real Data**: Use actual order pages encountered by users
2. **A/B Testing**: Compare custom vs zero-shot classifier performance
3. **Field-Level Classification**: Extend to classify specific order fields
4. **Multi-Language Support**: Add training data in different languages

## Support

For issues related to classifier training:
1. Check browser console for error messages
2. Verify training data format
3. Test with simplified examples first
4. Consider clearing browser storage and retraining
