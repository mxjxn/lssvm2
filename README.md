# sudoAMM v2

> **Note**: This repository contains the LSSVM (sudoAMM v2) protocol contracts from [sudoswap](https://github.com/sudoswap), reorganized into a Turborepo monorepo structure with additional tooling by [mxjxn](https://github.com/mxjxn).

## Attribution

### From sudoswap
- **`packages/lssvm-contracts/`** - All Solidity contracts, and tests for the LSSVM (sudoAMM v2) protocol
- Protocol architecture, features, and core functionality
- Original documentation and protocol design

### From mxjxn
- **`apps/miniapp/`** - Farcaster miniapp for interacting with NFT liquidity pools
- deployment scripts
- Monorepo structure and Turborepo configuration
- Integration tooling and developer experience improvements

---

sudoAMM v2 is focused on delivering several specific feature upgrades missing from sudoAMM v1. 

Read the longform overview [here](https://blog.sudoswap.xyz/introducing-sudoswap-v2.html).

## Monorepo Structure

This repository is organized as a [Turborepo](https://turbo.build/repo) monorepo with the following structure:

- **`apps/miniapp`** - Farcaster miniapp for interacting with NFT liquidity pools (by mxjxn)
- **`packages/lssvm-contracts`** - Solidity contracts for the LSSVM protocol (from sudoswap)

### Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Build all packages:
```bash
pnpm build
```

3. Run development servers:
```bash
pnpm dev
```

## Architecture
![sudoAMM v2 diagram](./flowchart.png)

Diagram by [Gerard Pearson](https://twitter.com/gpersoon), prepared during the Spearbit [security audit](https://github.com/sudoswap/v2-audits/blob/main/spearbit.pdf).

## Protocol Features (sudoswap)

The main focuses of the LSSVM protocol are:
- On-chain royalty support for all collections by default
- Property-checking for pools to allow for specifying desired trait / ID orders
- An opt-in on-chain structure for LPs and project owners that allows for revenue sharing
- ERC1155 support
- Separate fee accounting, unified router, improved events, and minor gas optimizations


### On-chain Royalty Support
If your collection is already ERC2981 compliant, then you're good to go. All buys and sells executed on sudoAMM v2 will send the appropriate royalty amount to your specified recipient address(es). If your collection isn't ERC2981 compliant, but your collection has an `owner()` or similar admin role, you can use the Manifold Royalty Registry to deploy a 2981 compliant royalty lookup.

If your collection uses a different royalty interface, the following interfaces are also supported via `RoyaltyEngine.sol`, a non-upgradeable version of the Manifold Royalty Engine:
* Rarible v1
* Rarible v2
* Foundation
* SuperRare
* Zora
* ArtBlocks 
* KnownOrigin v2

### Property Checking
Pools can set another contract to do on-chain verification of desired properties (e.g. ID set inclusion) to purchase only certain items in a collection. 

The protocol provides a generic `IPropertyChecker` interface, and it is agnostic about whether this is done through a bitmap, merkle tree, or any other on-chain property.

### Settings
For projects that want to work more closely with pool creators, sudoAMM v2 introduces a project-controlled Setting. 

A Setting is contract that enforces specific requirements for pools that opt into them. For example, a Setting might ask that assets stay locked in the pool for 90 days, collect an upfront fee, as well as a 50/50 split of trading fees. In return for adhering to a Setting, projects can configure a separate royalty amount for these pools to encourage more trading.

Settings are an *opt-in* feature that are always configured by a collection's owner. 

The sudoAMM v2 repo includes a configurable Setting template ready to use out of the box, with choices for direct payment, lock duration, and fee split. Project owners are free to create their own Setting for more bespoke conditions if they so choose.

### ERC1155 Support
Pools can now also be made for ERC1155<>ETH or ERC1155<>ERC20 pairs. Pools for ERC1155 assets will specify a specific ID in the ERC1155 collection that they buy or sell. Both ERC1155 and ERC721 pool types now inherit from the base `LSSVMPair` class.

### Misc
- TRADE pools can now set a separate `feeRecipient` to receive swap fees on each swap. Pools can also continue to keep fee balances internally if desired.
- Improved events for tracking NFTs swapped in or out
- A new `VeryFastRouter` which allows for handling all swap types (i.e. ERC721<>ETH, ERC721<>ERC20, ERC1155<>ETH, ERC1155<>ERC20), as well as an efficient method for handling **partial fills** when buying/selling multiple items from the same pool.

## Miniapp (mxjxn)

This repository includes a **Farcaster miniapp** (`apps/miniapp/`) built by mxjxn that provides a user-friendly interface for interacting with NFT liquidity pools built on the LSSVM protocol.

### Features

- **Pool Discovery**: Enter pool addresses to view detailed pool information including spot price, delta, fees, and available NFTs
- **Buy NFTs**: Purchase NFTs from liquidity pools using ETH or ERC20 tokens with real-time price quotes
- **Sell NFTs**: Sell your NFTs to liquidity pools in exchange for tokens
- **Shopping Cart**: Add multiple NFTs to a cart and checkout in a single transaction
- **ERC721 & ERC1155 Support**: Full support for both NFT standards
- **Transaction Tracking**: Monitor transaction status with explorer links
- **Real-time Quotes**: Get up-to-date pricing information before trading, including fees and royalties

### Tech Stack

- **Next.js 14** with App Router
- **Wagmi** for Ethereum interactions
- **Farcaster Miniapp SDK** for Farcaster integration
- **Tailwind CSS** for styling
- **React Query** for data fetching

### Quick Start

1. Install dependencies (from root):
```bash
pnpm install
```

2. Configure environment variables (see `apps/miniapp/ENV_VARS.md` for details):
```bash
# Create apps/miniapp/.env.local with your contract addresses
NEXT_PUBLIC_ROUTER_ADDRESS_8453=0x...
NEXT_PUBLIC_FACTORY_ADDRESS_8453=0x...
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

3. Run the development server:
```bash
# From root
pnpm dev

# Or from the miniapp directory
cd apps/miniapp
pnpm dev
```

For detailed setup instructions, deployment guide, and architecture information, see the [Miniapp README](./apps/miniapp/README.md).

## Building/Testing Contracts (sudoswap)

The Solidity contracts are located in `packages/lssvm-contracts/`.

```bash
cd packages/lssvm-contracts
forge install
forge test
```

To generate coverage report locally: 
```bash
cd packages/lssvm-contracts
forge coverage --report lcov && genhtml lcov.info -o report --branch
open report/index.html
```

## Documentation
General documentation available [here](https://docs.sudoswap.xyz/).

To pull quote information, check out the sudo-defined-quoter package [here](https://github.com/sudoswap/sudo-defined-quoter).

To view audits for sudoAMM v2 by Narya, Spearbit, and Cyfrin check out [here](https://github.com/sudoswap/v2-audits)

## Deployment Scripts (mxjxn)

> **⚠️ Warning**: These deployment scripts are untested and provided as-is. Use at your own risk. Always test deployments on a testnet before deploying to mainnet. Verify all contract addresses and parameters before broadcasting transactions.

This repository includes comprehensive deployment scripts for deploying the entire sudoAMM v2 protocol. The scripts are located in `packages/lssvm-contracts/script/` and include:

- **Individual deployment scripts** for each component (Core, Bonding Curves, Router, Property Checkers, Settings)
- **Master deployment script** (`DeployAll.s.sol`) for deploying everything at once
- **Comprehensive documentation** including README, deployment checklist, and order reference
- **Local testing support** with Anvil integration and helper scripts

### Local Testing

Before deploying to testnet or mainnet, it's highly recommended to test deployments locally using Anvil (Foundry's local Ethereum node).

**Quick Start for Local Testing:**

1. Start Anvil in one terminal:
   ```bash
   anvil
   ```

2. Deploy to local node:
   ```bash
   cd packages/lssvm-contracts
   ./deploy-local.sh
   ```

3. Follow the [Local Testing Guide](./packages/lssvm-contracts/LOCAL_TESTING.md) for:
   - Factory configuration (automatic and manual)
   - Creating and testing ERC721 pools
   - Creating and testing ERC1155 pools
   - Useful cast commands for querying contracts
   - Troubleshooting common issues

The deployment script automatically configures the factory (whitelists bonding curves and router) when the deployer is the factory owner.

### Deployment to Testnet/Mainnet

For detailed instructions, see the [Deployment Guide](./packages/lssvm-contracts/script/README.md).

Quick start:
```bash
cd packages/lssvm-contracts

# Configure your environment
cp script/.env.example .env
# Edit .env with your values

# Deploy all contracts
forge script script/DeployAll.s.sol:DeployAll --rpc-url $RPC_URL --broadcast --verify
```

### Deployment Features

- **Automatic factory configuration**: Scripts automatically whitelist bonding curves and router when deployer is factory owner
- **OpenZeppelin v5 compatibility**: Updated to work with latest OpenZeppelin contracts
- **Comprehensive error handling**: Detailed logging and fallback checks
- **Helper scripts**: `deploy-local.sh` for easy local deployment

For more details on deployment improvements and best practices, see [DEPLOYMENT_IMPROVEMENTS.md](./packages/lssvm-contracts/DEPLOYMENT_IMPROVEMENTS.md).

## Deployments (sudoswap)

The contracts have been deployed on Ethereum Mainnet to the following addresses:

**Factory & Router**

- LSSVMPairFactory: [0xA020d57aB0448Ef74115c112D18a9C231CC86000](https://etherscan.io/address/0xa020d57ab0448ef74115c112d18a9c231cc86000)
- VeryFastRouter: [0x090C236B62317db226e6ae6CD4c0Fd25b7028b65](https://etherscan.io/address/0x090C236B62317db226e6ae6CD4c0Fd25b7028b65)

**Price Curves**

- LinearCurve: [0xe5d78fec1a7f42d2F3620238C498F088A866FdC5](https://etherscan.io/address/0xe5d78fec1a7f42d2f3620238c498f088a866fdc5)
- ExponentialCurve: [0xfa056C602aD0C0C4EE4385b3233f2Cb06730334a](https://etherscan.io/address/0xfa056c602ad0c0c4ee4385b3233f2cb06730334a)
- XYKCurve: [0xc7fB91B6cd3C67E02EC08013CEBb29b1241f3De5](https://etherscan.io/address/0xc7fb91b6cd3c67e02ec08013cebb29b1241f3de5)
- GDACurve: [0x1fD5876d4A3860Eb0159055a3b7Cb79fdFFf6B67](https://etherscan.io/address/0x1fd5876d4a3860eb0159055a3b7cb79fdfff6b67)

**Other**

- SettingsFactory: [0xF4F439A6A152cFEcb1F34d726D490F82Bcb3c2C7](https://etherscan.io/address/0xf4f439a6a152cfecb1f34d726d490f82bcb3c2c7)
- PropertyCheckerFactory: [0x031b216FaBec82310FEa3426b33455609b99AfC1](https://etherscan.io/address/0x031b216fabec82310fea3426b33455609b99afc1)
- RoyaltyEngine: [0xBc40d21999b4BF120d330Ee3a2DE415287f626C9](https://etherscan.io/address/0xbc40d21999b4bf120d330ee3a2de415287f626c9)
- ZeroExRouter: [0xe4ac8eDd513074BA5f78DCdDc57680EF68Fa0CaE](https://etherscan.io/address/0xe4ac8edd513074ba5f78dcddc57680ef68fa0cae)