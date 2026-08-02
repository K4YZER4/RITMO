CREATE OR REPLACE FUNCTION alumno.set_expira_token_vinculacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.creado_en IS NULL THEN
    NEW.creado_en := NOW();
  END IF;

  NEW.expira_en := NEW.creado_en + INTERVAL '30 minutes';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_expira_token_vinculacion
BEFORE INSERT ON alumno.token_vinculacion_alumno
FOR EACH ROW
EXECUTE FUNCTION alumno.set_expira_token_vinculacion();