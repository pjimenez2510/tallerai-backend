import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TenantContext } from './tenant.context';
import { TenantInterceptor } from './tenant.interceptor';

describe('TenantInterceptor', () => {
  let interceptor: TenantInterceptor;
  let tenantContext: TenantContext;

  beforeEach(() => {
    tenantContext = new TenantContext();
    interceptor = new TenantInterceptor(tenantContext);
  });

  const makeContext = (user?: { tenantId: string }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  const makeHandler = (value: unknown = 'ok'): CallHandler => ({
    handle: () => of(value),
  });

  it('should set tenantId in context when user is authenticated', (done) => {
    const ctx = makeContext({ tenantId: 'tenant-abc' });
    const handler = {
      handle: () =>
        new (jest.requireActual<typeof import('rxjs')>('rxjs').Observable)(
          (subscriber: import('rxjs').Subscriber<unknown>) => {
            expect(tenantContext.getTenantId()).toBe('tenant-abc');
            subscriber.next('result');
            subscriber.complete();
          },
        ),
    };

    interceptor.intercept(ctx, handler).subscribe({
      next: (val) => expect(val).toBe('result'),
      complete: done,
    });
  });

  it('should pass through when no user is present', (done) => {
    const ctx = makeContext(undefined);
    const handler = makeHandler('no-auth-result');

    interceptor.intercept(ctx, handler).subscribe({
      next: (val) => expect(val).toBe('no-auth-result'),
      complete: done,
    });
  });

  it('should pass through when user has no tenantId', (done) => {
    const ctx = makeContext(undefined);
    const handler = makeHandler('public');

    interceptor.intercept(ctx, handler).subscribe({
      next: (val) => expect(val).toBe('public'),
      complete: done,
    });
  });
});
