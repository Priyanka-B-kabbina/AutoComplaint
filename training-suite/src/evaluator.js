#!/usr/bin/env node

/**
 * AutoComplaint Model Evaluator
 * 
 * Comprehensive evaluation and testing of trained models
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { OrderClassifierTrainer } from './classifier.js';

const program = new Command();

program
  .name('autocomplaint-evaluator')
  .description('Evaluate AutoComplaint ML models')
  .version('1.0.0')
  .option('-m, --model <path>', 'path to trained model', './models/order-classifier')
  .option('-t, --test-data <path>', 'path to test data (JSONL format)', './data/test.jsonl')
  .option('-o, --output <path>', 'output path for evaluation report', './evaluation-report.json')
  .option('--detailed', 'generate detailed evaluation report')
  .option('--export-errors', 'export misclassified examples')
  .parse();

const options = program.opts();

async function main() {
  console.log(chalk.bold.blue('📊 AutoComplaint Model Evaluator'));
  console.log(chalk.blue('=' .repeat(45)));
  
  try {
    // Load model
    console.log(chalk.blue('📂 Loading model...'));
    const trainer = new OrderClassifierTrainer();
    const modelLoaded = await trainer.loadModel(options.model);
    
    if (!modelLoaded) {
      throw new Error(`Failed to load model from ${options.model}`);
    }
    
    console.log(chalk.green('✅ Model loaded successfully'));
    
    // Load test data
    let testData;
    if (await fs.pathExists(options.testData)) {
      console.log(chalk.blue('📚 Loading test data...'));
      testData = await trainer.loadTrainingData(options.testData);
    } else {
      console.log(chalk.yellow('⚠️ No test data found, creating sample test set...'));
      testData = await createSampleTestData(options.testData);
    }
    
    console.log(chalk.cyan(`📊 Test set: ${testData.length} examples`));
    
    // Run basic evaluation
    console.log(chalk.blue('🔍 Running basic evaluation...'));
    const basicEval = await trainer.evaluate(testData);
    
    // Run detailed evaluation
    console.log(chalk.blue('🧪 Running detailed evaluation...'));
    const detailedEval = await trainer.detailedTest(testData);
    
    // Generate comprehensive report
    const report = await generateEvaluationReport(trainer, testData, basicEval, detailedEval);
    
    // Display results
    displayResults(report);
    
    // Save report
    await fs.writeFile(options.output, JSON.stringify(report, null, 2));
    console.log(chalk.green(`📄 Evaluation report saved to: ${options.output}`));
    
    // Export errors if requested
    if (options.exportErrors) {
      await exportMisclassifiedExamples(detailedEval, path.dirname(options.output));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Evaluation failed:'), error.message);
    process.exit(1);
  }
}

/**
 * Create sample test data if none exists
 */
async function createSampleTestData(testDataPath) {
  const sampleTestData = [
    // Order examples
    {"text": "Order Receipt Order ID: ORD-987654 Date: April 10, 2024 Total: $156.78 Customer: Alice Johnson", "label": "order"},
    {"text": "Payment Confirmation Transaction: TXN-445566 Amount: €89.50 Card ending in 1234 Successful", "label": "order"},
    {"text": "Delivery Notification Your package has arrived! Order #DEL-123789 delivered to 456 Oak Street", "label": "order"},
    {"text": "Purchase Summary Item: Gaming Headset Quantity: 1 Price: ₹4,999 Order Date: 15/04/2024", "label": "order"},
    {"text": "E-receipt from TechMart Order: TM-789123 Product: Wireless Mouse Total: $45.99 Paid via PayPal", "label": "order"},
    
    // Non-order examples
    {"text": "Product Specifications: 15.6-inch display, Intel Core i7, 16GB RAM, 512GB SSD, Windows 11", "label": "non-order"},
    {"text": "Customer Service Hours: Monday-Friday 9AM-6PM, Saturday 10AM-4PM, Sunday Closed", "label": "non-order"},
    {"text": "Shipping Policy: Free shipping on orders over $50. Express delivery available for $9.99", "label": "non-order"},
    {"text": "Compare Products: Model A vs Model B. See detailed comparison chart and customer reviews", "label": "non-order"},
    {"text": "Blog Post: Top 10 Tech Gadgets of 2024. Discover the latest innovations in consumer electronics", "label": "non-order"},
    
    // Edge cases
    {"text": "Order tracking is temporarily unavailable. Please try again later or contact customer support", "label": "non-order"},
    {"text": "Special offer: Order now and get 20% off your next purchase! Use code SAVE20 at checkout", "label": "non-order"},
    {"text": "Order history shows your last 5 purchases. Click on any order to view detailed information", "label": "non-order"}
  ];
  
  await fs.ensureDir(path.dirname(testDataPath));
  const jsonlContent = sampleTestData.map(item => JSON.stringify(item)).join('\n');
  await fs.writeFile(testDataPath, jsonlContent);
  
  console.log(chalk.green(`✅ Sample test data created at ${testDataPath}`));
  return sampleTestData;
}

