# Code Style and Conventions

## TypeScript/JavaScript
- Use TypeScript for all new code
- Strict mode enabled in tsconfig.json
- Use explicit type annotations for function parameters and return types
- Prefer interfaces over type aliases for object shapes
- Use const assertions for literal types

## React Components
- Functional components with hooks (no class components)
- Props interfaces defined above components
- Use descriptive prop names
- Destructure props in function parameters
- Export named components (not default exports)

## File Naming
- Components: PascalCase (e.g., `Button.tsx`, `RestockAlertCard.tsx`)
- Utilities: camelCase (e.g., `formatCurrency.ts`)
- Test files: `<component>.test.tsx` or `<utility>.test.ts`
- Use `.tsx` for files with JSX, `.ts` for pure TypeScript

## Component Structure
```typescript
// Imports
import React from 'react'
import { ExternalDependency } from 'package'
import { LocalComponent } from '@/components/ui/component'

// Types/Interfaces
interface ComponentProps {
  prop1: string
  prop2?: number
  onAction: (value: string) => void
}

// Component
export function Component({ prop1, prop2 = 0, onAction }: ComponentProps) {
  // Hooks
  const [state, setState] = React.useState('')
  
  // Event handlers
  const handleClick = () => {
    onAction(state)
  }
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

## Styling
- Tailwind CSS for styling
- Use Tailwind's utility classes
- Custom styles via CSS modules when necessary
- Responsive design with mobile-first approach
- Dark mode support using Tailwind's dark: prefix

## Testing
- Jest and React Testing Library for unit tests
- Test user behavior, not implementation details
- Use accessible queries (getByRole, getByLabelText)
- Mock external dependencies
- Aim for >80% coverage

## Imports
- Use absolute imports with @ alias (e.g., `@/components/ui/button`)
- Group imports: external packages, then local imports
- Sort imports alphabetically within groups

## Error Handling
- Use try-catch blocks for async operations
- Provide meaningful error messages
- Log errors appropriately
- Use Error Boundaries for React components

## Comments
- Use JSDoc for function documentation
- Inline comments for complex logic
- TODO comments with ticket references
- Avoid obvious comments

## Git Commits
- Conventional commits format: type(scope): message
- Types: feat, fix, docs, style, refactor, test, chore
- Keep commits atomic and focused
- Write clear, descriptive commit messages