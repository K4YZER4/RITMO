import { SetMetadata } from '@nestjs/common';

export const ES_RUTA_SIN_SUSCRIPCION = 'sinSuscripcion';

export const SinSuscripcion = () => SetMetadata(ES_RUTA_SIN_SUSCRIPCION, true);
