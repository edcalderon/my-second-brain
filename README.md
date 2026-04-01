# My Second Brain

![Deploy Web](https://github.com/edcalderon/my-second-brain/actions/workflows/deploy-web.yml/badge.svg)
![Deploy Static](https://github.com/edcalderon/my-second-brain/actions/workflows/deploy-static.yml/badge.svg)
![Publish NPM](https://github.com/edcalderon/my-second-brain/actions/workflows/publish-npm.yml/badge.svg)

## Project Directory

The public site now lives on `https://edcalderon.io` and acts as a directory for multiple projects.

| Route | Purpose |
| --- | --- |
| [`/`](https://edcalderon.io/) | Public project directory and entrypoint |
| [`/my-second-brain/`](https://edcalderon.io/my-second-brain/) | Second Brain dashboard |
| [`/my-second-brain/documentation/`](https://edcalderon.io/my-second-brain/documentation/) | Docusaurus docs for the knowledge workspace |
| [`/a-quant/`](https://edcalderon.io/a-quant/) | Dedicated A-Quant project portal |

## Packages

- [`packages/versioning`](packages/versioning) - release automation, changelog management, and repo guardrails.
- [`packages/auth`](packages/auth) - auth helpers, provisioning docs, and UI integrations.
- [`packages/gcp-functions`](packages/gcp-functions) - Cloud Functions for sync, status, and screenshot automation.

The root landing page is implemented as static HTML in `apps/dashboard/public/index.html`, with a matching dedicated A-Quant portal in `apps/dashboard/public/a-quant/index.html`. That keeps the root fast, gives each project its own surface, and leaves room for more projects later.


A personal knowledge laboratory leveraged by **Obsidian** as the markdown foundation, designed for agentic intelligence and deep reflection.

## 🏗️ High-Level Architecture

```mermaid
graph TD
    subgraph "Human Input"
        A[Rocketbook] -->|Handwritten Notes| B[Digital Sync]
    end

    subgraph "Cloud Processing (GCP)"
        B -->|IMAP/Webhook| C[Cloud Functions]
        C -->|Gemini AI| D[Structured Data]
        D -->|Archive| E[(Firestore / GCS)]
    end

    subgraph "Knowledge Foundation"
        E -->|Markdown Export| F[Obsidian Vault]
        F -->|Context Sync| G[Supermemory]
    end

    subgraph "Agentic Orchestration"
        G -->|Knowledge Graph| H[Open Code]
        H -->|Specialized Agents| I[Task Execution]
        I -->|Insights/Actions| J[Dashboard]
    end

    J -->|Review| A
```

---

## 🏛️ The Ignatian Roots of Reflection

The core of this system is the **Ignatian Habit Tracker**. These three reflective questions stem from a 500-year-old tradition of daily self-examination known as the **Examen of Conscience**, formalized by **St. Ignatius of Loyola** (1491–1556), the founder of the Jesuits.

### The Three Pillars
1. **What wrong did I do?**
   - *Recognition of faults, sins, or harmful habits.*
2. **What good did I accomplish?**
   - *Gratitude for actions, growth, and grace.*
3. **What did I forget or fail to do?**
   - *Awareness of omissions and missed duties.*

### Historical Context
While Ignatius systematized this into a repeatable spiritual and behavioral framework, its roots reach back even further to **Stoic philosophy**:
- **Seneca** (1st century AD): Reviewed each day at night, asking: *"What bad habit did you cure today? What fault did you resist? In what respect are you better?"*
- **Epictetus**: Taught daily moral accounting as a path to virtue.

This repository bridges these ancient wisdom traditions with modern AI, making the practice "brief, honest, and daily" as Ignatius encouraged, but with the added power of agentic synthesis.

---

## 💎 Why Obsidian?

Obsidian serves as the **Markdown Foundation** for this laboratory. While many tools exist, Obsidian provides the best balance for an agentic second brain.

### Pros
- **Local-First & Future-Proof**: Your data lives on your machine in standard Markdown. No vendor lock-in.
- **Agent-Friendly**: Markdown is the native language of LLMs. Agents can easily parse, modify, and generate documents without complex APIs.
- **Graph Visualization**: Semantic linking mimics human thought and helps identify knowledge clusters.
- **Infinite Extensibility**: A rich plugin ecosystem allows for custom workflows and automation.

### Cons (vs. Other Approaches)
- **Sync Overhead**: Requires a strategy (Git, Cloud, or Obsidian Sync) compared to SaaS tools like Notion.
- **Mobile Experience**: Can be less fluid than cloud-native mobile apps for quick capture (remedied here by **Rocketbook** integration).

**Verdict**: Obsidian is not overhead; it is the **Ground Truth**. It ensures that the knowledge remains human-readable for decades while being agent-ingestible today.

---

## 🆕 Recent Updates

### Dashboard v1.1.5
- ✨ **Mobile-First Redesign**: Complete responsive overhaul with collapsible sidebar
- 🌙 **Dark Mode System**: Full theme support with localStorage persistence and system preference detection
- 🐛 **Tailwind v4 Compatibility**: Fixed dark mode implementation for Tailwind CSS v4.1.18
- 🎨 **Glass Panel Effects**: Enhanced UI with backdrop blur and premium gradients
- 📱 **Touch-Friendly Navigation**: Improved mobile experience with proper touch targets

### Versioning CLI v1.4.2
- 🔄 **Extension Updates**: All extensions updated to v1.4.2 for consistency
- 🛡️ **Enhanced Security**: Improved secrets detection and validation
- 📊 **Status Command**: Comprehensive health reporting with `--json` and `--dot` output
- 🔧 **Monorepo Support**: Better handling of multi-package versioning

---

## 🗺️ Roadmap

- [x] **Phase 0**: Initialize Repository & Cleanse Sensitive Data.
- [/] **Phase 1**: Finalize IMAP ingestion for Rocketbook reflections.
- [ ] **Phase 2**: Deep integration between Obsidian vault and Supermemory graph.
- [ ] **Phase 3**: Deploy [Oh My OpenCode](https://github.com/open-code-orchestrator) orchestrator for automated processing.

---

## 🚀 Repository Structure

- **`apps/dashboard`**: Next.js dashboard for visualizing the Knowledge Base.
- **`packages/gcp-functions`**: Cloud Functions for IMAP ingestion and Gemini AI processing.
- **`archive/node-binance-trader-legacy`**: Deprecated legacy trader repo kept as reference only.
- **`packages/versioning`**: Composable versioning tool with extension system (reentry, cleanup, secrets).
- **`docs/`**: Detailed architecture, deployment docs, and the [trading rewrite migration plan](docs/TRADING_REWRITE_MIGRATION.md).

## ⚠️ Trading Stack

The active trading stack has been fully migrated to a **separate private repository**.
The legacy `node-binance-trader` remains at `archive/node-binance-trader-legacy` as a read-only reference.
See [docs/TRADING_REWRITE_MIGRATION.md](docs/TRADING_REWRITE_MIGRATION.md) for details.

## 📄 License
MIT
# Firebase Auth Fix
