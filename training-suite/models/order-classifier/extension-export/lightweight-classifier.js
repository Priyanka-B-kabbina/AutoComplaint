/**
 * ML-Only Order Page Classifier for Chrome Extension
 * Pure ML-based inference - no rule-based fallbacks
 */

class LightweightOrderClassifier {
  constructor() {
    this.isLoaded = false;
    this.model = null;
    this.modelMetadata = null;
    this.modelServerUrl = 'http://localhost:3001';
  }

  /**
   * Load the trained model from model server
   */
  async loadModel(modelUrl = null) {
    try {
      console.log('🔄 Loading ML model from server...');
      
      // Always try to load from model server first
      const serverUrl = modelUrl || `${this.modelServerUrl}/models/classifier`;
      
      try {
        const response = await fetch(serverUrl);
        if (response.ok) {
          this.modelMetadata = await response.json();
          console.log('✅ ML model metadata loaded from server');
          
          // For TensorFlow.js models
          if (typeof tf !== 'undefined' && this.modelMetadata.tfjs_url) {
            this.model = await tf.loadLayersModel(this.modelMetadata.tfjs_url);
            console.log('✅ TensorFlow.js model loaded');
          }
          
          this.isLoaded = true;
          return true;
        }
      } catch (error) {
        console.error('❌ Failed to load from model server:', error.message);
        throw new Error(`Model server unavailable: ${error.message}`);
      }
      
      throw new Error('No ML model available - model server is required');
      
    } catch (error) {
      console.error('❌ Error loading ML classifier:', error);
      throw error; // Don't fallback - require ML model
    }
  }

  /**
   * Classify text as order-related or not using ML only
   */
  async classify(text) {
    if (!this.isLoaded) {
      await this.loadModel();
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input for classification');
    }

    // Use ML model for classification - no fallbacks
    if (this.model) {
      return await this.classifyWithModel(text);
    } else {
      // Use model server API
      return await this.classifyWithServer(text);
    }
  }

  /**
   * Classify using model server API
   */
  async classifyWithServer(text) {
    try {
      const response = await fetch(`${this.modelServerUrl}/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();
      return {
        isOrder: result.isOrder,
        confidence: result.confidence,
        method: 'ml-server',
        details: result.details
      };
    } catch (error) {
      throw new Error(`ML classification via server failed: ${error.message}`);
    }
  }

  /**
   * ML-based classification using local TensorFlow.js model
   */
  async classifyWithModel(text) {
    if (!this.model || typeof tf === 'undefined') {
      throw new Error('TensorFlow.js model not available');
    }

    try {
      // Preprocess text for ML model
      const tokens = this.preprocessText(text);
      const inputTensor = tf.tensor2d([tokens]);
      
      const prediction = this.model.predict(inputTensor);
      const probabilities = await prediction.data();
      
      // Assuming binary classification: [non-order, order]
      const orderProbability = probabilities[1];
      const isOrder = orderProbability > 0.5;
      
      // Cleanup tensors
      inputTensor.dispose();
      prediction.dispose();
      
      return {
        isOrder,
        confidence: isOrder ? orderProbability : (1 - orderProbability),
        method: 'ml-tfjs',
        probabilities: Array.from(probabilities)
      };
      
    } catch (error) {
      throw new Error(`TensorFlow.js classification failed: ${error.message}`);
    }
  }

  /**
   * Text preprocessing for ML model input - REQUIRES VOCABULARY
   */
  preprocessText(text) {
    if (!this.modelMetadata || !this.modelMetadata.vocabulary) {
      throw new Error('Model vocabulary not available - cannot tokenize text');
    }
    
    // Proper vocabulary-based tokenization
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
    
    const maxLength = this.modelMetadata.maxSequenceLength || 512;
    const vocabulary = this.modelMetadata.vocabulary;
    const unknownToken = vocabulary['<UNK>'] || 1;
    
    // Map words to vocabulary indices
    const tokens = words.map(word => {
      return vocabulary[word] || unknownToken;
    });

    // Pad or truncate to fixed length
    if (tokens.length > maxLength) {
      return tokens.slice(0, maxLength);
    } else {
      return tokens.concat(Array(maxLength - tokens.length).fill(0));
    }
  }

  /**
   * Classify entire page content using ML only
   */
  async classifyPage() {
    try {
      // Extract key page content
      const content = this.extractPageContent();
      
      if (!content || content.trim().length < 50) {
        throw new Error('Insufficient page content for ML classification');
      }
      
      // Classify using ML model only
      const result = await this.classify(content);
      
      // Add page-level metadata
      result.pageInfo = {
        contentLength: content.length,
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString()
      };
      
      return result;
      
    } catch (error) {
      console.error('❌ ML page classification error:', error);
      throw error; // Don't fallback - require ML classification
    }
  }

  /**
   * Extract relevant content from the page for ML processing
   */
  extractPageContent() {
    const selectors = [
      'main',
      '[role="main"]',
      '.order',
      '.invoice',
      '.receipt',
      '.confirmation',
      '.order-details',
      '.order-summary',
      'h1, h2, h3',
      '.title',
      '.heading'
    ];
    
    let content = '';
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (element.textContent) {
          content += element.textContent + ' ';
        }
      }
    }
    
    // Fallback to body content if nothing found
    if (content.trim().length < 100) {
      content = document.body.textContent || '';
    }
    
    // Limit content length for ML processing
    return content.substring(0, 5000);
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LightweightOrderClassifier;
}

// Global assignment for browser environment
if (typeof window !== 'undefined') {
  window.LightweightOrderClassifier = LightweightOrderClassifier;
}
