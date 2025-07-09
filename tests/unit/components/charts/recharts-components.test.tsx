import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import * as RechartsComponents from '@/components/charts/RechartsComponents';

// Mock next/dynamic
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (importFn: () => Promise<any>, options?: any) => {
    // Return a component that renders the chart directly (simulating loaded state)
    const MockComponent = (props: any) => {
      return <div data-testid="chart-component" {...props}>Chart Component</div>;
    };
    MockComponent.displayName = 'DynamicComponent';
    return MockComponent;
  }
}));

// Mock recharts
jest.mock('recharts', () => ({
  // Chart components
  AreaChart: () => <div>AreaChart</div>,
  BarChart: () => <div>BarChart</div>,
  LineChart: () => <div>LineChart</div>,
  PieChart: () => <div>PieChart</div>,
  RadarChart: () => <div>RadarChart</div>,
  ComposedChart: () => <div>ComposedChart</div>,
  ScatterChart: () => <div>ScatterChart</div>,
  
  // Lightweight components
  Area: () => <div>Area</div>,
  Bar: () => <div>Bar</div>,
  Line: () => <div>Line</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  CartesianGrid: () => <div>CartesianGrid</div>,
  Tooltip: () => <div>Tooltip</div>,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div>Pie</div>,
  Cell: () => <div>Cell</div>,
  PolarGrid: () => <div>PolarGrid</div>,
  PolarAngleAxis: () => <div>PolarAngleAxis</div>,
  PolarRadiusAxis: () => <div>PolarRadiusAxis</div>,
  Radar: () => <div>Radar</div>,
  Legend: () => <div>Legend</div>,
  Scatter: () => <div>Scatter</div>,
  ZAxis: () => <div>ZAxis</div>,
}));

