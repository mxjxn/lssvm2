import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'LSSVM Development Suite Documentation',
  description: 'Comprehensive documentation for the LSSVM (sudoAMM v2) development suite including contracts, miniapp, indexer, and deployment guides.',
}

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Getting Started', href: '/getting-started' },
  { name: 'Protocol', href: '/protocol' },
  { name: 'Miniapp', href: '/miniapp' },
  { name: 'Indexer', href: '/indexer' },
  { name: 'Contracts', href: '/contracts' },
  { name: 'Deployment', href: '/deployment' },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <Link href="/" className="flex items-center space-x-3">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    LSSVM
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                    Development Suite
                  </div>
                </Link>
                
                <nav className="hidden md:flex space-x-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>

                <a
                  href="https://github.com/mxjxn/such-lssvm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>

              {/* Mobile navigation */}
              <nav className="md:hidden pb-4">
                <div className="flex flex-wrap gap-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center text-gray-600 dark:text-gray-400">
                <p className="mb-2">
                  LSSVM Development Suite - Built on{' '}
                  <a href="https://sudoswap.xyz" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    sudoAMM v2
                  </a>
                </p>
                <p className="text-sm">
                  Protocol by <a href="https://github.com/sudoswap" target="_blank" rel="noopener noreferrer" className="hover:underline">sudoswap</a>
                  {' • '}
                  Development suite by <a href="https://github.com/mxjxn" target="_blank" rel="noopener noreferrer" className="hover:underline">mxjxn</a>
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
