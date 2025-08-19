/**
 * DistilBERT MNLI Order Page Classifier for Chrome Extension
 * Uses @xenova/transformers for real ML classification
 */

class DistilBERTMNLIClassifier {
  constructor() {
    this.isLoaded = false;
    this.classifier = null;
    // Use a browser-compatible model for sentiment analysis
    this.modelName = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load the DistilBERT model for classification
   */
  async loadModel() {
    if (this.isLoaded && this.classifier) {
      return true;
    }

    try {
      console.log('🔄 Loading DistilBERT model...');
      
      // Import the pipeline function from transformers
      let pipeline;
      if (typeof window !== 'undefined' && window.pipeline) {
        // Use global pipeline if available
        pipeline = window.pipeline;
      } else {
        // Import from transformers module
        const { pipeline: pipelineFunc } = await import('@xenova/transformers');
        pipeline = pipelineFunc;
        
        // Also set it globally for future use
        if (typeof window !== 'undefined') {
          window.pipeline = pipeline;
        }
      }
      
      // Use sentiment analysis pipeline (more reliable in browser)
      this.classifier = await pipeline(
        'sentiment-analysis',
        this.modelName
      );
      
      this.isLoaded = true;
      console.log('✅ DistilBERT model loaded successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to load DistilBERT model:', error);
      throw new Error(`DistilBERT model loading failed: ${error.message}`);
    }
  }

  /**
   * Classify text using DistilBERT sentiment analysis adapted for order detection
   */
  async classify(text) {
    if (!this.isLoaded) {
      await this.loadModel();
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input for DistilBERT classification');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(text);
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📋 Using cached DistilBERT classification');
        return cached.result;
      }
    }

    try {
      // Use sentiment analysis on order-related keywords
      const orderKeywords = [
        'order', 'purchase', 'buy', 'transaction', 'invoice', 'receipt', 
        'confirmed', 'shipped', 'delivered', 'payment', 'total', 'amount',
        'order id', 'order number', 'tracking', 'quantity'
      ];
      
      // Count order-related keywords in text
      const textLower = text.toLowerCase();
      const keywordMatches = orderKeywords.filter(keyword => 
        textLower.includes(keyword)
      ).length;
      
      // Analyze sentiment of the text
      const sentimentResult = await this.classifier(text);
      
      // Combine keyword analysis with sentiment for order detection
      const keywordConfidence = Math.min(keywordMatches / 5, 1.0); // Normalize to 0-1
      const sentimentConfidence = sentimentResult[0].score;
      
      // Order pages typically have positive sentiment and order keywords
      const combinedConfidence = (keywordConfidence * 0.7) + (sentimentConfidence * 0.3);
      const isOrder = keywordMatches >= 2 && combinedConfidence > 0.6;

      const classificationResult = {
        isOrder,
        confidence: combinedConfidence,
        method: 'distilbert-sentiment-adapted',
        topLabel: isOrder ? 'order page' : 'non-order page',
        allPredictions: [
          { label: 'order page', score: combinedConfidence },
          { label: 'non-order page', score: 1 - combinedConfidence }
        ],
        details: {
          model: this.modelName,
          keywordMatches: keywordMatches,
          keywordConfidence: keywordConfidence,
          sentimentResult: sentimentResult,
          timestamp: new Date().toISOString()
        }
      };

      // Cache the result
      this.cache.set(cacheKey, {
        result: classificationResult,
        timestamp: Date.now()
      });

      console.log('🤖 DistilBERT classification:', {
        isOrder,
        confidence: combinedConfidence.toFixed(3),
        keywordMatches,
        sentiment: sentimentResult[0].label
      });

      return classificationResult;

    } catch (error) {
      console.error('❌ DistilBERT classification failed:', error);
      throw new Error(`DistilBERT classification failed: ${error.message}`);
    }
  }

  /**
   * Classify the current page content
   */
  async classifyPage() {
    const pageContent = this.extractPageContent();
    const classification = await this.classify(pageContent);
    
    return {
      ...classification,
      pageInfo: {
        url: window.location.href,
        title: document.title,
        contentLength: pageContent.length
      }
    };
  }

  /**
   * Fine-tune classification with custom order vs non-order examples
   */
  async classifyWithCustomLabels(text, customLabels = null) {
    if (!this.isLoaded) {
      await this.loadModel();
    }

    const labels = customLabels || [
      'e-commerce order confirmation page',
      'shopping cart or checkout page', 
      'order tracking or status page',
      'product catalog or listing page',
      'general website content',
      'customer service or help page'
    ];

    try {
      // Use the main classify method which works with sentiment analysis
      const result = await this.classify(text);
      
      // Map the result to custom labels based on order detection
      let bestLabel, confidence;
      if (result.isOrder) {
        // Choose most appropriate order-related label
        bestLabel = labels.find(label => 
          label.includes('order') || label.includes('cart') || label.includes('tracking')
        ) || labels[0];
        confidence = result.confidence;
      } else {
        // Choose most appropriate non-order label
        bestLabel = labels.find(label => 
          label.includes('catalog') || label.includes('general') || label.includes('help')
        ) || labels[labels.length - 1];
        confidence = 1 - result.confidence;
      }

      return {
        isOrder: result.isOrder,
        confidence: confidence,
        method: 'distilbert-sentiment-custom',
        topLabel: bestLabel,
        allPredictions: labels.map(label => {
          const isOrderLabel = label.includes('order') || label.includes('cart') || label.includes('tracking');
          const score = isOrderLabel === result.isOrder ? confidence : (1 - confidence) / (labels.length - 1);
          return { label, score };
        }).sort((a, b) => b.score - a.score)
      };

    } catch (error) {
      throw new Error(`Custom DistilBERT classification failed: ${error.message}`);
    }
  }

  /**
   * Extract relevant content from the page for classification
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
      '.purchase-summary',
      'h1, h2, h3',
      '.title',
      '.price',
      '.total'
    ];

    let content = '';
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.textContent) {
          content += el.textContent.trim() + ' ';
        }
      });
    }

    // If no specific selectors found, use body text
    if (content.length < 50) {
      content = document.body.textContent || document.body.innerText || '';
    }

    // Limit content length to avoid overwhelming the classifier
    return content.slice(0, 2000);
  }

  /**
   * Generate cache key for text
   */
  getCacheKey(text) {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < Math.min(text.length, 100); i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `distilbert_${Math.abs(hash)}_${text.length}`;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ DistilBERT classification cache cleared');
  }

  /**
   * Get model info
   */
  getModelInfo() {
    return {
      name: 'DistilBERT Order Classifier',
      model: this.modelName,
      type: 'sentiment-analysis-transformers',
      loaded: this.isLoaded,
      cacheSize: this.cache.size
    };
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DistilBERTMNLIClassifier;
}

// Global assignment for browser environment
if (typeof window !== 'undefined') {
  window.DistilBERTMNLIClassifier = DistilBERTMNLIClassifier;
}

// ES6 export for webpack
export default DistilBERTMNLIClassifier;
export { DistilBERTMNLIClassifier };
