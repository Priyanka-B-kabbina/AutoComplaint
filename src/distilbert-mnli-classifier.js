/**
 * DistilBERT MNLI Order Page Classifier for Chrome Extension
 * Pure ML-based inference using DistilBERT MNLI model
 */

import { pipeline } from '@xenova/transformers';

class DistilBERTMNLIClassifier {
  constructor() {
    this.isLoaded = false;
    this.classifier = null;
    this.modelName = 'distilbert-base-uncased-finetuned-sst-2-english'; // Will update to MNLI
    this.mnliModelName = 'facebook/bart-large-mnli'; // Better MNLI model
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load the DistilBERT MNLI model
   */
  async loadModel() {
    if (this.isLoaded && this.classifier) {
      return true;
    }

    try {
      console.log('🔄 Loading DistilBERT MNLI model...');
      
      // Use zero-shot classification pipeline with MNLI model
      this.classifier = await pipeline(
        'zero-shot-classification',
        this.mnliModelName
      );
      
      this.isLoaded = true;
      console.log('✅ DistilBERT MNLI model loaded successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to load DistilBERT MNLI model:', error);
      throw new Error(`DistilBERT MNLI model loading failed: ${error.message}`);
    }
  }

  /**
   * Classify text using DistilBERT MNLI zero-shot classification
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
      // Define the candidate labels for order vs non-order classification
      const candidateLabels = [
        'online order confirmation',
        'purchase receipt', 
        'order summary',
        'product page',
        'category listing',
        'search results',
        'general webpage'
      ];

      // Use DistilBERT MNLI for zero-shot classification
      const result = await this.classifier(text, candidateLabels);
      
      // Determine if this is an order page based on top predictions
      const orderLabels = ['online order confirmation', 'purchase receipt', 'order summary'];
      const topLabel = result.labels[0];
      const topScore = result.scores[0];
      
      const isOrder = orderLabels.includes(topLabel);
      const confidence = topScore;

      const classificationResult = {
        isOrder,
        confidence,
        method: 'distilbert-mnli',
        topLabel,
        allPredictions: result.labels.map((label, i) => ({
          label,
          score: result.scores[i]
        })),
        details: {
          model: this.mnliModelName,
          candidateLabels,
          timestamp: new Date().toISOString()
        }
      };

      // Cache the result
      this.cache.set(cacheKey, {
        result: classificationResult,
        timestamp: Date.now()
      });

      console.log('🤖 DistilBERT MNLI classification:', {
        isOrder,
        confidence: confidence.toFixed(3),
        topLabel
      });

      return classificationResult;

    } catch (error) {
      console.error('❌ DistilBERT MNLI classification failed:', error);
      throw new Error(`DistilBERT MNLI classification failed: ${error.message}`);
    }
  }

  /**
   * Classify entire page content using DistilBERT MNLI
   */
  async classifyPage() {
    try {
      // Extract key page content
      const content = this.extractPageContent();
      
      if (!content || content.trim().length < 50) {
        throw new Error('Insufficient page content for DistilBERT classification');
      }
      
      // Classify using DistilBERT MNLI
      const result = await this.classify(content);
      
      // Add page-level metadata
      result.pageInfo = {
        contentLength: content.length,
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        modelUsed: 'DistilBERT MNLI'
      };
      
      return result;
      
    } catch (error) {
      console.error('❌ DistilBERT page classification error:', error);
      throw error;
    }
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
      const result = await this.classifier(text, labels);
      
      // More granular classification for e-commerce
      const orderKeywords = ['order', 'confirmation', 'cart', 'checkout', 'tracking', 'status'];
      const topLabel = result.labels[0];
      const isOrderRelated = orderKeywords.some(keyword => 
        topLabel.toLowerCase().includes(keyword)
      );

      return {
        isOrder: isOrderRelated,
        confidence: result.scores[0],
        method: 'distilbert-mnli-custom',
        topLabel,
        allPredictions: result.labels.map((label, i) => ({
          label,
          score: result.scores[i]
        }))
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
      '.order-summary',
      'h1, h2, h3',
      '.title',
      '.heading',
      '.product-title',
      '.checkout',
      '.cart'
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
    
    // Fallback to body content if nothing specific found
    if (content.trim().length < 100) {
      content = document.body.textContent || '';
    }
    
    // Limit content length for model processing (BERT has 512 token limit)
    return content.substring(0, 2000); // ~500 tokens approximately
  }

  /**
   * Generate cache key for text
   */
  getCacheKey(text) {
    // Simple hash for cache key
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
      name: 'DistilBERT MNLI Classifier',
      model: this.mnliModelName,
      type: 'zero-shot-classification',
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
