
-- 1) pais
INSERT INTO pais (id, nombre)
VALUES
  (1, 'México')
ON CONFLICT (id) DO NOTHING;

-- 2) entidad_federativa
INSERT INTO entidad_federativa (id, nombre, id_pais)
VALUES
  (1, 'Sinaloa', 1)
ON CONFLICT (id) DO NOTHING;

-- 3) municipio
INSERT INTO municipio (id, nombre, id_entidad_federativa)
VALUES
  (1, 'Guasave', 1)
ON CONFLICT (id) DO NOTHING;

-- 4) localidad
INSERT INTO localidad (id, nombre, id_municipio)
VALUES
  (1, 'Guasave', 1)
ON CONFLICT (id) DO NOTHING;

-- 5) estado
INSERT INTO estado (id, nombre)
VALUES
  (1, 'ACTIVO'),
  (2, 'COMPLETADA'),
  (3, 'INACTIVO'),
  (4, 'PENDIENTE'),
  (5, 'PENDIENTE_PAGO')
ON CONFLICT (id) DO NOTHING;

-- 6) dia_semana
INSERT INTO dia_semana (id, nombre)
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
INSERT INTO entrenador_tema (id, primary_color, secundary_color, background_color)
VALUES
  (1, '#2563EB', '#1D4ED8', '#F8FAFC')
ON CONFLICT (id) DO NOTHING;
-- 8) redes_sociales
INSERT INTO redes_sociales (id, nombre)
VALUES
  (1, 'INSTAGRAM'),
  (2, 'FACEBOOK'),
  (3, 'TIKTOK'),
  (4, 'YOUTUBE'),
  (5, 'WHATSAPP'),
  (6, 'X')
ON CONFLICT (id) DO NOTHING;

-- 9) categorias
INSERT INTO categorias (id, nombre)
VALUES
  (1, 'FUERZA'),
  (2, 'HIPERTROFIA'),
  (3, 'PERDIDA_PESO'),
  (4, 'REHABILITACION'),
  (5, 'ACONDICIONAMIENTO'),
  (6, 'HALTEROFILIA')
ON CONFLICT (id) DO NOTHING;

-- 10) tipo_seccion
INSERT INTO tipo_seccion (id, nombre)
VALUES
  (1, 'HERO'),
  (2, 'ABOUT'),
  (3, 'SERVICES'),
  (4, 'TESTIMONIALS'),
  (5, 'TRANSFORMATIONS'),
  (6, 'FAQ'),
  (7, 'CONTACT'),
  (8, 'SOCIAL_LINKS')
ON CONFLICT (id) DO NOTHING;

-- 11) musculo
INSERT INTO musculo (id, nombre)
VALUES
  (1, 'PECHO'),
  (2, 'ESPALDA'),
  (3, 'HOMBROS'),
  (4, 'BICEPS'),
  (5, 'TRICEPS'),
  (6, 'CUADRICEPS'),
  (7, 'FEMORALES'),
  (8, 'GLUTEOS'),
  (9, 'PANTORRILLAS'),
  (10, 'CORE')
ON CONFLICT (id) DO NOTHING;

-- 12) equipo
INSERT INTO equipo (id, nombre)
VALUES
  (1, 'BARRA'),
  (2, 'MANCUERNAS'),
  (3, 'KETTLEBELL'),
  (4, 'BANCA'),
  (5, 'RACK'),
  (6, 'POLEA'),
  (7, 'BANDAS'),
  (8, 'MAQUINA_SMITH'),
  (9, 'PRENSA'),
  (10, 'PESO_CORPORAL')
ON CONFLICT (id) DO NOTHING;

-- 13) categoria_rutina
INSERT INTO categoria_rutina (id, nombre, descripcion)
VALUES
  (1, 'HIPERTROFIA', 'Rutinas orientadas al aumento de masa muscular'),
  (2, 'FUERZA', 'Rutinas orientadas a mejorar fuerza máxima y progresión de cargas'),
  (3, 'PERDIDA_GRASA', 'Rutinas orientadas a aumentar gasto energético y adherencia'),
  (4, 'HALTEROFILIA', 'Rutinas enfocadas en tecnica y progresión de levantamientos olímpicos'),
  (5, 'ACONDICIONAMIENTO', 'Rutinas generales de condición física y resistencia'),
  (6, 'TECNICA', 'Rutinas enfocadas en aprendizaje técnico del movimiento')
ON CONFLICT (id) DO NOTHING;
