-- SCHEMAS
CREATE SCHEMA ubi;
CREATE SCHEMA core;
CREATE SCHEMA entrenador;
CREATE SCHEMA alumno;
CREATE SCHEMA app_user;


-- TABLAS CORE
CREATE TABLE core.redes_sociales (
  id INTEGER PRIMARY KEY NOT NULL,
  nombre VARCHAR(50) NOT NULL
);
CREATE TABLE core.tipo_seccion (
  id BIGINT PRIMARY KEY NOT NULL,
  nombre VARCHAR(100) UNIQUE NOT NULL
);


CREATE TABLE core.categorias (
  id INTEGER PRIMARY KEY NOT NULL,
  nombre VARCHAR(50) NOT NULL
);


CREATE TABLE core.estado (
  id INTEGER PRIMARY KEY NOT NULL,
  nombre VARCHAR(30) NOT NULL
);


CREATE TABLE core.musculo (
  id BIGINT PRIMARY KEY NOT NULL,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW()
);


CREATE TABLE core.equipo (
  id BIGINT PRIMARY KEY NOT NULL,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW()
);


CREATE TABLE core.ejercicio_estandar (
  id BIGINT PRIMARY KEY NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  url_imagen TEXT,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW()
);


CREATE TABLE core.ejercicio_estandar_musculo (
  id_ejercicio_estandar BIGINT NOT NULL,
  id_musculo BIGINT NOT NULL,
  PRIMARY KEY (id_ejercicio_estandar, id_musculo)
);


CREATE TABLE core.dia_semana (
  id SMALLINT PRIMARY KEY NOT NULL,
  nombre VARCHAR(20) UNIQUE NOT NULL
);


CREATE TABLE core.ejercicio_estandar_equipo (
  id_ejercicio_estandar BIGINT NOT NULL,
  id_equipo BIGINT NOT NULL,
  PRIMARY KEY (id_ejercicio_estandar, id_equipo)
);


CREATE TABLE core.categoria_rutina (
  id INT PRIMARY KEY NOT NULL,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT
);


-- UBICACIÓN
CREATE TABLE ubi.pais (
  id INTEGER PRIMARY KEY NOT NULL,
  nombre VARCHAR(50) NOT NULL
);


CREATE TABLE ubi.entidad_federativa (
  id BIGINT PRIMARY KEY NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  id_pais INTEGER NOT NULL
);


CREATE TABLE ubi.municipio (
  id BIGINT PRIMARY KEY NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  id_entidad_federativa BIGINT NOT NULL
);


CREATE TABLE ubi.localidad (
  id BIGINT PRIMARY KEY NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  id_municipio BIGINT NOT NULL
);


-- APP_USER


CREATE TABLE app_user.usuario (
  id UUID PRIMARY KEY NOT NULL,
  nombre VARCHAR(20) NOT NULL,
  apellido_paterno VARCHAR(20) NOT NULL,
  apellido_materno VARCHAR(20),
  correo VARCHAR(60) NOT NULL,
  hashed_password VARCHAR(60) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  fecha_registro DATE NOT NULL
);


-- ENTRENADOR / ALUMNO / GIMNASIO
CREATE TABLE entrenador.entrenador_tema (
  id BIGINT PRIMARY KEY NOT NULL,
  primary_color VARCHAR(50) NOT NULL,
  secundary_color VARCHAR(50) NOT NULL,
  background_color VARCHAR(50) NOT NULL
);


CREATE TABLE entrenador.entrenador (
  id_usuario UUID PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  id_estado INTEGER NOT NULL,
  fecha_entrenador DATE NOT NULL,
  id_localidad BIGINT,
  verificacion_status BOOLEAN NOT NULL DEFAULT false,
  id_tema BIGINT NOT NULL DEFAULT 1,
  nombre_publico VARCHAR(50),
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW()
);


CREATE TABLE entrenador.entrenador_redes_sociales (
  id BIGINT PRIMARY KEY NOT NULL,
  id_entrenador UUID NOT NULL,
  id_red_social INTEGER NOT NULL,
  url_red TEXT NOT NULL
);


CREATE TABLE entrenador.entrenador_categorias (
  id BIGINT PRIMARY KEY NOT NULL,
  id_entrenador UUID NOT NULL,
  id_categoria INTEGER NOT NULL
);


