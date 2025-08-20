# AutoComplaint ML Training Requirements

## Current Issues Found in Code Review

### 1. Critical: No Trained Models
- Architecture is correct but no actual models exist
- Need to create training data and train models

### 2. Training Data Requirements
Create: `/training-suite/data/training/training_data.jsonl`

Example format:
```jsonl
{"text": "Order #12345 for iPhone 14 Pro Total: $999.99 Delivery Date: Jan 15, 2024", "label": "order"}
{"text": "Search results for smartphones - 1,234 products found", "label": "non-order"}
{"text": "Your order has been confirmed Order ID: AMZ-789456123 Product: MacBook Pro", "label": "order"}
{"text": "About Us - We are a leading technology company founded in 1995", "label": "non-order"}
```

### 3. Training Steps
```bash
cd training-suite
npm install
node src/trainer.js --train --data ./data/training/training_data.jsonl
```

### 4. NER Models Still Needed
Current extraction only does classification. Need separate models for:
- Order ID extraction
- Product name extraction  
- Price extraction
- Date extraction
- Seller extraction
- Tracking number extraction

## Next Priority Actions

1. **Immediate**: Create sample training data
2. **Train**: Basic order classifier  
3. **Test**: End-to-end ML pipeline
4. **Implement**: NER models for extraction
5. **Production**: Deploy with real trained models

## Architecture Grade: B+
- ✅ Correct ML-only architecture
- ✅ Proper separation of concerns
- ✅ No rule-based fallbacks
- ❌ Missing actual trained models
- ⚠️  Tokenization needs vocabulary consistency
- ⚠️  Extraction incomplete (classification only)
