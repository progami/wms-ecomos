// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfills for test environment
import './src/__tests__/test-polyfills'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
  redirect: jest.fn(),
}))

// Mock next-auth
jest.mock('next-auth/react', () => {
  const originalModule = jest.requireActual('next-auth/react')
  const mockSession = {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'system_admin',
      warehouseId: 'test-warehouse-id',
    },
    expires: new Date(Date.now() + 2 * 86400).toISOString(),
  }
  return {
    __esModule: true,
    ...originalModule,
    useSession: jest.fn(() => {
      return { data: mockSession, status: 'authenticated' }
    }),
    signOut: jest.fn(() => Promise.resolve()),
  }
})

// Mock getServerSession
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// Fix for jsdom issues
if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
  
  // Fix document.addEventListener issue
  if (typeof document !== 'undefined' && !document.addEventListener) {
    document.addEventListener = jest.fn()
    document.removeEventListener = jest.fn()
  }
}

// Suppress console errors during tests unless explicitly testing error cases
const originalError = console.error
const originalWarn = console.warn
const originalLog = console.log

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('document.addEventListener'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
  
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('deprecated')
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }

  // Suppress logs during tests
  console.log = jest.fn()
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
  console.log = originalLog
})