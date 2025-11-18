import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          LSSVM Development Suite
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Comprehensive documentation for the LSSVM (sudoAMM v2) protocol, 
          including smart contracts, Farcaster miniapp, Graph Protocol subgraph, 
          and deployment tooling.
        </p>
      </div>

      {/* Key Features */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400">
            Protocol Contracts
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Full implementation of sudoAMM v2 with ERC721/ERC1155 support, 
            royalty handling, and advanced bonding curves.
          </p>
          <Link href="/contracts" className="text-blue-600 dark:text-blue-400 hover:underline">
            Learn more →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400">
            Farcaster Miniapp
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            User-friendly interface for trading NFTs through liquidity pools 
            with shopping cart, real-time quotes, and transaction tracking.
          </p>
          <Link href="/miniapp" className="text-blue-600 dark:text-blue-400 hover:underline">
            Learn more →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400">
            Graph Protocol Indexer
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Subgraph for indexing pool events, swaps, deposits, and withdrawals 
            on Base Mainnet and testnet.
          </p>
          <Link href="/indexer" className="text-blue-600 dark:text-blue-400 hover:underline">
            Learn more →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400">
            Deployment Scripts
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Comprehensive deployment tooling for Base Mainnet, testnet, 
            and local development environments.
          </p>
          <Link href="/deployment" className="text-blue-600 dark:text-blue-400 hover:underline">
            Learn more →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400">
            Getting Started
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Quick start guide to set up your development environment and 
            start building with LSSVM.
          </p>
          <Link href="/getting-started" className="text-blue-600 dark:text-blue-400 hover:underline">
            Learn more →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400">
            Protocol Overview
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            LSSVM is built directly on top of the original sudoswap sudoAMM v2 protocol, developed entirely by the sudoswap team. This project does not modify or change the underlying protocol in any way—full credit goes to sudoswap and their authors for creating sudoAMM v2 (licensed under AGPL-3.0).
          </p>
          <Link href="/protocol" className="text-blue-600 dark:text-blue-400 hover:underline">
            Learn more →
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Quick Links</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="https://github.com/mxjxn/such-lssvm"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center hover:shadow-md transition-shadow"
          >
            <div className="font-semibold mb-1">GitHub Repository</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">View source code</div>
          </a>
          
          <a
            href="https://docs.sudoswap.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center hover:shadow-md transition-shadow"
          >
            <div className="font-semibold mb-1">sudoswap Docs</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Protocol documentation</div>
          </a>
          
          <a
            href="https://basescan.org/address/0xF6B4bDF778db19DD5928248DE4C18Ce22E8a5f5e"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center hover:shadow-md transition-shadow"
          >
            <div className="font-semibold mb-1">Base Mainnet</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">View contracts</div>
          </a>
          
          <a
            href="https://sepolia.basescan.org/address/0x372990Fd91CF61967325dD5270f50c4192bfb892"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center hover:shadow-md transition-shadow"
          >
            <div className="font-semibold mb-1">Base Testnet</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Test environment</div>
          </a>
        </div>
      </div>

      {/* Related Projects */}
      <div className="mt-16">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-4xl mx-auto shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Related Projects</h2>
          <div className="space-y-6">
            <div className="border-l-4 border-purple-600 dark:border-purple-400 pl-6">
              <h3 className="text-xl font-bold mb-2 text-purple-600 dark:text-purple-400">
                Cryptoart Monorepo
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                A comprehensive monorepo containing all projects related to the Cryptoart channel on Farcaster, 
                including creator tools, auctionhouse functionality, and NFT curation.
              </p>
              <div className="space-y-2 mb-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Key Projects:</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                  <li>• <strong>Cryptoart Studio App</strong> - Creator tools and subscription management</li>
                  <li>• <strong>Auctionhouse App</strong> - Auction functionality for NFTs</li>
                  <li>• <strong>Such Gallery</strong> - NFT curation and gallery with referral system</li>
                  <li>• <strong>Creator Core Contracts</strong> - ERC721/ERC1155 NFT framework</li>
                  <li>• <strong>Auctionhouse Contracts</strong> - Marketplace smart contracts</li>
                  <li>• <strong>Unified Indexer</strong> - Bridges LSSVM pools and Auctionhouse listings</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Integration:</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                  <li>• Uses <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">@lssvm/abis</code> package for LSSVM contract interactions</li>
                  <li>• Unified indexer provides single interface for querying pools and auctions</li>
                  <li>• LSSVM pool creation integrated into collection deployment flow</li>
                </ul>
              </div>
              <div className="mt-4 flex gap-4">
                <a
                  href="https://github.com/mxjxn/cryptoart-studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                >
                  View Repository →
                </a>
                <a
                  href="https://github.com/mxjxn/cryptoart-studio/blob/main/LSSVM_INTEGRATION.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                >
                  Integration Guide →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attribution */}
      <div className="mt-16 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-4xl mx-auto shadow-md">
          <h2 className="text-2xl font-bold mb-4">Attribution</h2>
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div>
              <h3 className="font-bold text-lg mb-2 text-blue-600 dark:text-blue-400">
                From sudoswap
              </h3>
              <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                <li>• LSSVM protocol contracts</li>
                <li>• Protocol architecture & design</li>
                <li>• Security audits & testing</li>
                <li>• Original documentation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2 text-purple-600 dark:text-purple-400">
                From mxjxn
              </h3>
              <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Farcaster miniapp</li>
                <li>• Graph Protocol subgraph</li>
                <li>• Deployment scripts & tooling</li>
                <li>• Monorepo structure & docs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

