import { getDocContent } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Link from 'next/link';

const deploymentDocs = [
  { title: 'Base Mainnet Deployment', path: 'packages/lssvm-contracts/BASE_DEPLOYMENT_SUMMARY.md' },
  { title: 'Base Testnet Deployment', path: 'packages/lssvm-contracts/BASE_TESTNET_DEPLOYMENT_SUMMARY.md' },
  { title: 'Deploy to Base', path: 'packages/lssvm-contracts/DEPLOY_BASE.md' },
  { title: 'Deploy to Base Testnet', path: 'packages/lssvm-contracts/DEPLOY_BASE_TESTNET.md' },
  { title: 'Deployment Improvements', path: 'packages/lssvm-contracts/DEPLOYMENT_IMPROVEMENTS.md' },
  { title: 'Deployment Scripts', path: 'packages/lssvm-contracts/script/README.md' },
  { title: 'Deployment Checklist', path: 'packages/lssvm-contracts/script/DEPLOYMENT_CHECKLIST.md' },
  { title: 'Deployment Order', path: 'packages/lssvm-contracts/script/DEPLOYMENT_ORDER.md' },
];

export default function Deployment() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Home
        </Link>
      </div>
      
      <h1 className="text-4xl font-bold mb-8">Deployment Guide</h1>
      
      <div className="mb-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p className="text-gray-700 dark:text-gray-300">
          Comprehensive deployment scripts and guides for deploying the LSSVM protocol 
          to Base Mainnet, Base Sepolia testnet, or local development environments.
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
        
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Local Development</h3>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto">
              <code>{`cd packages/lssvm-contracts
anvil  # In one terminal
./deploy-local.sh  # In another terminal`}</code>
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Base Sepolia Testnet</h3>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto">
              <code>{`cd packages/lssvm-contracts
./deploy-base-testnet.sh
./deploy-test-nfts.sh  # Optional: Deploy test NFTs`}</code>
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Base Mainnet</h3>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto">
              <code>{`cd packages/lssvm-contracts
./deploy-base.sh`}</code>
            </pre>
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded text-sm">
              ⚠️ Always test deployments on testnet before deploying to mainnet
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-4">Deployment Documentation</h2>
        <div className="space-y-4">
          {deploymentDocs.map((doc) => {
            const content = getDocContent(doc.path);
            if (!content) return null;
            
            return (
              <details key={doc.path} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <summary className="font-semibold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
                  {doc.title}
                </summary>
                <div className="mt-4 pl-4 border-l-2 border-gray-300 dark:border-gray-700">
                  <MarkdownRenderer content={content.content} />
                </div>
              </details>
            );
          })}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Deployment Features</h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li>✅ Automatic factory configuration</li>
          <li>✅ Mnemonic support for key management</li>
          <li>✅ Chain ID validation</li>
          <li>✅ Comprehensive error handling</li>
          <li>✅ Helper scripts for common scenarios</li>
          <li>✅ Test NFT contracts for testing pools</li>
        </ul>
      </div>
    </div>
  );
}
