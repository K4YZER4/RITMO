-- Relajar el CHECK suscripcion_periodo_check para permitir suscripciones morosas
-- cuyo periodo aún no se asigna (el pago no se ha confirmado aún).

ALTER TABLE app_user.suscripcion
  DROP CONSTRAINT IF EXISTS suscripcion_periodo_check;

ALTER TABLE app_user.suscripcion
  ADD CONSTRAINT suscripcion_periodo_check
    CHECK (
      (
        vitalicia = true
        AND periodo_actual_fin IS NULL
        AND siguiente_cobro_en IS NULL
      )
      OR
      estado = 'morosa'
      OR
      (
        vitalicia = false
        AND periodo_actual_fin IS NOT NULL
        AND periodo_actual_fin > periodo_actual_inicio
      )
    );