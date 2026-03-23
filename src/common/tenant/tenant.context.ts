import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';

interface TenantStore {
  tenantId: string;
}

@Injectable()
export class TenantContext {
  private readonly als = new AsyncLocalStorage<TenantStore>();

  run<T>(tenantId: string, fn: () => T): T {
    return this.als.run({ tenantId }, fn);
  }

  getTenantId(): string {
    const store = this.als.getStore();
    if (!store) {
      throw new Error(
        'TenantContext not initialized. Ensure TenantInterceptor is applied.',
      );
    }
    return store.tenantId;
  }

  getTenantIdOrNull(): string | null {
    return this.als.getStore()?.tenantId ?? null;
  }
}
