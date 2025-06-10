# Source Directory Structure

This directory contains all the application source code organized in a modular structure.

## Directory Overview

### app/
Next.js 14 App Router directory containing all pages, API routes, and layouts.

### components/
Reusable React components organized by feature area.

### lib/
Utility functions, database clients, and shared business logic.

### modules/
Feature-based modules following a domain-driven design approach.

### types/
TypeScript type definitions and interfaces.

### middleware.ts
Next.js middleware for authentication and request routing.

## Architecture

The application follows a modular architecture where:
- **Pages** are in the `app/` directory (Next.js App Router)
- **Shared components** are in `components/`
- **Feature modules** are in `modules/` with their own components, services, and types
- **Utilities and helpers** are in `lib/`
- **Global types** are in `types/`

This structure promotes:
- Code reusability
- Feature isolation
- Clear separation of concerns
- Easy navigation and maintenance