CREATE TABLE entrenador.gimnasio (
  id BIGINT PRIMARY KEY NOT NULL,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  ubicacion TEXT NOT NULL,
  created_by_usuario UUID NOT NULL,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  id_localidad BIGINT NOT NULL,
  id_estado INTEGER NOT NULL
);


CREATE TABLE alumno.alumno (
  id_usuario UUID PRIMARY KEY NOT NULL,
  id_estado INTEGER NOT NULL,
  sexo VARCHAR(20),
  numero_celular VARCHAR(20),
  fecha_inicio_entrenamiento DATE,
  objetivo TEXT,
  nivel_actividad TEXT,
  observaciones_medicas TEXT,
  lesiones_actuales TEXT,
  lesiones_pasadas TEXT,
  contacto_emergencia_nombre VARCHAR(100),
  contacto_emergencia_telefono VARCHAR(30),
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  id_entrenador_actual UUID,
  created_by UUID,
  updated_by UUID
);


CREATE TABLE entrenador.entrenador_gimnasio (
  id BIGINT PRIMARY KEY NOT NULL,
  id_gimnasio BIGINT NOT NULL,
  id_entrenador UUID NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  fecha_ingreso TIMESTAMP(0)
);


CREATE TABLE entrenador.entrenador_seccion (
  id BIGINT PRIMARY KEY NOT NULL,
  id_entrenador UUID NOT NULL,
  id_tipo_seccion BIGINT NOT NULL,
  configuracion_json JSONB NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW()
);


-- EJERCICIOS / RUTINAS APP_USER
CREATE TABLE app_user.ejercicio_personalizado (
  id BIGINT PRIMARY KEY NOT NULL,
  created_by_usuario UUID NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true, 
  descripcion TEXT,
  url_imagen TEXT,
  link_informacion TEXT,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW()
);


CREATE TABLE app_user.ejercicio_personalizado_musculo (
  id_ejercicio_personalizado BIGINT NOT NULL,
  id_musculo BIGINT NOT NULL,
  PRIMARY KEY (id_ejercicio_personalizado, id_musculo)
);


CREATE TABLE app_user.ejercicio_personalizado_equipo (
  id_ejercicio_personalizado BIGINT NOT NULL,
  id_equipo BIGINT NOT NULL,
  PRIMARY KEY (id_ejercicio_personalizado, id_equipo)
);


CREATE TABLE app_user.rutina (
  id BIGINT PRIMARY KEY NOT NULL,
  created_by_usuario UUID NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  id_categoria_rutina INT,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  CONSTRAINT nombre_valido_rutina CHECK (char_length(trim(nombre)) > 0)
);



CREATE TABLE app_user.rutina_ejercicio (
  id BIGINT PRIMARY KEY NOT NULL,
  id_rutina BIGINT NOT NULL,
  id_ejercicio_estandar BIGINT,
  id_ejercicio_personalizado BIGINT,
  orden INTEGER NOT NULL,
  series INTEGER NOT NULL,
  repeticiones INTEGER NOT NULL,
  peso_objetivo NUMERIC(10,2),
  nota_entrenador TEXT,
  link_apoyo TEXT,
  CONSTRAINT rutina_ejercicio_orden_check CHECK (orden > 0),
  CONSTRAINT rutina_ejercicio_series_check CHECK (series > 0),
  CONSTRAINT rutina_ejercicio_repeticiones_check CHECK (repeticiones > 0),
  CONSTRAINT rutina_ejercicio_peso_objetivo_check CHECK (peso_objetivo IS NULL OR peso_objetivo >= 0),
  CONSTRAINT rutina_ejercicio_xor_check CHECK (
    (id_ejercicio_estandar IS NOT NULL AND id_ejercicio_personalizado IS NULL)
    OR
    (id_ejercicio_estandar IS NULL AND id_ejercicio_personalizado IS NOT NULL)
  )
);


CREATE TABLE app_user.rutina_semana_dia (
  id BIGINT PRIMARY KEY NOT NULL,
  id_rutina BIGINT NOT NULL,
  id_dia_semana SMALLINT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  CONSTRAINT rutina_semana_dia_dia_valido_check CHECK (id_dia_semana BETWEEN 1 AND 7)
);
CREATE TABLE app_user.usuario_rutina_ejercicio_override (
  id BIGINT PRIMARY KEY NOT NULL,
  id_usuario_rutina BIGINT NOT NULL,
  id_rutina_ejercicio BIGINT NOT NULL,
  series INTEGER,
  repeticiones INTEGER,
  peso_objetivo NUMERIC(10,2),
  nota_entrenador TEXT,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  CONSTRAINT usuario_rutina_ejercicio_override_unique
    UNIQUE (id_usuario_rutina, id_rutina_ejercicio)
);