/**
 * Generate comprehensive evaluation report
 */
async function generateEvaluationReport(trainer, testData, basicEval, detailedEval) {
  // Calculate confusion matrix
  const confusionMatrix = calculateConfusionMatrix(detailedEval.results);
  
  // Calculate per-class metrics
  const metrics = calculateMetrics(confusionMatrix);
  
  // Analyze errors
  const errorAnalysis = analyzeErrors(detailedEval.results);
  
  // Confidence distribution
  const confidenceStats = analyzeConfidence(detailedEval.results);
  
  return {
    modelInfo: {
      modelPath: trainer.modelPath,
      config: trainer.config,
      vocabularySize: trainer.vocabulary.size,
      evaluationDate: new Date().toISOString()
    },
    testDataInfo: {
      totalExamples: testData.length,
      labelDistribution: getLabelDistribution(testData)
    },
    performance: {
      accuracy: detailedEval.accuracy,
      loss: basicEval.loss,
      confusionMatrix,
      metrics,
      confidenceStats
    },
    errorAnalysis,
    detailedResults: detailedEval.results
  };
}

/**
 * Calculate confusion matrix
 */
function calculateConfusionMatrix(results) {
  const matrix = {
    'order': { 'order': 0, 'non-order': 0 },
    'non-order': { 'order': 0, 'non-order': 0 }
  };
  
  results.forEach(result => {
    matrix[result.expected][result.predicted]++;
  });
  
  return matrix;
}

/**
 * Calculate precision, recall, F1-score
 */
function calculateMetrics(confusionMatrix) {
  const metrics = {};
  
  for (const label of ['order', 'non-order']) {
    const tp = confusionMatrix[label][label];
    const fp = Object.keys(confusionMatrix).reduce((sum, actual) => 
      actual !== label ? sum + confusionMatrix[actual][label] : sum, 0);
    const fn = Object.keys(confusionMatrix[label]).reduce((sum, predicted) => 
      predicted !== label ? sum + confusionMatrix[label][predicted] : sum, 0);
    
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1 = 2 * (precision * recall) / (precision + recall) || 0;
    
    metrics[label] = {
      precision: parseFloat(precision.toFixed(4)),
      recall: parseFloat(recall.toFixed(4)),
      f1Score: parseFloat(f1.toFixed(4)),
      support: tp + fn
    };
  }
  
  // Macro averages
  const macroAvg = {
    precision: Object.values(metrics).reduce((sum, m) => sum + m.precision, 0) / 2,
    recall: Object.values(metrics).reduce((sum, m) => sum + m.recall, 0) / 2,
    f1Score: Object.values(metrics).reduce((sum, m) => sum + m.f1Score, 0) / 2
  };
  
  metrics.macroAverage = {
    precision: parseFloat(macroAvg.precision.toFixed(4)),
    recall: parseFloat(macroAvg.recall.toFixed(4)),
    f1Score: parseFloat(macroAvg.f1Score.toFixed(4))
  };
  
  return metrics;
}

/**
 * Analyze classification errors
 */
function analyzeErrors(results) {
  const errors = results.filter(r => !r.correct);
  
  const errorsByType = {
    'order-misclassified-as-non-order': errors.filter(e => e.expected === 'order' && e.predicted === 'non-order'),
    'non-order-misclassified-as-order': errors.filter(e => e.expected === 'non-order' && e.predicted === 'order')
  };
  
  const lowConfidenceErrors = errors.filter(e => e.confidence < 0.8);
  const highConfidenceErrors = errors.filter(e => e.confidence >= 0.8);
  
  return {
    totalErrors: errors.length,
    errorsByType: Object.fromEntries(
      Object.entries(errorsByType).map(([type, errs]) => [type, errs.length])
    ),
    lowConfidenceErrors: lowConfidenceErrors.length,
    highConfidenceErrors: highConfidenceErrors.length,
    exampleErrors: errors.slice(0, 5).map(e => ({
      text: e.text,
      expected: e.expected,
      predicted: e.predicted,
      confidence: e.confidence
    }))
  };
}

/**
 * Analyze confidence distribution
 */
function analyzeConfidence(results) {
  const confidences = results.map(r => r.confidence);
  
  confidences.sort((a, b) => a - b);
  
  const q1 = confidences[Math.floor(confidences.length * 0.25)];
  const median = confidences[Math.floor(confidences.length * 0.5)];
  const q3 = confidences[Math.floor(confidences.length * 0.75)];
  
  const correctPredictions = results.filter(r => r.correct);
  const incorrectPredictions = results.filter(r => !r.correct);
  
  return {
    overall: {
      min: Math.min(...confidences),
      max: Math.max(...confidences),
      mean: confidences.reduce((a, b) => a + b, 0) / confidences.length,
      median,
      q1,
      q3
    },
    correct: {
      mean: correctPredictions.reduce((sum, r) => sum + r.confidence, 0) / correctPredictions.length,
      min: Math.min(...correctPredictions.map(r => r.confidence)),
      max: Math.max(...correctPredictions.map(r => r.confidence))
    },
    incorrect: incorrectPredictions.length > 0 ? {
      mean: incorrectPredictions.reduce((sum, r) => sum + r.confidence, 0) / incorrectPredictions.length,
      min: Math.min(...incorrectPredictions.map(r => r.confidence)),
      max: Math.max(...incorrectPredictions.map(r => r.confidence))
    } : null
  };
}

