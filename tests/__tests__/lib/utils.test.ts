describe('Utility Functions', () => {
  // Mock implementations of utility functions
  const cn = (...inputs: (string | undefined | null | false)[]) => {
    return inputs
      .filter(Boolean)
      .map(s => (s as string).trim())
      .join(' ');
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    let d: Date;
    if (typeof date === 'string') {
      // Handle ISO strings properly
      if (date.includes('T')) {
        d = new Date(date);
      } else {
        // Add time to prevent timezone issues
        d = new Date(date + 'T12:00:00Z');
      }
    } else {
      d = date;
    }
    
    // Format in UTC to avoid timezone issues
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    };
    
    return d.toLocaleDateString('en-US', options);
  };

  const truncate = (str: string, length: number) => {
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
  };

  describe('cn (className utility)', () => {
    it('should combine class names', () => {
      expect(cn('btn', 'btn-primary')).toBe('btn btn-primary');
    });

    it('should filter out falsy values', () => {
      expect(cn('btn', false, 'btn-primary', null, undefined)).toBe('btn btn-primary');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
    });

    it('should trim extra spaces', () => {
      expect(cn('  btn  ', '  btn-primary  ')).toBe('btn btn-primary');
    });
  });

  describe('formatCurrency', () => {
    it('should format USD currency by default', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should format negative numbers', () => {
      expect(formatCurrency(-500)).toBe('-$500.00');
    });

    it('should format large numbers', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('should support other currencies', () => {
      expect(formatCurrency(100, 'EUR')).toContain('100');
    });
  });

  describe('formatDate', () => {
    it('should format Date objects', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(formatDate(date)).toBe('Jan 15, 2024');
    });

    it('should format date strings', () => {
      expect(formatDate('2024-01-15')).toBe('Jan 15, 2024');
    });

    it('should handle ISO date strings', () => {
      expect(formatDate('2024-01-15T10:30:00Z')).toBe('Jan 15, 2024');
    });
  });

  describe('truncate', () => {
    it('should not truncate short strings', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should truncate long strings', () => {
      expect(truncate('Hello World!', 8)).toBe('Hello Wo...');
    });

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should handle empty strings', () => {
      expect(truncate('', 10)).toBe('');
    });
  });
});