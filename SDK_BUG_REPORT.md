# NEAR Intents SDK Bug Report

**Date**: November 25, 2024  
**SDK Version**: `@defuse-protocol/intents-sdk@0.36.2`  
**Status**: ❌ BLOCKING

---

## Error

```
SyntaxError: The requested module '@hot-labs/omni-sdk' does not provide an export named 'HotBridge'
    at ModuleJob._instantiate (node:internal/modules/esm/module_job:228:21)
```

## Root Cause

The SDK has a dependency on `@hot-labs/omni-sdk@2.20.2`, but the SDK is trying to import `HotBridge` which doesn't exist in that version of the package.

This is in the SDK's own code:
```javascript
// node_modules/@defuse-protocol/intents-sdk/dist/src/sdk.js:22
import { HotBridge } from "@hot-labs/omni-sdk";
```

## Impact

- ❌ Cannot use SDK to sign and submit INTENTS-to-INTENTS swaps
- ❌ Cannot execute automated portfolio construction
- ❌ Cannot execute automated rebalancing

## What We Tried

1. ✅ Installed SDK correctly
2. ✅ Created proper intent signer with EVM wallet
3. ✅ Implemented quote + SDK signing flow
4. ❌ SDK crashes on import due to dependency issue

## SDK Documentation Warning

The SDK README explicitly states:

> **Note**: Deposit functionality is not yet implemented in this SDK. Currently, use bridge interfaces directly for deposit operations.

And marks the SDK as "unstable":

> Although still under development and considered unstable, the Defuse SDK offers a comprehensive solution for cross-chain asset swaps.

## Possible Solutions

### Option 1: Wait for SDK Fix (Recommended)
Contact NEAR Intents team about this bug and wait for a fix.

**Pros**: Official, supported solution  
**Cons**: Unknown timeline

### Option 2: Try Older SDK Version
Try downgrading to an older version that might not have this bug.

**Pros**: Might work immediately  
**Cons**: May have other issues, missing features

### Option 3: Direct Protocol Integration
Bypass the SDK entirely and interact with the NEAR Intents protocol contracts directly.

**Pros**: Full control, no SDK dependencies  
**Cons**: Very complex, high maintenance

### Option 4: Hybrid Approach
Use 1Click API for quotes, implement our own intent signing and submission.

**Pros**: More control, can work around SDK issues  
**Cons**: Complex, need to understand protocol internals

## Recommendation

**Immediate**: Document this blocker and contact NEAR Intents team

**Short-term**: Try Option 2 (older SDK version) or Option 4 (custom signing)

**Long-term**: Wait for SDK stability improvements

## Contact Information

- **GitHub**: https://github.com/defuse-protocol/defuse-sdk
- **Documentation**: https://docs.near-intents.org
- **Discord**: (if available)

## Our Implementation

We have working code for:
- ✅ EVM wallet generation and management
- ✅ Quote generation from 1Click API
- ✅ Intent signer creation (crashes on SDK import)
- ✅ Database and API infrastructure

We just need a working SDK or alternative way to submit signed intents.

## Test Command

```bash
npm run test:sdk:swap
```

## Environment

- Node.js: v22.20.0
- TypeScript: Latest
- SDK: @defuse-protocol/intents-sdk@0.36.2
- OS: macOS

---

**Next Steps**:
1. Open GitHub issue on defuse-sdk repository
2. Try older SDK versions
3. Research direct protocol integration
4. Consider alternative approaches

