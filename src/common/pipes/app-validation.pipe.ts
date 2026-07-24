import { Injectable, ValidationError, ValidationPipe } from '@nestjs/common';
import { AppBadRequestException } from '../exception/app-bad-request';

@Injectable()
export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const firstError = errors[0];
        const field = firstError?.property ?? 'unknownField';
        const constraints = firstError?.constraints ?? {};
        const rawMessage = Object.values(constraints)[0] ?? null;

        let code = 'INVALID_INPUT';
        let message = `El campo "${field}" es inválido.`;

        if (typeof rawMessage === 'string') {
          try {
            const parsed = JSON.parse(rawMessage) as {
              code?: string;
              message?: string;
            };

            if (parsed?.code) code = parsed.code;
            if (parsed?.message) message = parsed.message;
          } catch {
            message = rawMessage;
          }
        }

        return new AppBadRequestException(code, message, { field });
      },
    });
  }
}
