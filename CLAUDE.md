# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production 
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

### Dependencies
- `npm install` - Install all dependencies

## Architecture

This is a React TypeScript financial management application ("Grana Board") built with:

- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom color scheme and gradients
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: React Router DOM v6
- **Database**: Supabase (PostgreSQL) with full schema implemented
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **AI Integration**: OpenAI API for transaction categorization

### Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components (auto-generated)
│   ├── dashboard/       # Dashboard-specific components
│   ├── layout/          # Layout components (Header, Sidebar, MainLayout)
│   └── ai/              # AI-related components
├── pages/               # Route components (Dashboard, Transactions, etc.)
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions and AI client
├── integrations/        # External service integrations
│   └── supabase/       # Supabase client and types
└── assets/             # Static assets

supabase/
├── config.toml         # Supabase configuration
└── migrations/         # Database migrations (full schema implemented)
```

### Key Architecture Patterns

1. **Layout System**: Uses `MainLayout` component that wraps all pages with consistent header/sidebar structure
2. **Navigation**: Sidebar navigation with collapsible state managed in `MainLayout`
3. **Component Library**: Extensive use of shadcn/ui components for consistent design
4. **Database Integration**: Full Supabase schema with users, transactions, categories, goals, bills, investments, and WhatsApp messages
5. **Routing**: Single-page application with React Router, catch-all route for 404s
6. **AI Integration**: OpenAI GPT-4o for intelligent transaction categorization with fallback logic

### Database Schema

The Supabase database includes:

- **users**: User profiles extending auth.users
- **categories**: User-defined transaction categories with budgets
- **transactions**: Income/expense records with categorization
- **goals**: Financial goals with progress tracking
- **bills**: Payable/receivable bills with recurring options
- **investments**: Investment portfolio tracking
- **whatsapp_messages**: WhatsApp bot integration messages

All tables have proper RLS (Row Level Security) policies and are fully indexed for performance.

### Pages Overview

- **Dashboard**: Financial overview with cards, mock data currently used
- **Transactions**: Income and expense tracking with AI categorization
- **WhatsApp**: WhatsApp-based financial control interface
- **Categories**: Financial category management
- **Reports**: Analytics and charts
- **Goals**: Financial goal setting and tracking
- **Bills**: Accounts payable/receivable management
- **Investments**: Investment portfolio management
- **Settings**: Application configuration

### Component Conventions

- All components use TypeScript with proper interfaces
- Functional components with React.FC typing
- Consistent import order: React, external libraries, internal imports
- shadcn/ui components follow established patterns
- Icons from Lucide React with consistent sizing
- Tailwind classes for styling with semantic color variables
- Custom gradients and shadows defined in theme

### Supabase Integration

- Client configured in `src/integrations/supabase/client.ts`
- Types auto-generated from database schema
- Full database schema implemented with migrations
- RLS policies ensure user data isolation

### AI Features

- OpenAI GPT-4o integration for transaction categorization
- Fallback logic using keyword matching for offline operation
- Brazilian financial context awareness
- User history analysis for improved categorization
- Cost estimation and API key validation

### Important Notes

- Application is in Portuguese (Brazilian)
- Uses BRL currency formatting
- Mock data currently used in Dashboard (real API integration pending)
- No test framework currently configured
- Built with Lovable platform integration
- OpenAI API key required for AI features (VITE_OPENAI_API_KEY)
- Database migrations are complete but API integration still needed