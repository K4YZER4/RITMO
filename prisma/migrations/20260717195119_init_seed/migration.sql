
-- 1) pais
INSERT INTO ubi.pais (nombre)
VALUES
  ('México');

-- 2) entidad_federativa
INSERT INTO ubi.entidad_federativa (nombre, id_pais)
VALUES
  ('Sinaloa', 1);

-- 3) municipio
INSERT INTO ubi.municipio (nombre, id_entidad_federativa)
VALUES
  ('Guasave', 1);

-- 4) localidad
INSERT INTO ubi.localidad (nombre, id_municipio)
VALUES
  ('Guasave', 1);

-- 5) estado
INSERT INTO core.estado (nombre)
VALUES
  ('ACTIVO'),
  ('COMPLETADA'),
  ('INACTIVO'),
  ('PENDIENTE'),
  ('PENDIENTE_PAGO');

-- 6) dia_semana
INSERT INTO core.dia_semana (id, nombre)
VALUES
  (1, 'LUNES'),
  (2, 'MARTES'),
  (3, 'MIERCOLES'),
  (4, 'JUEVES'),
  (5, 'VIERNES'),
  (6, 'SABADO'),
  (7, 'DOMINGO')
ON CONFLICT (id) DO NOTHING;

-- 7) entrenador_tema
INSERT INTO entrenador.entrenador_tema (primary_color, secundary_color, background_color)
VALUES
  ('#2563EB', '#1D4ED8', '#F8FAFC');
-- 8) redes_sociales
INSERT INTO core.redes_sociales (nombre)
VALUES
  ('INSTAGRAM'),
  ('FACEBOOK'),
  ('TIKTOK'),
  ('YOUTUBE'),
  ('WHATSAPP'),
  ('X');

-- 9) categorias
INSERT INTO core.categorias (nombre)
VALUES
  ( 'FUERZA'),
  ('HIPERTROFIA'),
  ('PERDIDA_PESO'),
  ('REHABILITACION'),
  ('ACONDICIONAMIENTO'),
  ('HALTEROFILIA');

-- 10) tipo_seccion
INSERT INTO core.tipo_seccion (nombre)
VALUES
  ('HERO'),
  ('ABOUT'),
  ('SERVICES'),
  ('TESTIMONIALS'),
  ('TRANSFORMATIONS'),
  ('FAQ'),
  ('CONTACT'),
  ('SOCIAL_LINKS');

-- 11) musculo
INSERT INTO core.musculo (nombre)
VALUES
  ('PECHO'),
  ('ESPALDA'),
  ('HOMBROS'),
  ('BICEPS'),
  ('TRICEPS'),
  ('CUADRICEPS'),
  ('FEMORALES'),
  ('GLUTEOS'),
  ('PANTORRILLAS'),
  ('CORE');

-- 12) equipo
INSERT INTO core.equipo (nombre)
VALUES
  ('BARRA'),
  ('MANCUERNAS'),
  ('KETTLEBELL'),
  ('BANCA'),
  ('RACK'),
  ('POLEA'),
  ('BANDAS'),
  ('MAQUINA_SMITH'),
  ('PRENSA'),
  ('PESO_CORPORAL');

-- 13) categoria_rutina
INSERT INTO core.categoria_rutina (nombre, descripcion)
VALUES
  ('HIPERTROFIA', 'Rutinas orientadas al aumento de masa muscular'),
  ('FUERZA', 'Rutinas orientadas a mejorar fuerza máxima y progresión de cargas'),
  ('PERDIDA_GRASA', 'Rutinas orientadas a aumentar gasto energético y adherencia'),
  ('HALTEROFILIA', 'Rutinas enfocadas en tecnica y progresión de levantamientos olímpicos'),
  ('ACONDICIONAMIENTO', 'Rutinas generales de condición física y resistencia'),
  ('TECNICA', 'Rutinas enfocadas en aprendizaje técnico del movimiento');

  --14 Sexo
INSERT INTO core.sexo (nombre)
VALUES
  ('MASCULINO'),
  ('FEMENINO');