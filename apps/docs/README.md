# LSSVM Documentation Site

This is the documentation website for the LSSVM Development Suite. It provides comprehensive documentation for all aspects of the project, including:

- Protocol overview and architecture
- Smart contracts documentation
- Farcaster miniapp guide
- Graph Protocol indexer
- Deployment instructions

## Development

To run the documentation site locally:

```bash
# From the root of the repository
pnpm install

# From the docs directory
cd apps/docs
pnpm dev
```

The site will be available at http://localhost:3001

## Building

To build the static site:

```bash
cd apps/docs
pnpm build
```

The output will be in the `out` directory.

## Deployment

The documentation is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment is handled by the `.github/workflows/deploy-docs.yml` workflow.

## Structure

- `/app` - Next.js app router pages
- `/components` - React components
- `/lib` - Utility functions for reading markdown files
- `/public` - Static assets

## Adding Documentation

Documentation is pulled from markdown files throughout the repository. To add new documentation:

1. Add your markdown file to the appropriate location in the repository
2. Update `lib/markdown.ts` to include the new file in the `getAllDocs()` function
3. Create or update the relevant page in `/app` to display the documentation

## Tech Stack

- **Next.js 14** with App Router and Static Export
- **TypeScript**
- **Tailwind CSS** for styling
- **react-markdown** for rendering markdown
- **@tailwindcss/typography** for prose styling

