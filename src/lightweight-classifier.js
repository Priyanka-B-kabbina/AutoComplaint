/**
 * Lightweight Order Page Classifier for Chrome Extension
 * Inference-only implementation - no training logic
 */

class LightweightOrderClassifier {
  constructor() {
    this.isLoaded = false;
    this.model = null;
    this.modelMetadata = null;
    this.fallbackRules = null;
    this.initializeFallbackRules();
  }

  /**
   * Initialize fallback rule-based classifier
   */
  initializeFallbackRules() {
    this.fallbackRules = {
      orderIndicators: [
        // Order identifiers
        /order\s*#?[\w\-\d]+/i,
        /order\s*number\s*:?\s*[\w\-\d]+/i,
        /order\s*id\s*:?\s*[\w\-\d]+/i,
        /invoice\s*#?[\w\-\d]+/i,
        /confirmation\s*#?[\w\-\d]+/i,
        /receipt\s*#?[\w\-\d]+/i,
        
        // Price patterns
        /total\s*:?\s*[\$₹£€¥]\s*[\d,]+\.?\d*/i,
        /amount\s*:?\s*[\$₹£€¥]\s*[\d,]+\.?\d*/i,
        /subtotal\s*:?\s*[\$₹£€¥]\s*[\d,]+\.?\d*/i,
        /price\s*:?\s*[\$₹£€¥]\s*[\d,]+\.?\d*/i,
        
        // Delivery/shipping
        /delivery\s*date/i,
        /shipping\s*address/i,
        /estimated\s*delivery/i,
        /order\s*status/i,
        /tracking\s*number/i,
        
        // Status indicators
        /order\s*placed/i,
        /order\s*confirmed/i,
        /order\s*shipped/i,
        /order\s*delivered/i,
        /payment\s*successful/i,
        /order\s*summary/i
      ],
      
      nonOrderIndicators: [
        /about\s*us/i,
        /privacy\s*policy/i,
        /terms\s*of\s*service/i,
        /contact\s*us/i,
        /search\s*results/i,
        /category/i,
        /browse\s*products/i,
        /product\s*details/i,
        /add\s*to\s*cart/i,
        /wishlist/i,
        /recommended\s*for\s*you/i,
        /customer\s*reviews/i,
        /frequently\s*bought/i
      ]
    };
  }

  /**
   * Load the trained model from a URL or local source
   */
  async loadModel(modelUrl = null) {
    try {
      if (modelUrl) {
        console.log('🔄 Loading trained model from:', modelUrl);
        
        // Try to load TensorFlow.js model
        if (typeof tf !== 'undefined') {
          try {
            this.model = await tf.loadLayersModel(modelUrl);
            
            // Load metadata if available
            const metadataUrl = modelUrl.replace('model.json', 'metadata.json');
            try {
              const response = await fetch(metadataUrl);
              this.modelMetadata = await response.json();
            } catch (e) {
              console.warn('⚠️ Could not load model metadata');
            }
            
            this.isLoaded = true;
            console.log('✅ ML model loaded successfully');
            return true;
          } catch (error) {
            console.warn('⚠️ Failed to load ML model:', error.message);
          }
        }
      }
      
      console.log('🔄 Using fallback rule-based classifier');
      this.isLoaded = true;
      return true;
      
    } catch (error) {
      console.error('❌ Error loading classifier:', error);
      this.isLoaded = true; // Still allow fallback
      return false;
    }
  }

  /**
   * Classify text as order-related or not
   */
  async classify(text) {
    if (!this.isLoaded) {
      await this.loadModel();
    }

    if (!text || typeof text !== 'string') {
      return { isOrder: false, confidence: 0, method: 'invalid' };
    }

    // Try ML model first
    if (this.model) {
      try {
        const prediction = await this.classifyWithModel(text);
        if (prediction.confidence > 0.6) {
          return prediction;
        }
      } catch (error) {
        console.warn('⚠️ ML classification failed, using fallback:', error.message);
      }
    }

    // Fallback to rule-based classification
    return this.classifyWithRules(text);
  }

