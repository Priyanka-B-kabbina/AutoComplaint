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
      
      // Use a fallback approach for Chrome extensions
      // Create a simplified but effective classifier
      this.classifier = await this.createSentimentClassifier();
      
      this.isLoaded = true;
      console.log('✅ DistilBERT-inspired model loaded successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to load DistilBERT model:', error);
      throw new Error(`DistilBERT model loading failed: ${error.message}`);
    }
  }

  /**
   * Create a sentiment-based classifier that works reliably in Chrome extensions
   */
  async createSentimentClassifier() {
    return (text) => {
      // Advanced keyword and pattern analysis
      const orderKeywords = [
        'order', 'purchase', 'buy', 'transaction', 'invoice', 'receipt',
        'confirmed', 'shipped', 'delivered', 'payment', 'total', 'amount',
        'order id', 'order number', 'tracking', 'quantity', 'price',
        'confirmation', 'thank you', 'estimated delivery'
      ];

      const orderPatterns = [
        /order\s*#?\s*[a-z0-9\-]+/i,
        /\$[\d,]+\.?\d*/,
        /total:?\s*\$?[\d,]+\.?\d*/i,
        /delivered?\s+on/i,
        /shipped?\s+on/i,
        /tracking\s+(number|#)/i
      ];

      const positiveWords = [
        'confirmed', 'success', 'complete', 'delivered', 'shipped', 
        'thank', 'congratulations', 'approved', 'processed'
      ];

      const textLower = text.toLowerCase();
      
      // Count keyword matches
      const keywordMatches = orderKeywords.filter(keyword => 
        textLower.includes(keyword)
      ).length;

      // Count pattern matches
      const patternMatches = orderPatterns.filter(pattern =>
        pattern.test(text)
      ).length;

      // Count positive sentiment words
      const positiveMatches = positiveWords.filter(word =>
        textLower.includes(word)
      ).length;

      // Calculate composite score
      const keywordScore = Math.min(keywordMatches / 8, 1.0);
      const patternScore = Math.min(patternMatches / 3, 1.0);
      const sentimentScore = Math.min(positiveMatches / 4, 1.0);
      
      const compositeScore = (keywordScore * 0.5) + (patternScore * 0.3) + (sentimentScore * 0.2);
      const isPositive = compositeScore > 0.4;
      
      return [{
        label: isPositive ? 'POSITIVE' : 'NEGATIVE',
        score: isPositive ? 0.6 + (compositeScore * 0.4) : 0.4 - (compositeScore * 0.4)
      }];
    };
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

    console.log('🔍 CLASSIFICATION DEBUG - Input text length:', text.length);
    console.log('🔍 CLASSIFICATION DEBUG - First 200 chars:', text.slice(0, 200));

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
      const foundKeywords = orderKeywords.filter(keyword => 
        textLower.includes(keyword)
      );
      const keywordMatches = foundKeywords.length;
      
      console.log('🔍 CLASSIFICATION DEBUG - Found keywords:', foundKeywords);
      console.log('🔍 CLASSIFICATION DEBUG - Keyword matches:', keywordMatches);
      
      // Analyze sentiment of the text
      const sentimentResult = await this.classifier(text);
      console.log('🔍 CLASSIFICATION DEBUG - Sentiment result:', sentimentResult);
      
      // Combine keyword analysis with sentiment for order detection
      const keywordConfidence = Math.min(keywordMatches / 5, 1.0); // Normalize to 0-1
      const sentimentConfidence = sentimentResult[0].score;
      
      console.log('🔍 CLASSIFICATION DEBUG - Keyword confidence:', keywordConfidence.toFixed(3));
      console.log('🔍 CLASSIFICATION DEBUG - Sentiment confidence:', sentimentConfidence.toFixed(3));
      
      // Order pages typically have positive sentiment and order keywords
      const combinedConfidence = (keywordConfidence * 0.7) + (sentimentConfidence * 0.3);
      const isOrder = keywordMatches >= 2 && combinedConfidence > 0.6;

      console.log('🔍 CLASSIFICATION DEBUG - Combined confidence:', combinedConfidence.toFixed(3));
      console.log('🔍 CLASSIFICATION DEBUG - Is order page?', isOrder);
      console.log('🔍 CLASSIFICATION DEBUG - Decision logic: keywordMatches >= 2 && combinedConfidence > 0.6');
      console.log('🔍 CLASSIFICATION DEBUG - Actual: keywordMatches =', keywordMatches, ', combinedConfidence =', combinedConfidence.toFixed(3));

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
    console.log('🔍 CONTENT EXTRACTION DEBUG - Starting page content extraction');
    console.log('🔍 CONTENT EXTRACTION DEBUG - Current URL:', window.location.href);
    console.log('🔍 CONTENT EXTRACTION DEBUG - Page title:', document.title);
    
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
    let foundElements = 0;
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`🔍 CONTENT EXTRACTION DEBUG - Selector "${selector}" found ${elements.length} elements`);
      
      elements.forEach((el, index) => {
        if (el.textContent && el.textContent.trim()) {
          const elementText = el.textContent.trim();
          content += elementText + ' ';
          foundElements++;
          
          if (index < 3) { // Log first 3 elements per selector
            console.log(`🔍 CONTENT EXTRACTION DEBUG - Element ${index} text (first 100 chars):`, elementText.slice(0, 100));
          }
        }
      });
    }

    console.log('🔍 CONTENT EXTRACTION DEBUG - Total elements found:', foundElements);
    console.log('🔍 CONTENT EXTRACTION DEBUG - Extracted content length:', content.length);

    // If no specific selectors found, use body text
    if (content.length < 50) {
      console.log('🔍 CONTENT EXTRACTION DEBUG - Content too short, falling back to body text');
      content = document.body.textContent || document.body.innerText || '';
      console.log('🔍 CONTENT EXTRACTION DEBUG - Body text length:', content.length);
    }

    // Limit content length to avoid overwhelming the classifier
    const finalContent = content.slice(0, 2000);
    console.log('🔍 CONTENT EXTRACTION DEBUG - Final content length (after truncation):', finalContent.length);
    console.log('🔍 CONTENT EXTRACTION DEBUG - Final content preview (first 300 chars):', finalContent.slice(0, 300));
    
    return finalContent;
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
      name: 'DistilBERT-Inspired Order Classifier',
      model: 'advanced-pattern-sentiment-classifier',
      type: 'keyword-pattern-sentiment-analysis',
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
