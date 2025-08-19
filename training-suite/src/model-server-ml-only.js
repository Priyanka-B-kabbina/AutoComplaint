#!/usr/bin/env node

/**
 * AutoComplaint Model Server - ML Only
 * 
 * Serves trained ML models via HTTP API for extension integration
 * No rule-based fallbacks - pure ML-based classification and extraction
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
 * Initialize the ML model - no fallbacks
 */
async function initializeModel(modelPath = './models/order-classifier') {
  try {
    console.log(chalk.blue('🔄 Loading ML model for extension API...'));
    
    classifier = new OrderClassifierTrainer();
    const success = await classifier.loadModel(modelPath);
    
    if (success) {
      classifierReady = true;
      console.log(chalk.green('✅ ML model loaded and ready for extension'));
      return true;
    } else {
      console.log(chalk.yellow('⚠️ No trained model found. Training new model...'));
      
      // Try to train a new model with sample data
      try {
        const trainingDataPath = './data/training/training_data.jsonl';
        if (await fs.pathExists(trainingDataPath)) {
          const trainingData = await classifier.loadTrainingData(trainingDataPath);
          console.log(chalk.blue('🎓 Training new ML model...'));
          await classifier.trainWithSamples(trainingData);
          await classifier.saveModel(modelPath);
          classifierReady = true;
          console.log(chalk.green('✅ New ML model trained and ready'));
          return true;
        } else {
          console.log(chalk.red('❌ No training data available - ML models required'));
          return false;
        }
      } catch (trainError) {
        console.error(chalk.red('❌ ML training failed:'), trainError.message);
        return false;
      }
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize ML model:'), error.message);
    return false;
  }
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    classifierReady,
    mlOnly: true,
    timestamp: new Date().toISOString(),
    version: '7.0.0'
  });
});

// Model metadata endpoints for extension
app.get('/models/classifier', (req, res) => {
  if (!classifierReady || !classifier) {
    return res.status(503).json({ 
      error: 'ML classifier not ready',
      message: 'Trained ML models are required for operation'
    });
  }
  
  // Convert vocabulary Map to object for JSON serialization
  const vocabularyObj = {};
  if (classifier.vocabulary) {
    for (const [word, index] of classifier.vocabulary) {
      vocabularyObj[word] = index;
    }
  }
  
  res.json({
    name: 'order-page-classifier',
    version: '1.0.0',
    type: 'binary-classification',
    classes: ['non-order', 'order'],
    confidence_threshold: 0.7,
    ready: true,
    mlOnly: true,
    vocabulary: vocabularyObj,
    maxSequenceLength: classifier.config?.maxSequenceLength || 512,
    vocabularySize: classifier.vocabulary?.size || 0
  });
});

app.get('/models/extractor', (req, res) => {
  res.json({
    name: 'order-information-extractor',
    version: '1.0.0',
    type: 'named-entity-recognition',
    entities: ['orderId', 'productName', 'productValue', 'orderDate', 'deliveryDate', 'sellerName', 'trackingNumber'],
    ready: false,
    mlOnly: true,
    note: 'Specialized NER models required for full extraction'
  });
});

// Classification endpoint - ML only
app.post('/classify', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    if (!classifierReady || !classifier) {
      return res.status(503).json({ 
        error: 'ML classifier not ready',
        message: 'Trained ML models are required for classification'
      });
    }
    
    console.log(chalk.blue('📊 ML classification request'));
    
    // Use ML classifier only - no fallbacks
    const prediction = await classifier.predict(text);
    
    res.json({
      isOrder: prediction.label === 'order',
      confidence: prediction.confidence,
      method: 'ml-classifier',
      details: {
        prediction: prediction.label,
        confidence: prediction.confidence,
        modelVersion: '7.0.0'
      }
    });
    
  } catch (error) {
    console.error(chalk.red('❌ ML classification error:'), error);
    res.status(500).json({ 
      error: 'ML classification failed',
      message: error.message 
    });
  }
});

