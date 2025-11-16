import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const docsDirectory = path.join(process.cwd(), '../../');

export interface DocFile {
  slug: string;
  title: string;
  content: string;
  path: string;
}

export function getDocContent(relativePath: string): DocFile | null {
  try {
    const fullPath = path.join(docsDirectory, relativePath);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    
    return {
      slug: path.basename(relativePath, '.md'),
      title: data.title || extractTitleFromContent(content) || path.basename(relativePath, '.md'),
      content,
      path: relativePath,
    };
  } catch (error) {
    console.error(`Error reading file ${relativePath}:`, error);
    return null;
  }
}

function extractTitleFromContent(content: string): string | null {
  // Try to extract the first H1 heading
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}

export function getAllDocs(): { name: string; path: string }[] {
  return [
    { name: 'README', path: 'README.md' },
    { name: 'Implementation Summary', path: 'IMPLEMENTATION_SUMMARY.md' },
    // Miniapp docs
    { name: 'Miniapp README', path: 'apps/miniapp/README.md' },
    { name: 'Miniapp Environment Variables', path: 'apps/miniapp/ENV_VARS.md' },
    { name: 'Future Indexing', path: 'apps/miniapp/FUTURE_INDEXING.md' },
    // Indexer docs
    { name: 'Indexer README', path: 'apps/indexer/README.md' },
    // Contract docs
    { name: 'Contracts README', path: 'packages/lssvm-contracts/README.md' },
    { name: 'Base Deployment', path: 'packages/lssvm-contracts/BASE_DEPLOYMENT_SUMMARY.md' },
    { name: 'Base Testnet Deployment', path: 'packages/lssvm-contracts/BASE_TESTNET_DEPLOYMENT_SUMMARY.md' },
    { name: 'Deploy to Base', path: 'packages/lssvm-contracts/DEPLOY_BASE.md' },
    { name: 'Deploy to Base Testnet', path: 'packages/lssvm-contracts/DEPLOY_BASE_TESTNET.md' },
    { name: 'Local Testing', path: 'packages/lssvm-contracts/LOCAL_TESTING.md' },
    { name: 'Quick Test', path: 'packages/lssvm-contracts/QUICK_TEST.md' },
    { name: 'Testing Guide', path: 'packages/lssvm-contracts/TESTING.md' },
    { name: 'Test Analysis', path: 'packages/lssvm-contracts/TEST_ANALYSIS.md' },
    { name: 'Test NFTs', path: 'packages/lssvm-contracts/TEST_NFTS.md' },
    { name: 'Deployment Improvements', path: 'packages/lssvm-contracts/DEPLOYMENT_IMPROVEMENTS.md' },
    // Deployment scripts
    { name: 'Deployment Scripts', path: 'packages/lssvm-contracts/script/README.md' },
    { name: 'Deployment Checklist', path: 'packages/lssvm-contracts/script/DEPLOYMENT_CHECKLIST.md' },
    { name: 'Deployment Order', path: 'packages/lssvm-contracts/script/DEPLOYMENT_ORDER.md' },
  ];
}
