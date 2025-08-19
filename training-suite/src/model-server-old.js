#!/usr/bin/env node

/**
 * AutoComplaint Model Server
 * 
 * Serves trained models via HTTP API for testing and integration
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { OrderClassifierTrainer } from './classifier.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('web'));

// Global model instance
let classifier = null;

/**
 * Initialize the model
 */
async function initializeModel(modelPath = './models/order-classifier') {
  try {
    console.log(chalk.blue('🔄 Loading model...'));
    
    classifier = new OrderClassifierTrainer();
    const success = await classifier.loadModel(modelPath);
    
    if (success) {
      console.log(chalk.green('✅ Model loaded successfully'));
      return true;
    } else {
      console.log(chalk.yellow('⚠️ No model found. Please train a model first.'));
      return false;
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to load model:'), error.message);
    return false;
  }
}

// API Routes

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    model: classifier ? 'loaded' : 'not loaded',
    vocabulary: classifier?.vocabulary ? classifier.vocabulary.size : 0,
    timestamp: new Date().toISOString()
  });
});

/**
 * Model info endpoint
 */
app.get('/api/model-info', (req, res) => {
  if (!classifier) {
    return res.status(503).json({ error: 'Model not loaded' });
  }
  
  res.json({
    config: classifier.config,
    vocabularySize: classifier.vocabulary.size,
    trainingHistory: classifier.trainingHistory,
    modelPath: classifier.modelPath
  });
});

/**
 * Single prediction endpoint
 */
app.post('/api/predict', async (req, res) => {
  if (!classifier) {
    return res.status(503).json({ error: 'Model not loaded' });
  }
  
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text field is required and must be a string' });
    }
    
    const result = await classifier.predict(text);
    res.json({
      success: true,
      prediction: result,
      metadata: {
        textLength: text.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Batch prediction endpoint
 */
app.post('/api/predict-batch', async (req, res) => {
  if (!classifier) {
    return res.status(503).json({ error: 'Model not loaded' });
  }
  
  try {
    const { texts } = req.body;
    
    if (!Array.isArray(texts)) {
      return res.status(400).json({ error: 'texts field must be an array' });
    }
    
    if (texts.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 texts per batch' });
    }
    
    const predictions = [];
    for (const text of texts) {
      const result = await classifier.predict(text);
      predictions.push(result);
    }
    
    res.json({
      success: true,
      predictions,
      metadata: {
        batchSize: texts.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Batch prediction error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Evaluate endpoint (for test data)
 */
app.post('/api/evaluate', async (req, res) => {
  if (!classifier) {
    return res.status(503).json({ error: 'Model not loaded' });
  }
  
  try {
    const { data } = req.body;
    
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'data field must be an array of {text, label} objects' });
    }
    
    const evaluation = await classifier.evaluate(data);
    const detailedTest = await classifier.detailedTest(data);
    
    res.json({
      success: true,
      evaluation,
      detailedTest,
      metadata: {
        testSize: data.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Serve model files for download/integration
 */
app.use('/models', express.static('./models'));

/**
 * Load new model endpoint
 */
app.post('/api/load-model', async (req, res) => {
  try {
    const { modelPath } = req.body;
    
    if (!modelPath) {
      return res.status(400).json({ error: 'modelPath is required' });
    }
    
    const success = await initializeModel(modelPath);
    
    if (success) {
      res.json({ success: true, message: 'Model loaded successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to load model' });
    }
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * List available models
 */
app.get('/api/models', async (req, res) => {
  try {
    const modelsDir = './models';
    
    if (!await fs.pathExists(modelsDir)) {
      return res.json({ models: [] });
    }
    
    const items = await fs.readdir(modelsDir);
    const models = [];
    
    for (const item of items) {
      const itemPath = path.join(modelsDir, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        const modelJsonPath = path.join(itemPath, 'model.json');
        const metadataPath = path.join(itemPath, 'metadata.json');
        
        if (await fs.pathExists(modelJsonPath)) {
          let metadata = { name: item };
          
          if (await fs.pathExists(metadataPath)) {
            try {
              const meta = await fs.readJSON(metadataPath);
              metadata = { ...metadata, ...meta };
            } catch (e) {
              // Ignore metadata parsing errors
            }
          }
          
          models.push({
            name: item,
            path: itemPath,
            metadata,
            size: stat.size,
            modified: stat.mtime
          });
        }
      }
    }
    
    res.json({ models });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint not found' 
  });
});

/**
 * Start the server
 */
async function startServer() {
  console.log(chalk.bold.blue('🌐 AutoComplaint Model Server'));
  console.log(chalk.blue('=' .repeat(40)));
  
  // Try to load default model
  await initializeModel();
  
  app.listen(PORT, () => {
    console.log(chalk.green(`✅ Server running on http://localhost:${PORT}`));
    console.log(chalk.cyan('📡 API Endpoints:'));
    console.log(chalk.cyan(`  GET  /api/health - Health check`));
    console.log(chalk.cyan(`  GET  /api/model-info - Model information`));
    console.log(chalk.cyan(`  POST /api/predict - Single prediction`));
    console.log(chalk.cyan(`  POST /api/predict-batch - Batch predictions`));
    console.log(chalk.cyan(`  POST /api/evaluate - Evaluate on test data`));
    console.log(chalk.cyan(`  GET  /api/models - List available models`));
    console.log(chalk.cyan(`  POST /api/load-model - Load different model`));
    console.log(chalk.cyan(`  GET  /models/* - Download model files`));
    console.log(chalk.blue(''));
    console.log(chalk.yellow('💡 Example usage:'));
    console.log(chalk.yellow('curl -X POST http://localhost:3000/api/predict \\'));
    console.log(chalk.yellow('  -H "Content-Type: application/json" \\'));
    console.log(chalk.yellow('  -d \'{"text":"Order #123 Total: $99.99"}\''));
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.blue('\\n🛑 Shutting down server...'));
  process.exit(0);
});

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(console.error);
}

export { app, startServer, initializeModel };
