#!/usr/bin/env node

/**
 * AutoComplaint Model Server - Simplified
 * 
 * Serves ML models via HTTP API for extension integration (without TensorFlow)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Simple in-memory model (for demo purposes)
let modelReady = true;

console.log('🚀 AutoComplaint Model Server (Simplified) starting...');

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    classifierReady: modelReady,
    timestamp: new Date().toISOString(),
    version: '7.0.0-simplified'
  });
});

// Model metadata endpoints for extension
app.get('/models/classifier', (req, res) => {
  res.json({
    name: 'order-page-classifier-simple',
    version: '1.0.0',
    type: 'rule-based-enhanced',
    classes: ['non-order', 'order'],
    confidence_threshold: 0.7,
    ready: true
  });
});

app.get('/models/extractor', (req, res) => {
  res.json({
    name: 'order-info-extractor-simple', 
    version: '1.0.0',
    type: 'pattern-matching-enhanced',
    fields: ['orderId', 'productName', 'productValue', 'orderDate', 'sellerName'],
    ready: true
  });
});

// Classification endpoint for extension
app.post('/classify', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    console.log('📊 Extension classification request');
    
    // Enhanced rule-based classification
    const result = classifyTextEnhanced(text);
    
    res.json({
      prediction: result.isOrder ? 'order' : 'non-order',
      confidence: result.confidence,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Classification error:', error);
    res.status(500).json({ error: 'Classification failed' });
  }
});

// Information extraction endpoint for extension
app.post('/extract', async (req, res) => {
  try {
    const { text, url } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    console.log('🔍 Extension extraction request for:', url || 'unknown URL');
    
    // Enhanced pattern-based extraction
    const extractedInfo = extractOrderInformationEnhanced(text, url);
    
    res.json(extractedInfo);
    
  } catch (error) {
    console.error('❌ Extraction error:', error);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

/**
 * Enhanced rule-based classification
 */
