import { getDocContent } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Link from 'next/link';

export default function GettingStarted() {
  const doc = getDocContent('README.md');

  if (!doc) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Getting Started</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Documentation not available.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Home
        </Link>
      </div>
      
      <MarkdownRenderer content={doc.content} />
      
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-4">Next Steps</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/protocol" className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow">
            <div className="font-semibold mb-2">Protocol Overview →</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Learn about the LSSVM protocol architecture
            </div>
          </Link>
          
          <Link href="/contracts" className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow">
            <div className="font-semibold mb-2">Smart Contracts →</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Explore the contract documentation
            </div>
          </Link>
          
          <Link href="/miniapp" className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow">
            <div className="font-semibold mb-2">Miniapp →</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Build with the Farcaster miniapp
            </div>
          </Link>
          
          <Link href="/deployment" className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow">
            <div className="font-semibold mb-2">Deployment →</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Deploy contracts and applications
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
