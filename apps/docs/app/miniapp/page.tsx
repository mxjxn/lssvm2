import { getDocContent } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Link from 'next/link';

export default function Miniapp() {
  const doc = getDocContent('apps/miniapp/README.md');
  const envDoc = getDocContent('apps/miniapp/ENV_VARS.md');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Home
        </Link>
      </div>
      
      <h1 className="text-4xl font-bold mb-8">Farcaster Miniapp</h1>
      
      <div className="mb-8 p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
        <p className="text-gray-700 dark:text-gray-300">
          A user-friendly Farcaster miniapp for interacting with NFT liquidity pools. 
          Built with Next.js 14, Wagmi, and the Farcaster Miniapp SDK.
        </p>
      </div>

      {doc && <MarkdownRenderer content={doc.content} />}

      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-4">Configuration</h2>
        {envDoc && <MarkdownRenderer content={envDoc.content} />}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Related Documentation</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/indexer" className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow">
            <div className="font-semibold mb-2">Indexer →</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Graph Protocol subgraph for data indexing
            </div>
          </Link>
          
          <Link href="/deployment" className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow">
            <div className="font-semibold mb-2">Deployment →</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Deploy the miniapp and contracts
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
