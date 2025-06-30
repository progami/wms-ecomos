# WMS (Warehouse Management System) Project Overview

## Project Purpose
A comprehensive warehouse management system built with Next.js for managing inventory, operations, and warehouse logistics.

## Tech Stack
- **Frontend**: Next.js 14.1.3, React 18.2.0, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **State Management**: React Query (TanStack Query)
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **Data Visualization**: Recharts
- **Forms**: React Hook Form with Zod validation
- **Testing**: Jest, React Testing Library, Playwright
- **Development Tools**: ESLint, Prettier, Husky

## Project Structure
```
/src
  /app          - Next.js app router pages
  /components   - React components
    /ui         - Reusable UI components
    /layout     - Layout components
    /charts     - Chart components
    /operations - Operations-specific components
    /dashboard  - Dashboard components
    /common     - Common/shared components
  /lib          - Utility functions and configurations
  /hooks        - Custom React hooks
  /types        - TypeScript type definitions
/tests
  /unit         - Unit tests
  /integration  - Integration tests
  /e2e          - End-to-end tests
/prisma        - Database schema and migrations
```

## Key Features
- Inventory management with SKU tracking
- Restock alerts and predictions
- Financial tracking and reporting
- Warehouse operations workflow
- Multi-user support with role-based access
- Demo mode for testing
- Import/export functionality
- Real-time dashboards and analytics