import { BadRequestException, HttpStatus } from '@nestjs/common';

export class AppBadRequestException extends BadRequestException {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super({
      code,
      message,
      statusCode: HttpStatus.BAD_REQUEST,
      details: details ?? null,
    });
  }
}
