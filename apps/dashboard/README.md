# Second Brain Dashboard

A modern, responsive Next.js dashboard for the My Second Brain knowledge management system.

## Features

- 🌙 **Dark/Light Theme**: Complete theme system with localStorage persistence
- 📱 **Mobile-First Design**: Responsive layout with collapsible sidebar navigation
- 🎨 **Glass Panel Effects**: Modern UI with backdrop blur and premium gradients
- 🔍 **Search Interface**: Global search across knowledge base
- 📊 **Knowledge Graph**: Visual representation of connected thoughts
- 🔐 **Firebase Auth**: Secure authentication with Google OAuth
- ⚡ **Next.js 16**: Built with the latest Next.js features
- 🎯 **TypeScript**: Full type safety throughout

## Tech Stack

- **Framework**: Next.js 16.1.6 with App Router
- **Styling**: Tailwind CSS 4.1.18 with custom design system
- **Authentication**: Firebase Auth
- **Knowledge Graph**: Supermemory integration
- **Deployment**: Static export for GitHub Pages

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment Variables

Create `.env.local` with publishable client configuration only:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_SUPERMEMORY_API_KEY=your_publishable_api_key
```

`NEXT_PUBLIC_*` values are included in the browser bundle. Never put service
keys, database credentials, exchange credentials, or private API tokens in
this file. GitHub Pages releases are built by
[`deploy-web.yml`](../../../.github/workflows/deploy-web.yml) after a change is
merged to `main`.

## Recent Updates

### v1.1.5
- ✨ Mobile-first responsive redesign
- 🌙 Complete dark mode implementation with Tailwind v4 compatibility
- 🎨 Enhanced glass panel effects and premium gradients
- 📱 Improved touch-friendly navigation
- 🔧 Fixed theme persistence and system preference detection
