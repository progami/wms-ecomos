import React from 'react';
import { render, screen, act, renderHook, waitFor } from '@testing-library/react';
import { useToast, ToastProvider } from '@/components/ui/use-toast';

describe('useToast Hook and ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('renders children correctly', () => {
      render(
        <ToastProvider>
          <div>Test Child</div>
        </ToastProvider>
      );
      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('provides toast context to children', () => {
      const TestComponent = () => {
        const { toasts } = useToast();
        return <div>Toasts: {toasts.length}</div>;
      };

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      expect(screen.getByText('Toasts: 0')).toBeInTheDocument();
    });
  });

  describe('useToast hook', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ToastProvider>{children}</ToastProvider>
    );

    it('returns toast functions and state', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      expect(result.current).toHaveProperty('toast');
      expect(result.current).toHaveProperty('toasts');
      expect(result.current).toHaveProperty('dismiss');
      expect(typeof result.current.toast).toBe('function');
      expect(typeof result.current.dismiss).toBe('function');
      expect(Array.isArray(result.current.toasts)).toBe(true);
    });

    it('adds toast when toast function is called', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.toast({
          title: 'Test Toast',
          description: 'This is a test',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        title: 'Test Toast',
        description: 'This is a test',
      });
      expect(result.current.toasts[0].id).toBeDefined();
    });

    it('adds multiple toasts', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.toast({ title: 'Toast 1' });
        result.current.toast({ title: 'Toast 2' });
        result.current.toast({ title: 'Toast 3' });
      });

      expect(result.current.toasts).toHaveLength(3);
      expect(result.current.toasts[0].title).toBe('Toast 1');
      expect(result.current.toasts[1].title).toBe('Toast 2');
      expect(result.current.toasts[2].title).toBe('Toast 3');
    });

    it('auto-dismisses toast after 5 seconds', async () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.toast({ title: 'Auto-dismiss toast' });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.toasts).toHaveLength(0);
      });
    });

    it('dismisses specific toast by ID', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.toast({ title: 'Toast 1' });
      });
      
      // Advance time slightly to ensure different IDs
      act(() => {
        jest.advanceTimersByTime(1);
      });
      
      act(() => {
        result.current.toast({ title: 'Toast 2' });
      });

      expect(result.current.toasts).toHaveLength(2);
      const toastId = result.current.toasts[0].id;

      act(() => {
        result.current.dismiss(toastId);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Toast 2');
    });

    it('dismisses all toasts when dismiss is called without ID', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.toast({ title: 'Toast 1' });
        result.current.toast({ title: 'Toast 2' });
        result.current.toast({ title: 'Toast 3' });
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('handles toast with variant', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.toast({
          title: 'Error',
          description: 'Something went wrong',
          variant: 'destructive',
        });
      });

      expect(result.current.toasts[0]).toMatchObject({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    });

    it('handles toast with action', () => {
      const { result } = renderHook(() => useToast(), { wrapper });
      const action = <button>Undo</button>;

      act(() => {
        result.current.toast({
          title: 'Item deleted',
          action: action,
        });
      });

      expect(result.current.toasts[0]).toMatchObject({
        title: 'Item deleted',
        action: action,
      });
    });

    it('generates unique IDs for each toast', () => {
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.toast({ title: 'Toast 1' });
      });
      
      // Advance time slightly to ensure different IDs
      act(() => {
        jest.advanceTimersByTime(1);
      });
      
      act(() => {
        result.current.toast({ title: 'Toast 2' });
      });

      const id1 = result.current.toasts[0].id;
      const id2 = result.current.toasts[1].id;

      expect(id1).not.toBe(id2);
    });
  });

  describe('useToast without provider', () => {
    it('returns mock implementation when no provider exists', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const { result } = renderHook(() => useToast());

      expect(result.current.toasts).toEqual([]);
      expect(typeof result.current.toast).toBe('function');
      expect(typeof result.current.dismiss).toBe('function');

      // Should not throw when calling functions
      act(() => {
        result.current.toast({ title: 'Test' });
        result.current.dismiss();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Integration tests', () => {
    it('works with multiple components using the hook', () => {
      const Component1 = () => {
        const { toast, toasts } = useToast();
        return (
          <div>
            <button onClick={() => toast({ title: 'From Component 1' })}>
              Add Toast 1
            </button>
            <div>Component 1 sees: {toasts.length} toasts</div>
          </div>
        );
      };

      const Component2 = () => {
        const { toast, toasts } = useToast();
        return (
          <div>
            <button onClick={() => toast({ title: 'From Component 2' })}>
              Add Toast 2
            </button>
            <div>Component 2 sees: {toasts.length} toasts</div>
          </div>
        );
      };

      render(
        <ToastProvider>
          <Component1 />
          <Component2 />
        </ToastProvider>
      );

      expect(screen.getByText('Component 1 sees: 0 toasts')).toBeInTheDocument();
      expect(screen.getByText('Component 2 sees: 0 toasts')).toBeInTheDocument();

      act(() => {
        screen.getByText('Add Toast 1').click();
      });

      expect(screen.getByText('Component 1 sees: 1 toasts')).toBeInTheDocument();
      expect(screen.getByText('Component 2 sees: 1 toasts')).toBeInTheDocument();

      act(() => {
        screen.getByText('Add Toast 2').click();
      });

      expect(screen.getByText('Component 1 sees: 2 toasts')).toBeInTheDocument();
      expect(screen.getByText('Component 2 sees: 2 toasts')).toBeInTheDocument();
    });

    it('handles rapid toast additions', () => {
      const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.toast({ title: `Toast ${i}` });
        }
      });

      expect(result.current.toasts).toHaveLength(10);
    });

    it('maintains order of toasts', () => {
      const { result } = renderHook(() => useToast(), { wrapper: ToastProvider });

      act(() => {
        result.current.toast({ title: 'First' });
        result.current.toast({ title: 'Second' });
        result.current.toast({ title: 'Third' });
      });

      expect(result.current.toasts[0].title).toBe('First');
      expect(result.current.toasts[1].title).toBe('Second');
      expect(result.current.toasts[2].title).toBe('Third');
    });
  });
});