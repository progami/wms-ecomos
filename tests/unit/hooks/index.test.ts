/**
 * Index test file to verify all hooks are exported and can be imported
 */

describe('Custom Hooks Exports', () => {
  it('should export useClientLogger hook', () => {
    const { useClientLogger } = require('@/hooks/useClientLogger');
    expect(useClientLogger).toBeDefined();
    expect(typeof useClientLogger).toBe('function');
  });

  it('should export usePerformanceMonitor hook', () => {
    const { usePerformanceMonitor } = require('@/hooks/usePerformanceMonitor');
    expect(usePerformanceMonitor).toBeDefined();
    expect(typeof usePerformanceMonitor).toBe('function');
  });

  it('should export useInteractionTracking hook', () => {
    const { useInteractionTracking } = require('@/hooks/usePerformanceMonitor');
    expect(useInteractionTracking).toBeDefined();
    expect(typeof useInteractionTracking).toBe('function');
  });

  it('should export useApiTracking hook', () => {
    const { useApiTracking } = require('@/hooks/usePerformanceMonitor');
    expect(useApiTracking).toBeDefined();
    expect(typeof useApiTracking).toBe('function');
  });

  it('should export useToast hook', () => {
    const { useToast } = require('@/components/ui/use-toast');
    expect(useToast).toBeDefined();
    expect(typeof useToast).toBe('function');
  });

  it('should export ToastProvider component', () => {
    const { ToastProvider } = require('@/components/ui/use-toast');
    expect(ToastProvider).toBeDefined();
    expect(typeof ToastProvider).toBe('function');
  });
});