function classifyTextEnhanced(text) {
  const normalizedText = text.toLowerCase();
  
  // Strong order indicators
  const strongOrderIndicators = [
    /order\s*(number|id|#)\s*:?\s*[a-z0-9\-]+/i,
    /invoice\s*(number|id|#)\s*:?\s*[a-z0-9\-]+/i,
    /confirmation\s*(number|id|#)\s*:?\s*[a-z0-9\-]+/i,
    /receipt\s*(number|id|#)\s*:?\s*[a-z0-9\-]+/i,
    /order\s*placed/i,
    /order\s*confirmed/i,
    /payment\s*successful/i,
    /order\s*summary/i
  ];
  
  // Medium order indicators
  const mediumOrderIndicators = [
    /total\s*[:=]\s*[\$₹£€¥]\s*[\d,]+/i,
    /subtotal\s*[:=]\s*[\$₹£€¥]\s*[\d,]+/i,
    /delivery\s*date/i,
    /shipping\s*address/i,
    /order\s*status/i,
    /tracking\s*(number|id)/i
  ];
  
  // Weak order indicators
  const weakOrderIndicators = [
    /order/i,
    /invoice/i,
    /receipt/i,
    /purchase/i,
    /transaction/i,
    /payment/i
  ];
  
  // Non-order indicators (negative signals)
  const nonOrderIndicators = [
    /product\s*details/i,
    /add\s*to\s*cart/i,
    /buy\s*now/i,
    /product\s*reviews/i,
    /frequently\s*bought/i,
    /recommended\s*for\s*you/i,
    /search\s*results/i,
    /category/i,
    /browse/i
  ];
  
  let score = 0;
  let matchedIndicators = [];
  
  // Check strong indicators
  for (const pattern of strongOrderIndicators) {
    if (pattern.test(normalizedText)) {
      score += 0.4;
      matchedIndicators.push('strong');
    }
  }
  
  // Check medium indicators
  for (const pattern of mediumOrderIndicators) {
    if (pattern.test(normalizedText)) {
      score += 0.2;
      matchedIndicators.push('medium');
    }
  }
  
  // Check weak indicators
  for (const pattern of weakOrderIndicators) {
    if (pattern.test(normalizedText)) {
      score += 0.1;
      matchedIndicators.push('weak');
    }
  }
  
  // Check negative indicators
  for (const pattern of nonOrderIndicators) {
    if (pattern.test(normalizedText)) {
      score -= 0.15;
      matchedIndicators.push('negative');
    }
  }
  
  // URL-based scoring
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  if (currentUrl.includes('order') || currentUrl.includes('invoice') || currentUrl.includes('receipt')) {
    score += 0.3;
    matchedIndicators.push('url');
  }
  
  // Normalize score to 0-1 range
  const confidence = Math.max(0, Math.min(1, score));
  const isOrder = confidence >= 0.5;
  
  return {
    isOrder,
    confidence: isOrder ? confidence : (1 - confidence),
    matchedIndicators,
    method: 'enhanced-rules'
  };
}

/**
 * Enhanced pattern-based information extraction
 */
function extractOrderInformationEnhanced(text, url = '') {
  const extracted = {
    orderId: '',
    productName: '',
    productValue: '',
    orderDate: '',
    deliveryDate: '',
    sellerName: '',
    trackingNumber: '',
    customerDetails: {},
    extractionMethod: 'enhanced-patterns',
    confidence: 0,
    url: url
  };
  
  try {
    // Order ID extraction with comprehensive patterns
    const orderIdPatterns = [
      /order\s*(?:number|id|#)?\s*:?\s*([A-Z0-9\-]{5,})/gi,
      /invoice\s*(?:number|id|#)?\s*:?\s*([A-Z0-9\-]{5,})/gi,
      /confirmation\s*(?:number|id|#)?\s*:?\s*([A-Z0-9\-]{5,})/gi,
      /receipt\s*(?:number|id|#)?\s*:?\s*([A-Z0-9\-]{5,})/gi,
      /transaction\s*(?:id|ref)?\s*:?\s*([A-Z0-9\-]{5,})/gi
    ];
    
    for (const pattern of orderIdPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        extracted.orderId = matches[0][1];
        extracted.confidence += 0.25;
        break;
      }
    }
    
    // Enhanced price extraction
    const pricePatterns = [
      /(?:total|grand\s*total|amount|subtotal)\s*:?\s*([\$₹£€¥]\s*[\d,]+\.?\d*)/gi,
      /(?:rs|inr|usd|eur|gbp|₹|\$|£|€)\s*[\.\s]?\s*([\d,]+\.?\d*)/gi
    ];
    
    for (const pattern of pricePatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        extracted.productValue = matches[0][0];
        extracted.confidence += 0.2;
        break;
      }
    }
    
    // Product name extraction
    const productPatterns = [
      /(?:product|item)\s*(?:name|title)?\s*:?\s*([^\n]{10,100})/gi,
      /<h1[^>]*>([^<]{10,100})<\/h1>/gi,
      /<title[^>]*>([^<]{10,100})</gi
    ];
    
    for (const pattern of productPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const productName = matches[0][1].trim();
        if (productName.length >= 10 && productName.length <= 100) {
          extracted.productName = productName;
          extracted.confidence += 0.15;
          break;
        }
      }
    }
    
    // Date extraction
    const datePatterns = [
      /(?:order|purchase|invoice)\s*date\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/gi,
      /(?:order|purchase|invoice)\s*date\s*:?\s*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/gi
    ];
    
    for (const pattern of datePatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        extracted.orderDate = matches[0][1];
        extracted.confidence += 0.15;
        break;
      }
    }
    
    // Seller extraction
    const sellerPatterns = [
      /(?:sold|shipped)\s*by\s*:?\s*([^\n]{3,50})/gi,
      /seller\s*:?\s*([^\n]{3,50})/gi,
      /brand\s*:?\s*([^\n]{3,50})/gi
    ];
    
    for (const pattern of sellerPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        extracted.sellerName = matches[0][1].trim();
        extracted.confidence += 0.1;
        break;
      }
    }
    
    // Tracking number
    const trackingPatterns = [
      /tracking\s*(?:number|id)\s*:?\s*([A-Z0-9]{8,})/gi
    ];
    
    for (const pattern of trackingPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        extracted.trackingNumber = matches[0][1];
        extracted.confidence += 0.1;
        break;
      }
    }
    
    // Normalize confidence
    extracted.confidence = Math.min(1.0, extracted.confidence);
    
    console.log('✅ Enhanced extraction completed with confidence:', extracted.confidence);
    return extracted;
    
  } catch (error) {
    console.error('❌ Extraction processing error:', error);
    extracted.error = error.message;
    return extracted;
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AutoComplaint Model Server running on http://localhost:${PORT}`);
  console.log(`📊 Model ready: ${modelReady}`);
  console.log(`🔗 Extension API: http://localhost:${PORT}/classify`);
  console.log(`🔍 Extraction API: http://localhost:${PORT}/extract`);
});

export default app;
