#!/usr/bin/env node

/**
 * AutoComplaint Model Server
 * 
 * Serves trained models via HTTP API for extension integration
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { OrderClassifierTrainer } from './classifier.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('web'));

// Global model instance
let classifier = null;
let classifierReady = false;

/**
 * Initialize the model
 */
async function initializeModel(modelPath = './models/order-classifier') {
  try {
    console.log(chalk.blue('🔄 Loading model for extension API...'));
    
    classifier = new OrderClassifierTrainer();
    const success = await classifier.loadModel(modelPath);
    
    if (success) {
      classifierReady = true;
      console.log(chalk.green('✅ Model loaded and ready for extension'));
      return true;
    } else {
      console.log(chalk.yellow('⚠️ No model found. Training new model...'));
      
      // Try to train a new model with sample data
      try {
        const trainingDataPath = './data/training/training_data.jsonl';
        if (await fs.pathExists(trainingDataPath)) {
          const trainingData = await classifier.loadTrainingData(trainingDataPath);
          console.log(chalk.blue('🎓 Training new model...'));
          await classifier.trainWithSamples(trainingData);
          await classifier.saveModel(modelPath);
          classifierReady = true;
          console.log(chalk.green('✅ New model trained and ready'));
          return true;
        } else {
          console.log(chalk.red('❌ No training data available'));
          return false;
        }
      } catch (trainError) {
        console.error(chalk.red('❌ Training failed:'), trainError.message);
        return false;
      }
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize model:'), error.message);
    return false;
  }
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    classifierReady,
    timestamp: new Date().toISOString(),
    version: '7.0.0'
  });
});

// Model metadata endpoints for extension
app.get('/models/classifier', (req, res) => {
  if (!classifierReady || !classifier) {
    return res.status(503).json({ error: 'Classifier not ready' });
  }
  
  res.json({
    name: 'order-page-classifier',
    version: '1.0.0',
    type: 'binary-classification',
    classes: ['non-order', 'order'],
    confidence_threshold: 0.7,
    ready: true
  });
});

app.get('/models/extractor', (req, res) => {
  res.json({
    name: 'order-info-extractor', 
    version: '1.0.0',
    type: 'information-extraction',
    fields: ['orderId', 'productName', 'productValue', 'orderDate', 'sellerName'],
    ready: true
  });
});

