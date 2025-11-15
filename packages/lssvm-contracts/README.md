# LSSVM Contracts

This package contains the Solidity contracts for the LSSVM (sudoAMM v2) protocol.

## Structure

- **`src/`** - Main Solidity contract source files
  - `bonding-curves/` - Price curve implementations
  - `erc721/` - ERC721 pair implementations
  - `erc1155/` - ERC1155 pair implementations
  - `property-checking/` - Property checker contracts
  - `royalty-auth/` - Royalty interface implementations
  - `settings/` - Settings contract implementations
  - `test/` - Test files
- **`script/`** - Deployment scripts
- **`lib/`** - Foundry dependencies

## Building

```bash
forge build
```

## Testing

```bash
forge test
```

For coverage:
```bash
forge coverage --report lcov
genhtml lcov.info -o report --branch
open report/index.html
```

## Deployment

See the [deployment guide](./script/README.md) for detailed instructions.

### Local Testing

Before deploying to testnet or mainnet, test deployments locally using Anvil:

```bash
# Start Anvil in one terminal
anvil

# Deploy to local node
./deploy-local.sh
```

For comprehensive local testing instructions including ERC721 and ERC1155 pool testing, see [LOCAL_TESTING.md](./LOCAL_TESTING.md).

For details on deployment improvements and best practices, see [DEPLOYMENT_IMPROVEMENTS.md](./DEPLOYMENT_IMPROVEMENTS.md).

