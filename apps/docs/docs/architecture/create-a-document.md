---
sidebar_position: 2
---

# System Architecture

Learn about the **architecture** of Edward's Second Brain system and how all components work together.

## Overview

The system is built as a modern monorepo with the following key components:

### Frontend Layer
- **Dashboard**: Next.js application for user interaction
- **Documentation**: Docusaurus-powered docs site
- **Deployment**: GitHub Pages for static hosting

### Backend Services
- **Firebase**: Authentication, Firestore database, and storage
- **Supermemory API**: AI-powered knowledge processing
- **Cloud Functions**: Serverless data processing

### Development Tools
- **Versioning System**: Automated semantic versioning
- **Monorepo Management**: pnpm workspaces
- **CI/CD**: GitHub Actions for automated deployment

## Data Flow

```
User Input → Dashboard → Firebase → Supermemory API → Knowledge Graph
                      ↓
               Documentation ← Docusaurus ← GitHub Pages
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js 14 + TypeScript | User interface |
| Styling | Tailwind CSS | Design system |
| Database | Firebase Firestore | Data storage |
| Auth | Firebase Auth | User authentication |
| AI | Supermemory API | Knowledge processing |
| Docs | Docusaurus 3.9 | Documentation |
| Versioning | Custom CLI | Release management |
| CI/CD | GitHub Actions | Automation |

## Monorepo Structure

```
edward/
├── apps/
│   ├── dashboard/          # Next.js web app
│   │   ├── src/
│   │   │   ├── app/        # App Router pages
│   │   │   ├── components/ # React components
│   │   │   ├── lib/        # Utilities & API clients
│   │   │   └── hooks/      # Custom React hooks
│   │   ├── public/         # Static assets
│   │   └── package.json
│   └── docs/               # Docusaurus documentation
│       ├── docs/           # Documentation pages
│       ├── src/            # React components
│       ├── static/         # Static assets
│       └── docusaurus.config.ts
├── packages/
│   └── versioning/         # Custom versioning CLI
│       ├── src/            # TypeScript source
│       ├── dist/           # Compiled output
│       └── package.json
├── scripts/                # Deployment scripts
├── config/                 # Configuration files
├── docs/                   # Additional docs
└── package.json           # Root package.json
```

## Component Details

### Dashboard Application
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks
- **Deployment**: GitHub Pages (static export)
- **Features**:
  - Memory management interface
  - Knowledge graph visualization
  - User authentication
  - Search functionality

### Documentation Site
- **Framework**: Docusaurus 3.9
- **Language**: TypeScript
- **Features**:
  - Auto-generated sidebar
  - Search functionality
  - Versioned documentation
  - Edit links to GitHub
- **Deployment**: GitHub Pages

### Versioning System
- **Technology**: Node.js CLI application
- **Features**:
  - Semantic versioning
  - Changelog generation
  - Monorepo version sync
  - Git tag management
  - NPM publishing
- **Extensions**: Customizable lifecycle hooks

### Backend Services

#### Firebase
- **Authentication**: User login/signup
- **Firestore**: NoSQL database for user data
- **Storage**: File uploads and media
- **Hosting**: Static site hosting

#### Supermemory API
- **Purpose**: AI-powered knowledge processing
- **Features**:
  - Text analysis and categorization
  - Knowledge graph generation
  - Memory storage and retrieval
  - Action item extraction

#### Cloud Functions
- **Runtime**: Node.js on Google Cloud
- **Purpose**: Server-side processing
- **Triggers**: HTTP requests, database events

## Development Workflow

1. **Local Development**:
   ```bash
   npm run dev          # Start dashboard
   npm run dev:docs      # Start documentation
   ```

2. **Version Management**:
   ```bash
   npm run version:patch # Bug fixes
   npm run version:minor # New features
   npm run version:major # Breaking changes
   ```

3. **Deployment**:
   - Dashboard: Auto-deploys on push to main
   - Docs: Auto-deploys on push to main
   - Versioning: Publishes to NPM on tag push

## Security Considerations

- **API Keys**: Exposed in client for static hosting
- **Authentication**: Firebase Auth for user management
- **Data Privacy**: User data stored in Firestore
- **Rate Limiting**: API usage monitoring

## Configure the Sidebar

Docusaurus automatically **creates a sidebar** from the `docs` folder.

Add metadata to customize the sidebar label and position:

```md title="docs/hello.md" {1-4}
---
sidebar_label: 'Hi!'
sidebar_position: 3
---

# Hello

This is my **first Docusaurus document**!
```

It is also possible to create your sidebar explicitly in `sidebars.js`:

```js title="sidebars.js"
export default {
  tutorialSidebar: [
    'intro',
    // highlight-next-line
    'hello',
    {
      type: 'category',
      label: 'Tutorial',
      items: ['tutorial-basics/create-a-document'],
    },
  ],
};
```
