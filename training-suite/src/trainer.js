#!/usr/bin/env node

/**
 * AutoComplaint Training Suite - Main Training Script
 * 
 * Usage:
 *   npm run train
 *   npm run train -- --data ./data/training.jsonl --epochs 30
 *   npm run train -- --config ./custom-config.json
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { OrderClassifierTrainer } from './classifier.js';

const program = new Command();

program
  .name('autocomplaint-trainer')
  .description('AutoComplaint ML Model Training Suite')
  .version('1.0.0')
  .option('-d, --data <path>', 'path to training data (JSONL format)', './data/training.jsonl')
  .option('-o, --output <path>', 'output directory for trained model', './models/order-classifier')
  .option('-c, --config <path>', 'path to training configuration file')
  .option('-e, --epochs <number>', 'number of training epochs', '20')
  .option('-b, --batch-size <number>', 'batch size for training', '32')
  .option('-v, --validation-split <number>', 'validation split ratio', '0.2')
  .option('--interactive', 'run in interactive mode')
  .option('--evaluate', 'evaluate model after training')
  .option('--serve', 'start model server after training')
  .parse();

const options = program.opts();

async function main() {
  console.log(chalk.bold.blue('🤖 AutoComplaint Training Suite'));
  console.log(chalk.blue('=' .repeat(50)));
  
  try {
    // Load configuration
    let config = {};
    
    if (options.config) {
      console.log(chalk.blue(`📋 Loading config from ${options.config}...`));
      config = await fs.readJSON(options.config);
    }
    
    // Override config with command line options
    if (options.epochs) config.epochs = parseInt(options.epochs);
    if (options.batchSize) config.batchSize = parseInt(options.batchSize);
    if (options.validationSplit) config.validationSplit = parseFloat(options.validationSplit);
    
    // Interactive mode
    if (options.interactive) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'modelName',
          message: 'Model name:',
          default: 'order-classifier'
        },
        {
          type: 'number',
          name: 'epochs',
          message: 'Number of epochs:',
          default: 20
        },
        {
          type: 'number',
          name: 'batchSize',
          message: 'Batch size:',
          default: 32
        },
        {
          type: 'number',
          name: 'learningRate',
          message: 'Learning rate:',
          default: 0.001
        },
        {
          type: 'confirm',
          name: 'evaluate',
          message: 'Evaluate model after training?',
          default: true
        }
      ]);
      
      Object.assign(config, answers);
      options.evaluate = answers.evaluate;
    }
    
    // Initialize trainer
    const trainer = new OrderClassifierTrainer(config);
    
    // Check if training data exists
    if (!await fs.pathExists(options.data)) {
      console.log(chalk.yellow(`⚠️ Training data not found at ${options.data}`));
      console.log(chalk.blue('📝 Creating sample training data...'));
      await createSampleData(options.data);
    }
    
    // Load training data
    const trainingData = await trainer.loadTrainingData(options.data);
    
    // Split data for validation if needed
    let trainData = trainingData;
    let validationData = null;
    
    if (options.validationSplit && parseFloat(options.validationSplit) > 0) {
      const splitIndex = Math.floor(trainingData.length * (1 - parseFloat(options.validationSplit)));
      trainData = trainingData.slice(0, splitIndex);
      validationData = trainingData.slice(splitIndex);
      
      console.log(chalk.cyan(`📊 Data split: ${trainData.length} training, ${validationData.length} validation`));
    }
    
    // Train model
    console.log(chalk.blue('🚀 Starting training...'));
    const history = await trainer.trainModel(trainData, validationData);
    
    // Save model
    const modelPath = await trainer.saveModel(options.output);
    
    // Evaluation
    if (options.evaluate && validationData) {
      console.log(chalk.blue('🔍 Running evaluation...'));
      const evaluation = await trainer.evaluate(validationData);
      const detailedTest = await trainer.detailedTest(validationData.slice(0, 10)); // Test first 10 examples
      
      console.log(chalk.green('📈 Evaluation Complete'));
    }
    
    // Create export for extension
    await createExtensionExport(trainer, modelPath);
    
    console.log(chalk.green('🎉 Training completed successfully!'));
    console.log(chalk.cyan(`📁 Model saved to: ${modelPath}`));
    console.log(chalk.cyan(`🔧 Extension files ready in: ${modelPath}/extension-export/`));
    
    // Start server if requested
    if (options.serve) {
      console.log(chalk.blue('🌐 Starting model server...'));
      await startModelServer(trainer);
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Training failed:'), error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Create sample training data if none exists
 */
