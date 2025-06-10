import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { MainNav } from '@/components/layout/main-nav'
import { render, mockSessions } from '../../test-utils'

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

const mockSignOut = signOut as jest.MockedFunction<typeof signOut>
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

// Mock update function
const mockUpdate = jest.fn()

describe('MainNav Component', () => {

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/dashboard')
    mockSignOut.mockImplementation(() => Promise.resolve({ url: '/' }))
  })

  describe('Role-based Navigation', () => {
    it('should render admin navigation for admin role', () => {
      mockUseSession.mockReturnValue({
        data: mockSessions.admin,
        status: 'authenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      // Admin should see all navigation items
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Finance')).toBeInTheDocument()
      expect(screen.getByText('Operations')).toBeInTheDocument()
      expect(screen.getByText('Configuration')).toBeInTheDocument()
      expect(screen.getByText('Reports')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })

    it('should render limited navigation for staff role', () => {
      mockUseSession.mockReturnValue({
        data: mockSessions.warehouseStaff,
        status: 'authenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      // Staff should see limited navigation
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Operations')).toBeInTheDocument()
      expect(screen.queryByText('Admin')).not.toBeInTheDocument()
    })

    it('should render limited navigation for viewer role', () => {
      mockUseSession.mockReturnValue({
        data: mockSessions.viewer,
        status: 'authenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      // Viewer should see limited navigation
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Reports')).toBeInTheDocument()
    })
  })

  describe('Active Link Highlighting', () => {
    it('should highlight the current active route', () => {
      mockUsePathname.mockReturnValue('/finance/invoices')
      mockUseSession.mockReturnValue({
        data: mockSessions.admin,
        status: 'authenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      const financeLink = screen.getByText('Finance').closest('a')
      expect(financeLink).toHaveClass('bg-accent')
    })

    it('should not highlight non-active routes', () => {
      mockUsePathname.mockReturnValue('/dashboard')
      mockUseSession.mockReturnValue({
        data: mockSessions.admin,
        status: 'authenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      const financeLink = screen.getByText('Finance').closest('a')
      expect(financeLink).not.toHaveClass('bg-accent')
    })
  })

  describe('User Menu', () => {
    it('should display user information', () => {
      mockUseSession.mockReturnValue({
        data: mockSessions.admin,
        status: 'authenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      // Click on user menu
      const userButton = screen.getByRole('button', { name: /Admin User/i })
      fireEvent.click(userButton)

      expect(screen.getByText('admin@warehouse.com')).toBeInTheDocument()
    })

    it('should call signOut when logout is clicked', async () => {
      mockUseSession.mockReturnValue({
        data: mockSessions.admin,
        status: 'authenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      // Click on user menu
      const userButton = screen.getByRole('button', { name: /Admin User/i })
      fireEvent.click(userButton)

      // Click logout
      const logoutButton = screen.getByText('Log out')
      fireEvent.click(logoutButton)

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' })
      })
    })
  })

  describe('Navigation Dropdowns', () => {
    it('should toggle dropdown menus on click', () => {
      mockUseSession.mockReturnValue({
        data: mockSessions.admin,
        status: 'authenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      // Finance dropdown should not be visible initially
      expect(screen.queryByText('Invoices')).not.toBeInTheDocument()

      // Click on Finance
      fireEvent.click(screen.getByText('Finance'))

      // Finance dropdown items should now be visible
      expect(screen.getByText('Invoices')).toBeInTheDocument()
      expect(screen.getByText('Cost Ledger')).toBeInTheDocument()
    })

    it('should close dropdown when clicking outside', () => {
      mockUseSession.mockReturnValue({
        data: mockSessions.admin,
        status: 'authenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      // Open Finance dropdown
      fireEvent.click(screen.getByText('Finance'))
      expect(screen.getByText('Invoices')).toBeInTheDocument()

      // Click outside
      fireEvent.click(document.body)

      // Dropdown should close
      expect(screen.queryByText('Invoices')).not.toBeInTheDocument()
    })
  })

  describe('Mobile Navigation', () => {
    it('should toggle mobile menu', () => {
      mockUseSession.mockReturnValue({
        data: mockSessions.admin,
        status: 'authenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      // Mobile menu should not be visible initially
      const mobileNav = screen.getByTestId('mobile-nav')
      expect(mobileNav).toHaveClass('hidden')

      // Click hamburger menu
      const hamburgerButton = screen.getByLabelText('Toggle navigation menu')
      fireEvent.click(hamburgerButton)

      // Mobile menu should now be visible
      expect(mobileNav).toHaveClass('block')
    })
  })

  describe('Loading State', () => {
    it('should show loading state when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: mockUpdate,
      })

      render(<MainNav />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Unauthenticated State', () => {
    it('should show login link when unauthenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      expect(screen.getByText('Login')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      mockUseSession.mockReturnValue({
        data: mockSessions.admin,
        status: 'authenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation')
      expect(screen.getByLabelText('Toggle navigation menu')).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      mockUseSession.mockReturnValue({
        data: mockSessions.admin,
        status: 'authenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      const firstLink = screen.getByText('Dashboard').closest('a')
      firstLink?.focus()

      expect(document.activeElement).toBe(firstLink)
    })

    it('should mark icon as decorative with aria-hidden', () => {
      mockUseSession.mockReturnValue({
        data: mockSessions.admin,
        status: 'authenticated',
        update: mockUpdate,
      })

      render(<MainNav />)

      const icons = screen.getAllByTestId('nav-icon')
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })
})