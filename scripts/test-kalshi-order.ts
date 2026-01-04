import 'dotenv/config';
import { getKalshiMarketService, getKalshiTradeService } from '../src/services';

async function testKalshiOrder() {
  console.log('🔍 Testing Kalshi Order Creation...\n');

  try {
    // Step 1: Get a market
    const marketService = getKalshiMarketService();
    console.log('📊 Fetching markets...');
    const marketsResponse = await marketService.getMarkets({ limit: 5, status: 'open' });
    
    if (!marketsResponse || !marketsResponse.markets || marketsResponse.markets.length === 0) {
      console.error('❌ No open markets found');
      return;
    }

    const market = marketsResponse.markets[0];
    console.log(`\n✅ Found market: ${market.ticker}`);
    console.log(`   Title: ${market.title}`);
    console.log(`   Status: ${market.status}`);
    console.log(`   Yes Bid: ${market.yes_bid}¢`);
    console.log(`   No Bid: ${market.no_bid}¢`);

    // Step 2: Calculate order params
    const side = 'yes';
    const price = market.yes_bid || 50;
    const amount = 10; // $10
    const count = Math.floor((amount * 100) / price);

    console.log(`\n📝 Order Parameters:`);
    console.log(`   Ticker: ${market.ticker}`);
    console.log(`   Side: ${side}`);
    console.log(`   Action: buy`);
    console.log(`   Count: ${count}`);
    console.log(`   Type: market`);
    console.log(`   Estimated Price: ${price}¢`);
    console.log(`   Amount: $${amount}`);

    // Step 3: Check balance
    const tradeService = getKalshiTradeService();
    const balance = await tradeService.getBalance();
    console.log(`\n💰 Account Balance: $${(balance.balance / 100).toFixed(2)}`);

    if (balance.balance < amount * 100) {
      console.error(`❌ Insufficient balance. Need $${amount}, have $${(balance.balance / 100).toFixed(2)}`);
      return;
    }

    // Step 4: Try to place order
    console.log('\n🚀 Placing order...');
    
    const orderParams: any = {
      ticker: market.ticker,
      action: 'buy' as const,
      side: side as 'yes' | 'no',
      count: count,
      type: 'market' as const,
    };

    // Add price based on side - even market orders need a price!
    if (side === 'yes') {
      orderParams.yes_price = price;
    } else {
      orderParams.no_price = price;
    }

    console.log('\n📤 Sending order with params:');
    console.log(JSON.stringify(orderParams, null, 2));

    const order = await tradeService.createOrder(orderParams);

    console.log('\n✅ Order placed successfully!');
    console.log(`   Order ID: ${order.order_id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Fill Count: ${order.fill_count || 0}`);
    console.log(`   Remaining Count: ${order.remaining_count}`);
    console.log(`   Average Price: ${order.yes_price || order.no_price}¢`);
    console.log(`   Total Cost: $${((order.taker_fill_cost || 0) / 100).toFixed(2)}`);
    console.log(`   Fees: $${((order.taker_fees || 0) / 100).toFixed(2)}`);

  } catch (error: any) {
    console.error('\n❌ Order failed!');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('\nAPI Response:');
      console.error('  Status:', error.response.status);
      console.error('  Status Text:', error.response.statusText);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

testKalshiOrder();
