import { renderHook } from '@testing-library/react';
import { useClientLogger } from '@/hooks/useClientLogger';
import { clientLogger } from '@/lib/logger/client';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Mock dependencies
jest.mock('@/lib/logger/client', () => ({
  clientLogger: {
    navigation: jest.fn(),
    action: jest.fn(),
    performance: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

describe('useClientLogger', () => {
  const mockPathname = '/test-page';
  const mockSession = {
    user: {
      id: 'user-123',
      role: 'admin',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue(mockPathname);
    (useSession as jest.Mock).mockReturnValue({ data: mockSession });
  });

  describe('initialization and page view logging', () => {
    it('should log page view on mount', () => {
      renderHook(() => useClientLogger());

      expect(clientLogger.navigation).toHaveBeenCalledWith(
        'page_view',
        mockPathname,
        expect.objectContaining({
          userId: mockSession.user.id,
          userRole: mockSession.user.role,
          timestamp: expect.any(String),
        })
      );
    });

    it('should log page view when pathname changes', () => {
      const { rerender } = renderHook(() => useClientLogger());

      expect(clientLogger.navigation).toHaveBeenCalledTimes(1);

      // Change pathname
      (usePathname as jest.Mock).mockReturnValue('/new-page');
      rerender();

      expect(clientLogger.navigation).toHaveBeenCalledTimes(2);
      expect(clientLogger.navigation).toHaveBeenLastCalledWith(
        'page_view',
        '/new-page',
        expect.objectContaining({
          userId: mockSession.user.id,
          userRole: mockSession.user.role,
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle missing session data', () => {
      (useSession as jest.Mock).mockReturnValue({ data: null });

      renderHook(() => useClientLogger());

      expect(clientLogger.navigation).toHaveBeenCalledWith(
        'page_view',
        mockPathname,
        expect.objectContaining({
          userId: undefined,
          userRole: undefined,
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle missing clientLogger gracefully', () => {
      // Temporarily set clientLogger to null
      const originalLogger = (clientLogger as any);
      (clientLogger as any) = null;

      expect(() => {
        renderHook(() => useClientLogger());
      }).not.toThrow();

      // Restore
      (clientLogger as any) = originalLogger;
    });
  });

  describe('logAction', () => {
    it('should log action with metadata', () => {
      const { result } = renderHook(() => useClientLogger());

      const action = 'button_click';
      const metadata = { buttonId: 'submit-btn', value: 'Submit' };

      result.current.logAction(action, metadata);

      expect(clientLogger.action).toHaveBeenCalledWith(action, {
        ...metadata,
        userId: mockSession.user.id,
        userRole: mockSession.user.role,
        page: mockPathname,
        timestamp: expect.any(String),
      });
    });

    it('should log action without metadata', () => {
      const { result } = renderHook(() => useClientLogger());

      result.current.logAction('simple_action');

      expect(clientLogger.action).toHaveBeenCalledWith('simple_action', {
        userId: mockSession.user.id,
        userRole: mockSession.user.role,
        page: mockPathname,
        timestamp: expect.any(String),
      });
    });

    it('should update metadata when session changes', () => {
      const { result, rerender } = renderHook(() => useClientLogger());

      // Log action with initial session
      result.current.logAction('action1');

      expect(clientLogger.action).toHaveBeenCalledWith('action1', 
        expect.objectContaining({
          userId: 'user-123',
          userRole: 'admin',
        })
      );

      // Update session
      const newSession = { user: { id: 'user-456', role: 'user' } };
      (useSession as jest.Mock).mockReturnValue({ data: newSession });
      rerender();

      // Log action with new session
      result.current.logAction('action2');

      expect(clientLogger.action).toHaveBeenLastCalledWith('action2',
        expect.objectContaining({
          userId: 'user-456',
          userRole: 'user',
        })
      );
    });
  });

  describe('logPerformance', () => {
    it('should log performance metric with value and metadata', () => {
      const { result } = renderHook(() => useClientLogger());

      const metric = 'api_response_time';
      const value = 125.5;
      const metadata = { endpoint: '/api/users', method: 'GET' };

      result.current.logPerformance(metric, value, metadata);

      expect(clientLogger.performance).toHaveBeenCalledWith(metric, value, {
        ...metadata,
        userId: mockSession.user.id,
        page: mockPathname,
      });
    });

    it('should log performance metric without metadata', () => {
      const { result } = renderHook(() => useClientLogger());

      result.current.logPerformance('page_load_time', 2000);

      expect(clientLogger.performance).toHaveBeenCalledWith(
        'page_load_time',
        2000,
        {
          userId: mockSession.user.id,
          page: mockPathname,
        }
      );
    });

    it('should handle zero and negative values', () => {
      const { result } = renderHook(() => useClientLogger());

      result.current.logPerformance('metric1', 0);
      result.current.logPerformance('metric2', -100);

      expect(clientLogger.performance).toHaveBeenCalledWith('metric1', 0, expect.any(Object));
      expect(clientLogger.performance).toHaveBeenCalledWith('metric2', -100, expect.any(Object));
    });
  });

  describe('logError', () => {
    it('should log error with Error object', () => {
      const { result } = renderHook(() => useClientLogger());

      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n    at test.js:10:15';

      result.current.logError('Failed to fetch data', error);

      expect(clientLogger.error).toHaveBeenCalledWith('Failed to fetch data', {
        error: {
          name: 'Error',
          message: 'Test error message',
          stack: error.stack,
        },
        userId: mockSession.user.id,
        page: mockPathname,
      });
    });

    it('should log error with custom error object', () => {
      const { result } = renderHook(() => useClientLogger());

      const customError = {
        code: 'NETWORK_ERROR',
        status: 500,
        details: 'Connection timeout',
      };

      result.current.logError('Network request failed', customError);

      expect(clientLogger.error).toHaveBeenCalledWith('Network request failed', {
        error: customError,
        userId: mockSession.user.id,
        page: mockPathname,
      });
    });

    it('should log error with string', () => {
      const { result } = renderHook(() => useClientLogger());

      result.current.logError('Simple error', 'Something went wrong');

      expect(clientLogger.error).toHaveBeenCalledWith('Simple error', {
        error: 'Something went wrong',
        userId: mockSession.user.id,
        page: mockPathname,
      });
    });

    it('should handle different error types', () => {
      const { result } = renderHook(() => useClientLogger());

      // TypeError
      const typeError = new TypeError('Cannot read property of undefined');
      result.current.logError('Type error occurred', typeError);

      expect(clientLogger.error).toHaveBeenCalledWith('Type error occurred', {
        error: {
          name: 'TypeError',
          message: 'Cannot read property of undefined',
          stack: expect.any(String),
        },
        userId: mockSession.user.id,
        page: mockPathname,
      });

      // Custom error class
      class CustomError extends Error {
        constructor(message: string, public code: number) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const customError = new CustomError('Custom error', 404);
      result.current.logError('Custom error occurred', customError);

      expect(clientLogger.error).toHaveBeenCalledWith('Custom error occurred', {
        error: {
          name: 'CustomError',
          message: 'Custom error',
          stack: expect.any(String),
        },
        userId: mockSession.user.id,
        page: mockPathname,
      });
    });
  });

  describe('memoization and dependencies', () => {
    it('should memoize logAction callback', () => {
      const { result, rerender } = renderHook(() => useClientLogger());

      const logAction1 = result.current.logAction;
      rerender();
      const logAction2 = result.current.logAction;

      expect(logAction1).toBe(logAction2);
    });

    it('should update callbacks when dependencies change', () => {
      const { result, rerender } = renderHook(() => useClientLogger());

      const logAction1 = result.current.logAction;
      const logPerformance1 = result.current.logPerformance;
      const logError1 = result.current.logError;

      // Change pathname
      (usePathname as jest.Mock).mockReturnValue('/different-page');
      rerender();

      const logAction2 = result.current.logAction;
      const logPerformance2 = result.current.logPerformance;
      const logError2 = result.current.logError;

      expect(logAction1).not.toBe(logAction2);
      expect(logPerformance1).not.toBe(logPerformance2);
      expect(logError1).not.toBe(logError2);
    });

    it('should update callbacks when session changes', () => {
      const { result, rerender } = renderHook(() => useClientLogger());

      const logAction1 = result.current.logAction;

      // Change session
      (useSession as jest.Mock).mockReturnValue({ 
        data: { user: { id: 'new-user', role: 'user' } } 
      });
      rerender();

      const logAction2 = result.current.logAction;

      expect(logAction1).not.toBe(logAction2);
    });
  });

  describe('edge cases', () => {
    it('should handle missing clientLogger methods', () => {
      const mockLogger = {
        navigation: undefined,
        action: undefined,
        performance: undefined,
        error: undefined,
      };
      
      (clientLogger as any) = mockLogger;

      const { result } = renderHook(() => useClientLogger());

      expect(() => {
        result.current.logAction('test');
        result.current.logPerformance('test', 100);
        result.current.logError('test', new Error());
      }).not.toThrow();
    });

    it('should handle concurrent calls', () => {
      const { result } = renderHook(() => useClientLogger());

      // Simulate concurrent calls
      Promise.all([
        result.current.logAction('action1'),
        result.current.logAction('action2'),
        result.current.logAction('action3'),
      ]);

      expect(clientLogger.action).toHaveBeenCalledTimes(3);
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useClientLogger());

      unmount();

      // Verify no memory leaks or errors on unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});