/**
 * Get label distribution
 */
function getLabelDistribution(data) {
  const distribution = {};
  data.forEach(item => {
    distribution[item.label] = (distribution[item.label] || 0) + 1;
  });
  return distribution;
}

/**
 * Display evaluation results
 */
function displayResults(report) {
  console.log(chalk.green('\n🎉 Evaluation Complete!'));
  console.log(chalk.blue('=' .repeat(50)));
  
  // Overall performance
  console.log(chalk.bold('\n📊 Overall Performance:'));
  console.log(chalk.cyan(`  Accuracy: ${report.performance.accuracy.toFixed(2)}%`));
  console.log(chalk.cyan(`  Loss: ${report.performance.loss.toFixed(4)}`));
  
  // Per-class metrics
  console.log(chalk.bold('\n📈 Per-Class Metrics:'));
  Object.entries(report.performance.metrics).forEach(([label, metrics]) => {
    if (label !== 'macroAverage') {
      console.log(chalk.yellow(`  ${label.toUpperCase()}:`));
      console.log(chalk.cyan(`    Precision: ${(metrics.precision * 100).toFixed(2)}%`));
      console.log(chalk.cyan(`    Recall: ${(metrics.recall * 100).toFixed(2)}%`));
      console.log(chalk.cyan(`    F1-Score: ${(metrics.f1Score * 100).toFixed(2)}%`));
      console.log(chalk.cyan(`    Support: ${metrics.support} examples`));
    }
  });
  
  // Macro averages
  const macro = report.performance.metrics.macroAverage;
  console.log(chalk.bold('\n🎯 Macro Averages:'));
  console.log(chalk.cyan(`  Precision: ${(macro.precision * 100).toFixed(2)}%`));
  console.log(chalk.cyan(`  Recall: ${(macro.recall * 100).toFixed(2)}%`));
  console.log(chalk.cyan(`  F1-Score: ${(macro.f1Score * 100).toFixed(2)}%`));
  
  // Confusion Matrix
  console.log(chalk.bold('\n🔍 Confusion Matrix:'));
  const cm = report.performance.confusionMatrix;
  console.log(chalk.cyan('              Predicted'));
  console.log(chalk.cyan('              Order  Non-Order'));
  console.log(chalk.cyan(`  Actual Order    ${cm.order.order.toString().padStart(3)}      ${cm.order['non-order'].toString().padStart(3)}`));
  console.log(chalk.cyan(`      Non-Order   ${cm['non-order'].order.toString().padStart(3)}      ${cm['non-order']['non-order'].toString().padStart(3)}`));
  
  // Error Analysis
  console.log(chalk.bold('\n❌ Error Analysis:'));
  console.log(chalk.cyan(`  Total Errors: ${report.errorAnalysis.totalErrors}`));
  console.log(chalk.cyan(`  High Confidence Errors: ${report.errorAnalysis.highConfidenceErrors}`));
  console.log(chalk.cyan(`  Low Confidence Errors: ${report.errorAnalysis.lowConfidenceErrors}`));
  
  // Confidence Stats
  const conf = report.performance.confidenceStats;
  console.log(chalk.bold('\n📊 Confidence Statistics:'));
  console.log(chalk.cyan(`  Mean Confidence: ${(conf.overall.mean * 100).toFixed(2)}%`));
  console.log(chalk.cyan(`  Median Confidence: ${(conf.overall.median * 100).toFixed(2)}%`));
  console.log(chalk.cyan(`  Correct Predictions Avg: ${(conf.correct.mean * 100).toFixed(2)}%`));
  if (conf.incorrect) {
    console.log(chalk.cyan(`  Incorrect Predictions Avg: ${(conf.incorrect.mean * 100).toFixed(2)}%`));
  }
}

/**
 * Export misclassified examples
 */
async function exportMisclassifiedExamples(detailedEval, outputDir) {
  const errors = detailedEval.results.filter(r => !r.correct);
  
  if (errors.length === 0) {
    console.log(chalk.green('🎉 No errors to export - perfect classification!'));
    return;
  }
  
  const errorFile = path.join(outputDir, 'misclassified-examples.jsonl');
  const errorContent = errors.map(error => JSON.stringify({
    text: error.text.replace('...', ''), // Remove truncation
    expected: error.expected,
    predicted: error.predicted,
    confidence: error.confidence,
    error_type: `${error.expected}-as-${error.predicted}`
  })).join('\n');
  
  await fs.writeFile(errorFile, errorContent);
  console.log(chalk.yellow(`📄 Misclassified examples exported to: ${errorFile}`));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, generateEvaluationReport, calculateConfusionMatrix, calculateMetrics };
