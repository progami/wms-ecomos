import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

describe('ConfirmDialog Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    it('renders with default button text', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders with custom button text', () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          confirmText="Delete"
          cancelText="Keep"
        />
      );
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
    });
  });

  describe('Dialog types', () => {
    it('renders warning type by default', () => {
      render(<ConfirmDialog {...defaultProps} />);
      // Find the icon container by its classes
      const iconContainer = document.querySelector('.bg-yellow-100');
      expect(iconContainer).toBeInTheDocument();
    });

    it('renders danger type with red styling', () => {
      render(<ConfirmDialog {...defaultProps} type="danger" />);
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-red-600');
    });

    it('renders warning type with yellow styling', () => {
      render(<ConfirmDialog {...defaultProps} type="warning" />);
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-yellow-600');
    });

    it('renders info type with blue styling', () => {
      render(<ConfirmDialog {...defaultProps} type="info" />);
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-blue-600');
    });
  });

  describe('User interactions', () => {
    it('calls onConfirm and onClose when confirm button is clicked', () => {
      render(<ConfirmDialog {...defaultProps} />);
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.click(confirmButton);
      
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls only onClose when cancel button is clicked', () => {
      render(<ConfirmDialog {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', () => {
      render(<ConfirmDialog {...defaultProps} />);
      
      // Find the backdrop element by its classes
      const backdrop = document.querySelector('.bg-gray-500');
      fireEvent.click(backdrop!);
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('handles keyboard interactions', async () => {
      const user = userEvent.setup();
      render(<ConfirmDialog {...defaultProps} />);
      
      // Tab through buttons
      await user.tab();
      expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('has proper dialog structure', () => {
      render(<ConfirmDialog {...defaultProps} />);
      
      // The dialog is the outermost container
      const dialog = document.querySelector('.fixed.inset-0.z-50');
      expect(dialog).toBeInTheDocument();
    });

    it('has proper heading hierarchy', () => {
      render(<ConfirmDialog {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Confirm Action');
    });

    it('maintains focus trap within dialog', async () => {
      const user = userEvent.setup();
      render(<ConfirmDialog {...defaultProps} />);
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      
      // Focus should cycle between buttons
      confirmButton.focus();
      await user.tab();
      expect(cancelButton).toHaveFocus();
      
      await user.tab();
      expect(confirmButton).toHaveFocus();
    });

    it('has descriptive text for screen readers', () => {
      render(<ConfirmDialog {...defaultProps} />);
      
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });
  });

  describe('Responsive behavior', () => {
    it('has responsive button layout', () => {
      render(<ConfirmDialog {...defaultProps} />);
      
      const buttonContainer = screen.getByRole('button', { name: 'Confirm' }).parentElement;
      expect(buttonContainer).toHaveClass('sm:flex', 'sm:flex-row-reverse');
    });

    it('has responsive spacing', () => {
      render(<ConfirmDialog {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toHaveClass('mt-3', 'sm:mt-0');
    });

    it('has responsive width for buttons', () => {
      render(<ConfirmDialog {...defaultProps} />);
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      
      expect(confirmButton).toHaveClass('w-full', 'sm:w-auto');
      expect(cancelButton).toHaveClass('w-full', 'sm:w-auto');
    });
  });

  describe('Visual states', () => {
    it('has hover states on buttons', () => {
      render(<ConfirmDialog {...defaultProps} type="danger" />);
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('hover:bg-red-700');
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toHaveClass('hover:bg-gray-50');
    });

    it('has focus states on buttons', () => {
      render(<ConfirmDialog {...defaultProps} type="info" />);
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('focus:ring-blue-500');
    });

    it('has proper shadow and border styling', () => {
      render(<ConfirmDialog {...defaultProps} />);
      
      const dialogContent = document.querySelector('.shadow-xl');
      expect(dialogContent).toBeInTheDocument();
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toHaveClass('ring-1', 'ring-inset', 'ring-gray-300');
    });
  });

  describe('Animation and transitions', () => {
    it('has transition classes for smooth animations', () => {
      render(<ConfirmDialog {...defaultProps} />);
      
      const backdrop = document.querySelector('.bg-gray-500');
      expect(backdrop).toHaveClass('transition-opacity');
      
      const dialogContent = document.querySelector('.transition-all');
      expect(dialogContent).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles empty title and message', () => {
      render(<ConfirmDialog {...defaultProps} title="" message="" />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('');
    });

    it('handles very long title and message', () => {
      const longTitle = 'A'.repeat(100);
      const longMessage = 'B'.repeat(500);
      
      render(<ConfirmDialog {...defaultProps} title={longTitle} message={longMessage} />);
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles rapid open/close cycles', () => {
      const { rerender } = render(<ConfirmDialog {...defaultProps} />);
      
      rerender(<ConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
      
      rerender(<ConfirmDialog {...defaultProps} isOpen={true} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });
  });
});