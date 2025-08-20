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

// NER imports - Using compromise.js for lightweight NER
import nlp from 'compromise';

// Note: compromise plugins for dates and numbers are built-in for basic functionality

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

// Simple prediction endpoint - let extension handle extraction logic
app.post('/predict-entities', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    console.log(chalk.blue('🔍 Entity prediction request'));
    
    // Only provide basic NER predictions - let extension handle extraction
    const predictions = await predictEntities(text);
    
    res.json(predictions);
    
  } catch (error) {
    console.error(chalk.red('❌ Prediction error:'), error);
    res.status(500).json({ error: 'Prediction failed' });
  }
});

/**
 * Simple entity prediction - returns raw NER entities for extension to process
 * Training-suite should only provide ML predictions, not business logic
 */
async function predictEntities(text) {
  try {
    console.log(chalk.blue('🧠 Predicting entities for text length:'), text.length);
    
    // Initialize compromise NLP for basic NER
    const doc = nlp(text);
    
    // Extract basic entities using compromise.js
    const entities = {
      people: doc.people().out('array'),
      places: doc.places().out('array'),
      organizations: doc.organizations().out('array'),
      dates: doc.dates().out('array'),
      money: doc.money().out('array'),
      phoneNumbers: doc.phoneNumbers().out('array'),
      emails: doc.emails().out('array'),
      urls: doc.urls().out('array'),
      nouns: doc.nouns().out('array').slice(0, 20), // Limit for performance
      numbers: doc.numbers().out('array')
    };
    
    console.log(chalk.green('✅ Basic NER entities extracted'));
    
    return {
      entities,
      timestamp: new Date().toISOString(),
      textLength: text.length,
      processingMethod: 'compromise-js-ner'
    };
    
  } catch (error) {
    console.error(chalk.red('❌ Entity prediction error:'), error);
    return {
      entities: {},
      error: error.message,
      timestamp: new Date().toISOString()
    };
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
