import React from 'react';
import { render, screen } from '@testing-library/react';
import { Progress } from '@/components/ui/progress';

describe('Progress Component', () => {
  describe('Rendering', () => {
    it('renders progress bar', () => {
      render(<Progress value={50} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<Progress value={50} className="custom-progress" />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveClass('custom-progress');
    });

    it('applies default styles', () => {
      render(<Progress value={50} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveClass(
        'relative',
        'h-4',
        'w-full',
        'overflow-hidden',
        'rounded-full',
        'bg-secondary'
      );
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Progress ref={ref} value={50} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Progress values', () => {
    it('handles 0% progress', () => {
      render(<Progress value={0} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('handles 50% progress', () => {
      render(<Progress value={50} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    });

    it('handles 100% progress', () => {
      render(<Progress value={100} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    });

    it('handles undefined value as 0', () => {
      render(<Progress />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    });

    it('handles null value as 0', () => {
      render(<Progress value={null as any} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('Visual indicator', () => {
    it('indicator transforms based on value', () => {
      const { container } = render(<Progress value={75} />);
      // Find the indicator element (child of progressbar)
      const indicator = container.querySelector('[style*="transform"]');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveStyle({ transform: 'translateX(-25%)' });
    });

    it('indicator at 0% progress', () => {
      const { container } = render(<Progress value={0} />);
      const indicator = container.querySelector('[style*="transform"]');
      expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });
    });

    it('indicator at 100% progress', () => {
      const { container } = render(<Progress value={100} />);
      const indicator = container.querySelector('[style*="transform"]');
      expect(indicator).toHaveStyle({ transform: 'translateX(-0%)' });
    });

    it('indicator has transition styles', () => {
      const { container } = render(<Progress value={50} />);
      const indicator = container.querySelector('.transition-all');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('h-full', 'w-full', 'flex-1', 'bg-primary');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<Progress value={60} />);
      const progressbar = screen.getByRole('progressbar');
      
      expect(progressbar).toHaveAttribute('aria-valuenow', '60');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('supports aria-label', () => {
      render(<Progress value={50} aria-label="Loading progress" />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Loading progress');
    });

    it('supports aria-labelledby', () => {
      render(
        <>
          <span id="progress-label">Upload progress</span>
          <Progress value={30} aria-labelledby="progress-label" />
        </>
      );
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-labelledby', 'progress-label');
    });

    it('supports aria-describedby', () => {
      render(
        <>
          <Progress value={80} aria-describedby="progress-desc" />
          <span id="progress-desc">80% complete</span>
        </>
      );
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-describedby', 'progress-desc');
    });
  });

  describe('Edge cases', () => {
    it('handles values greater than 100', () => {
      render(<Progress value={150} />);
      const progressbar = screen.getByRole('progressbar');
      // Radix UI Progress should clamp the value
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    });

    it('handles negative values', () => {
      render(<Progress value={-50} />);
      const progressbar = screen.getByRole('progressbar');
      // Radix UI Progress should clamp the value
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    });

    it('handles decimal values', () => {
      render(<Progress value={33.33} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '33.33');
    });
  });

  describe('Props forwarding', () => {
    it('forwards additional HTML attributes', () => {
      render(
        <Progress
          value={50}
          id="upload-progress"
          data-testid="test-progress"
          title="Upload progress: 50%"
        />
      );
      
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('id', 'upload-progress');
      expect(progressbar).toHaveAttribute('data-testid', 'test-progress');
      expect(progressbar).toHaveAttribute('title', 'Upload progress: 50%');
    });

    it('supports data-state attribute', () => {
      render(<Progress value={100} />);
      const progressbar = screen.getByRole('progressbar');
      // Radix UI adds data-state="complete" when value is 100
      expect(progressbar).toHaveAttribute('data-state');
    });
  });

  describe('Dynamic updates', () => {
    it('updates when value changes', () => {
      const { rerender } = render(<Progress value={25} />);
      let progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '25');

      rerender(<Progress value={75} />);
      progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '75');
    });

    it('updates indicator transform when value changes', () => {
      const { container, rerender } = render(<Progress value={20} />);
      let indicator = container.querySelector('[style*="transform"]');
      expect(indicator).toHaveStyle({ transform: 'translateX(-80%)' });

      rerender(<Progress value={80} />);
      indicator = container.querySelector('[style*="transform"]');
      expect(indicator).toHaveStyle({ transform: 'translateX(-20%)' });
    });
  });

  describe('Custom styling', () => {
    it('allows custom height through className', () => {
      render(<Progress value={50} className="h-2" />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveClass('h-2');
      expect(progressbar).not.toHaveClass('h-4'); // Should override default
    });

    it('allows custom colors through className', () => {
      render(<Progress value={50} className="bg-gray-200" />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveClass('bg-gray-200');
    });
  });
});