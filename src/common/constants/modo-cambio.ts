export const MODOS_CAMBIO_PLAN = {
  INSTANTANEO: 'instantaneo',
  FINAL_PERIODO: 'finalPeriodo',
} as const;

export type ModoCambioPlan = (typeof MODOS_CAMBIO_PLAN)[keyof typeof MODOS_CAMBIO_PLAN];
