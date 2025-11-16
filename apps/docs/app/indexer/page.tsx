import { getDocContent } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Link from 'next/link';

export default function Indexer() {
  const doc = getDocContent('apps/indexer/README.md');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Home
        </Link>
      </div>
      
      <h1 className="text-4xl font-bold mb-8">Graph Protocol Indexer</h1>
      
      <div className="mb-8 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <p className="text-gray-700 dark:text-gray-300">
          A Graph Protocol subgraph that indexes all pool creation events, swaps, deposits, 
          and withdrawals on Base Mainnet and Base Sepolia testnet.
        </p>
      </div>

      {doc && <MarkdownRenderer content={doc.content} />}

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Related Documentation</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/miniapp" className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow">
            <div className="font-semibold mb-2">Miniapp →</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Uses the subgraph for pool discovery
            </div>
          </Link>
          
          <Link href="/contracts" className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow">
            <div className="font-semibold mb-2">Smart Contracts →</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Contract ABIs and interfaces
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
