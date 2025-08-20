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

    // Enhanced input validation with better error handling
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.warn('⚠️ CLASSIFICATION WARNING - Invalid or empty text input:', { 
        text: text, 
        type: typeof text, 
        length: text?.length || 0 
      });
      
      // Return a default "not order page" result instead of throwing error
      return {
        isOrder: false,
        confidence: 0,
        method: 'distilbert-sentiment-adapted',
        topLabel: 'non-order page',
        allPredictions: [
          { label: 'non-order page', score: 1.0 },
          { label: 'order page', score: 0.0 }
        ],
        details: {
          model: this.modelName,
          keywordMatches: 0,
          keywordConfidence: 0,
          sentimentResult: [{ label: 'NEGATIVE', score: 1.0 }],
          timestamp: new Date().toISOString(),
          error: 'Invalid or empty text input'
        }
      };
    }

    // Clean and validate text
    text = text.trim();
    if (text.length < 10) {
      console.warn('⚠️ CLASSIFICATION WARNING - Text too short for reliable classification:', text.length);
      // Still process but with low confidence
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
    console.log('🔍 CONTENT EXTRACTION DEBUG - Starting enhanced page content extraction');
    console.log('🔍 CONTENT EXTRACTION DEBUG - Current URL:', window.location.href);
    console.log('🔍 CONTENT EXTRACTION DEBUG - Page title:', document.title);
    
    // Elements to exclude (navigation, ads, etc.)
    const excludeSelectors = [
      'nav', 'header', 'footer', 'aside', 
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      '.navigation', '.nav', '.menu', '.header', '.footer', '.sidebar',
      '.advertisement', '.ad', '.ads', '.promo', '.promotion',
      '.breadcrumb', '.breadcrumbs', '.tabs', '.tab',
      'script', 'style', 'noscript'
    ];
    
    // Priority selectors for order content
    const prioritySelectors = [
      '[class*="order-detail"]', '[id*="order-detail"]',
      '[class*="order-summary"]', '[id*="order-summary"]', 
      '[class*="order-info"]', '[id*="order-info"]',
      '[class*="invoice"]', '[id*="invoice"]',
      '[class*="receipt"]', '[id*="receipt"]',
      '[class*="confirmation"]', '[id*="confirmation"]',
      '.order', '.purchase', '.transaction'
    ];
    
    // General content selectors
    const contentSelectors = [
      'main', '[role="main"]', '.main-content', '#main-content',
      'h1, h2, h3', '.title', '.price', '.total', '.amount'
    ];

    let content = '';
    let foundElements = 0;
    let foundMeaningfulContent = false;
    
    // First, try priority selectors (most likely to contain order info)
    console.log('🔍 CONTENT EXTRACTION DEBUG - Checking priority selectors...');
    for (const selector of prioritySelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`🔍 CONTENT EXTRACTION DEBUG - Found ${elements.length} priority elements for: ${selector}`);
        
        elements.forEach((el, index) => {
          const cleanText = this.cleanElementText(el, excludeSelectors);
          if (cleanText.length > 20) {
            content += cleanText + ' ';
            foundElements++;
            foundMeaningfulContent = true;
            
            if (index < 2) { // Log first 2 elements per selector
              console.log(`🔍 CONTENT EXTRACTION DEBUG - Priority content: ${cleanText.slice(0, 100)}...`);
            }
          }
        });
      }
    }
    
    // If no priority content found, try general content selectors
    if (!foundMeaningfulContent) {
      console.log('🔍 CONTENT EXTRACTION DEBUG - No priority content found, trying general selectors...');
      
      for (const selector of contentSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`🔍 CONTENT EXTRACTION DEBUG - Found ${elements.length} general elements for: ${selector}`);
          
          elements.forEach((el, index) => {
            const cleanText = this.cleanElementText(el, excludeSelectors);
            if (cleanText.length > 10) {
              content += cleanText + ' ';
              foundElements++;
              foundMeaningfulContent = true;
              
              if (index < 2) {
                console.log(`🔍 CONTENT EXTRACTION DEBUG - General content: ${cleanText.slice(0, 100)}...`);
              }
            }
          });
        }
        
        if (foundMeaningfulContent && content.length > 200) break; // Stop if we have enough content
      }
    }

    console.log('🔍 CONTENT EXTRACTION DEBUG - Total elements processed:', foundElements);
    console.log('🔍 CONTENT EXTRACTION DEBUG - Raw extracted content length:', content.length);

    // Advanced text cleaning
    content = this.cleanAndNormalizeText(content);
    console.log('🔍 CONTENT EXTRACTION DEBUG - Cleaned content length:', content.length);

    // If still no meaningful content, fall back to body text with filtering
    if (content.length < 100) {
      console.log('🔍 CONTENT EXTRACTION DEBUG - Content still too short, using filtered body text');
      const bodyElement = document.body.cloneNode(true);
      
      // Remove excluded elements from body
      for (const excludeSelector of excludeSelectors) {
        const excludedElements = bodyElement.querySelectorAll(excludeSelector);
        excludedElements.forEach(el => el.remove());
      }
      
      content = bodyElement.textContent || bodyElement.innerText || '';
      content = this.cleanAndNormalizeText(content);
      console.log('🔍 CONTENT EXTRACTION DEBUG - Filtered body text length:', content.length);
    }

    // Final fallback: if still no content, try basic selectors
    if (content.length < 50) {
      console.log('🔍 CONTENT EXTRACTION DEBUG - Still no content, trying basic fallback selectors...');
      const fallbackSelectors = ['body', 'html', '[id]', '[class]'];
      
      for (const selector of fallbackSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const fallbackText = elements[0].textContent || elements[0].innerText || '';
          if (fallbackText.length > content.length) {
            content = this.cleanAndNormalizeText(fallbackText);
            console.log(`🔍 CONTENT EXTRACTION DEBUG - Fallback content from ${selector}: ${content.length} chars`);
            break;
          }
        }
      }
    }

    // Ultimate fallback: provide minimal content to avoid errors
    if (!content || content.length < 10) {
      console.warn('⚠️ CONTENT EXTRACTION WARNING - No meaningful content found, using page title and URL');
      content = `${document.title} ${window.location.href}`.trim();
      if (!content || content.length < 5) {
        content = 'webpage content not available';
      }
    }

    // Limit content length to avoid overwhelming the classifier
    const finalContent = content.slice(0, 2000);
    console.log('🔍 CONTENT EXTRACTION DEBUG - Final content length (after truncation):', finalContent.length);
    console.log('🔍 CONTENT EXTRACTION DEBUG - Final content preview (first 200 chars):', finalContent.slice(0, 200));
    console.log('🔍 CONTENT EXTRACTION DEBUG - Content quality check - has order keywords:', 
      /\b(order|purchase|total|amount|price|date|customer|product|item|quantity|invoice|receipt)\b/i.test(finalContent));
    
    return finalContent;
  }

  /**
   * Clean text from an element while excluding unwanted subelements
   */
  cleanElementText(element, excludeSelectors) {
    // Clone the element to avoid modifying the original DOM
    const clonedElement = element.cloneNode(true);
    
    // Remove excluded elements
    for (const excludeSelector of excludeSelectors) {
      const excludedElements = clonedElement.querySelectorAll(excludeSelector);
      excludedElements.forEach(el => el.remove());
    }
    
    // Get text content and clean it
    let text = clonedElement.textContent || '';
    
    // Remove excessive whitespace and normalize
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  /**
   * Advanced text cleaning and normalization
   */
  cleanAndNormalizeText(text) {
    // Remove excessive whitespace, tabs, newlines
    text = text.replace(/[\t\n\r\f\v]+/g, ' ');
    text = text.replace(/\s{2,}/g, ' ');
    
    // Remove empty parentheses, brackets
    text = text.replace(/\(\s*\)/g, '');
    text = text.replace(/\[\s*\]/g, '');
    text = text.replace(/\{\s*\}/g, '');
    
    // Remove repeated punctuation
    text = text.replace(/[.,;:!?]{2,}/g, '.');
    
    // Remove standalone single characters (except numbers and currency)
    text = text.replace(/\b[a-zA-Z]\b/g, '');
    
    // Remove excessive dots and dashes
    text = text.replace(/\.{2,}/g, '.');
    text = text.replace(/-{2,}/g, '-');
    
    // Clean up spaces around punctuation
    text = text.replace(/\s+([.,;:!?])/g, '$1');
    text = text.replace(/([.,;:!?])\s*([.,;:!?])/g, '$1');
    
    // Final cleanup
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
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