CREATE TABLE app_user.usuario_rutina (
  id BIGINT PRIMARY KEY NOT NULL,
  id_usuario UUID NOT NULL,
  id_rutina BIGINT NOT NULL,
  id_dia_semana SMALLINT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  activa BOOLEAN NOT NULL DEFAULT true,
  asignada_por_usuario UUID NOT NULL,
  motivo_cambio TEXT,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT alumno_rutina_dia_valido_check CHECK (id_dia_semana BETWEEN 1 AND 7)
);
CREATE TABLE app_user.sesion_entrenamiento (
  id BIGINT PRIMARY KEY NOT NULL,
  id_usuario UUID NOT NULL,
  id_usuario_rutina BIGINT,
  id_rutina BIGINT NOT NULL,
  fecha_sesion TIMESTAMP(0) NOT NULL,
  id_estado INT NOT NULL DEFAULT 2,
  notas_alumno TEXT,
  notas_entrenador TEXT,
  duracion_minutos INTEGER,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);


CREATE TABLE app_user.usuario_medicion (
  id BIGINT PRIMARY KEY NOT NULL,
  id_usuario UUID NOT NULL,
  fecha_medicion DATE NOT NULL,
  peso_kg NUMERIC(6,2),
  estatura_cm NUMERIC(5,2),
  grasa_corporal_pct NUMERIC(5,2),
  cintura_cm NUMERIC(5,2),
  cadera_cm NUMERIC(5,2),
  pecho_cm NUMERIC(5,2),
  brazo_cm NUMERIC(5,2),
  pierna_cm NUMERIC(5,2),
  nota TEXT,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW()
);


CREATE TABLE app_user.sesion_ejercicio (
  id BIGINT PRIMARY KEY NOT NULL,
  id_sesion_entrenamiento BIGINT NOT NULL,
  id_rutina_ejercicio BIGINT,
  id_ejercicio_estandar BIGINT,
  id_ejercicio_personalizado BIGINT,
  orden INTEGER NOT NULL,
  nota TEXT,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  CONSTRAINT sesion_ejercicio_xor_check CHECK (
    (id_ejercicio_estandar IS NOT NULL AND id_ejercicio_personalizado IS NULL)
    OR
    (id_ejercicio_estandar IS NULL AND id_ejercicio_personalizado IS NOT NULL)
  )
);


CREATE TABLE app_user.sesion_ejercicio_set (
  id BIGINT PRIMARY KEY NOT NULL,
  id_sesion_ejercicio BIGINT NOT NULL,
  numero_set INTEGER NOT NULL,
  repeticiones_objetivo INTEGER,
  peso_objetivo NUMERIC(10,2),
  repeticiones_realizadas INTEGER,
  peso_real NUMERIC(10,2),
  rir NUMERIC(4,2),
  rpe NUMERIC(4,2),
  descanso_segundos INTEGER,
  completado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  CONSTRAINT sesion_ejercicio_set_numero_set_check CHECK (numero_set > 0),
  CONSTRAINT sesion_ejercicio_set_reps_obj_check CHECK (repeticiones_objetivo IS NULL OR repeticiones_objetivo >= 0),
  CONSTRAINT sesion_ejercicio_set_reps_real_check CHECK (repeticiones_realizadas IS NULL OR repeticiones_realizadas >= 0),
  CONSTRAINT sesion_ejercicio_set_peso_obj_check CHECK (peso_objetivo IS NULL OR peso_objetivo >= 0),
  CONSTRAINT sesion_ejercicio_set_peso_real_check CHECK (peso_real IS NULL OR peso_real >= 0)
);


