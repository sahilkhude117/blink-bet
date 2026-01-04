/**
 * Test Kalshi API Authentication
 * Run with: npx tsx scripts/test-kalshi-auth.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testKalshiAuth() {
  console.log('\n🔍 Testing Kalshi API Authentication...\n');

  // Check environment variables
  const apiUrl = process.env.KALSHI_API_URL;
  const apiKey = process.env.KALSHI_API_KEY;
  const privateKey = process.env.KALSHI_PRIVATE_KEY;

  console.log('📋 Configuration:');
  console.log(`   API URL: ${apiUrl || '❌ NOT SET'}`);
  console.log(`   API Key: ${apiKey ? `✅ ${apiKey.slice(0, 10)}...` : '❌ NOT SET'}`);
  console.log(`   Private Key: ${privateKey ? `✅ Set (${privateKey.length} chars)` : '❌ NOT SET'}\n`);

  if (!apiUrl || !apiKey || !privateKey) {
    console.error('❌ Missing required environment variables!');
    console.log('\n📝 Please set in .env file:');
    console.log('   KALSHI_API_URL=https://demo-api.kalshi.co/trade-api/v2');
    console.log('   KALSHI_API_KEY=your-api-key');
    console.log('   KALSHI_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\\n...\\n-----END RSA PRIVATE KEY-----"');
    console.log('\n💡 Get credentials at: https://kalshi.com/account/api');
    process.exit(1);
  }

  // Test authentication by getting balance
  try {
    const { getKalshiTradeService } = await import('../src/services');
    const tradeService = getKalshiTradeService();
    
    console.log('🔐 Testing authentication...');
    const balance = await tradeService.getBalance();
    
    console.log('\n✅ Authentication successful!');
    console.log(`💰 Account balance: $${(balance.balance / 100).toFixed(2)}`);
    
  } catch (error: any) {
    console.error('\n❌ Authentication failed!');
    console.error(`   Error: ${error.message}`);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Verify your API key and private key are correct');
    console.log('   2. Check if using demo API (https://demo-api.kalshi.co) or production (https://api.kalshi.co)');
    console.log('   3. Ensure private key format includes newlines: "-----BEGIN RSA PRIVATE KEY-----\\n...\\n-----END RSA PRIVATE KEY-----"');
    console.log('   4. Generate new credentials at: https://kalshi.com/account/api');
    
    process.exit(1);
  }
}

testKalshiAuth();
