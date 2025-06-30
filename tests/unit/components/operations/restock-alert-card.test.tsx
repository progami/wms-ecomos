import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RestockAlertCard, RestockAlertRow } from '@/components/operations/restock-alert-card';

describe('RestockAlertCard Component', () => {
  const defaultProps = {
    skuCode: 'SKU-001',
    description: 'Premium Wireless Headphones',
    currentStock: 150,
    dailySalesVelocity: 10,
    daysOfStock: 15,
    restockPoint: 200,
    suggestedQuantity: 300,
    suggestedCartons: 30,
    suggestedPallets: 2,
    urgencyLevel: 'high' as const,
    urgencyScore: 75,
    recommendation: 'Restock within 7 days to avoid stockout',
    leadTimeDays: 14,
    safetyStockDays: 7,
  };

  describe('Rendering', () => {
    it('renders all required information', () => {
      render(<RestockAlertCard {...defaultProps} />);
      
      expect(screen.getByText('SKU-001')).toBeInTheDocument();
      expect(screen.getByText('Premium Wireless Headphones')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('15 days remaining')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('units/day')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('75/100')).toBeInTheDocument();
      expect(screen.getByText('Restock within 7 days to avoid stockout')).toBeInTheDocument();
    });

    it('renders suggested shipment details', () => {
      render(<RestockAlertCard {...defaultProps} />);
      
      expect(screen.getByText('300')).toBeInTheDocument();
      expect(screen.getByText('units')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('cartons')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('pallets')).toBeInTheDocument();
    });

    it('renders lead time information', () => {
      render(<RestockAlertCard {...defaultProps} />);
      
      expect(screen.getByText('Lead time: 14 days')).toBeInTheDocument();
    });

    it('renders without checkbox when onSelect is not provided', () => {
      render(<RestockAlertCard {...defaultProps} />);
      
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('renders with checkbox when onSelect is provided', () => {
      const onSelect = jest.fn();
      render(<RestockAlertCard {...defaultProps} onSelect={onSelect} />);
      
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });

  describe('Urgency levels', () => {
    it('applies critical urgency styling', () => {
      render(<RestockAlertCard {...defaultProps} urgencyLevel="critical" />);
      
      const badge = screen.getByText('CRITICAL');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800', 'border-red-200');
    });

    it('applies high urgency styling', () => {
      render(<RestockAlertCard {...defaultProps} urgencyLevel="high" />);
      
      const badge = screen.getByText('HIGH');
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-800', 'border-orange-200');
    });

    it('applies medium urgency styling', () => {
      render(<RestockAlertCard {...defaultProps} urgencyLevel="medium" />);
      
      const badge = screen.getByText('MEDIUM');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800', 'border-yellow-200');
    });

    it('applies low urgency styling', () => {
      render(<RestockAlertCard {...defaultProps} urgencyLevel="low" />);
      
      const badge = screen.getByText('LOW');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800', 'border-green-200');
    });
  });

  describe('Progress bar', () => {
    it('renders urgency score progress bar', () => {
      render(<RestockAlertCard {...defaultProps} urgencyScore={75} />);
      
      expect(screen.getByText('Urgency Score')).toBeInTheDocument();
      expect(screen.getByText('75/100')).toBeInTheDocument();
      
      // Check progress bar width
      const progressBar = document.querySelector('[style*="width: 75%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('renders full progress bar for 100 score', () => {
      render(<RestockAlertCard {...defaultProps} urgencyScore={100} />);
      
      const progressBar = document.querySelector('[style*="width: 100%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('renders empty progress bar for 0 score', () => {
      render(<RestockAlertCard {...defaultProps} urgencyScore={0} />);
      
      const progressBar = document.querySelector('[style*="width: 0%"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Selection behavior', () => {
    it('handles checkbox selection', () => {
      const onSelect = jest.fn();
      render(<RestockAlertCard {...defaultProps} onSelect={onSelect} isSelected={false} />);
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      expect(onSelect).toHaveBeenCalledWith(true);
    });

    it('handles checkbox deselection', () => {
      const onSelect = jest.fn();
      render(<RestockAlertCard {...defaultProps} onSelect={onSelect} isSelected={true} />);
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      expect(onSelect).toHaveBeenCalledWith(false);
    });

    it('shows selected state styling', () => {
      render(<RestockAlertCard {...defaultProps} isSelected={true} onSelect={jest.fn()} />);
      
      const card = screen.getByText('SKU-001').closest('div.border');
      expect(card).toHaveClass('ring-2', 'ring-primary');
    });
  });

  describe('Number formatting', () => {
    it('formats large stock numbers with commas', () => {
      render(<RestockAlertCard {...defaultProps} currentStock={15000} />);
      
      expect(screen.getByText('15,000')).toBeInTheDocument();
    });

    it('handles singular/plural for pallets', () => {
      const { rerender } = render(<RestockAlertCard {...defaultProps} suggestedPallets={1} />);
      expect(screen.getByText('pallet')).toBeInTheDocument();
      
      rerender(<RestockAlertCard {...defaultProps} suggestedPallets={3} />);
      expect(screen.getByText('pallets')).toBeInTheDocument();
    });
  });

  describe('View Details button', () => {
    it('renders view details button', () => {
      render(<RestockAlertCard {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /View Details/i });
      expect(button).toBeInTheDocument();
      expect(button.querySelector('svg')).toBeInTheDocument(); // Calculator icon
    });

    it('has hover effect on view details button', () => {
      render(<RestockAlertCard {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /View Details/i });
      expect(button).toHaveClass('hover:underline');
    });
  });

  describe('Tooltip content', () => {
    it('renders tooltip component', () => {
      render(<RestockAlertCard {...defaultProps} />);
      
      // The tooltip component should be present even if not visible
      expect(screen.getByText('Suggested Shipment')).toBeInTheDocument();
    });
  });
});

describe('RestockAlertRow Component', () => {
  const defaultProps = {
    skuCode: 'SKU-002',
    description: 'Bluetooth Speaker',
    currentStock: 200,
    daysOfStock: 20,
    suggestedCartons: 15,
    urgencyLevel: 'medium' as const,
    recommendation: 'Monitor stock levels closely',
  };

  describe('Rendering', () => {
    it('renders all required information in table row format', () => {
      render(
        <table>
          <tbody>
            <RestockAlertRow {...defaultProps} />
          </tbody>
        </table>
      );
      
      expect(screen.getByText('SKU-002')).toBeInTheDocument();
      expect(screen.getByText('Bluetooth Speaker')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.getByText('20 days')).toBeInTheDocument();
      expect(screen.getByText('15 cartons')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      expect(screen.getByText('Monitor stock levels closely')).toBeInTheDocument();
    });

    it('renders without checkbox when onSelect is not provided', () => {
      render(
        <table>
          <tbody>
            <RestockAlertRow {...defaultProps} />
          </tbody>
        </table>
      );
      
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('renders with checkbox when onSelect is provided', () => {
      render(
        <table>
          <tbody>
            <RestockAlertRow {...defaultProps} onSelect={jest.fn()} />
          </tbody>
        </table>
      );
      
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });

  describe('Urgency level styling in rows', () => {
    it('applies critical urgency styling', () => {
      render(
        <table>
          <tbody>
            <RestockAlertRow {...defaultProps} urgencyLevel="critical" />
          </tbody>
        </table>
      );
      
      const badge = screen.getByText('CRITICAL');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800', 'border-red-200');
      
      const daysText = screen.getByText('20 days');
      expect(daysText).toHaveClass('text-red-600');
    });

    it('applies appropriate text color for each urgency level', () => {
      const levels = [
        { level: 'critical' as const, colorClass: 'text-red-600' },
        { level: 'high' as const, colorClass: 'text-orange-600' },
        { level: 'medium' as const, colorClass: 'text-yellow-600' },
        { level: 'low' as const, colorClass: 'text-green-600' },
      ];
      
      levels.forEach(({ level, colorClass }) => {
        const { container } = render(
          <table>
            <tbody>
              <RestockAlertRow {...defaultProps} urgencyLevel={level} />
            </tbody>
          </table>
        );
        
        const daysText = screen.getByText('20 days');
        expect(daysText).toHaveClass(colorClass);
        
        container.remove();
      });
    });
  });

  describe('Selection behavior in rows', () => {
    it('handles row selection', () => {
      const onSelect = jest.fn();
      render(
        <table>
          <tbody>
            <RestockAlertRow {...defaultProps} onSelect={onSelect} isSelected={false} />
          </tbody>
        </table>
      );
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      expect(onSelect).toHaveBeenCalledWith(true);
    });

    it('shows selected row styling', () => {
      const { container } = render(
        <table>
          <tbody>
            <RestockAlertRow {...defaultProps} isSelected={true} onSelect={jest.fn()} />
          </tbody>
        </table>
      );
      
      const row = container.querySelector('tr');
      expect(row).toHaveClass('bg-blue-50');
    });

    it('has hover effect on rows', () => {
      const { container } = render(
        <table>
          <tbody>
            <RestockAlertRow {...defaultProps} />
          </tbody>
        </table>
      );
      
      const row = container.querySelector('tr');
      expect(row).toHaveClass('hover:bg-gray-50');
    });
  });

  describe('Number formatting in rows', () => {
    it('formats large numbers with commas', () => {
      render(
        <table>
          <tbody>
            <RestockAlertRow {...defaultProps} currentStock={25000} />
          </tbody>
        </table>
      );
      
      expect(screen.getByText('25,000')).toBeInTheDocument();
    });
  });
});