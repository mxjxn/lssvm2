import { getDocContent } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Link from 'next/link';

export default function Protocol() {
  const mainDoc = getDocContent('README.md');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Home
        </Link>
      </div>
      
      <h1 className="text-4xl font-bold mb-8">Protocol Overview</h1>
      
      <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h2 className="text-xl font-bold mb-2">About LSSVM (sudoAMM v2)</h2>
        <p className="text-gray-700 dark:text-gray-300">
          The LSSVM protocol is an advanced NFT automated market maker that provides liquidity 
          for NFT trading. Built on sudoAMM v2, it introduces features like on-chain royalty 
          support, property checking, and revenue sharing settings.
        </p>
      </div>

      {mainDoc && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Key Features</h2>
          <MarkdownRenderer content={mainDoc.content.split('## Protocol Features')[1]?.split('## Miniapp')[0] || ''} />
        </div>
      )}

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Resources</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <a 
            href="https://docs.sudoswap.xyz/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="font-semibold mb-2">sudoswap Documentation →</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Official protocol documentation
            </div>
          </a>
          
          <a 
            href="https://blog.sudoswap.xyz/introducing-sudoswap-v2.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="font-semibold mb-2">Protocol Introduction →</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Long-form overview of sudoAMM v2
            </div>
          </a>
          
          <a 
            href="https://github.com/sudoswap/v2-audits" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="font-semibold mb-2">Security Audits →</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Narya, Spearbit, and Cyfrin audits
            </div>
          </a>
          
          <Link href="/contracts" className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow">
            <div className="font-semibold mb-2">Smart Contracts →</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Explore contract documentation
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
