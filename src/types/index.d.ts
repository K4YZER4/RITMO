export {};
import type { JwtPayload } from '../common/types/jwt-payload';

declare module 'express' {
  interface Request {
    user?: JwtPayload;
  }
}