// Classification endpoint for extension
app.post('/classify', async (req, res) => {
  try {
    if (!classifierReady || !classifier) {
      return res.status(503).json({ error: 'Classifier not ready' });
    }
    
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    console.log(chalk.blue('📊 Extension classification request'));
    
    const result = await classifier.predict(text);
    
    res.json({
      prediction: result.label,
      confidence: result.confidence,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(chalk.red('❌ Classification error:'), error);
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
    
    console.log(chalk.blue('🔍 Extension extraction request'));
    
    // Use enhanced ML extraction
    const extractedInfo = await extractOrderInformationML(text, url);
    
    res.json(extractedInfo);
    
  } catch (error) {
    console.error(chalk.red('❌ Extraction error:'), error);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

/**
 * Enhanced ML-based information extraction
 */
async function extractOrderInformationML(text, url = '') {
  const extracted = {
    orderId: '',
    productName: '',
    productValue: '',
    orderDate: '',
    deliveryDate: '',
    sellerName: '',
    trackingNumber: '',
    customerDetails: {},
    extractionMethod: 'ml-server-enhanced',
    confidence: 0,
    url: url
  };
  
  try {
    // Use classifier for initial text analysis if available
    if (classifierReady && classifier) {
      const classification = await classifier.predict(text);
      extracted.pageClassification = {
        isOrder: classification.label === 'order',
        confidence: classification.confidence
      };
    }
    
    // Enhanced pattern matching with ML guidance
    
    // Order ID extraction - more comprehensive patterns
    const orderIdPatterns = [
      /order\s*#?\s*:?\s*([A-Z0-9-]{5,})/gi,
      /order\s*number\s*:?\s*([A-Z0-9-]{5,})/gi,
      /order\s*id\s*:?\s*([A-Z0-9-]{5,})/gi,
      /invoice\s*#?\s*:?\s*([A-Z0-9-]{5,})/gi,
      /confirmation\s*#?\s*:?\s*([A-Z0-9-]{5,})/gi,
      /receipt\s*#?\s*:?\s*([A-Z0-9-]{5,})/gi,
      /transaction\s*id\s*:?\s*([A-Z0-9-]{5,})/gi
    ];
    
    let bestOrderIdMatch = null;
    let maxOrderIdScore = 0;
    
    for (const pattern of orderIdPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        // Score based on context and pattern strength
        let score = 0.5;
        if (match[0].toLowerCase().includes('order')) score += 0.3;
        if (match[0].toLowerCase().includes('invoice')) score += 0.2;
        if (match[1].length >= 8) score += 0.2;
        
        if (score > maxOrderIdScore) {
          maxOrderIdScore = score;
          bestOrderIdMatch = match[1];
        }
      }
    }
    
    if (bestOrderIdMatch) {
      extracted.orderId = bestOrderIdMatch;
      extracted.confidence += 0.25;
    }
    
    // Product name extraction with context awareness
    const productPatterns = [
      /(?:product|item)\s*name\s*:?\s*([^\\n]{10,100})/gi,
      /(?:product|item)\s*:?\s*([^\\n]{10,100})/gi,
      /<h1[^>]*>([^<]{10,100})<\/h1>/gi,
      /<h2[^>]*>([^<]{10,100})<\/h2>/gi
    ];
    
    for (const pattern of productPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        extracted.productName = matches[0][1].trim();
        extracted.confidence += 0.15;
        break;
      }
    }
    
    // Enhanced price extraction
    const pricePatterns = [
      /(?:total|subtotal|amount|price|cost)\s*:?\s*([\$₹£€¥]\s*[\d,]+\.?\d*)/gi,
      /(?:rs|inr|usd|eur|gbp)\s*[\.\s]?\s*([\d,]+\.?\d*)/gi,
      /([\$₹£€¥]\s*[\d,]+\.?\d*)/g
    ];
    
    let bestPriceMatch = null;
    let maxPriceScore = 0;
    
    for (const pattern of pricePatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        let score = 0.3;
        if (match[0].toLowerCase().includes('total')) score += 0.4;
        if (match[0].toLowerCase().includes('subtotal')) score += 0.3;
        if (match[0].toLowerCase().includes('amount')) score += 0.2;
        
        if (score > maxPriceScore) {
          maxPriceScore = score;
          bestPriceMatch = match[0];
        }
      }
    }
    
    if (bestPriceMatch) {
      extracted.productValue = bestPriceMatch;
      extracted.confidence += 0.2;
    }
    
    // Date extraction with multiple formats
    const datePatterns = [
      /order\s*date\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/gi,
      /order\s*date\s*:?\s*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/gi,
      /(?:placed|ordered|confirmed)\s*on\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/gi,
      /(?:placed|ordered|confirmed)\s*on\s*:?\s*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/gi,
      /(\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})/gi
    ];
    
    for (const pattern of datePatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        extracted.orderDate = matches[0][1];
        extracted.confidence += 0.15;
        break;
      }
    }
    
    // Seller extraction with enhanced patterns
    const sellerPatterns = [
      /(?:sold|shipped)\s*by\s*:?\s*([^\\n]{3,50})/gi,
      /seller\s*:?\s*([^\\n]{3,50})/gi,
      /brand\s*:?\s*([^\\n]{3,50})/gi,
      /manufacturer\s*:?\s*([^\\n]{3,50})/gi
    ];
    
    for (const pattern of sellerPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        extracted.sellerName = matches[0][1].trim();
        extracted.confidence += 0.1;
        break;
      }
    }
    
    // Tracking number extraction
    const trackingPatterns = [
      /(?:tracking|shipment)\s*(?:number|id)\s*:?\s*([A-Z0-9]{8,})/gi,
      /track(?:ing)?\s*:?\s*([A-Z0-9]{8,})/gi
    ];
    
    for (const pattern of trackingPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        extracted.trackingNumber = matches[0][1];
        extracted.confidence += 0.1;
        break;
      }
    }
    
    // Delivery date extraction
    const deliveryPatterns = [
      /(?:delivery|shipping)\s*date\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/gi,
      /(?:delivery|shipping)\s*date\s*:?\s*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/gi,
      /(?:estimated|expected)\s*delivery\s*:?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/gi,
      /(?:estimated|expected)\s*delivery\s*:?\s*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/gi
    ];
    
    for (const pattern of deliveryPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        extracted.deliveryDate = matches[0][1];
        extracted.confidence += 0.1;
        break;
      }
    }
    
    // Customer details extraction
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const phonePattern = /(?:phone|mobile|tel)\s*:?\s*([\+\d\s\-\(\)]{10,})/gi;
    
    const emailMatches = [...text.matchAll(emailPattern)];
    if (emailMatches.length > 0) {
      extracted.customerDetails.email = emailMatches[0][1];
      extracted.confidence += 0.05;
    }
    
    const phoneMatches = [...text.matchAll(phonePattern)];
    if (phoneMatches.length > 0) {
      extracted.customerDetails.phone = phoneMatches[0][1].trim();
      extracted.confidence += 0.05;
    }
    
    // Normalize confidence to 0-1 range
    extracted.confidence = Math.min(1.0, extracted.confidence);
    
    console.log(chalk.green('✅ ML extraction completed with confidence:'), extracted.confidence);
    return extracted;
    
  } catch (error) {
    console.error(chalk.red('❌ ML extraction processing error:'), error);
    extracted.error = error.message;
    return extracted;
  }
}