describe('RechartsComponents', () => {
  describe('Lazy loaded chart components', () => {
    it('exports AreaChart as dynamic component', () => {
      const { AreaChart } = RechartsComponents;
      expect(AreaChart).toBeDefined();
      expect(typeof AreaChart).toBe('function');
    });

    it('exports BarChart as dynamic component', () => {
      const { BarChart } = RechartsComponents;
      expect(BarChart).toBeDefined();
      expect(typeof BarChart).toBe('function');
    });

    it('exports LineChart as dynamic component', () => {
      const { LineChart } = RechartsComponents;
      expect(LineChart).toBeDefined();
      expect(typeof LineChart).toBe('function');
    });

    it('exports PieChart as dynamic component', () => {
      const { PieChart } = RechartsComponents;
      expect(PieChart).toBeDefined();
      expect(typeof PieChart).toBe('function');
    });

    it('exports RadarChart as dynamic component', () => {
      const { RadarChart } = RechartsComponents;
      expect(RadarChart).toBeDefined();
      expect(typeof RadarChart).toBe('function');
    });

    it('exports ComposedChart as dynamic component', () => {
      const { ComposedChart } = RechartsComponents;
      expect(ComposedChart).toBeDefined();
      expect(typeof ComposedChart).toBe('function');
    });

    it('exports ScatterChart as dynamic component', () => {
      const { ScatterChart } = RechartsComponents;
      expect(ScatterChart).toBeDefined();
      expect(typeof ScatterChart).toBe('function');
    });

    it('renders loading placeholder for dynamic charts', () => {
      const { AreaChart } = RechartsComponents;
      render(<AreaChart />);
      
      // Due to our mock, it should render the chart component
      expect(screen.getByTestId('chart-component')).toBeInTheDocument();
    });
  });

  describe('Lightweight components', () => {
    it('exports Area component', () => {
      const { Area } = RechartsComponents;
      expect(Area).toBeDefined();
      render(<Area />);
      expect(screen.getByText('Area')).toBeInTheDocument();
    });

    it('exports Bar component', () => {
      const { Bar } = RechartsComponents;
      expect(Bar).toBeDefined();
      render(<Bar />);
      expect(screen.getByText('Bar')).toBeInTheDocument();
    });

    it('exports Line component', () => {
      const { Line } = RechartsComponents;
      expect(Line).toBeDefined();
      render(<Line />);
      expect(screen.getByText('Line')).toBeInTheDocument();
    });

    it('exports axis components', () => {
      const { XAxis, YAxis } = RechartsComponents;
      expect(XAxis).toBeDefined();
      expect(YAxis).toBeDefined();
      
      render(
        <>
          <XAxis />
          <YAxis />
        </>
      );
      
      expect(screen.getByText('XAxis')).toBeInTheDocument();
      expect(screen.getByText('YAxis')).toBeInTheDocument();
    });

    it('exports CartesianGrid component', () => {
      const { CartesianGrid } = RechartsComponents;
      expect(CartesianGrid).toBeDefined();
      render(<CartesianGrid />);
      expect(screen.getByText('CartesianGrid')).toBeInTheDocument();
    });

    it('exports Tooltip component', () => {
      const { Tooltip } = RechartsComponents;
      expect(Tooltip).toBeDefined();
      render(<Tooltip />);
      expect(screen.getByText('Tooltip')).toBeInTheDocument();
    });

    it('exports ResponsiveContainer component', () => {
      const { ResponsiveContainer } = RechartsComponents;
      expect(ResponsiveContainer).toBeDefined();
      
      render(
        <ResponsiveContainer>
          <div>Chart Content</div>
        </ResponsiveContainer>
      );
      
      expect(screen.getByText('Chart Content')).toBeInTheDocument();
    });

    it('exports Pie chart components', () => {
      const { Pie, Cell } = RechartsComponents;
      expect(Pie).toBeDefined();
      expect(Cell).toBeDefined();
      
      render(
        <>
          <Pie />
          <Cell />
        </>
      );
      
      expect(screen.getByText('Pie')).toBeInTheDocument();
      expect(screen.getByText('Cell')).toBeInTheDocument();
    });

    it('exports Polar components', () => {
      const { PolarGrid, PolarAngleAxis, PolarRadiusAxis } = RechartsComponents;
      expect(PolarGrid).toBeDefined();
      expect(PolarAngleAxis).toBeDefined();
      expect(PolarRadiusAxis).toBeDefined();
      
      render(
        <>
          <PolarGrid />
          <PolarAngleAxis />
          <PolarRadiusAxis />
        </>
      );
      
      expect(screen.getByText('PolarGrid')).toBeInTheDocument();
      expect(screen.getByText('PolarAngleAxis')).toBeInTheDocument();
      expect(screen.getByText('PolarRadiusAxis')).toBeInTheDocument();
    });

    it('exports Radar component', () => {
      const { Radar } = RechartsComponents;
      expect(Radar).toBeDefined();
      render(<Radar />);
      expect(screen.getByText('Radar')).toBeInTheDocument();
    });

    it('exports Legend component', () => {
      const { Legend } = RechartsComponents;
      expect(Legend).toBeDefined();
      render(<Legend />);
      expect(screen.getByText('Legend')).toBeInTheDocument();
    });

    it('exports Scatter and ZAxis components', () => {
      const { Scatter, ZAxis } = RechartsComponents;
      expect(Scatter).toBeDefined();
      expect(ZAxis).toBeDefined();
      
      render(
        <>
          <Scatter />
          <ZAxis />
        </>
      );
      
      expect(screen.getByText('Scatter')).toBeInTheDocument();
      expect(screen.getByText('ZAxis')).toBeInTheDocument();
    });
  });

  describe('Component integration', () => {
    it('can compose chart with components', () => {
      const { BarChart, ResponsiveContainer, Bar, XAxis, YAxis, Tooltip } = RechartsComponents;
      
      render(
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={[]}>
            <XAxis />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      );
      
      // All components should render
      expect(screen.getByTestId('chart-component')).toBeInTheDocument();
    });

    it('supports all chart types', () => {
      const chartTypes = [
        'AreaChart',
        'BarChart',
        'LineChart',
        'PieChart',
        'RadarChart',
        'ComposedChart',
        'ScatterChart'
      ];
      
      chartTypes.forEach(chartType => {
        expect(RechartsComponents).toHaveProperty(chartType);
      });
    });

    it('supports all component exports', () => {
      const components = [
        'Area', 'Bar', 'Line', 'XAxis', 'YAxis', 'CartesianGrid',
        'Tooltip', 'ResponsiveContainer', 'Pie', 'Cell', 'PolarGrid',
        'PolarAngleAxis', 'PolarRadiusAxis', 'Radar', 'Legend',
        'Scatter', 'ZAxis'
      ];
      
      components.forEach(component => {
        expect(RechartsComponents).toHaveProperty(component);
      });
    });
  });
});