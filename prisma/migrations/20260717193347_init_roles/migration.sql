DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'rtmo_migrator'
  ) THEN
    CREATE ROLE rtmo_migrator WITH LOGIN PASSWORD 'r1tm0_m1gr4t0r';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'rtmo_app'
  ) THEN
    CREATE ROLE rtmo_app WITH LOGIN PASSWORD 'ritmo_app';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE postgres TO rtmo_migrator;
GRANT CONNECT ON DATABASE postgres TO rtmo_app;

GRANT USAGE, CREATE ON SCHEMA ubi TO rtmo_migrator;
GRANT USAGE, CREATE ON SCHEMA core TO rtmo_migrator;
GRANT USAGE, CREATE ON SCHEMA entrenador TO rtmo_migrator;
GRANT USAGE, CREATE ON SCHEMA alumno TO rtmo_migrator;
GRANT USAGE, CREATE ON SCHEMA app_user TO rtmo_migrator;

GRANT USAGE ON SCHEMA ubi TO rtmo_app;
GRANT USAGE ON SCHEMA core TO rtmo_app;
GRANT USAGE ON SCHEMA entrenador TO rtmo_app;
GRANT USAGE ON SCHEMA alumno TO rtmo_app;
GRANT USAGE ON SCHEMA app_user TO rtmo_app;

GRANT SELECT ON ALL TABLES IN SCHEMA ubi TO rtmo_app;
GRANT SELECT ON ALL TABLES IN SCHEMA core TO rtmo_app;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA entrenador TO rtmo_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA alumno TO rtmo_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA app_user TO rtmo_app;

GRANT DELETE ON TABLE app_user.rutina_ejercicio TO rtmo_app;
GRANT DELETE ON TABLE app_user.ejercicio_personalizado_musculo TO rtmo_app;
GRANT DELETE ON TABLE app_user.ejercicio_personalizado_equipo TO rtmo_app;
GRANT DELETE ON TABLE app_user.usuario_rutina_ejercicio_override TO rtmo_app;