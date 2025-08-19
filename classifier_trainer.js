/**
 * AutoComplaint Custom Classifier Training Script
 * 
 * This script can be used to train the custom order detection classifier
 * independently of the main extraction process.
 */

import { OrderEntityExtractor } from './src/amazon.js';

class ClassifierTrainer {
  constructor() {
    this.extractor = new OrderEntityExtractor();
  }

  async initialize() {
    console.log('🚀 Initializing classifier trainer...');
    try {
      await this.extractor.waitForInitialization();
      console.log('✅ Trainer initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize trainer:', error);
      return false;
    }
  }

  async trainModel(forceRetrain = false) {
    console.log('🎯 Starting model training...');
    const result = await this.extractor.trainCustomClassifier(forceRetrain);
    
    if (result.success) {
      console.log('✅ Training completed:', result.message);
    } else {
      console.error('❌ Training failed:', result.message);
    }
    
    return result;
  }

  async testModel() {
    console.log('🧪 Testing trained model...');
    
    const testCases = [
      {
        text: "Order #12345 Total: $99.99 Delivered on March 15, 2024",
        expected: "order"
      },
      {
        text: "Invoice #INV-789 Amount: ₹2,500 GST: ₹450 Total: ₹2,950",
        expected: "order"
      },
      {
        text: "Welcome to our store! Browse thousands of products.",
        expected: "non-order"
      },
      {
        text: "About Us - We are a leading company established in 1995",
        expected: "non-order"
      },
      {
        text: "Order Summary: Order ID OD123456789 Status: Shipped",
        expected: "order"
      },
      {
        text: "Search results for 'laptops' - showing 1-20 of 1500 results",
        expected: "non-order"
      }
    ];

    let correct = 0;
    const results = [];

    for (const testCase of testCases) {
      const result = await this.extractor.testCustomClassifier(testCase.text);
      
      if (result.success) {
        const isCorrect = result.result.label === testCase.expected;
        if (isCorrect) correct++;
        
        results.push({
          text: testCase.text.substring(0, 50) + '...',
          expected: testCase.expected,
          predicted: result.result.label,
          confidence: result.result.confidence.toFixed(3),
          correct: isCorrect
        });
        
        console.log(`${isCorrect ? '✅' : '❌'} "${testCase.text.substring(0, 30)}..." | Expected: ${testCase.expected} | Got: ${result.result.label} (${result.result.confidence.toFixed(3)})`);
      } else {
        console.error('❌ Test failed:', result.message);
      }
    }

    const accuracy = (correct / testCases.length * 100).toFixed(1);
    console.log(`\n📊 Test Results: ${correct}/${testCases.length} correct (${accuracy}% accuracy)`);
    
    return {
      accuracy: parseFloat(accuracy),
      results,
      totalTests: testCases.length,
      correctPredictions: correct
    };
  }

  async evaluateModel() {
    console.log('📈 Running comprehensive model evaluation...');
    
    const status = this.extractor.getClassifierStatus();
    console.log('📋 Model Status:', status);
    
    if (!status.trained) {
      console.warn('⚠️ Model not trained yet. Training first...');
      await this.trainModel();
    }
    
    const testResults = await this.testModel();
    
    console.log('\n🎯 Model Evaluation Complete');
    console.log(`   Accuracy: ${testResults.accuracy}%`);
    console.log(`   Model Status: ${status.trained ? 'Trained' : 'Not Trained'}`);
    
    return {
      status,
      testResults
    };
  }

  async retrainModel() {
    console.log('🔄 Retraining model with latest data...');
    return await this.trainModel(true);
  }
}

// Export for use in other scripts
export { ClassifierTrainer };

// If running as standalone script
if (typeof window !== 'undefined') {
  window.ClassifierTrainer = ClassifierTrainer;
  
  // Convenience methods
  window.trainOrderClassifier = async () => {
    const trainer = new ClassifierTrainer();
    await trainer.initialize();
    return await trainer.trainModel();
  };
  
  window.evaluateOrderClassifier = async () => {
    const trainer = new ClassifierTrainer();
    await trainer.initialize();
    return await trainer.evaluateModel();
  };
  
  window.retrainOrderClassifier = async () => {
    const trainer = new ClassifierTrainer();
    await trainer.initialize();
    return await trainer.retrainModel();
  };
}

// Auto-run if script is loaded directly
if (typeof document !== 'undefined' && document.readyState !== 'loading') {
  console.log('🎯 AutoComplaint Classifier Trainer loaded');
  console.log('💡 Use window.trainOrderClassifier() to train the model');
  console.log('💡 Use window.evaluateOrderClassifier() to test the model');
  console.log('💡 Use window.retrainOrderClassifier() to retrain with latest data');
}