async function createSampleData(dataPath) {
  const sampleData = [
    {"text": "Order #AMZ-123456 Total: $49.99 Delivery Date: March 15, 2024 Product: Wireless Headphones", "label": "order"},
    {"text": "Invoice #INV-789012 Amount: ₹2,999 GST: ₹359.88 Total: ₹3,358.88 Date: 10 Jan 2024", "label": "order"},
    {"text": "Your order has been shipped! Tracking: 1Z999AA1234567890 Expected delivery: Tomorrow", "label": "order"},
    {"text": "Order Confirmation Order Number: 12345-ABCDE Date Placed: February 28, 2024 Total Amount: $127.50", "label": "order"},
    {"text": "Tax Invoice Invoice No: TI/2024/001234 Date: 15/03/2024 Billed To: John Doe", "label": "order"},
    {"text": "Receipt Order #98765 Date: March 20, 2024 Customer: Jane Smith Item: Smartphone Case", "label": "order"},
    {"text": "Order Summary Order ID: DEF-789123 Status: Delivered Total: €45.99 Product: Coffee Maker", "label": "order"},
    {"text": "Shipping Confirmation Your order #GHI-456789 has been shipped Tracking Number: TR123456789", "label": "order"},
    {"text": "Digital Receipt Order #ABC-987654 Purchase Date: 22 Feb 2024 Store: ElectroMart", "label": "order"},
    {"text": "Amazon Order Summary Order placed: March 25, 2024 Amazon order number: 123-4567890-1234567", "label": "order"},
    {"text": "Welcome to our online store! Browse thousands of products at great prices", "label": "non-order"},
    {"text": "About Us - We are a leading retailer established in 1995. Our mission is to provide quality", "label": "non-order"},
    {"text": "Contact us: Phone: +1-800-555-0123 Email: support@store.com Address: 123 Main St", "label": "non-order"},
    {"text": "Privacy Policy: This website collects cookies to improve user experience", "label": "non-order"},
    {"text": "Search results for 'headphones' - Showing 1-20 of 500 results. Sort by: Price, Rating", "label": "non-order"},
    {"text": "User Account Dashboard Your orders: 5 Recent activity: Last login March 22, 2024", "label": "non-order"},
    {"text": "Return Policy: Items can be returned within 30 days of purchase. Original packaging required", "label": "non-order"},
    {"text": "Customer Reviews (4.5/5 stars) Great product! Fast shipping. Would buy again", "label": "non-order"},
    {"text": "Shopping Cart (3 items) Wireless Mouse - $25.99 USB Cable - $12.99 Keyboard - $67.99", "label": "non-order"},
    {"text": "FAQ - Frequently Asked Questions Q: How do I track my order? A: Use the tracking number", "label": "non-order"},
    {"text": "Newsletter Signup: Get 10% off your first order! Enter your email below", "label": "non-order"},
    {"text": "Product Page: Wireless Bluetooth Earbuds Price: $79.99 Rating: 4.2/5 Features", "label": "non-order"},
    {"text": "Home page - Welcome to MegaStore! Discover amazing deals on electronics, fashion", "label": "non-order"},
    {"text": "Login page - Enter your credentials Email: Password: Remember me Forgot password?", "label": "non-order"},
    {"text": "Terms of Service: By using this website, you agree to our terms and conditions", "label": "non-order"},
    {"text": "Help Center - How can we help you today? Order tracking Shipping information Returns", "label": "non-order"}
  ];
  
  await fs.ensureDir(path.dirname(dataPath));
  
  const jsonlContent = sampleData.map(item => JSON.stringify(item)).join('\n');
  await fs.writeFile(dataPath, jsonlContent);
  
  console.log(chalk.green(`✅ Sample training data created at ${dataPath}`));
  console.log(chalk.cyan(`📊 ${sampleData.length} examples (${sampleData.filter(d => d.label === 'order').length} order, ${sampleData.filter(d => d.label === 'non-order').length} non-order)`));
}

/**
 * Create export files for the browser extension
 */
