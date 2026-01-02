---
sidebar_position: 6
---

# Development Setup

Congratulations! You're ready to start developing with Edward's Second Brain. Here's how to get your development environment set up.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+**: [Download here](https://nodejs.org/)
- **pnpm**: `npm install -g pnpm`
- **Git**: For version control

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/edcalderon/my-second-brain.git
   cd my-second-brain
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment variables**:
   ```bash
   cp apps/dashboard/.env.example apps/dashboard/.env.local
   # Edit .env.local with your API keys
   ```

4. **Start development servers**:
   ```bash
   # Terminal 1: Dashboard
   npm run dev

   # Terminal 2: Documentation
   npm run dev:docs
   ```

## Environment Configuration

### Required API Keys

You'll need to obtain API keys for the following services:

#### Supermemory API
- Visit [Supermemory](https://supermemory.ai) to get your API key
- Add to `.env.local`: `NEXT_PUBLIC_SUPERMEMORY_API_KEY=your-key`

#### Firebase
- Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
- Enable Authentication and Firestore
- Add Firebase config variables to `.env.local`

## Development Workflow

### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and test locally

3. **Version your changes**:
   ```bash
   npm run version:patch  # For bug fixes
   npm run version:minor  # For new features
   npm run version:major  # For breaking changes
   ```

4. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Testing

```bash
# Run all tests
pnpm --filter @ed/dashboard test

# Build all apps
npm run build

# Validate versions
npm run version:validate
```

## Project Structure

```
edward/
├── apps/
│   ├── dashboard/     # Main web application
│   └── docs/          # Documentation site
├── packages/
│   └── versioning/    # Version management CLI
├── scripts/           # Deployment scripts
└── config/           # Configuration files
```

## Key Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dashboard development server |
| `npm run dev:docs` | Start documentation development server |
| `npm run build` | Build all applications |
| `npm run version:patch` | Create patch release |
| `npm run version:validate` | Check version consistency |

## Contributing

1. Follow conventional commit format
2. Write tests for new features
3. Update documentation as needed
4. Ensure all CI checks pass

## Getting Help

- **Documentation**: You're reading it! Check other sections for detailed guides
- **Issues**: Report bugs on [GitHub Issues](https://github.com/edcalderon/my-second-brain/issues)
- **Discussions**: Ask questions on [GitHub Discussions](https://github.com/edcalderon/my-second-brain/discussions)

## What's Next?

- Explore the [System Architecture](./create-a-document.md) to understand how everything works
- Check out the [API Reference](../api/index.md) for integration details
- Learn about [Deployment](./deploy-your-site.md) processes

Happy coding! 🚀
