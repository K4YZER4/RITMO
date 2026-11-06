-- Tabla de tokens JWT revocados (denylist por jti).
CREATE TABLE app_user.token_revocado (
  jti VARCHAR(128) PRIMARY KEY,
  usuario_id UUID,
  expira_en TIMESTAMPTZ(6) NOT NULL,
  revocado_en TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX token_revocado_expira_en_idx
  ON app_user.token_revocado (expira_en);

CREATE INDEX token_revocado_usuario_id_idx
  ON app_user.token_revocado (usuario_id);