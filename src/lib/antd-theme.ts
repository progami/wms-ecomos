import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    // Colors
    colorPrimary: '#3b82f6', // blue-500
    colorSuccess: '#10b981', // emerald-500
    colorWarning: '#f59e0b', // amber-500
    colorError: '#ef4444', // red-500
    colorInfo: '#3b82f6', // blue-500
    
    // Layout
    borderRadius: 6,
    
    // Typography
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    
    // Spacing
    marginXS: 4,
    marginSM: 8,
    margin: 16,
    marginMD: 20,
    marginLG: 24,
    marginXL: 32,
    
    // Component specific
    controlHeight: 36,
    controlHeightLG: 40,
    controlHeightSM: 32,
  },
  components: {
    Button: {
      primaryShadow: 'none',
      defaultBorderColor: '#e5e7eb', // gray-200
      defaultBg: '#ffffff',
    },
    Input: {
      activeBorderColor: '#3b82f6',
      hoverBorderColor: '#60a5fa', // blue-400
    },
    Table: {
      headerBg: '#f9fafb', // gray-50
      rowHoverBg: '#f3f4f6', // gray-100
    },
    Card: {
      headerBg: '#ffffff',
      boxShadowTertiary: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    },
    Modal: {
      borderRadiusLG: 8,
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
    Tabs: {
      cardBg: '#f9fafb', // gray-50
    },
  },
  algorithm: undefined, // Will be set dynamically for dark mode
};

export const darkTheme: ThemeConfig = {
  ...theme,
  token: {
    ...theme.token,
    colorBgContainer: '#1f2937', // gray-800
    colorBgElevated: '#374151', // gray-700
    colorBgLayout: '#111827', // gray-900
    colorBorder: '#374151', // gray-700
    colorBorderSecondary: '#4b5563', // gray-600
    colorText: '#f3f4f6', // gray-100
    colorTextSecondary: '#d1d5db', // gray-300
    colorTextTertiary: '#9ca3af', // gray-400
    colorTextQuaternary: '#6b7280', // gray-500
  },
  components: {
    ...theme.components,
    Button: {
      ...theme.components?.Button,
      defaultBg: '#374151', // gray-700
      defaultBorderColor: '#4b5563', // gray-600
    },
    Table: {
      ...theme.components?.Table,
      headerBg: '#1f2937', // gray-800
      rowHoverBg: '#374151', // gray-700
    },
    Card: {
      ...theme.components?.Card,
      headerBg: '#1f2937', // gray-800
    },
    Tabs: {
      ...theme.components?.Tabs,
      cardBg: '#1f2937', // gray-800
    },
  },
};