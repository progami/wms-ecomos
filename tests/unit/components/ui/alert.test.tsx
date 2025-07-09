import React from 'react';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

describe('Alert Components', () => {
  describe('Alert', () => {
    it('renders with children', () => {
      render(<Alert>Alert message</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Alert message')).toBeInTheDocument();
    });

    it('has correct role attribute', () => {
      render(<Alert>Alert</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('applies default variant styles', () => {
      render(<Alert data-testid="alert">Default alert</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('bg-background', 'text-foreground');
    });

    it('applies destructive variant styles', () => {
      render(<Alert variant="destructive" data-testid="alert">Error alert</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('border-destructive/50', 'text-destructive');
    });

    it('applies base styles', () => {
      render(<Alert data-testid="alert">Alert</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('relative', 'w-full', 'rounded-lg', 'border', 'p-4');
    });

    it('merges custom className', () => {
      render(<Alert className="custom-alert" data-testid="alert">Alert</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('custom-alert');
      expect(alert).toHaveClass('relative', 'w-full'); // Still has base classes
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Alert ref={ref}>Alert</Alert>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveAttribute('role', 'alert');
    });

    it('forwards additional props', () => {
      render(
        <Alert id="test-alert" data-testid="alert" aria-live="polite">
          Alert
        </Alert>
      );
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('id', 'test-alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('handles icon styling classes', () => {
      render(<Alert data-testid="alert">Alert</Alert>);
      const alert = screen.getByTestId('alert');
      // Check for icon-related classes
      expect(alert.className).toMatch(/\[&>svg\]/);
    });
  });

  describe('AlertTitle', () => {
    it('renders as h5 element', () => {
      render(<AlertTitle>Alert Title</AlertTitle>);
      const title = screen.getByText('Alert Title');
      expect(title.tagName).toBe('H5');
    });

    it('applies default styles', () => {
      render(<AlertTitle data-testid="title">Title</AlertTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight');
    });

    it('merges custom className', () => {
      render(<AlertTitle className="text-lg" data-testid="title">Title</AlertTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-lg', 'mb-1', 'font-medium');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLHeadingElement>();
      render(<AlertTitle ref={ref}>Title</AlertTitle>);
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe('AlertDescription', () => {
    it('renders with children', () => {
      render(<AlertDescription>Description text</AlertDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('renders as div element', () => {
      render(<AlertDescription data-testid="desc">Description</AlertDescription>);
      const description = screen.getByTestId('desc');
      expect(description.tagName).toBe('DIV');
    });

    it('applies default styles', () => {
      render(<AlertDescription data-testid="desc">Description</AlertDescription>);
      const description = screen.getByTestId('desc');
      expect(description).toHaveClass('text-sm');
      expect(description.className).toMatch(/\[&_p\]:leading-relaxed/);
    });

    it('merges custom className', () => {
      render(<AlertDescription className="text-xs" data-testid="desc">Description</AlertDescription>);
      const description = screen.getByTestId('desc');
      expect(description).toHaveClass('text-xs');
      expect(description.className).toMatch(/\[&_p\]:leading-relaxed/);
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(<AlertDescription ref={ref}>Description</AlertDescription>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('handles paragraph styling', () => {
      render(
        <AlertDescription data-testid="desc">
          <p>Paragraph content</p>
        </AlertDescription>
      );
      const description = screen.getByTestId('desc');
      expect(description.className).toMatch(/\[&_p\]:leading-relaxed/);
    });
  });

  describe('Alert composition', () => {
    it('renders complete alert structure', () => {
      render(
        <Alert>
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>
            You can add components to your app using the cli.
          </AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('Heads up!')).toBeInTheDocument();
      expect(screen.getByText('You can add components to your app using the cli.')).toBeInTheDocument();
    });

    it('renders with icon', () => {
      const Icon = () => <svg data-testid="icon" />;
      
      render(
        <Alert>
          <Icon />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong</AlertDescription>
        </Alert>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders destructive alert with complete structure', () => {
      render(
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Your session has expired. Please log in again.
          </AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('text-destructive');
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Your session has expired. Please log in again.')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper alert role', () => {
      render(<Alert>Accessible alert</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('supports aria-live attribute', () => {
      render(<Alert aria-live="assertive">Important alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('supports aria-atomic attribute', () => {
      render(<Alert aria-atomic="true">Atomic alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
    });

    it('maintains proper heading hierarchy', () => {
      render(
        <div>
          <h1>Page Title</h1>
          <Alert>
            <AlertTitle>Alert Title</AlertTitle>
            <AlertDescription>Alert description</AlertDescription>
          </Alert>
        </div>
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      const h5 = screen.getByText('Alert Title');
      expect(h1).toBeInTheDocument();
      expect(h5.tagName).toBe('H5');
    });
  });

  describe('Different content types', () => {
    it('renders with only title', () => {
      render(
        <Alert>
          <AlertTitle>Title only alert</AlertTitle>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Title only alert')).toBeInTheDocument();
    });

    it('renders with only description', () => {
      render(
        <Alert>
          <AlertDescription>Description only alert</AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Description only alert')).toBeInTheDocument();
    });

    it('renders with custom content', () => {
      render(
        <Alert>
          <div data-testid="custom-content">
            <button>Action</button>
            <span>Custom content</span>
          </div>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});