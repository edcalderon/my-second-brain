---
sidebar_position: 1
---

# Welcome to Edward's Second Brain

A comprehensive **knowledge base and documentation** system for managing personal insights, research, and project documentation.

## Overview

This documentation covers the Edward's Second Brain ecosystem, including:

- **Dashboard**: Web interface for managing knowledge and memories
- **API Functions**: Cloud functions for data processing
- **Versioning System**: Automated version management for the monorepo
- **Documentation**: This Docusaurus-powered documentation site

### Architecture

The system consists of multiple interconnected components:

- **Frontend**: Next.js dashboard deployed to GitHub Pages
- **Backend**: Firebase for data storage and authentication
- **AI Integration**: Supermemory API for knowledge processing
- **CI/CD**: GitHub Actions for automated deployment

## Quick Start

### Prerequisites

- Node.js 20.0 or above
- pnpm package manager
- GitHub account for deployment

### Development

```bash
# Install dependencies
pnpm install

# Start development servers
npm run dev          # Dashboard
npm run dev:docs      # Documentation

# Build for production
npm run build         # Build all apps
npm run build:docs    # Build docs only
```

## Key Features

- **Knowledge Graph**: Connect and visualize relationships between concepts
- **Memory Management**: Store and retrieve personal insights
- **Automated Versioning**: Semantic versioning across the entire monorepo
- **Multi-format Support**: Handle various types of content and media
- **Search & Discovery**: Powerful search capabilities across all knowledge

The command also installs all necessary dependencies you need to run Docusaurus.

## Start your site

Run the development server:

```bash
cd my-website
npm run start
```

The `cd` command changes the directory you're working with. In order to work with your newly created Docusaurus site, you'll need to navigate the terminal there.

The `npm run start` command builds your website locally and serves it through a development server, ready for you to view at http://localhost:3000/.

Open `docs/intro.md` (this page) and edit some lines: the site **reloads automatically** and displays your changes.