CREATE TABLE app_user.alumno_ejercicio_pr (
  id BIGINT PRIMARY KEY NOT NULL,
  id_usuario UUID NOT NULL,
  id_ejercicio_estandar BIGINT,
  id_ejercicio_personalizado BIGINT,
  peso NUMERIC(10,2) NOT NULL,
  repeticiones INTEGER NOT NULL,
  id_sesion_ejercicio_set BIGINT NOT NULL,
  fecha_pr TIMESTAMP(0) NOT NULL,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  CONSTRAINT alumno_ejercicio_pr_peso_check CHECK (peso >= 0),
  CONSTRAINT alumno_ejercicio_pr_repeticiones_check CHECK (repeticiones > 0),
  CONSTRAINT alumno_ejercicio_pr_sesion_set_check CHECK (id_sesion_ejercicio_set IS NOT NULL),
  CONSTRAINT alumno_ejercicio_pr_xor_check CHECK (
    (id_ejercicio_estandar IS NOT NULL AND id_ejercicio_personalizado IS NULL)
    OR
    (id_ejercicio_estandar IS NULL AND id_ejercicio_personalizado IS NOT NULL)
  )
);


CREATE TABLE app_user.alumno_entrenador_historial (
  id BIGINT PRIMARY KEY NOT NULL,
  id_usuario UUID NOT NULL,
  id_entrenador UUID NOT NULL,
  fecha_inicio TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  fecha_fin TIMESTAMP(0),
  activo BOOLEAN NOT NULL DEFAULT true,
  motivo_cambio TEXT,
  created_at TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  created_by UUID
);


-- ÍNDICES (ajustados solo en nombres de tablas/esquemas cuando aplica)
CREATE INDEX usuario_rutina_usuario_dia_idx
  ON app_user.usuario_rutina (id_usuario, id_dia_semana);

CREATE INDEX alumno_entrenador_historial_alumno_fecha_idx
  ON app_user.alumno_entrenador_historial (id_usuario, fecha_inicio);


-- FOREIGN KEYS (con esquemas)

