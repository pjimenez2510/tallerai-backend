import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformResponseInterceptor } from './transform-response.interceptor';

const makeContext = (statusCode: number): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
    }),
  }) as unknown as ExecutionContext;

const makeHandler = (returnValue: unknown) => ({
  handle: () => of(returnValue),
});

describe('TransformResponseInterceptor', () => {
  let interceptor: TransformResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformResponseInterceptor();
  });

  it('should wrap data with message when response has message key', (done) => {
    const context = makeContext(200);
    const handler = makeHandler({ message: 'Success msg', data: { id: '1' } });

    interceptor.intercept(context, handler as never).subscribe((result) => {
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Success msg');
      expect(result.data).toEqual({ id: '1' });
      expect(result.timestamp).toBeTruthy();
      done();
    });
  });

  it('should use "Success" as default message when no message key', (done) => {
    const context = makeContext(200);
    const handler = makeHandler([{ id: '1' }]);

    interceptor.intercept(context, handler as never).subscribe((result) => {
      expect(result.message).toBe('Success');
      expect(result.data).toEqual([{ id: '1' }]);
      done();
    });
  });

  it('should set data to null when message is present but data is undefined', (done) => {
    const context = makeContext(200);
    const handler = makeHandler({ message: 'Done' });

    interceptor.intercept(context, handler as never).subscribe((result) => {
      expect(result.message).toBe('Done');
      expect(result.data).toBeNull();
      done();
    });
  });

  it('should reflect 201 status code from context', (done) => {
    const context = makeContext(201);
    const handler = makeHandler({ message: 'Created', data: { id: '2' } });

    interceptor.intercept(context, handler as never).subscribe((result) => {
      expect(result.statusCode).toBe(201);
      done();
    });
  });
});
