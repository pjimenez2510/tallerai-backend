import { TenantContext } from './tenant.context';

describe('TenantContext', () => {
  let context: TenantContext;

  beforeEach(() => {
    context = new TenantContext();
  });

  it('should return tenantId inside run()', () => {
    context.run('tenant-123', () => {
      expect(context.getTenantId()).toBe('tenant-123');
    });
  });

  it('should return null outside run() via getTenantIdOrNull', () => {
    expect(context.getTenantIdOrNull()).toBeNull();
  });

  it('should throw error outside run() via getTenantId', () => {
    expect(() => context.getTenantId()).toThrow(
      'TenantContext not initialized',
    );
  });

  it('should isolate tenantId between nested runs', () => {
    context.run('tenant-A', () => {
      expect(context.getTenantId()).toBe('tenant-A');

      context.run('tenant-B', () => {
        expect(context.getTenantId()).toBe('tenant-B');
      });

      expect(context.getTenantId()).toBe('tenant-A');
    });
  });

  it('should return the value from the callback', () => {
    const result = context.run('t1', () => 42);
    expect(result).toBe(42);
  });
});
