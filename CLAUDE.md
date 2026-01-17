# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ERechnung is an E-Invoicing SaaS platform for the German market with ZUGFeRD 2.x / Factur-X support. It's a full-stack application with a Next.js frontend and Express.js backend.

## Commands

### Frontend (run from `frontend/` directory)
```bash
npm run dev      # Start development server (port 3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm start        # Start production server
```

### Backend (run from `backend/` directory)
```bash
npm run dev      # Start development server with tsx watch (port 3001)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled JS from dist/
```

### Docker (run from root)
```bash
docker-compose up -d          # Start all services (backend, postgres, pgadmin)
docker-compose down           # Stop all services
```
- PostgreSQL runs on port 5432 (user: postgres, password: postgres, db: erechnung)
- pgAdmin runs on port 5050 (admin@erechnung.com / admin)

## Architecture

### Frontend (`frontend/`)
- **Framework**: Next.js 16 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS 4 with Shadcn/UI components
- **API Client**: Custom fetch-based client with JWT token refresh at `src/lib/api/client.ts`

**Routing Structure** (`src/app/`):
- `(dashboard)/` - Route group for authenticated pages with shared layout/shell
  - `invoices/`, `quotes/`, `customers/`, `expenses/`, `vendors/` - CRUD modules
  - `accounting/accounts/`, `accounting/journal/` - Double-entry bookkeeping
  - `reports/`, `settings/`, `company/` - Configuration pages
- `login/` - Authentication page

**Key Components**:
- `src/components/layout/` - Shell, Sidebar, Header (main app layout)
- `src/components/ui/` - Shadcn/UI primitives (Button, Card, Dialog, etc.)
- `src/components/invoice/` - Invoice preview and XML import
- `src/components/quote/` - Quote form and preview

### Backend (`backend/`)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with raw SQL queries (no ORM)
- **Authentication**: JWT with access/refresh tokens

**Structure**:
- `src/routes/` - Express routers for each API module
- `src/services/` - Business logic (invoice.service.ts, zugferd.service.ts, etc.)
- `src/middleware/` - Auth, validation, error handling
- `src/types/index.ts` - All TypeScript interfaces
- `init.sql` - Complete database schema

**API Routes** (all prefixed with `/api`):
- `/auth` - Login, register, refresh token
- `/invoices`, `/quotes`, `/customers`, `/vendors`, `/expenses`
- `/accounting` - Chart of accounts, journal entries
- `/company`, `/settings`, `/reports`

### ZUGFeRD Support
- `backend/src/services/zugferd.service.ts` - Generates ZUGFeRD 2.1 XML (Factur-X)
- `backend/src/services/xml-import.service.ts` - Parses incoming ZUGFeRD/XRechnung
- Uses `fast-xml-parser` for XML generation/parsing

### Type System
Both frontend and backend have parallel type definitions:
- `frontend/src/types/index.ts` - Frontend types with string dates
- `backend/src/types/index.ts` - Backend types with Date objects

Key entities: Invoice, Quote, Customer, Vendor, Expense, ChartOfAccount, JournalEntry

## German Accounting Context

The app implements German accounting standards:
- **SKR03** chart of accounts structure
- **DATEV** compatibility fields in accounting entities
- German tax rates (19% standard, 7% reduced)
- German address format (street, house number separate fields)
