import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '@/components/ui/empty-state';
import { Package, ShoppingCart, Users } from 'lucide-react';

describe('EmptyState Component', () => {
  const defaultProps = {
    icon: Package,
    title: 'No items found',
    description: 'Start by adding your first item to the inventory.',
  };

  describe('Rendering', () => {
    it('renders with required props', () => {
      render(<EmptyState {...defaultProps} />);
      
      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(screen.getByText('Start by adding your first item to the inventory.')).toBeInTheDocument();
    });

    it('renders the icon', () => {
      render(<EmptyState {...defaultProps} />);
      
      // Icon should be rendered as an SVG
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-12', 'w-12', 'text-gray-400', 'mx-auto', 'mb-4');
    });

    it('renders with different icons', () => {
      const { rerender } = render(<EmptyState {...defaultProps} icon={ShoppingCart} />);
      let icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();

      rerender(<EmptyState {...defaultProps} icon={Users} />);
      icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders without action button when action is not provided', () => {
      render(<EmptyState {...defaultProps} />);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders with action button when action is provided', () => {
      const action = {
        label: 'Add Item',
        onClick: jest.fn(),
      };
      
      render(<EmptyState {...defaultProps} action={action} />);
      
      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies correct container styles', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      const wrapper = container.firstChild;
      
      expect(wrapper).toHaveClass('text-center', 'py-12');
    });

    it('applies correct title styles', () => {
      render(<EmptyState {...defaultProps} />);
      const title = screen.getByText('No items found');
      
      expect(title).toHaveClass('text-lg', 'font-medium', 'text-gray-900', 'mb-2');
      expect(title.tagName).toBe('H3');
    });

    it('applies correct description styles', () => {
      render(<EmptyState {...defaultProps} />);
      const description = screen.getByText('Start by adding your first item to the inventory.');
      
      expect(description).toHaveClass('text-sm', 'text-gray-500', 'mb-6', 'max-w-sm', 'mx-auto');
      expect(description.tagName).toBe('P');
    });

    it('applies action button styles', () => {
      const action = {
        label: 'Add Item',
        onClick: jest.fn(),
      };
      
      render(<EmptyState {...defaultProps} action={action} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('action-button');
    });
  });

  describe('User interactions', () => {
    it('calls onClick when action button is clicked', () => {
      const mockOnClick = jest.fn();
      const action = {
        label: 'Add Item',
        onClick: mockOnClick,
      };
      
      render(<EmptyState {...defaultProps} action={action} />);
      
      const button = screen.getByRole('button', { name: 'Add Item' });
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('does not throw when clicking button multiple times', () => {
      const mockOnClick = jest.fn();
      const action = {
        label: 'Add Item',
        onClick: mockOnClick,
      };
      
      render(<EmptyState {...defaultProps} action={action} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Content variations', () => {
    it('handles long titles', () => {
      const longTitle = 'This is a very long title that might wrap on smaller screens';
      render(<EmptyState {...defaultProps} title={longTitle} />);
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles long descriptions', () => {
      const longDescription = 'This is a very long description that provides detailed information about why this state is empty and what the user can do to populate it with meaningful content.';
      render(<EmptyState {...defaultProps} description={longDescription} />);
      
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('handles special characters in text', () => {
      render(
        <EmptyState
          {...defaultProps}
          title="No items & products"
          description="Add items with special chars: <>&quot;"
        />
      );
      
      expect(screen.getByText('No items & products')).toBeInTheDocument();
      // The <> characters will be rendered as text, and &quot; will be rendered as "
      const descriptionElement = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'p' && 
               content.includes('Add items with special chars:');
      });
      expect(descriptionElement).toHaveTextContent('Add items with special chars: <>"');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<EmptyState {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('No items found');
    });

    it('icon has proper accessibility attributes', () => {
      render(<EmptyState {...defaultProps} />);
      
      const icon = document.querySelector('svg');
      // Lucide icons typically include aria-hidden by default
      expect(icon).toBeInTheDocument();
    });

    it('action button is keyboard accessible', () => {
      const action = {
        label: 'Add Item',
        onClick: jest.fn(),
      };
      
      render(<EmptyState {...defaultProps} action={action} />);
      
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('maintains semantic HTML structure', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      
      const heading = container.querySelector('h3');
      const paragraph = container.querySelector('p');
      
      expect(heading).toBeInTheDocument();
      expect(paragraph).toBeInTheDocument();
    });
  });

  describe('Integration scenarios', () => {
    it('works as expected in a typical empty list scenario', () => {
      const handleAddItem = jest.fn();
      
      render(
        <div>
          <h1>Inventory</h1>
          <EmptyState
            icon={Package}
            title="No products in inventory"
            description="Your inventory is empty. Add your first product to get started."
            action={{
              label: 'Add Product',
              onClick: handleAddItem,
            }}
          />
        </div>
      );
      
      expect(screen.getByText('No products in inventory')).toBeInTheDocument();
      
      const button = screen.getByRole('button', { name: 'Add Product' });
      fireEvent.click(button);
      
      expect(handleAddItem).toHaveBeenCalled();
    });

    it('can be used without action for read-only states', () => {
      render(
        <EmptyState
          icon={Users}
          title="No team members"
          description="You haven't added any team members yet."
        />
      );
      
      expect(screen.getByText('No team members')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Props validation', () => {
    it('renders with minimal valid props', () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('updates when props change', () => {
      const { rerender } = render(<EmptyState {...defaultProps} />);
      
      expect(screen.getByText('No items found')).toBeInTheDocument();
      
      rerender(
        <EmptyState
          {...defaultProps}
          title="Updated title"
          description="Updated description"
        />
      );
      
      expect(screen.queryByText('No items found')).not.toBeInTheDocument();
      expect(screen.getByText('Updated title')).toBeInTheDocument();
      expect(screen.getByText('Updated description')).toBeInTheDocument();
    });
  });
});