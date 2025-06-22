interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryOn?: (error: any) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    retryOn = (error) => {
      // Retry on network errors and 5xx status codes
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
      if (error.status >= 500) return true;
      if (error.status === 429) return true; // Rate limited
      return false;
    }
  } = options;

  let lastError: Error | undefined;
  let delayMs = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt === maxRetries || !retryOn(error)) {
        throw error;
      }

      // Handle rate limit headers
      if (error.status === 429 && error.headers?.['retry-after']) {
        delayMs = parseInt(error.headers['retry-after']) * 1000;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, maxDelayMs)));

      // Exponential backoff
      delayMs *= backoffMultiplier;
    }
  }

  throw lastError || new Error('Retry failed');
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

// Circuit breaker implementation
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: number;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeMs: number = 60000,
    private readonly halfOpenRequests: number = 3
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailureTime || 0) > this.resetTimeMs) {
        this.state = 'half-open';
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      
      if (this.state === 'half-open') {
        this.failures = 0;
        this.state = 'closed';
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'open';
      }

      throw error;
    }
  }

  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = undefined;
  }
}

// API client with resilience
export class ResilientAPIClient {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(
    private readonly baseURL: string,
    private readonly defaultTimeout: number = 5000
  ) {}

  private getCircuitBreaker(endpoint: string): CircuitBreaker {
    if (!this.circuitBreakers.has(endpoint)) {
      this.circuitBreakers.set(endpoint, new CircuitBreaker());
    }
    return this.circuitBreakers.get(endpoint)!;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(endpoint);
    const timeout = options.timeout || this.defaultTimeout;

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        return withTimeout(async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
              ...options,
              signal: controller.signal
            });

            if (!response.ok) {
              const error: any = new Error(`HTTP ${response.status}`);
              error.status = response.status;
              error.headers = Object.fromEntries(response.headers);
              throw error;
            }

            return response.json();
          } finally {
            clearTimeout(timeoutId);
          }
        }, timeout);
      });
    });
  }
}

// Batch processing with partial failure handling
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    concurrency?: number;
    continueOnError?: boolean;
  } = {}
): Promise<{
  successful: Array<{ item: T; result: R }>;
  failed: Array<{ item: T; error: Error }>;
}> {
  const { concurrency = 5, continueOnError = true } = options;
  
  const successful: Array<{ item: T; result: R }> = [];
  const failed: Array<{ item: T; error: Error }> = [];
  
  const chunks = [];
  for (let i = 0; i < items.length; i += concurrency) {
    chunks.push(items.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (item) => {
      try {
        const result = await processor(item);
        successful.push({ item, result });
      } catch (error: any) {
        failed.push({ item, error });
        if (!continueOnError) {
          throw error;
        }
      }
    });

    await Promise.all(promises);
  }

  return { successful, failed };
}

// Token refresh manager
export class TokenManager {
  private token?: string;
  private refreshPromise?: Promise<string>;
  private tokenExpiry?: number;

  constructor(
    private readonly refreshToken: () => Promise<{ token: string; expiresIn: number }>
  ) {}

  async getToken(): Promise<string> {
    // Check if token is still valid
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    // If already refreshing, wait for that
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Refresh token
    this.refreshPromise = this.refreshToken()
      .then(({ token, expiresIn }) => {
        this.token = token;
        this.tokenExpiry = Date.now() + (expiresIn * 1000);
        this.refreshPromise = undefined;
        return token;
      })
      .catch((error) => {
        this.refreshPromise = undefined;
        throw error;
      });

    return this.refreshPromise;
  }

  invalidate(): void {
    this.token = undefined;
    this.tokenExpiry = undefined;
  }
}