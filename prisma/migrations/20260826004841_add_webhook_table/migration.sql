CREATE TYPE app_user.estado_evento_webhook_enum AS ENUM (
  'recibido',
  'procesando',
  'procesado',
  'fallido'
);

CREATE TABLE app_user.evento_webhook (
  id BIGSERIAL PRIMARY KEY,
  proveedor VARCHAR(30) NOT NULL,
  proveedor_evento_id VARCHAR(255) NOT NULL,
  tipo VARCHAR(150) NOT NULL,
  estado app_user.estado_evento_webhook_enum NOT NULL DEFAULT 'recibido',
  payload JSONB,
  error TEXT,
  recibido_en TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  procesado_en TIMESTAMPTZ(6)
);

CREATE INDEX evento_webhook_estado_recibido_idx
  ON app_user.evento_webhook (estado, recibido_en);

CREATE INDEX evento_webhook_tipo_recibido_idx
  ON app_user.evento_webhook (tipo, recibido_en);

CREATE UNIQUE INDEX evento_webhook_proveedor_evento_unique_idx
  ON app_user.evento_webhook (proveedor, proveedor_evento_id);