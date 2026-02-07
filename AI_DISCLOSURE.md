# AI Tool Disclosure

**Developer**: Pratik Kale ([@pratikkale26](https://x.com/pratikkale26))

## Overview

I built LayerSplit as the primary developer, using AI as a development assistant to accelerate iteration speed and improve code quality. The core architecture, business logic, and design decisions are my own work.

## What I Built Independently

### Smart Contract Design
- Conceived the 1% daily interest model (365% APR) as a social incentive mechanism
- Designed the partial payment system with interest-first allocation
- Created the initial Move contract structure and core logic
- Iterated with AI to complete edge cases and optimize code

### System Architecture
- Designed the 3-tier architecture (Smart Contract → Backend API → Telegram Mini App)
- Chose the tech stack: Sui Move, Express, Prisma, Next.js
- Structured the database schema for bills, debts, and user relationships
- Set up the initial project structure for all three components

### Core Business Logic
- Interest calculation formula with 3-day grace period
- Bill splitting algorithms (equal, custom, Dutch)
- Payment confirmation and debt settlement flow

## AI-Assisted Development

### Tools Used
- **Claude** (Anthropic) via website and cursor IDE
- Model: Claude 4.5 Sonnet

### Areas Where AI Helped

**1. Code Documentation & Organization**
- Writing comprehensive comments and JSDoc
- Structuring modular file organization
- Creating README and setup documentation

**2. Function Implementation**
- Completing Move functions after I wrote initial logic
- Generating TypeScript types and API route handlers
- Writting tests

**3. Frontend UI (Heavy Usage)**
- Tailwind CSS styling and responsive design
- Framer Motion animations
- Component structure and state management
- Landing page sections and TMA screens

### Example Prompts

1. *"Complete the interest calculation in Move - I want 1% per day after a 3-day grace period, with interest paid before principal"*

2. *"Create the API endpoints for bill CRUD operations using Express and Prisma, following the schema I designed"*

3. *"Build a modern dark-themed dashboard for the TMA with wallet connection, debt summary cards, and navigation"*

## Summary

| Component | My Contribution | AI Contribution |
|-----------|-----------------|-----------------|
| Smart Contract | Core logic, design | Code completion, tests |
| Backend API | Architecture, schema | Route handlers, types |
| Frontend | Requirements, structure | UI components, styling |
| Documentation | Outline | Full writeup |

The project reflects my vision and design decisions, with AI serving as a productivity multiplier—particularly for frontend polish and boilerplate code.
