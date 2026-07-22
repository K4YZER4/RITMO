// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guards.js';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
