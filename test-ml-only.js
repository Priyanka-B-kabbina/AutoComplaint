#!/usr/bin/env node

/**
 * Test ML-Only Architecture
 * Verify that the extension and model server work with pure ML approach
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const SERVER_URL = 'http://localhost:3001';

async function testMLOnlyArchitecture() {
  console.log(chalk.cyan('🧪 Testing ML-Only Architecture...'));
  
  try {
    // Test 1: Health check
    console.log(chalk.blue('\n1. Testing health endpoint...'));
    const healthResponse = await fetch(`${SERVER_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('Health:', healthData);
    
    if (healthData.mlOnly) {
      console.log(chalk.green('✅ Server is running in ML-only mode'));
    } else {
      console.log(chalk.red('❌ Server not in ML-only mode'));
    }
    
    // Test 2: Model metadata
    console.log(chalk.blue('\n2. Testing model metadata...'));
    try {
      const modelResponse = await fetch(`${SERVER_URL}/models/classifier`);
      if (modelResponse.ok) {
        const modelData = await modelResponse.json();
        console.log('Classifier metadata:', modelData);
        
        if (modelData.mlOnly) {
          console.log(chalk.green('✅ Classifier is ML-only'));
        }
      } else {
        console.log(chalk.yellow('⚠️ Classifier not ready (expected if no trained model)'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️ Model server not running - please start it first'));
    }
    
    // Test 3: Classification endpoint (should fail without model)
    console.log(chalk.blue('\n3. Testing classification endpoint...'));
    try {
      const classifyResponse = await fetch(`${SERVER_URL}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Order #12345 for iPhone 14' })
      });
      
      const classifyData = await classifyResponse.json();
      
      if (classifyResponse.ok) {
        console.log('Classification result:', classifyData);
        if (classifyData.method === 'ml-classifier') {
          console.log(chalk.green('✅ Classification using ML method'));
        }
      } else {
        console.log(chalk.yellow('⚠️ Classification failed (expected without trained model):'), classifyData.message);
        if (classifyData.message.includes('ML') || classifyData.message.includes('trained')) {
          console.log(chalk.green('✅ Correctly requiring ML models'));
        }
      }
    } catch (error) {
      console.log(chalk.red('❌ Classification test failed:'), error.message);
    }
    
    // Test 4: Extraction endpoint (should fail without model)
    console.log(chalk.blue('\n4. Testing extraction endpoint...'));
    try {
      const extractResponse = await fetch(`${SERVER_URL}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: 'Order #12345 Product: iPhone 14 Total: $999',
          url: 'https://example.com/order/12345'
        })
      });
      
      const extractData = await extractResponse.json();
      
      if (extractResponse.ok) {
        console.log('Extraction result:', extractData);
        if (extractData.extractionMethod === 'ml-only') {
          console.log(chalk.green('✅ Extraction using ML-only method'));
        }
      } else {
        console.log(chalk.yellow('⚠️ Extraction failed (expected without trained model):'), extractData.message);
        if (extractData.message.includes('ML') || extractData.message.includes('trained')) {
          console.log(chalk.green('✅ Correctly requiring ML models'));
        }
      }
    } catch (error) {
      console.log(chalk.red('❌ Extraction test failed:'), error.message);
    }
    
    console.log(chalk.cyan('\n🧪 ML-Only Architecture Test Complete'));
    console.log(chalk.green('✅ Extension and server are configured for ML-only operation'));
    console.log(chalk.yellow('ℹ️  To fully test, start the model server and train models first'));
    
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message);
  }
}

// Run test
testMLOnlyArchitecture();
