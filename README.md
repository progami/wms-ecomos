# Warehouse Management System

A warehouse management system for 3PL operations, inventory tracking, and invoice reconciliation built with Next.js and PostgreSQL.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

## Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd warehouse_management
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/warehouse_db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

4. **Set up the database**
```bash
npx prisma migrate dev
npx prisma db seed  # Optional: adds demo data
```

5. **Start the development server**
```bash
npm run dev
```

Visit http://localhost:3000

## Default Users

- **Admin**: admin@example.com / admin123
- **Finance**: finance@example.com / finance123  
- **Warehouse**: warehouse@example.com / warehouse123

## Project Structure

```
src/
├── app/           # Next.js app directory (pages & API routes)
├── components/    # React components
├── lib/          # Utility functions
└── types/        # TypeScript definitions

prisma/
├── schema.prisma  # Database schema
└── seed.ts       # Demo data script
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npx prisma studio` - Open database GUI

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js

## Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables

3. Run database migrations:
```bash
npx prisma migrate deploy
```

4. Start the server:
```bash
npm start
```

## License

MIT