// Legacy API endpoints for backward compatibility
app.get('/predict', async (req, res) => {
  const { text } = req.query;
  if (!text) {
    return res.status(400).json({ error: 'Text parameter is required' });
  }
  
  try {
    const result = await classifier.predict(text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/train', async (req, res) => {
  try {
    const { samples, epochs = 10 } = req.body;
    
    if (!samples || !Array.isArray(samples)) {
      return res.status(400).json({ error: 'Training samples are required' });
    }
    
    console.log(chalk.blue(`🎓 Training with ${samples.length} samples`));
    
    if (!classifier) {
      classifier = new OrderClassifierTrainer();
    }
    
    await classifier.trainWithSamples(samples, { epochs });
    await classifier.saveModel('./models/order-classifier');
    
    classifierReady = true;
    
    res.json({
      success: true,
      message: 'Model trained successfully',
      samples: samples.length
    });
    
  } catch (error) {
    console.error(chalk.red('❌ Training error:'), error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/evaluate', async (req, res) => {
  try {
    const { testSamples } = req.body;
    
    if (!testSamples || !Array.isArray(testSamples)) {
      return res.status(400).json({ error: 'Test samples are required' });
    }
    
    if (!classifierReady || !classifier) {
      return res.status(503).json({ error: 'Model not ready' });
    }
    
    const results = await classifier.evaluate(testSamples);
    res.json(results);
    
  } catch (error) {
    console.error(chalk.red('❌ Evaluation error:'), error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function startServer() {
  try {
    await initializeModel();
    
    app.listen(PORT, () => {
      console.log(chalk.green(`🚀 AutoComplaint Model Server running on http://localhost:${PORT}`));
      console.log(chalk.blue(`📊 Classifier ready: ${classifierReady}`));
      console.log(chalk.blue(`🌐 Web interface: http://localhost:${PORT}`));
      console.log(chalk.blue(`🔗 Extension API: http://localhost:${PORT}/classify`));
    });
  } catch (error) {
    console.error(chalk.red('❌ Failed to start server:'), error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
