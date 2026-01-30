# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inspector is a static Vue.js web application for interacting with smart contracts on the VeChain blockchain. Users can import contract ABIs, call contract functions (read/write), deploy contracts, and manage custom networks.

**Live:** https://inspector.vecha.in

## Development Commands

```bash
# Install dependencies
yarn install

# Development server with hot reload
yarn serve

# Production build
yarn build

# Run linter
yarn lint
```

Node.js 16.20.0+ required (see `.nvmrc`).

## Architecture

### Tech Stack
- Vue.js 2.7 with Vue Class Components and TypeScript
- Bulma/Buefy for UI components
- Dexie (IndexedDB wrapper) for local persistence
- @vechain/connex for blockchain interaction

### Directory Structure
```
/src
  /views        - Page components (Contracts, ContractDetail, Deploy)
  /components   - Reusable UI components
  /services     - Business logic (ImportService, NetworkService, etc.)
  /mixin        - Vue mixins (AccountCall for contract execution)
  /utils        - Utility functions
  /contracts    - Built-in contract ABIs and configs
  /abis         - ABI type definitions
  database.ts   - Dexie schema (contracts, filters, shortCuts, networks)
  Router.ts     - Vue Router config (hash mode)
```

### Key Patterns
- **Vue Class Components**: Use `@Component`, `@Prop`, `@Watch` decorators
- **Service Layer**: Business logic in `/services`, not in components
- **Reactive DB**: Dexie-Observable for reactive IndexedDB subscriptions
- **Network-aware**: Contracts filtered by genesis ID; supports main/test/solo/custom networks

### Database Tables (Dexie)
- `contracts` - Imported contract ABIs with address, name, network, category
- `filters` - Saved contract list views
- `shortCuts` - Quick-access contract methods (read/write)
- `networks` - Custom blockchain network configurations

### Routes
- `/contracts` - Main contract list
- `/contract/detail` - Contract inspection view
- `/deploy` - Contract deployment
- `/view/:id/list` - Filtered views
- `/view/mgt` - Filter management
- `/view/scs` - Shortcuts management

## Code Style

- Single quotes, no semicolons, 2-space indentation
- TypeScript strict mode
- Path alias: `@/*` maps to `src/*`
- PascalCase for components/classes, camelCase for methods/props

## VeChain Specifics

- Connex instance available globally via `this.$connex`
- Built-in contracts include Authority, VTHO, Executor, Params, Extension
- Prototype contract address: `0x000000000000000000000050726f746f74797065`
- Genesis IDs identify networks (main, test, solo)