async function createExtensionExport(trainer, modelPath) {
  const exportPath = path.join(modelPath, 'extension-export');
  await fs.ensureDir(exportPath);
  
  // Create lightweight inference-only version
  const lightweightClassifier = `
/**
 * AutoComplaint Lightweight Order Classifier
 * Generated by AutoComplaint Training Suite
 * For use in browser extensions (inference only)
 */

export class LightweightOrderClassifier {
  constructor() {
    this.model = null;
    this.vocabulary = null;
    this.config = null;
    this.ready = false;
  }

  async loadModel(modelUrl) {
    try {
      // Load model
      this.model = await tf.loadLayersModel(modelUrl + '/model.json');
      
      // Load metadata
      const metadataResponse = await fetch(modelUrl + '/metadata.json');
      const metadata = await metadataResponse.json();
      
      this.vocabulary = new Map(metadata.vocabulary);
      this.config = metadata.config;
      this.ready = true;
      
      console.log('✅ Order classifier loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to load classifier:', error);
      return false;
    }
  }

  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\\w\\s]/g, ' ')
      .split(/\\s+/)
      .filter(word => word.length > 0);
  }

  textToSequence(text) {
    if (!this.vocabulary) throw new Error('Model not loaded');
    
    const words = this.tokenize(text);
    const sequence = words.map(word => 
      this.vocabulary.get(word) || this.vocabulary.get('<UNK>')
    );
    
    // Pad or truncate
    const maxLen = this.config.maxSequenceLength;
    if (sequence.length > maxLen) {
      return sequence.slice(0, maxLen);
    } else {
      return sequence.concat(Array(maxLen - sequence.length).fill(0));
    }
  }

  async predict(text) {
    if (!this.ready) throw new Error('Model not ready');
    
    const sequence = this.textToSequence(text);
    const input = tf.tensor2d([sequence]);
    
    const prediction = await this.model.predict(input).data();
    input.dispose();
    
    const isOrder = prediction[1] > prediction[0];
    const confidence = Math.max(prediction[0], prediction[1]);
    
    return {
      label: isOrder ? 'order' : 'non-order',
      confidence: confidence,
      scores: [prediction[0], prediction[1]]
    };
  }
}
`;

  await fs.writeFile(path.join(exportPath, 'lightweight-classifier.js'), lightweightClassifier);
  
  // Create integration guide
  const integrationGuide = `
# AutoComplaint Extension Integration Guide

## Files Generated
- \`lightweight-classifier.js\` - Lightweight classifier for browser use
- \`model.json\` & \`model.bin\` - TensorFlow.js model files  
- \`metadata.json\` - Vocabulary and configuration

## Integration Steps

### 1. Copy Model Files
Copy the following files to your extension's \`models/\` directory:
- \`model.json\`
- \`model.bin\` (or multiple bin files)
- \`metadata.json\`

### 2. Update Extension Code
Replace the training-heavy classifier with the lightweight version:

\`\`\`javascript
import { LightweightOrderClassifier } from './models/lightweight-classifier.js';

// In your content script
const classifier = new LightweightOrderClassifier();
await classifier.loadModel(chrome.runtime.getURL('models/'));

// Use for prediction
const result = await classifier.predict(pageText);
console.log('Is order page:', result.label === 'order');
console.log('Confidence:', result.confidence);
\`\`\`

### 3. Update Manifest
Add model files to web_accessible_resources:

\`\`\`json
{
  "web_accessible_resources": [{
    "resources": [
      "models/*.json",
      "models/*.bin"
    ],
    "matches": ["<all_urls>"]
  }]
}
\`\`\`

## Model Performance
- Training Accuracy: ${trainer.trainingHistory ? (trainer.trainingHistory.history.acc.slice(-1)[0] * 100).toFixed(1) : 'N/A'}%
- Model Size: ~${(await fs.stat(path.join(modelPath, 'model.json'))).size / 1024}KB
- Vocabulary: ${trainer.vocabulary ? trainer.vocabulary.size : 'N/A'} words
`;

  await fs.writeFile(path.join(exportPath, 'INTEGRATION.md'), integrationGuide);
  
  console.log(chalk.green('📦 Extension export created'));
}

/**
 * Start a local model server for testing
 */
async function startModelServer(trainer) {
  const { default: express } = await import('express');
  const { default: cors } = await import('cors');
  
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  // Serve model files
  app.use('/models', express.static(trainer.modelPath));
  
  // Prediction endpoint
  app.post('/predict', async (req, res) => {
    try {
      const { text } = req.body;
      const result = await trainer.predict(text);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      model: trainer.model ? 'loaded' : 'not loaded',
      vocabulary: trainer.vocabulary ? trainer.vocabulary.size : 0
    });
  });
  
  const port = 3000;
  app.listen(port, () => {
    console.log(chalk.green(`🌐 Model server running at http://localhost:${port}`));
    console.log(chalk.cyan(`📡 Test predictions: POST http://localhost:${port}/predict`));
    console.log(chalk.cyan(`📁 Model files: http://localhost:${port}/models/`));
  });
}

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, createSampleData, createExtensionExport, startModelServer };
