---
sidebar_position: 5
---

# Deployment & CI/CD

Learn about the **deployment process** and CI/CD pipelines for Edward's Second Brain.

## Overview

The monorepo uses GitHub Actions for automated deployment to GitHub Pages with different pipelines for each application.

## Deployment Targets

### Dashboard Application
- **URL**: `https://edcalderon.github.io/my-second-brain/`
- **Technology**: Next.js static export
- **Workflow**: `.github/workflows/deploy-dashboard.yml`
- **Trigger**: Push to `main` branch

### Documentation Site
- **URL**: `https://edcalderon.github.io/my-second-brain/`
- **Technology**: Docusaurus static site
- **Workflow**: `.github/workflows/deploy-docs.yml`
- **Trigger**: Push to `main` branch, paths in `apps/docs/**`

### Versioning Package
- **Registry**: NPM (`@edcalderon/versioning`)
- **Workflow**: `.github/workflows/publish-npm.yml`
- **Trigger**: Push tags matching `versioning-v*`

## Build Process

### Dashboard Build
```bash
npm run build
# Uses Next.js static export
# Output: static HTML/CSS/JS files
```

### Documentation Build
```bash
npm run build:docs
# Uses Docusaurus build
# Output: static site in apps/docs/build/
```

### Versioning Package Build
```bash
npm run build
# Compiles TypeScript to JavaScript
# Output: CLI tool in dist/
```

## Environment Variables

### Dashboard
```bash
NEXT_PUBLIC_SUPERMEMORY_API_KEY=...
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# ... other Firebase config
```

### Documentation
```bash
# No environment variables needed
# Static site with embedded configuration
```

### Versioning Package
```bash
# No environment variables
# Pure CLI tool
```

## GitHub Actions Workflows

### Dashboard Deployment
```yaml
name: Deploy Dashboard to GitHub Pages
on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
      - uses: actions/deploy-pages@v4
```

### Documentation Deployment
```yaml
name: Deploy Docs to GitHub Pages
on:
  push:
    branches: [ main ]
    paths: [ 'apps/docs/**' ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm run build:docs
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
      - uses: actions/deploy-pages@v4
```

## Manual Deployment

### Local Testing
```bash
# Test dashboard build
npm run build
npm run start

# Test docs build
npm run build:docs
npm run serve:docs
```

### Force Deployment
- Go to GitHub Actions tab
- Select workflow
- Click "Run workflow"

## Monitoring

### Build Status
- Check GitHub Actions tab for build status
- Monitor deployment logs
- Verify live sites after deployment

### Performance
- Use Google PageSpeed Insights
- Monitor Core Web Vitals
- Check bundle sizes

### Errors
- Check browser console for runtime errors
- Monitor Firebase functions logs
- Review API rate limits

You can now deploy the `build` folder **almost anywhere** easily, **for free** or very small cost (read the **[Deployment Guide](https://docusaurus.io/docs/deployment)**).
