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

A new document is now available at [http://localhost:3000/docs/hello](http://localhost:3000/docs/hello).

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
