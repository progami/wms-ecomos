import { renderHook, act } from '@testing-library/react';
import { 
  usePerformanceMonitor, 
  useInteractionTracking, 
  useApiTracking 
} from '@/hooks/usePerformanceMonitor';
import { clientLogger, measurePerformance } from '@/lib/logger/client';

// Mock dependencies
jest.mock('@/lib/logger/client', () => ({
  clientLogger: {
    performance: jest.fn(),
    action: jest.fn(),
    navigation: jest.fn(),
    api: jest.fn(),
  },
  measurePerformance: jest.fn((name, fn) => fn()),
}));

// Mock performance API
const mockPerformanceNavigation = {
  loadEventEnd: 1000,
  fetchStart: 0,
  entryType: 'navigation',
  name: 'https://example.com',
  duration: 1000,
  startTime: 0,
} as PerformanceNavigationTiming;

const mockPaintEntries = [
  { name: 'first-paint', startTime: 100, entryType: 'paint' },
  { name: 'first-contentful-paint', startTime: 150, entryType: 'paint' },
] as PerformanceEntry[];

describe('usePerformanceMonitor', () => {
  let originalPerformance: Performance;
  let mockGetEntriesByType: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Save original performance object
    originalPerformance = global.performance;
    
    // Mock performance API
    mockGetEntriesByType = jest.fn((type: string) => {
      if (type === 'navigation') return [mockPerformanceNavigation];
      if (type === 'paint') return mockPaintEntries;
      return [];
    });

    Object.defineProperty(global, 'performance', {
      writable: true,
      value: {
        getEntriesByType: mockGetEntriesByType,
        now: jest.fn(() => 1234567890),
      },
    });

    // Mock document.readyState
    Object.defineProperty(document, 'readyState', {
      writable: true,
      value: 'loading',
    });
  });

  afterEach(() => {
    // Restore original performance object
    global.performance = originalPerformance;
  });

  describe('initialization and page load metrics', () => {
    it('should log metrics when page is already loaded', () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete',
      });

      renderHook(() => usePerformanceMonitor('HomePage'));

      expect(clientLogger.performance).toHaveBeenCalledWith(
        'Page Performance',
        1000,
        {
          page: 'HomePage',
          metrics: {
            pageLoad: 1000,
            firstContentfulPaint: 150,
          },
          url: 'http://localhost/',
        }
      );
    });

    it('should wait for page load event when page is loading', () => {
      const addEventListener = jest.spyOn(window, 'addEventListener');
      const removeEventListener = jest.spyOn(window, 'removeEventListener');

      renderHook(() => usePerformanceMonitor('ProductPage'));

      expect(addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
      expect(clientLogger.performance).not.toHaveBeenCalled();

      // Simulate page load
      const loadHandler = addEventListener.mock.calls[0][1] as Function;
      act(() => {
        loadHandler();
      });

      expect(clientLogger.performance).toHaveBeenCalledWith(
        'Page Performance',
        1000,
        expect.objectContaining({
          page: 'ProductPage',
        })
      );

      addEventListener.mockRestore();
      removeEventListener.mockRestore();
    });

    it('should clean up event listener on unmount', () => {
      const removeEventListener = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => usePerformanceMonitor('TestPage'));

      unmount();

      expect(removeEventListener).toHaveBeenCalledWith('load', expect.any(Function));

      removeEventListener.mockRestore();
    });

    it('should only log metrics once', () => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete',
      });

      const { rerender } = renderHook(
        ({ pageName }) => usePerformanceMonitor(pageName),
        { initialProps: { pageName: 'InitialPage' } }
      );

      expect(clientLogger.performance).toHaveBeenCalledTimes(1);

      // Re-render with same page name
      rerender({ pageName: 'InitialPage' });
      expect(clientLogger.performance).toHaveBeenCalledTimes(1);

      // Re-render with different page name
      rerender({ pageName: 'NewPage' });
      expect(clientLogger.performance).toHaveBeenCalledTimes(1);
    });

    it('should handle missing performance entries', () => {
      mockGetEntriesByType.mockImplementation(() => []);

      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete',
      });

      renderHook(() => usePerformanceMonitor('ErrorPage'));

      expect(clientLogger.performance).toHaveBeenCalledWith(
        'Page Performance',
        0,
        {
          page: 'ErrorPage',
          metrics: {},
          url: 'http://localhost/',
        }
      );
    });

    it('should handle server-side rendering', () => {
      // Simulate SSR by making window undefined
      const originalWindow = global.window;
      delete (global as any).window;

      expect(() => {
        renderHook(() => usePerformanceMonitor('SSRPage'));
      }).not.toThrow();

      expect(clientLogger.performance).not.toHaveBeenCalled();

      // Restore window
      (global as any).window = originalWindow;
    });
  });

  describe('measureOperation', () => {
    it('should measure custom operations', async () => {
      const { result } = renderHook(() => usePerformanceMonitor('OperationsPage'));

      const mockOperation = jest.fn();
      await result.current.measureOperation('fetchData', mockOperation);

      expect(measurePerformance).toHaveBeenCalledWith(
        'OperationsPage:fetchData',
        mockOperation
      );
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should handle async operations', async () => {
      const { result } = renderHook(() => usePerformanceMonitor('AsyncPage'));

      const asyncOperation = jest.fn().mockResolvedValue('result');
      await result.current.measureOperation('asyncTask', asyncOperation);

      expect(measurePerformance).toHaveBeenCalledWith(
        'AsyncPage:asyncTask',
        asyncOperation
      );
    });

    it('should handle operation errors', async () => {
      const { result } = renderHook(() => usePerformanceMonitor('ErrorPage'));

      const errorOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(
        result.current.measureOperation('failingTask', errorOperation)
      ).rejects.toThrow('Operation failed');

      expect(measurePerformance).toHaveBeenCalledWith(
        'ErrorPage:failingTask',
        errorOperation
      );
    });
  });
});

