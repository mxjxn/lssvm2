/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // GitHub Pages base path (will be /such-lssvm for the repo)
  // basePath: '/such-lssvm', // Uncomment when deploying to GitHub Pages
  trailingSlash: true,
}

module.exports = nextConfig
