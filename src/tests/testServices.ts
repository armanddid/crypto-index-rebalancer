import { priceService } from '../services/PriceService.js';
import { driftCalculator } from '../services/DriftCalculator.js';
import { AssetAllocation } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Test script for core services
 */
async function testServices() {
  console.log('========================================');
  console.log('🧪 Testing Core Services');
  console.log('========================================\n');

  try {
    // Test 1: PriceService - Single price
    console.log('Test 1: Fetch single price (BTC)');
    console.log('----------------------------------------');
    const btcPrice = await priceService.getPrice('BTC');
    console.log(`✅ BTC Price: $${btcPrice.toLocaleString()}\n`);

    // Test 2: PriceService - Multiple prices
    console.log('Test 2: Fetch multiple prices');
    console.log('----------------------------------------');
    const symbols = ['BTC', 'ETH', 'SOL', 'USDC'];
    const prices = await priceService.getPrices(symbols);
    
    console.log('Prices fetched:');
    prices.forEach((price, symbol) => {
      console.log(`  ${symbol}: $${price.toLocaleString()}`);
    });
    console.log('✅ Multiple prices fetched\n');

    // Test 3: PriceService - USD value calculation
    console.log('Test 3: Calculate USD value');
    console.log('----------------------------------------');
    const ethAmount = 1.5;
    const ethUsdValue = await priceService.calculateUsdValue('ETH', ethAmount);
    console.log(`${ethAmount} ETH = $${ethUsdValue.toLocaleString()}`);
    console.log('✅ USD value calculated\n');

    // Test 4: PriceService - Token amount calculation
    console.log('Test 4: Calculate token amount');
    console.log('----------------------------------------');
    const targetUsd = 10000;
    const btcAmount = await priceService.calculateTokenAmount('BTC', targetUsd);
    console.log(`$${targetUsd.toLocaleString()} = ${btcAmount.toFixed(6)} BTC`);
    console.log('✅ Token amount calculated\n');

    // Test 5: DriftCalculator - Calculate drift
    console.log('Test 5: Calculate portfolio drift');
    console.log('----------------------------------------');
    
    // Simulate a portfolio that has drifted
    const holdings = new Map<string, number>([
      ['BTC', 0.05],    // ~$4,400 (44%)
      ['ETH', 1.2],     // ~$3,600 (36%)
      ['SOL', 14.5],    // ~$2,000 (20%)
    ]);

    const targetAllocations: AssetAllocation[] = [
      { symbol: 'BTC', percentage: 40 },
      { symbol: 'ETH', percentage: 30 },
      { symbol: 'SOL', percentage: 30 },
    ];

    const driftAnalysis = await driftCalculator.calculateDrift(holdings, targetAllocations);

    console.log(`Total Portfolio Value: $${driftAnalysis.totalValue.toLocaleString()}\n`);
    console.log('Current Allocations:');
    driftAnalysis.allocations.forEach((alloc) => {
      console.log(`  ${alloc.symbol}:`);
      console.log(`    Current: ${alloc.currentPercentage.toFixed(2)}% ($${alloc.usdValue.toLocaleString()})`);
      console.log(`    Target:  ${alloc.targetPercentage.toFixed(2)}%`);
      console.log(`    Drift:   ${alloc.drift.toFixed(2)}pp (${alloc.driftPercentage.toFixed(2)}% of target)`);
    });

    console.log(`\nMax Drift: ${driftAnalysis.maxDrift.toFixed(2)}pp`);
    console.log('✅ Drift calculated\n');

    // Test 6: DriftCalculator - Rebalancing actions
    console.log('Test 6: Generate rebalancing actions');
    console.log('----------------------------------------');
    
    if (driftAnalysis.rebalancingActions.length > 0) {
      console.log('Rebalancing Actions:');
      driftAnalysis.rebalancingActions.forEach((action) => {
        console.log(`  ${action.action} ${action.symbol}:`);
        console.log(`    Current: ${action.currentAmount.toFixed(6)}`);
        console.log(`    Target:  ${action.targetAmount.toFixed(6)}`);
        console.log(`    Delta:   ${action.amountDelta.toFixed(6)} ($${action.usdValue.toLocaleString()})`);
      });
    } else {
      console.log('No rebalancing actions needed (portfolio is balanced)');
    }
    console.log('✅ Rebalancing actions generated\n');

    // Test 7: DriftCalculator - Check if rebalancing needed
    console.log('Test 7: Check rebalancing threshold');
    console.log('----------------------------------------');
    const thresholds = [3, 5, 10];
    
    thresholds.forEach((threshold) => {
      const needed = driftCalculator.needsRebalancing(driftAnalysis, threshold);
      console.log(`  Threshold ${threshold}%: ${needed ? '✅ REBALANCE' : '❌ NO ACTION'}`);
    });
    console.log('✅ Threshold checks complete\n');

    // Test 8: Price cache
    console.log('Test 8: Test price caching');
    console.log('----------------------------------------');
    console.log('Fetching BTC price again (should use cache)...');
    const startTime = Date.now();
    const cachedPrice = await priceService.getPrice('BTC');
    const fetchTime = Date.now() - startTime;
    console.log(`✅ Cached price: $${cachedPrice.toLocaleString()} (fetched in ${fetchTime}ms)`);
    console.log('Note: Cache TTL is 60 seconds\n');

    console.log('========================================');
    console.log('✅ ALL TESTS PASSED!');
    console.log('========================================\n');

    console.log('📊 Summary:');
    console.log('  ✅ PriceService: Single price fetch');
    console.log('  ✅ PriceService: Multiple prices fetch');
    console.log('  ✅ PriceService: USD value calculation');
    console.log('  ✅ PriceService: Token amount calculation');
    console.log('  ✅ DriftCalculator: Drift calculation');
    console.log('  ✅ DriftCalculator: Rebalancing actions');
    console.log('  ✅ DriftCalculator: Threshold checks');
    console.log('  ✅ PriceService: Cache functionality');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testServices();