describe('useInteractionTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackClick', () => {
    it('should track click events with metadata', () => {
      const { result } = renderHook(() => useInteractionTracking());

      const metadata = { buttonType: 'primary', section: 'header' };
      result.current.trackClick('LoginButton', metadata);

      expect(clientLogger.action).toHaveBeenCalledWith('Element clicked', {
        element: 'LoginButton',
        timestamp: expect.any(Number),
        ...metadata,
      });
    });

    it('should track click events without metadata', () => {
      const { result } = renderHook(() => useInteractionTracking());

      result.current.trackClick('SimpleButton');

      expect(clientLogger.action).toHaveBeenCalledWith('Element clicked', {
        element: 'SimpleButton',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('trackFormSubmit', () => {
    it('should track form submissions with metadata', () => {
      const { result } = renderHook(() => useInteractionTracking());

      const metadata = { fields: ['email', 'password'], validationPassed: true };
      result.current.trackFormSubmit('LoginForm', metadata);

      expect(clientLogger.action).toHaveBeenCalledWith('Form submitted', {
        form: 'LoginForm',
        timestamp: expect.any(Number),
        ...metadata,
      });
    });

    it('should track form submissions without metadata', () => {
      const { result } = renderHook(() => useInteractionTracking());

      result.current.trackFormSubmit('ContactForm');

      expect(clientLogger.action).toHaveBeenCalledWith('Form submitted', {
        form: 'ContactForm',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('trackNavigation', () => {
    it('should track navigation events with metadata', () => {
      const { result } = renderHook(() => useInteractionTracking());

      const metadata = { method: 'link', userId: 'user123' };
      result.current.trackNavigation('/home', '/products', metadata);

      expect(clientLogger.navigation).toHaveBeenCalledWith(
        '/home',
        '/products',
        metadata
      );
    });

    it('should track navigation events without metadata', () => {
      const { result } = renderHook(() => useInteractionTracking());

      result.current.trackNavigation('/dashboard', '/settings');

      expect(clientLogger.navigation).toHaveBeenCalledWith(
        '/dashboard',
        '/settings',
        undefined
      );
    });
  });

  describe('edge cases', () => {
    it('should handle missing clientLogger', () => {
      (clientLogger as any) = null;

      const { result } = renderHook(() => useInteractionTracking());

      expect(() => {
        result.current.trackClick('test');
        result.current.trackFormSubmit('test');
        result.current.trackNavigation('from', 'to');
      }).not.toThrow();

      // Restore
      (clientLogger as any) = {
        action: jest.fn(),
        navigation: jest.fn(),
      };
    });

    it('should handle concurrent tracking calls', () => {
      const { result } = renderHook(() => useInteractionTracking());

      // Simulate rapid clicks
      for (let i = 0; i < 10; i++) {
        result.current.trackClick(`Button${i}`);
      }

      expect(clientLogger.action).toHaveBeenCalledTimes(10);
    });
  });
});

describe('useApiTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock performance.now()
    jest.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)  // Start time
      .mockReturnValueOnce(1250); // End time (250ms duration)
  });

  describe('successful API calls', () => {
    it('should track successful API calls', async () => {
      const { result } = renderHook(() => useApiTracking());

      const mockResponse = new Response('{"data": "test"}', { status: 200 });
      const mockFetch = jest.fn().mockResolvedValue(mockResponse);

      const response = await result.current.trackApiCall('GET', '/api/users', mockFetch);

      expect(response).toBe(mockResponse);
      expect(mockFetch).toHaveBeenCalled();
      expect(clientLogger.api).toHaveBeenCalledWith('GET', '/api/users', 200, 250);
    });

    it('should track different HTTP methods', async () => {
      const { result } = renderHook(() => useApiTracking());

      const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];
      
      for (const method of methods) {
        jest.spyOn(performance, 'now')
          .mockReturnValueOnce(1000)
          .mockReturnValueOnce(1100);

        const mockResponse = new Response('{}', { status: 201 });
        const mockFetch = jest.fn().mockResolvedValue(mockResponse);

        await result.current.trackApiCall(method, `/api/resource`, mockFetch);

        expect(clientLogger.api).toHaveBeenCalledWith(method, '/api/resource', 201, 100);
      }
    });

    it('should track different status codes', async () => {
      const { result } = renderHook(() => useApiTracking());

      const statusCodes = [200, 201, 204, 301, 400, 401, 403, 404, 500];

      for (const status of statusCodes) {
        jest.spyOn(performance, 'now')
          .mockReturnValueOnce(1000)
          .mockReturnValueOnce(1150);

        const mockResponse = new Response('', { status });
        const mockFetch = jest.fn().mockResolvedValue(mockResponse);

        await result.current.trackApiCall('GET', `/api/test`, mockFetch);

        expect(clientLogger.api).toHaveBeenLastCalledWith('GET', '/api/test', status, 150);
      }
    });
  });

  describe('failed API calls', () => {
    it('should track failed API calls with network errors', async () => {
      const { result } = renderHook(() => useApiTracking());

      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1300);

      const networkError = new Error('Network error');
      const mockFetch = jest.fn().mockRejectedValue(networkError);

      await expect(
        result.current.trackApiCall('GET', '/api/fail', mockFetch)
      ).rejects.toThrow('Network error');

      expect(clientLogger.api).toHaveBeenCalledWith('GET', '/api/fail', 0, 300, {
        error: 'Network error',
      });
    });

    it('should track failed API calls with custom errors', async () => {
      const { result } = renderHook(() => useApiTracking());

      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1200);

      const customError = { message: 'Custom error', code: 'ERR_001' };
      const mockFetch = jest.fn().mockRejectedValue(customError);

      await expect(
        result.current.trackApiCall('POST', '/api/custom', mockFetch)
      ).rejects.toEqual(customError);

      expect(clientLogger.api).toHaveBeenCalledWith('POST', '/api/custom', 0, 200, {
        error: 'Unknown error',
      });
    });

    it('should handle timeout errors', async () => {
      const { result } = renderHook(() => useApiTracking());

      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(31000); // 30 second timeout

      const timeoutError = new Error('Request timeout');
      const mockFetch = jest.fn().mockRejectedValue(timeoutError);

      await expect(
        result.current.trackApiCall('GET', '/api/slow', mockFetch)
      ).rejects.toThrow('Request timeout');

      expect(clientLogger.api).toHaveBeenCalledWith('GET', '/api/slow', 0, 30000, {
        error: 'Request timeout',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very fast API calls', async () => {
      const { result } = renderHook(() => useApiTracking());

      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1000.5); // 0.5ms duration

      const mockResponse = new Response('{}', { status: 200 });
      const mockFetch = jest.fn().mockResolvedValue(mockResponse);

      await result.current.trackApiCall('GET', '/api/fast', mockFetch);

      expect(clientLogger.api).toHaveBeenCalledWith('GET', '/api/fast', 200, 0.5);
    });

    it('should handle concurrent API calls', async () => {
      const { result } = renderHook(() => useApiTracking());

      const mockResponse = new Response('{}', { status: 200 });
      const mockFetch = jest.fn().mockResolvedValue(mockResponse);

      // Reset mock to provide different timestamps for each call
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(1000).mockReturnValueOnce(1100)
        .mockReturnValueOnce(1000).mockReturnValueOnce(1200)
        .mockReturnValueOnce(1000).mockReturnValueOnce(1150);

      const promises = [
        result.current.trackApiCall('GET', '/api/1', mockFetch),
        result.current.trackApiCall('GET', '/api/2', mockFetch),
        result.current.trackApiCall('GET', '/api/3', mockFetch),
      ];

      await Promise.all(promises);

      expect(clientLogger.api).toHaveBeenCalledTimes(3);
    });

    it('should handle missing clientLogger', async () => {
      (clientLogger as any) = null;

      const { result } = renderHook(() => useApiTracking());

      const mockResponse = new Response('{}', { status: 200 });
      const mockFetch = jest.fn().mockResolvedValue(mockResponse);

      await expect(
        result.current.trackApiCall('GET', '/api/test', mockFetch)
      ).resolves.toBe(mockResponse);

      // Restore
      (clientLogger as any) = { api: jest.fn() };
    });
  });
});