// Extraction endpoint - ML only
app.post('/extract', async (req, res) => {
  try {
    const { text, url = '' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    if (!classifierReady || !classifier) {
      return res.status(503).json({ 
        error: 'ML extractor not ready',
        message: 'Trained ML models are required for extraction'
      });
    }
    
    console.log(chalk.blue('🔍 ML extraction request'));
    
    // Use ML-based extraction only
    const extractedInfo = await extractOrderInformationML(text, url);
    
    res.json(extractedInfo);
    
  } catch (error) {
    console.error(chalk.red('❌ ML extraction error:'), error);
    res.status(500).json({ 
      error: 'ML extraction failed',
      message: error.message 
    });
  }
});

/**
 * Pure ML-based information extraction
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
    extractionMethod: 'ml-only',
    confidence: 0,
    url: url
  };
  
  try {
    // Require ML classifier for extraction
    if (!classifierReady || !classifier) {
      throw new Error('ML models not available - extraction requires trained models');
    }
    
    // First classify to ensure this is order content
    const classification = await classifier.predict(text);
    extracted.pageClassification = {
      isOrder: classification.label === 'order',
      confidence: classification.confidence
    };
    
    if (classification.label !== 'order' || classification.confidence < 0.6) {
      extracted.confidence = 0;
      extracted.error = 'Content not classified as order page by ML model';
      return extracted;
    }
    
    // TODO: Implement ML-based Named Entity Recognition (NER) for extraction
    // For now, we'll use the classifier confidence as base confidence
    // and indicate that specialized extraction models are needed
    
    extracted.confidence = classification.confidence * 0.5; // Reduced since we don't have full extraction yet
    extracted.note = 'Full ML-based extraction requires specialized NER models - please train extraction models';
    
    // Placeholder for future ML extraction models:
    // - Order ID extraction model (NER for order identifiers)
    // - Product name extraction model (NER for product entities)
    // - Price extraction model (NER for monetary values)
    // - Date extraction model (NER for temporal entities)
    // - Seller name extraction model (NER for seller entities)
    // - Tracking number extraction model (NER for tracking identifiers)
    
    console.log(chalk.green('✅ ML extraction completed with confidence:'), extracted.confidence);
    return extracted;
    
  } catch (error) {
    console.error(chalk.red('❌ ML extraction processing error:'), error);
    throw error; // Don't fallback - require ML models
  }
}

// Legacy API endpoints for backward compatibility
app.get('/predict', async (req, res) => {
  const { text } = req.query;
  if (!text) {
    return res.status(400).json({ error: 'Text parameter is required' });
  }
  
  if (!classifierReady || !classifier) {
    return res.status(503).json({ error: 'ML classifier not ready' });
  }
  
  try {
    const result = await classifier.predict(text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Training endpoint
app.post('/train', async (req, res) => {
  try {
    const { samples, epochs = 10 } = req.body;
    
    if (!samples || !Array.isArray(samples)) {
      return res.status(400).json({ error: 'Training samples are required' });
    }
    
    console.log(chalk.blue(`🎓 Training with ${samples.length} samples for ${epochs} epochs`));
    
    if (!classifier) {
      classifier = new OrderClassifierTrainer();
    }
    
    await classifier.trainWithSamples(samples, epochs);
    classifierReady = true;
    
    res.json({ 
      message: 'Training completed successfully',
      samples: samples.length,
      epochs 
    });
    
  } catch (error) {
    console.error(chalk.red('❌ Training error:'), error);
    res.status(500).json({ error: error.message });
  }
});

// Model persistence endpoints
app.post('/save-model', async (req, res) => {
  try {
    if (!classifierReady || !classifier) {
      return res.status(503).json({ error: 'No trained model to save' });
    }
    
    const { path: modelPath = './models/order-classifier' } = req.body;
    await classifier.saveModel(modelPath);
    
    res.json({ message: 'Model saved successfully', path: modelPath });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/load-model', async (req, res) => {
  try {
    const { path: modelPath = './models/order-classifier' } = req.body;
    
    if (!classifier) {
      classifier = new OrderClassifierTrainer();
    }
    
    const success = await classifier.loadModel(modelPath);
    classifierReady = success;
    
    if (success) {
      res.json({ message: 'Model loaded successfully', path: modelPath });
    } else {
      res.status(404).json({ error: 'Model not found', path: modelPath });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function startServer() {
  try {
    console.log(chalk.cyan('🚀 Starting AutoComplaint ML Model Server...'));
    
    // Initialize ML model
    await initializeModel();
    
    app.listen(PORT, () => {
      console.log(chalk.green(`✅ ML Model Server running on port ${PORT}`));
      console.log(chalk.blue(`🔗 Health check: http://localhost:${PORT}/health`));
      console.log(chalk.blue(`📊 Classification: POST http://localhost:${PORT}/classify`));
      console.log(chalk.blue(`🔍 Extraction: POST http://localhost:${PORT}/extract`));
      console.log(chalk.yellow('⚠️  ML-only mode: No rule-based fallbacks'));
    });
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to start server:'), error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log(chalk.yellow('🔄 Received SIGTERM, shutting down gracefully...'));
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('🔄 Received SIGINT, shutting down gracefully...'));
  process.exit(0);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, startServer };
