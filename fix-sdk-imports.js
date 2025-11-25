#!/usr/bin/env node

/**
 * Fix ESM import issues in @defuse-protocol/intents-sdk
 * The SDK has imports without .js extensions which fail in strict ESM mode
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filesToFix = [
  'node_modules/@defuse-protocol/intents-sdk/dist/src/intents/expirable-nonce.js',
  'node_modules/@defuse-protocol/intents-sdk/dist/src/intents/intent-builder.js',
  'node_modules/@defuse-protocol/intents-sdk/dist/src/sdk.js',
];

console.log('🔧 Fixing ESM imports in @defuse-protocol/intents-sdk...');

let fixedCount = 0;

filesToFix.forEach(filePath => {
  const fullPath = join(__dirname, filePath);
  
  try {
    let content = readFileSync(fullPath, 'utf8');
    let modified = false;
    
    // Fix near-api-js imports without .js extension
    const patterns = [
      { from: /from ['"]near-api-js\/lib\/utils\/serialize['"]/g, to: 'from "near-api-js/lib/utils/serialize.js"' },
      { from: /from ['"]near-api-js\/lib\/key_stores['"]/g, to: 'from "near-api-js/lib/key_stores/index.js"' },
      { from: /from ['"]near-api-js\/lib\/account['"]/g, to: 'from "near-api-js/lib/account.js"' },
      { from: /from ['"]near-api-js\/lib\/providers['"]/g, to: 'from "near-api-js/lib/providers/index.js"' },
      { from: /from ['"]near-api-js\/lib\/utils\/key_pair['"]/g, to: 'from "near-api-js/lib/utils/key_pair.js"' },
      { from: /from ['"]near-api-js\/lib\/transaction['"]/g, to: 'from "near-api-js/lib/transaction.js"' },
    ];
    
    patterns.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    });
    
    if (modified) {
      writeFileSync(fullPath, content, 'utf8');
      console.log(`  ✓ Fixed: ${filePath}`);
      fixedCount++;
    } else {
      console.log(`  - Skipped (no changes needed): ${filePath}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`  ⚠ Not found (may not be installed yet): ${filePath}`);
    } else {
      console.error(`  ✗ Error fixing ${filePath}:`, error.message);
    }
  }
});

console.log(`\n✅ Fixed ${fixedCount} file(s)`);

