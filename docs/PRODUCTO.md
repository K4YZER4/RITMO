# RITMO como producto

RITMO es una plataforma web de entrenamiento que conecta a entrenadores con alumnos. El proyecto está diseñado como una demostración full-stack de portafolio, no como un servicio comercial activo.

## Flujo principal

1. Un entrenador crea una rutina y configura sus ejercicios.
2. El alumno comparte un token temporal para vincularse.
3. El entrenador asigna la rutina por día y rango de fechas.
4. El alumno inicia la sesión desde su teléfono y registra cada set.
5. RITMO calcula volumen y récords personales.
6. El entrenador consulta la actividad y las mediciones del alumno.

## Usuarios

- **Entrenador:** administra alumnos, rutinas, ejercicios y progreso.
- **Alumno:** consulta su semana, realiza entrenamientos y registra mediciones.

## Alcance de la demo

- Autenticación JWT y revocación de sesiones.
- Vinculación segura alumno-entrenador.
- Rutinas, asignaciones y biblioteca de ejercicios.
- Sesiones, sets, PR, volumen y mediciones.
- Suscripciones y Stripe en modo de prueba.
- PWA responsive para escritorio, Android y iPhone.

No incluye una app nativa, HealthKit, Apple Watch, recuperación por correo ni un panel administrativo.
