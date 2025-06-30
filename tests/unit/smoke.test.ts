describe('Smoke Test', () => {
  it('should run basic test', () => {
    expect(true).toBe(true)
  })

  it('should perform basic math', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle strings', () => {
    expect('hello' + ' ' + 'world').toBe('hello world')
  })
})