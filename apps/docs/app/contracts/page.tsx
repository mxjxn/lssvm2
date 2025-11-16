import { getDocContent } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Link from 'next/link';

const contractDocs = [
  { title: 'Contracts Overview', path: 'packages/lssvm-contracts/README.md' },
  { title: 'Local Testing', path: 'packages/lssvm-contracts/LOCAL_TESTING.md' },
  { title: 'Quick Test', path: 'packages/lssvm-contracts/QUICK_TEST.md' },
  { title: 'Testing Guide', path: 'packages/lssvm-contracts/TESTING.md' },
  { title: 'Test Analysis', path: 'packages/lssvm-contracts/TEST_ANALYSIS.md' },
  { title: 'Test NFTs', path: 'packages/lssvm-contracts/TEST_NFTS.md' },
];

export default function Contracts() {
  const mainDoc = getDocContent('packages/lssvm-contracts/README.md');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Home
        </Link>
      </div>
      
      <h1 className="text-4xl font-bold mb-8">Smart Contracts</h1>
      
      <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
        <p className="text-gray-700 dark:text-gray-300">
          The LSSVM protocol smart contracts implement sudoAMM v2 with support for ERC721 
          and ERC1155 NFTs, multiple bonding curves, on-chain royalties, and advanced 
          trading features.
        </p>
      </div>

      {mainDoc && <MarkdownRenderer content={mainDoc.content} />}

      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-4">Contract Documentation</h2>
        <div className="space-y-4">
          {contractDocs.map((doc) => {
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
        <h2 className="text-2xl font-bold mb-4">Deployed Contracts</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <h3 className="font-bold mb-2">Base Mainnet</h3>
            <div className="text-sm space-y-2">
              <div>
                <div className="text-gray-600 dark:text-gray-400">Factory</div>
                <a 
                  href="https://basescan.org/address/0xF6B4bDF778db19DD5928248DE4C18Ce22E8a5f5e" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                >
                  0xF6B4...5f5e
                </a>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Router</div>
                <a 
                  href="https://basescan.org/address/0x4352c72114C4b9c4e1F8C96347F2165EECaDeb5C" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                >
                  0x4352...eb5C
                </a>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <h3 className="font-bold mb-2">Base Sepolia Testnet</h3>
            <div className="text-sm space-y-2">
              <div>
                <div className="text-gray-600 dark:text-gray-400">Factory</div>
                <a 
                  href="https://sepolia.basescan.org/address/0x372990Fd91CF61967325dD5270f50c4192bfb892" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                >
                  0x3729...b892
                </a>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Router</div>
                <a 
                  href="https://sepolia.basescan.org/address/0x6C9e6BAc4255901EaD3447C07917967E9dBc32d3" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                >
                  0x6C9e...32d3
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <Link href="/deployment" className="text-blue-600 dark:text-blue-400 hover:underline">
            View full deployment details →
          </Link>
        </div>
      </div>
    </div>
  );
}