ALTER TABLE app_user.usuario_rutina
  ADD CONSTRAINT usuario_rutina_id_usuario_foreign
  FOREIGN KEY (id_usuario) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.usuario_rutina
  ADD CONSTRAINT usuario_rutina_id_rutina_foreign
  FOREIGN KEY (id_rutina) REFERENCES app_user.rutina (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.usuario_rutina
  ADD CONSTRAINT usuario_rutina_id_dia_semana_foreign
  FOREIGN KEY (id_dia_semana) REFERENCES core.dia_semana (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.usuario_rutina
  ADD CONSTRAINT usuario_rutina_asignada_por_usuario_foreign
  FOREIGN KEY (asignada_por_usuario) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.usuario_rutina_ejercicio_override
  ADD CONSTRAINT usuario_rutina_ejercicio_override_id_usuario_rutina_foreign
  FOREIGN KEY (id_usuario_rutina)
  REFERENCES app_user.usuario_rutina (id)
  DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.usuario_rutina_ejercicio_override
  ADD CONSTRAINT usuario_rutina_ejercicio_override_id_rutina_ejercicio_foreign
  FOREIGN KEY (id_rutina_ejercicio)
  REFERENCES app_user.rutina_ejercicio (id)
  DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE app_user.usuario_rutina
  ADD CONSTRAINT usuario_rutina_created_by_foreign
  FOREIGN KEY (created_by) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.usuario_rutina
  ADD CONSTRAINT usuario_rutina_updated_by_foreign
  FOREIGN KEY (updated_by) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.usuario_medicion
  ADD CONSTRAINT usuario_medicion_id_usuario_foreign
  FOREIGN KEY (id_usuario) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.sesion_entrenamiento
  ADD CONSTRAINT sesion_entrenamiento_id_usuario_foreign
  FOREIGN KEY (id_usuario) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.sesion_entrenamiento
  ADD CONSTRAINT sesion_entrenamiento_id_usuario_rutina_foreign
  FOREIGN KEY (id_usuario_rutina) REFERENCES app_user.usuario_rutina (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.alumno_ejercicio_pr
  ADD CONSTRAINT alumno_ejercicio_pr_id_usuario_foreign
  FOREIGN KEY (id_usuario) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.alumno_entrenador_historial
  ADD CONSTRAINT alumno_entrenador_historial_id_usuario_foreign
  FOREIGN KEY (id_usuario) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.rutina
  ADD CONSTRAINT rutina_id_categoria_rutina_foreign
  FOREIGN KEY (id_categoria_rutina) REFERENCES core.categoria_rutina (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.rutina_semana_dia
  ADD CONSTRAINT rutina_semana_dia_id_dia_semana_foreign
  FOREIGN KEY (id_dia_semana) REFERENCES core.dia_semana (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE alumno.alumno
  ADD CONSTRAINT alumno_id_usuario_foreign
  FOREIGN KEY (id_usuario) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.alumno_ejercicio_pr
  ADD CONSTRAINT alumno_ejercicio_pr_id_ejercicio_estandar_foreign
  FOREIGN KEY (id_ejercicio_estandar) REFERENCES core.ejercicio_estandar (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.alumno_ejercicio_pr
  ADD CONSTRAINT alumno_ejercicio_pr_id_ejercicio_personalizado_foreign
  FOREIGN KEY (id_ejercicio_personalizado) REFERENCES app_user.ejercicio_personalizado (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.alumno_ejercicio_pr
  ADD CONSTRAINT alumno_ejercicio_pr_id_sesion_ejercicio_set_foreign
  FOREIGN KEY (id_sesion_ejercicio_set) REFERENCES app_user.sesion_ejercicio_set (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.entrenador
  ADD CONSTRAINT entrenador_id_tema_foreign
  FOREIGN KEY (id_tema) REFERENCES entrenador.entrenador_tema (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE ubi.entidad_federativa
  ADD CONSTRAINT entidad_federativa_id_pais_foreign
  FOREIGN KEY (id_pais) REFERENCES ubi.pais (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.entrenador_redes_sociales
  ADD CONSTRAINT entrenador_redes_sociales_id_entrenador_foreign
  FOREIGN KEY (id_entrenador) REFERENCES entrenador.entrenador (id_usuario) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.gimnasio
  ADD CONSTRAINT gimnasio_id_localidad_foreign
  FOREIGN KEY (id_localidad) REFERENCES ubi.localidad (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.entrenador
  ADD CONSTRAINT entrenador_id_usuario_foreign
  FOREIGN KEY (id_usuario) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE alumno.alumno
  ADD CONSTRAINT alumno_id_entrenador_actual_foreign
  FOREIGN KEY (id_entrenador_actual) REFERENCES entrenador.entrenador (id_usuario) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE alumno.alumno
  ADD CONSTRAINT alumno_created_by_foreign
  FOREIGN KEY (created_by) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE alumno.alumno
  ADD CONSTRAINT alumno_updated_by_foreign
  FOREIGN KEY (updated_by) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.sesion_entrenamiento
  ADD CONSTRAINT sesion_entrenamiento_id_rutina_foreign
  FOREIGN KEY (id_rutina) REFERENCES app_user.rutina (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.sesion_entrenamiento
  ADD CONSTRAINT sesion_entrenamiento_created_by_foreign
  FOREIGN KEY (created_by) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.sesion_entrenamiento
  ADD CONSTRAINT sesion_entrenamiento_updated_by_foreign
  FOREIGN KEY (updated_by) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.sesion_ejercicio
  ADD CONSTRAINT sesion_ejercicio_id_sesion_entrenamiento_foreign
  FOREIGN KEY (id_sesion_entrenamiento) REFERENCES app_user.sesion_entrenamiento (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.sesion_ejercicio
  ADD CONSTRAINT sesion_ejercicio_id_rutina_ejercicio_foreign
  FOREIGN KEY (id_rutina_ejercicio) REFERENCES app_user.rutina_ejercicio (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.sesion_ejercicio
  ADD CONSTRAINT sesion_ejercicio_id_ejercicio_estandar_foreign
  FOREIGN KEY (id_ejercicio_estandar) REFERENCES core.ejercicio_estandar (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.sesion_ejercicio
  ADD CONSTRAINT sesion_ejercicio_id_ejercicio_personalizado_foreign
  FOREIGN KEY (id_ejercicio_personalizado) REFERENCES app_user.ejercicio_personalizado (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.sesion_ejercicio_set
  ADD CONSTRAINT sesion_ejercicio_set_id_sesion_ejercicio_foreign
  FOREIGN KEY (id_sesion_ejercicio) REFERENCES app_user.sesion_ejercicio (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.alumno_entrenador_historial
  ADD CONSTRAINT alumno_entrenador_historial_id_entrenador_foreign
  FOREIGN KEY (id_entrenador) REFERENCES entrenador.entrenador (id_usuario) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.alumno_entrenador_historial
  ADD CONSTRAINT alumno_entrenador_historial_created_by_foreign
  FOREIGN KEY (created_by) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE alumno.alumno
  ADD CONSTRAINT alumno_id_estado_foreign
  FOREIGN KEY (id_estado) REFERENCES core.estado (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE ubi.localidad
  ADD CONSTRAINT localidad_id_municipio_foreign
  FOREIGN KEY (id_municipio) REFERENCES ubi.municipio (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.entrenador_redes_sociales
  ADD CONSTRAINT entrenador_redes_sociales_id_red_social_foreign
  FOREIGN KEY (id_red_social) REFERENCES core.redes_sociales (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.gimnasio
  ADD CONSTRAINT gimnasio_id_estado_foreign
  FOREIGN KEY (id_estado) REFERENCES core.estado (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE ubi.municipio
  ADD CONSTRAINT municipio_id_entidad_federativa_foreign
  FOREIGN KEY (id_entidad_federativa) REFERENCES ubi.entidad_federativa (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.entrenador_categorias
  ADD CONSTRAINT entrenador_categorias_id_categoria_foreign
  FOREIGN KEY (id_categoria) REFERENCES core.categorias (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.entrenador
  ADD CONSTRAINT entrenador_id_estado_foreign
  FOREIGN KEY (id_estado) REFERENCES core.estado (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.entrenador_gimnasio
  ADD CONSTRAINT entrenador_gimnasio_id_gimnasio_foreign
  FOREIGN KEY (id_gimnasio) REFERENCES entrenador.gimnasio (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.entrenador_gimnasio
  ADD CONSTRAINT entrenador_gimnasio_id_entrenador_foreign
  FOREIGN KEY (id_entrenador) REFERENCES entrenador.entrenador (id_usuario) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.entrenador
  ADD CONSTRAINT entrenador_id_localidad_foreign
  FOREIGN KEY (id_localidad) REFERENCES ubi.localidad (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.entrenador_categorias
  ADD CONSTRAINT entrenador_categorias_id_entrenador_foreign
  FOREIGN KEY (id_entrenador) REFERENCES entrenador.entrenador (id_usuario) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.entrenador_seccion
  ADD CONSTRAINT entrenador_seccion_id_entrenador_foreign
  FOREIGN KEY (id_entrenador) REFERENCES entrenador.entrenador (id_usuario) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.entrenador_seccion
  ADD CONSTRAINT entrenador_seccion_id_tipo_seccion_foreign
  FOREIGN KEY (id_tipo_seccion) REFERENCES core.tipo_seccion (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE core.ejercicio_estandar_musculo
  ADD CONSTRAINT ejercicio_estandar_musculo_id_ejercicio_estandar_foreign
  FOREIGN KEY (id_ejercicio_estandar) REFERENCES core.ejercicio_estandar (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE core.ejercicio_estandar_musculo
  ADD CONSTRAINT ejercicio_estandar_musculo_id_musculo_foreign
  FOREIGN KEY (id_musculo) REFERENCES core.musculo (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.ejercicio_personalizado_musculo
  ADD CONSTRAINT ejercicio_personalizado_musculo_id_ejercicio_personalizado_foreign
  FOREIGN KEY (id_ejercicio_personalizado) REFERENCES app_user.ejercicio_personalizado (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.ejercicio_personalizado_musculo
  ADD CONSTRAINT ejercicio_personalizado_musculo_id_musculo_foreign
  FOREIGN KEY (id_musculo) REFERENCES core.musculo (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE core.ejercicio_estandar_equipo
  ADD CONSTRAINT ejercicio_estandar_equipo_id_ejercicio_estandar_foreign
  FOREIGN KEY (id_ejercicio_estandar) REFERENCES core.ejercicio_estandar (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE core.ejercicio_estandar_equipo
  ADD CONSTRAINT ejercicio_estandar_equipo_id_equipo_foreign
  FOREIGN KEY (id_equipo) REFERENCES core.equipo (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.ejercicio_personalizado_equipo
  ADD CONSTRAINT ejercicio_personalizado_equipo_id_ejercicio_personalizado_foreign
  FOREIGN KEY (id_ejercicio_personalizado) REFERENCES app_user.ejercicio_personalizado (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.ejercicio_personalizado_equipo
  ADD CONSTRAINT ejercicio_personalizado_equipo_id_equipo_foreign
  FOREIGN KEY (id_equipo) REFERENCES core.equipo (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE entrenador.gimnasio
  ADD CONSTRAINT gimnasio_created_by_usuario_foreign
  FOREIGN KEY (created_by_usuario) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.ejercicio_personalizado
  ADD CONSTRAINT ejercicio_personalizado_created_by_usuario_foreign
  FOREIGN KEY (created_by_usuario) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.rutina
  ADD CONSTRAINT rutina_created_by_usuario_foreign
  FOREIGN KEY (created_by_usuario) REFERENCES app_user.usuario (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.rutina_ejercicio
  ADD CONSTRAINT rutina_ejercicio_id_rutina_foreign
  FOREIGN KEY (id_rutina) REFERENCES app_user.rutina (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.rutina_ejercicio
  ADD CONSTRAINT rutina_ejercicio_id_ejercicio_estandar_foreign
  FOREIGN KEY (id_ejercicio_estandar) REFERENCES core.ejercicio_estandar (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.rutina_ejercicio
  ADD CONSTRAINT rutina_ejercicio_id_ejercicio_personalizado_foreign
  FOREIGN KEY (id_ejercicio_personalizado) REFERENCES app_user.ejercicio_personalizado (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.rutina_semana_dia
  ADD CONSTRAINT rutina_semana_dia_id_rutina_foreign
  FOREIGN KEY (id_rutina) REFERENCES app_user.rutina (id) DEFERRABLE INITIALLY IMMEDIATE;


ALTER TABLE app_user.sesion_entrenamiento
  ADD CONSTRAINT sesion_entrenamiento_id_estado_foreign
  FOREIGN KEY (id_estado) REFERENCES core.estado (id) DEFERRABLE INITIALLY IMMEDIATE;

  ALTER TABLE entrenador.entrenador_redes_sociales
  ADD CONSTRAINT entrenador_redes_sociales_entrenador_red_unique
  UNIQUE (id_entrenador, id_red_social);

ALTER TABLE entrenador.entrenador_seccion
  ADD CONSTRAINT entrenador_seccion_entrenador_orden_unique
  UNIQUE (id_entrenador, orden);

ALTER TABLE entrenador.entrenador_seccion
  ADD CONSTRAINT entrenador_seccion_entrenador_tipo_seccion_unique
  UNIQUE (id_entrenador, id_tipo_seccion);

ALTER TABLE app_user.usuario_rutina_ejercicio_override
  ADD CONSTRAINT usuario_rutina_ejercicio_override_usuario_rutina_ejercicio_unique
  UNIQUE (id_usuario_rutina, id_rutina_ejercicio);

ALTER TABLE app_user.ejercicio_personalizado
  ADD CONSTRAINT ejercicio_personalizado_nombre_usuario_unique
  UNIQUE (created_by_usuario, nombre);

ALTER TABLE app_user.rutina
  ADD CONSTRAINT rutina_nombre_usuario_unique
  UNIQUE (created_by_usuario, nombre);

ALTER TABLE app_user.rutina_semana_dia
  ADD CONSTRAINT rutina_semana_dia_rutina_dia_unique
  UNIQUE (id_rutina, id_dia_semana);

ALTER TABLE app_user.usuario_rutina
  ADD CONSTRAINT usuario_rutina_unique_asignacion
  UNIQUE (id_usuario, id_rutina, id_dia_semana, fecha_inicio);

ALTER TABLE app_user.usuario_medicion
  ADD CONSTRAINT usuario_medicion_usuario_fecha_unique
  UNIQUE (id_usuario, fecha_medicion);

ALTER TABLE app_user.sesion_ejercicio_set
  ADD CONSTRAINT sesion_ejercicio_set_unique_numero
  UNIQUE (id_sesion_ejercicio, numero_set);

ALTER TABLE app_user.alumno_ejercicio_pr
  ADD CONSTRAINT alumno_pr_estandar_peso_unique
  UNIQUE (id_usuario, id_ejercicio_estandar, peso);

ALTER TABLE app_user.alumno_ejercicio_pr
  ADD CONSTRAINT alumno_pr_personalizado_peso_unique
  UNIQUE (id_usuario, id_ejercicio_personalizado, peso);