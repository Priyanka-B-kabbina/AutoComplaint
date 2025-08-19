/**
 * AutoComplaint Training Suite - Core Classifier Training Module
 * 
 * This module handles the training of custom ML models for order detection
 * completely separate from the browser extension.
 */

import * as tf from '@tensorflow/tfjs-node';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ProgressBar from 'progress';

export class OrderClassifierTrainer {
  constructor(config = {}) {
    this.config = {
      modelName: 'order-classifier',
      vocabularySize: 10000,
      embeddingDim: 128,
      maxSequenceLength: 512,
      epochs: 20,
      batchSize: 32,
      validationSplit: 0.2,
      learningRate: 0.001,
      dropoutRate: 0.5,
      ...config
    };
    
    this.model = null;
    this.tokenizer = null;
    this.vocabulary = new Map();
    this.isTraining = false;
    this.trainingHistory = null;
    this.modelPath = path.join(process.cwd(), 'models', this.config.modelName);
  }

  /**
   * Load training data from JSONL file
   */
  async loadTrainingData(dataPath) {
    console.log(chalk.blue('📚 Loading training data...'));
    
    try {
      const data = await fs.readFile(dataPath, 'utf8');
      const lines = data.split('\n').filter(line => line.trim());
      
      const examples = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          console.warn(chalk.yellow(`⚠️ Skipping invalid JSON line: ${line}`));
          return null;
        }
      }).filter(Boolean);
      
      console.log(chalk.green(`✅ Loaded ${examples.length} training examples`));
      
      // Validate data format
      this.validateTrainingData(examples);
      
      return examples;
    } catch (error) {
      console.error(chalk.red('❌ Failed to load training data:'), error.message);
      throw error;
    }
  }

  /**
   * Validate training data format
   */
  validateTrainingData(data) {
    const requiredFields = ['text', 'label'];
    const validLabels = ['order', 'non-order'];
    
    for (const example of data) {
      for (const field of requiredFields) {
        if (!(field in example)) {
          throw new Error(`Missing required field "${field}" in training data`);
        }
      }
      
      if (!validLabels.includes(example.label)) {
        throw new Error(`Invalid label "${example.label}". Must be one of: ${validLabels.join(', ')}`);
      }
    }
    
    // Check label distribution
    const labelCounts = data.reduce((counts, example) => {
      counts[example.label] = (counts[example.label] || 0) + 1;
      return counts;
    }, {});
    
    console.log(chalk.cyan('📊 Label distribution:'));
    Object.entries(labelCounts).forEach(([label, count]) => {
      const percentage = ((count / data.length) * 100).toFixed(1);
      console.log(chalk.cyan(`  ${label}: ${count} (${percentage}%)`));
    });
  }

  /**
   * Build vocabulary from training texts
   */
  buildVocabulary(texts) {
    console.log(chalk.blue('🔤 Building vocabulary...'));
    
    const wordCounts = new Map();
    
    // Count word frequencies
    for (const text of texts) {
      const words = this.tokenize(text);
      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    
    // Select top words
    const sortedWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.config.vocabularySize - 2); // Reserve space for <UNK> and <PAD>
    
    // Build vocabulary mapping
    this.vocabulary = new Map();
    this.vocabulary.set('<PAD>', 0);
    this.vocabulary.set('<UNK>', 1);
    
    sortedWords.forEach(([word], index) => {
      this.vocabulary.set(word, index + 2);
    });
    
    console.log(chalk.green(`✅ Vocabulary built with ${this.vocabulary.size} words`));
  }

  /**
   * Simple tokenization
   */
  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Convert text to sequence of token IDs
   */
  textToSequence(text) {
    const words = this.tokenize(text);
    const sequence = words.map(word => 
      this.vocabulary.get(word) || this.vocabulary.get('<UNK>')
    );
    
    // Pad or truncate to fixed length
    if (sequence.length > this.config.maxSequenceLength) {
      return sequence.slice(0, this.config.maxSequenceLength);
    } else {
      return sequence.concat(
        Array(this.config.maxSequenceLength - sequence.length).fill(0)
      );
    }
  }

  /**
   * Prepare training data tensors
   */
  prepareData(examples) {
    console.log(chalk.blue('🔧 Preparing training data...'));
    
    const texts = examples.map(ex => ex.text);
    const labels = examples.map(ex => ex.label === 'order' ? 1 : 0);
    
    // Build vocabulary if not exists
    if (this.vocabulary.size === 0) {
      this.buildVocabulary(texts);
    }
    
    // Convert texts to sequences
    const sequences = texts.map(text => this.textToSequence(text));
    
    // Create tensors
    const X = tf.tensor2d(sequences);
    const y = tf.oneHot(tf.tensor1d(labels, 'int32'), 2);
    
    console.log(chalk.green('✅ Data prepared'));
    console.log(chalk.cyan(`  Input shape: [${X.shape.join(', ')}]`));
    console.log(chalk.cyan(`  Output shape: [${y.shape.join(', ')}]`));
    
    return { X, y };
  }

  /**
   * Create the neural network model
   */
  createModel() {
    console.log(chalk.blue('🏗️ Creating model architecture...'));
    
    const model = tf.sequential({
      layers: [
        // Embedding layer
        tf.layers.embedding({
          inputDim: this.config.vocabularySize,
          outputDim: this.config.embeddingDim,
          inputLength: this.config.maxSequenceLength,
          name: 'embedding'
        }),
        
        // Global average pooling
        tf.layers.globalAveragePooling1d({ name: 'global_avg_pool' }),
        
        // Dense layers with dropout
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          name: 'dense_1'
        }),
        tf.layers.dropout({ rate: this.config.dropoutRate, name: 'dropout_1' }),
        
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          name: 'dense_2'
        }),
        tf.layers.dropout({ rate: this.config.dropoutRate, name: 'dropout_2' }),
        
        // Output layer
        tf.layers.dense({
          units: 2,
          activation: 'softmax',
          name: 'output'
        })
      ]
    });
    
    // Compile model
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    console.log(chalk.green('✅ Model created'));
    model.summary();
    
    return model;
  }

  /**
   * Train the model
   */
  async trainModel(trainingData, validationData = null) {
    if (this.isTraining) {
      throw new Error('Training already in progress');
    }
    
    this.isTraining = true;
    
    try {
      console.log(chalk.blue('🎯 Starting model training...'));
      
      // Prepare data
      const { X: trainX, y: trainY } = this.prepareData(trainingData);
      let valX = null, valY = null;
      
      if (validationData) {
        const valData = this.prepareData(validationData);
        valX = valData.X;
        valY = valData.y;
      }
      
      // Create model
      this.model = this.createModel();
      
      // Training callbacks
      const callbacks = {
        onEpochEnd: (epoch, logs) => {
          const progress = ((epoch + 1) / this.config.epochs * 100).toFixed(1);
          console.log(
            chalk.cyan(
              `Epoch ${epoch + 1}/${this.config.epochs} (${progress}%) - ` +
              `loss: ${logs.loss.toFixed(4)} - acc: ${logs.acc.toFixed(4)}` +
              (logs.val_loss ? ` - val_loss: ${logs.val_loss.toFixed(4)} - val_acc: ${logs.val_acc.toFixed(4)}` : '')
            )
          );
        }
      };
      
      // Start training
      const startTime = Date.now();
      
      this.trainingHistory = await this.model.fit(trainX, trainY, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        validationData: valX && valY ? [valX, valY] : null,
        validationSplit: valX && valY ? null : this.config.validationSplit,
        callbacks,
        verbose: 0
      });
      
      const trainingTime = Date.now() - startTime;
      
      // Clean up tensors
      trainX.dispose();
      trainY.dispose();
      if (valX) valX.dispose();
      if (valY) valY.dispose();
      
      console.log(chalk.green(`✅ Training completed in ${(trainingTime / 1000).toFixed(1)}s`));
      
      // Show final metrics
      const finalMetrics = this.trainingHistory.history;
      const finalAcc = finalMetrics.acc[finalMetrics.acc.length - 1];
      const finalValAcc = finalMetrics.val_acc ? finalMetrics.val_acc[finalMetrics.val_acc.length - 1] : null;
      
      console.log(chalk.green('📊 Final Results:'));
      console.log(chalk.green(`  Training Accuracy: ${(finalAcc * 100).toFixed(2)}%`));
      if (finalValAcc) {
        console.log(chalk.green(`  Validation Accuracy: ${(finalValAcc * 100).toFixed(2)}%`));
      }
      
      return this.trainingHistory;
      
    } catch (error) {
      console.error(chalk.red('❌ Training failed:'), error.message);
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Save the trained model and vocabulary
   */
  async saveModel(outputPath = null) {
    if (!this.model) {
      throw new Error('No model to save');
    }
    
    const savePath = outputPath || this.modelPath;
    
    console.log(chalk.blue(`💾 Saving model to ${savePath}...`));
    
    try {
      // Ensure directory exists
      await fs.ensureDir(savePath);
      
      // Save model
      await this.model.save(`file://${savePath}`);
      
      // Save vocabulary and config
      const metadata = {
        vocabulary: Array.from(this.vocabulary.entries()),
        config: this.config,
        trainingHistory: this.trainingHistory ? this.trainingHistory.history : null,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
      
      await fs.writeFile(
        path.join(savePath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      console.log(chalk.green('✅ Model saved successfully'));
      console.log(chalk.cyan(`📁 Model files saved to: ${savePath}`));
      
      return savePath;
    } catch (error) {
      console.error(chalk.red('❌ Failed to save model:'), error.message);
      throw error;
    }
  }

  /**
   * Load a trained model
   */
  async loadModel(modelPath = null) {
    const loadPath = modelPath || this.modelPath;
    
    console.log(chalk.blue(`📂 Loading model from ${loadPath}...`));
    
    try {
      // Load model
      this.model = await tf.loadLayersModel(`file://${loadPath}/model.json`);
      
      // Load metadata
      const metadataPath = path.join(loadPath, 'metadata.json');
      const metadata = await fs.readJSON(metadataPath);
      
      // Restore vocabulary and config
      this.vocabulary = new Map(metadata.vocabulary);
      this.config = { ...this.config, ...metadata.config };
      this.trainingHistory = metadata.trainingHistory;
      
      console.log(chalk.green('✅ Model loaded successfully'));
      console.log(chalk.cyan(`📊 Vocabulary size: ${this.vocabulary.size}`));
      
      return true;
    } catch (error) {
      console.error(chalk.red('❌ Failed to load model:'), error.message);
      return false;
    }
  }

  /**
   * Make prediction on text
   */
  async predict(text) {
    if (!this.model) {
      throw new Error('Model not loaded');
    }
    
    const sequence = this.textToSequence(text);
    const input = tf.tensor2d([sequence]);
    
    const prediction = await this.model.predict(input).data();
    input.dispose();
    
    const isOrder = prediction[1] > prediction[0];
    const confidence = Math.max(prediction[0], prediction[1]);
    
    return {
      label: isOrder ? 'order' : 'non-order',
      confidence: confidence,
      scores: {
        'non-order': prediction[0],
        'order': prediction[1]
      }
    };
  }

  /**
   * Evaluate model on test data
   */
  async evaluate(testData) {
    if (!this.model) {
      throw new Error('Model not loaded');
    }
    
    console.log(chalk.blue('📈 Evaluating model...'));
    
    const { X, y } = this.prepareData(testData);
    const evaluation = await this.model.evaluate(X, y);
    
    const loss = await evaluation[0].data();
    const accuracy = await evaluation[1].data();
    
    X.dispose();
    y.dispose();
    evaluation.forEach(tensor => tensor.dispose());
    
    console.log(chalk.green('📊 Evaluation Results:'));
    console.log(chalk.green(`  Loss: ${loss[0].toFixed(4)}`));
    console.log(chalk.green(`  Accuracy: ${(accuracy[0] * 100).toFixed(2)}%`));
    
    return {
      loss: loss[0],
      accuracy: accuracy[0]
    };
  }

  /**
   * Detailed testing with individual predictions
   */
  async detailedTest(testData) {
    console.log(chalk.blue('🧪 Running detailed test...'));
    
    const results = [];
    let correct = 0;
    
    for (const example of testData) {
      const prediction = await this.predict(example.text);
      const isCorrect = prediction.label === example.label;
      
      if (isCorrect) correct++;
      
      results.push({
        text: example.text.substring(0, 50) + '...',
        expected: example.label,
        predicted: prediction.label,
        confidence: prediction.confidence,
        correct: isCorrect
      });
    }
    
    const accuracy = (correct / testData.length * 100).toFixed(2);
    
    console.log(chalk.green(`📊 Detailed Test Results: ${correct}/${testData.length} (${accuracy}%)`));
    
    return {
      accuracy: parseFloat(accuracy),
      results,
      totalTests: testData.length,
      correctPredictions: correct
    };
  }
}
