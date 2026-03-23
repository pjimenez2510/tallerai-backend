import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

const makeHost = (jsonFn: jest.Mock) => ({
  switchToHttp: () => ({
    getResponse: () => ({
      status: jest.fn().mockReturnValue({ json: jsonFn }),
    }),
  }),
});

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jsonMock = jest.fn();
  });

  it('should handle string exception response', () => {
    const exception = new HttpException('Simple error message', HttpStatus.BAD_REQUEST);
    const host = makeHost(jsonMock);

    filter.catch(exception, host as never);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Simple error message',
        error: expect.any(String),
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle object exception response with message string', () => {
    const exception = new HttpException(
      { message: 'Object error message', error: 'BadRequest' },
      HttpStatus.BAD_REQUEST,
    );
    const host = makeHost(jsonMock);

    filter.catch(exception, host as never);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Object error message',
        error: 'BadRequest',
      }),
    );
  });

  it('should join array message into single string', () => {
    const exception = new HttpException(
      { message: ['field1 is required', 'field2 is invalid'], error: 'BadRequest' },
      HttpStatus.BAD_REQUEST,
    );
    const host = makeHost(jsonMock);

    filter.catch(exception, host as never);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'field1 is required, field2 is invalid',
      }),
    );
  });

  it('should fallback to default message when no message in object', () => {
    const exception = new HttpException({ error: 'SomeError' }, HttpStatus.INTERNAL_SERVER_ERROR);
    const host = makeHost(jsonMock);

    filter.catch(exception, host as never);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'An error occurred',
      }),
    );
  });

  it('should include a timestamp in ISO format', () => {
    const exception = new HttpException('error', HttpStatus.NOT_FOUND);
    const host = makeHost(jsonMock);

    filter.catch(exception, host as never);

    const [[arg]] = jsonMock.mock.calls as [[{ timestamp: string }]];
    expect(() => new Date(arg.timestamp)).not.toThrow();
  });
});