  /**
   * ML-based classification
   */
  async classifyWithModel(text) {
    if (!this.model || typeof tf === 'undefined') {
      throw new Error('Model not available');
    }

    try {
      // Simple preprocessing (would be more sophisticated in real implementation)
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
        method: 'ml',
        probabilities: Array.from(probabilities)
      };
      
    } catch (error) {
      throw new Error(`ML classification failed: ${error.message}`);
    }
  }

  /**
   * Rule-based classification fallback
   */
  classifyWithRules(text) {
    const normalizedText = text.toLowerCase();
    
    let orderScore = 0;
    let nonOrderScore = 0;
    
    // Check for order indicators
    for (const pattern of this.fallbackRules.orderIndicators) {
      if (pattern.test(normalizedText)) {
        orderScore += 1;
      }
    }
    
    // Check for non-order indicators
    for (const pattern of this.fallbackRules.nonOrderIndicators) {
      if (pattern.test(normalizedText)) {
        nonOrderScore += 1;
      }
    }
    
    // Calculate confidence
    const totalScore = orderScore + nonOrderScore;
    const isOrder = orderScore > nonOrderScore;
    const confidence = totalScore > 0 ? 
      (isOrder ? orderScore / totalScore : nonOrderScore / totalScore) : 0.5;
    
    // Boost confidence for strong indicators
    const adjustedConfidence = Math.min(0.95, confidence + (totalScore > 3 ? 0.2 : 0));
    
    return {
      isOrder,
      confidence: adjustedConfidence,
      method: 'rules',
      details: {
        orderScore,
        nonOrderScore,
        totalIndicators: totalScore
      }
    };
  }

  /**
   * Simple text preprocessing for ML model
   */
  preprocessText(text) {
    // Simple tokenization (in real implementation, use proper tokenizer)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
    
    const maxLength = 512;
    const tokens = words.map(word => {
      // Simple hash-based tokenization
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        const char = word.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash) % 9999 + 1;
    });

    // Pad or truncate
    if (tokens.length > maxLength) {
      return tokens.slice(0, maxLength);
    } else {
      return tokens.concat(Array(maxLength - tokens.length).fill(0));
    }
  }

  /**
   * Classify entire page content
   */
  async classifyPage() {
    try {
      // Extract key page content
      const content = this.extractPageContent();
      
      if (!content || content.trim().length < 50) {
        return { isOrder: false, confidence: 0.8, method: 'insufficient_content' };
      }
      
      // Classify the content
      const result = await this.classify(content);
      
      // Additional page-level checks
      if (result.isOrder) {
        const pageChecks = this.performPageLevelChecks();
        result.pageChecks = pageChecks;
        
        // Adjust confidence based on page structure
        if (pageChecks.hasOrderStructure) {
          result.confidence = Math.min(0.95, result.confidence + 0.1);
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Page classification error:', error);
      return { isOrder: false, confidence: 0, method: 'error', error: error.message };
    }
  }

  /**
   * Extract relevant content from the page
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
    
    // Limit content length
    return content.substring(0, 5000);
  }

  /**
   * Additional page-level structural checks
   */
  performPageLevelChecks() {
    const checks = {
      hasOrderStructure: false,
      hasOrderElements: false,
      hasTransactionElements: false,
      urlIndicators: false
    };
    
    // Check URL
    const url = window.location.href.toLowerCase();
    checks.urlIndicators = /order|invoice|receipt|confirmation|purchase|transaction/.test(url);
    
    // Check for order-specific elements
    const orderSelectors = [
      '[class*="order"]',
      '[id*="order"]',
      '[class*="invoice"]',
      '[class*="receipt"]',
      '[class*="confirmation"]'
    ];
    
    for (const selector of orderSelectors) {
      if (document.querySelector(selector)) {
        checks.hasOrderElements = true;
        break;
      }
    }
    
    // Check for transaction elements
    const transactionSelectors = [
      '[class*="total"]',
      '[class*="amount"]',
      '[class*="price"]',
      '[class*="payment"]'
    ];
    
    for (const selector of transactionSelectors) {
      if (document.querySelector(selector)) {
        checks.hasTransactionElements = true;
        break;
      }
    }
    
    // Determine overall structure
    checks.hasOrderStructure = checks.hasOrderElements || 
                              (checks.hasTransactionElements && checks.urlIndicators);
    
    return checks;
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
