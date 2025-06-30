import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useClientLogger } from '@/hooks/useClientLogger';
import { usePerformanceMonitor, useInteractionTracking, useApiTracking } from '@/hooks/usePerformanceMonitor';
import { useToast, ToastProvider } from '@/components/ui/use-toast';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Mock dependencies
jest.mock('@/lib/logger/client', () => ({
  clientLogger: {
    navigation: jest.fn(),
    action: jest.fn(),
    performance: jest.fn(),
    error: jest.fn(),
    api: jest.fn(),
  },
  measurePerformance: jest.fn((name, fn) => fn()),
}));

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

describe('Custom Hooks Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue('/test-page');
    (useSession as jest.Mock).mockReturnValue({ 
      data: { user: { id: 'user-123', role: 'admin' } } 
    });
  });

  describe('Hooks working together', () => {
    it('should allow multiple hooks to be used in the same component', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
      );

      const { result } = renderHook(
        () => ({
          logger: useClientLogger(),
          performance: usePerformanceMonitor('TestPage'),
          interaction: useInteractionTracking(),
          api: useApiTracking(),
          toast: useToast(),
        }),
        { wrapper }
      );

      // All hooks should be initialized
      expect(result.current.logger).toHaveProperty('logAction');
      expect(result.current.logger).toHaveProperty('logPerformance');
      expect(result.current.logger).toHaveProperty('logError');
      
      expect(result.current.performance).toHaveProperty('measureOperation');
      
      expect(result.current.interaction).toHaveProperty('trackClick');
      expect(result.current.interaction).toHaveProperty('trackFormSubmit');
      expect(result.current.interaction).toHaveProperty('trackNavigation');
      
      expect(result.current.api).toHaveProperty('trackApiCall');
      
      expect(result.current.toast).toHaveProperty('toast');
      expect(result.current.toast).toHaveProperty('dismiss');
      expect(result.current.toast).toHaveProperty('toasts');
    });

    it('should allow hooks to interact with each other', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
      );

      const { result } = renderHook(
        () => ({
          logger: useClientLogger(),
          toast: useToast(),
          api: useApiTracking(),
        }),
        { wrapper }
      );

      // Mock API call that fails
      const mockError = new Error('API Error');
      const mockFetch = jest.fn().mockRejectedValue(mockError);

      // Track API call
      try {
        await result.current.api.trackApiCall('POST', '/api/data', mockFetch);
      } catch (error) {
        // Log the error
        result.current.logger.logError('API call failed', error);
        
        // Show toast notification
        act(() => {
          result.current.toast.toast({
            title: 'Error',
            description: 'Failed to save data',
            variant: 'destructive',
          });
        });
      }

      // Verify error was logged
      expect(result.current.logger.logError).toBeDefined();
      
      // Verify toast was shown
      expect(result.current.toast.toasts).toHaveLength(1);
      expect(result.current.toast.toasts[0]).toMatchObject({
        title: 'Error',
        description: 'Failed to save data',
        variant: 'destructive',
      });
    });

    it('should handle real-world workflow scenario', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
      );

      const { result } = renderHook(
        () => ({
          logger: useClientLogger(),
          performance: usePerformanceMonitor('UserDashboard'),
          interaction: useInteractionTracking(),
          api: useApiTracking(),
          toast: useToast(),
        }),
        { wrapper }
      );

      // User clicks a button
      result.current.interaction.trackClick('RefreshDataButton', { 
        section: 'dashboard' 
      });

      // Log the action
      result.current.logger.logAction('refresh_data_initiated');

      // Measure the operation
      const mockResponse = new Response('{"data": "refreshed"}', { status: 200 });
      const mockFetch = jest.fn().mockResolvedValue(mockResponse);

      await result.current.performance.measureOperation(
        'refreshDashboardData',
        async () => {
          // Track the API call
          await result.current.api.trackApiCall('GET', '/api/dashboard/refresh', mockFetch);
        }
      );

      // Show success toast
      act(() => {
        result.current.toast.toast({
          title: 'Success',
          description: 'Dashboard data refreshed',
        });
      });

      // Log completion
      result.current.logger.logAction('refresh_data_completed');

      // Verify all tracking occurred
      expect(result.current.toast.toasts).toHaveLength(1);
      expect(result.current.toast.toasts[0].title).toBe('Success');
    });
  });

  describe('Error handling across hooks', () => {
    it('should handle errors gracefully when using multiple hooks', () => {
      // Set all loggers to null to test error handling
      const clientLogger = require('@/lib/logger/client').clientLogger;
      Object.keys(clientLogger).forEach(key => {
        clientLogger[key] = null;
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
      );

      // Should not throw when rendering
      expect(() => {
        renderHook(
          () => ({
            logger: useClientLogger(),
            performance: usePerformanceMonitor('ErrorPage'),
            interaction: useInteractionTracking(),
            api: useApiTracking(),
            toast: useToast(),
          }),
          { wrapper }
        );
      }).not.toThrow();
    });
  });

  describe('Performance considerations', () => {
    it('should not cause unnecessary re-renders when using multiple hooks', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
      );

      let renderCount = 0;
      const { rerender } = renderHook(
        () => {
          renderCount++;
          return {
            logger: useClientLogger(),
            performance: usePerformanceMonitor('PerfTest'),
            interaction: useInteractionTracking(),
          };
        },
        { wrapper }
      );

      const initialRenderCount = renderCount;

      // Re-render without changing dependencies
      rerender();

      // Should only increment by 1 (the re-render itself)
      expect(renderCount).toBe(initialRenderCount + 1);
    });

    it('should properly memoize callbacks across hooks', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ToastProvider>{children}</ToastProvider>
      );

      const { result, rerender } = renderHook(
        () => ({
          logger: useClientLogger(),
          interaction: useInteractionTracking(),
          api: useApiTracking(),
        }),
        { wrapper }
      );

      const logAction1 = result.current.logger.logAction;
      const trackClick1 = result.current.interaction.trackClick;
      const trackApiCall1 = result.current.api.trackApiCall;

      rerender();

      const logAction2 = result.current.logger.logAction;
      const trackClick2 = result.current.interaction.trackClick;
      const trackApiCall2 = result.current.api.trackApiCall;

      // Functions should be memoized when dependencies don't change
      expect(logAction1).toBe(logAction2);
      expect(trackClick1).toBe(trackClick2);
      expect(trackApiCall1).toBe(trackApiCall2);
    });
  });
});