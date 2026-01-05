# ERechnung - E-Invoicing SaaS Platform

A professional E-Invoicing application for the German market with ZUGFeRD 2.x / Factur-X support.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **UI Components**: Shadcn/UI, Lucide React Icons
- **Charts**: Recharts
- **Backend**: Node.js (planned)
- **Database**: PostgreSQL (planned)
- **Infrastructure**: Docker (planned)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── globals.css         # Global styles & CSS variables
│   │   ├── layout.tsx          # Root layout with Shell
│   │   └── page.tsx            # Dashboard page
│   ├── components/
│   │   ├── dashboard/          # Dashboard components
│   │   │   ├── stat-card.tsx   # Metric cards
│   │   │   ├── revenue-chart.tsx
│   │   │   ├── status-chart.tsx
│   │   │   └── recent-invoices.tsx
│   │   ├── layout/             # Layout components
│   │   │   ├── shell.tsx       # Main app shell
│   │   │   ├── sidebar.tsx     # Collapsible sidebar
│   │   │   └── header.tsx      # Top header
│   │   └── ui/                 # Shadcn/UI components
│   ├── lib/
│   │   ├── mock-data.ts        # Sample data for development
│   │   └── utils.ts            # Utility functions
│   └── types/
│       └── index.ts            # TypeScript interfaces
```

## Features (MVP)

- [x] Modern SaaS layout with collapsible sidebar
- [x] Executive Dashboard with KPI metrics
- [x] Revenue chart (last 12 months)
- [x] Invoice status distribution chart
- [x] Recent invoices table
- [ ] Invoice CRUD operations
- [ ] Invoice Editor with live PDF preview
- [ ] ZUGFeRD 2.x / Factur-X export
- [ ] Customer management
- [ ] Backend API
- [ ] Docker setup

## License

Proprietary
