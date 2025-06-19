describe('Simple TypeScript Test', () => {
  it('should handle TypeScript syntax', () => {
    const value: number = 42;
    expect(value).toBe(42);
  });

  it('should handle type assertions', () => {
    const obj = { name: 'test' } as any;
    expect(obj.name).toBe('test');
  });

  it('should handle optional chaining', () => {
    const obj: { nested?: { value?: number } } = { nested: { value: 10 } };
    expect(obj.nested?.value).toBe(10);
  });
});