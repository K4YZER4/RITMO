import { validationMessage } from '../validation-message';

export const AUTH_VALIDATION_ERRORS = {
  REQUIRED_EMAIL: validationMessage('REQUIRED_EMAIL', 'El correo es obligatorio.'),
  INVALID_EMAIL: validationMessage('INVALID_EMAIL', 'El correo no tiene un formato válido.'),
  EMAIL_TOO_SHORT: validationMessage(
    'EMAIL_TOO_SHORT',
    'El correo debe tener al menos 5 caracteres.',
  ),
  EMAIL_TOO_LONG: validationMessage(
    'EMAIL_TOO_LONG',
    'El correo no puede exceder los 60 caracteres.',
  ),

  REQUIRED_PASSWORD: validationMessage('REQUIRED_PASSWORD', 'La contraseña es obligatoria.'),
  INVALID_PASSWORD_TYPE: validationMessage(
    'INVALID_PASSWORD_TYPE',
    'La contraseña debe ser texto.',
  ),
  PASSWORD_TOO_SHORT: validationMessage(
    'PASSWORD_TOO_SHORT',
    'La contraseña debe tener al menos 8 caracteres.',
  ),
  PASSWORD_TOO_LONG: validationMessage(
    'PASSWORD_TOO_LONG',
    'La contraseña no puede exceder los 60 caracteres.',
  ),

  REQUIRED_NAME: validationMessage('REQUIRED_NAME', 'El nombre es obligatorio.'),
  INVALID_NAME: validationMessage('INVALID_NAME', 'El nombre debe ser texto.'),
  NAME_TOO_SHORT: validationMessage(
    'NAME_TOO_SHORT',
    'El nombre debe tener al menos 2 caracteres.',
  ),
  NAME_TOO_LONG: validationMessage(
    'NAME_TOO_LONG',
    'El nombre no puede exceder los 20 caracteres.',
  ),

  REQUIRED_SEX: validationMessage('REQUIRED_SEX', 'El sexo es obligatorio.'),
  INVALID_SEX: validationMessage('INVALID_SEX', 'El sexo debe ser texto.'),
  SEX_TOO_SHORT: validationMessage('SEX_TOO_SHORT', 'El sexo debe tener al menos 2 caracteres.'),
  SEX_TOO_LONG: validationMessage('SEX_TOO_LONG', 'El sexo no puede exceder los 20 caracteres.'),

  REQUIRED_LAST_NAME: validationMessage(
    'REQUIRED_LAST_NAME',
    'El apellido paterno es obligatorio.',
  ),
  INVALID_LAST_NAME: validationMessage('INVALID_LAST_NAME', 'El apellido paterno debe ser texto.'),
  LAST_NAME_TOO_SHORT: validationMessage(
    'LAST_NAME_TOO_SHORT',
    'El apellido paterno debe tener al menos 2 caracteres.',
  ),
  LAST_NAME_TOO_LONG: validationMessage(
    'LAST_NAME_TOO_LONG',
    'El apellido paterno no puede exceder los 20 caracteres.',
  ),

  REQUIRED_MOTHER_LAST_NAME: validationMessage(
    'REQUIRED_MOTHER_LAST_NAME',
    'El apellido materno es obligatorio.',
  ),
  INVALID_MOTHER_LAST_NAME: validationMessage(
    'INVALID_MOTHER_LAST_NAME',
    'El apellido materno debe ser texto.',
  ),
  MOTHER_LAST_NAME_TOO_SHORT: validationMessage(
    'MOTHER_LAST_NAME_TOO_SHORT',
    'El apellido materno debe tener al menos 2 caracteres.',
  ),
  MOTHER_LAST_NAME_TOO_LONG: validationMessage(
    'MOTHER_LAST_NAME_TOO_LONG',
    'El apellido materno no puede exceder los 20 caracteres.',
  ),

  REQUIRED_BIRTH_DATE: validationMessage(
    'REQUIRED_BIRTH_DATE',
    'La fecha de nacimiento es obligatoria.',
  ),
  INVALID_BIRTH_DATE_TYPE: validationMessage(
    'INVALID_BIRTH_DATE_TYPE',
    'La fecha de nacimiento debe ser texto.',
  ),
  INVALID_BIRTH_DATE: validationMessage(
    'INVALID_BIRTH_DATE',
    'La fecha de nacimiento debe tener un formato válido.',
  ),

  REQUIRED_PUBLIC_NAME: validationMessage(
    'REQUIRED_PUBLIC_NAME',
    'El nombre público es obligatorio.',
  ),
  INVALID_PUBLIC_NAME: validationMessage(
    'INVALID_PUBLIC_NAME',
    'El nombre público debe ser texto.',
  ),
  PUBLIC_NAME_TOO_SHORT: validationMessage(
    'PUBLIC_NAME_TOO_SHORT',
    'El nombre público debe tener al menos 2 caracteres.',
  ),
  PUBLIC_NAME_TOO_LONG: validationMessage(
    'PUBLIC_NAME_TOO_LONG',
    'El nombre público no puede exceder los 50 caracteres.',
  ),

  REQUIRED_TRAINER_ID: validationMessage(
    'REQUIRED_TRAINER_ID',
    'El id del entrenador es obligatorio.',
  ),
  INVALID_TRAINER_ID: validationMessage(
    'INVALID_TRAINER_ID',
    'El id del entrenador debe ser un UUID válido.',
  ),

  REQUIRED_PHONE: validationMessage('REQUIRED_PHONE', 'El número celular es obligatorio.'),
  INVALID_PHONE: validationMessage('INVALID_PHONE', 'El número celular debe ser numérico.'),

  REQUIRED_TRAINING_START_DATE: validationMessage(
    'REQUIRED_TRAINING_START_DATE',
    'La fecha de inicio del entrenamiento es obligatoria.',
  ),
  INVALID_TRAINING_START_DATE_TYPE: validationMessage(
    'INVALID_TRAINING_START_DATE_TYPE',
    'La fecha de inicio del entrenamiento debe ser texto.',
  ),
  INVALID_TRAINING_START_DATE: validationMessage(
    'INVALID_TRAINING_START_DATE',
    'La fecha de inicio del entrenamiento debe tener un formato válido.',
  ),

  REQUIRED_GOAL: validationMessage('REQUIRED_GOAL', 'El objetivo es obligatorio.'),
  INVALID_GOAL: validationMessage('INVALID_GOAL', 'El objetivo debe ser texto.'),

  REQUIRED_ACTIVITY_LEVEL: validationMessage(
    'REQUIRED_ACTIVITY_LEVEL',
    'El nivel de actividad es obligatorio.',
  ),
  INVALID_ACTIVITY_LEVEL: validationMessage(
    'INVALID_ACTIVITY_LEVEL',
    'El nivel de actividad debe ser texto.',
  ),

  REQUIRED_MEDICAL_NOTES: validationMessage(
    'REQUIRED_MEDICAL_NOTES',
    'Las observaciones médicas son obligatorias.',
  ),
  INVALID_MEDICAL_NOTES: validationMessage(
    'INVALID_MEDICAL_NOTES',
    'Las observaciones médicas deben ser texto.',
  ),

  REQUIRED_CURRENT_INJURIES: validationMessage(
    'REQUIRED_CURRENT_INJURIES',
    'Las lesiones actuales son obligatorias.',
  ),
  INVALID_CURRENT_INJURIES: validationMessage(
    'INVALID_CURRENT_INJURIES',
    'Las lesiones actuales deben ser texto.',
  ),

  REQUIRED_PAST_INJURIES: validationMessage(
    'REQUIRED_PAST_INJURIES',
    'Las lesiones pasadas son obligatorias.',
  ),
  INVALID_PAST_INJURIES: validationMessage(
    'INVALID_PAST_INJURIES',
    'Las lesiones pasadas deben ser texto.',
  ),

  REQUIRED_EMERGENCY_CONTACT_NAME: validationMessage(
    'REQUIRED_EMERGENCY_CONTACT_NAME',
    'El nombre del contacto de emergencia es obligatorio.',
  ),
  INVALID_EMERGENCY_CONTACT_NAME: validationMessage(
    'INVALID_EMERGENCY_CONTACT_NAME',
    'El nombre del contacto de emergencia debe ser texto.',
  ),

  REQUIRED_EMERGENCY_CONTACT_PHONE: validationMessage(
    'REQUIRED_EMERGENCY_CONTACT_PHONE',
    'El teléfono del contacto de emergencia es obligatorio.',
  ),
  INVALID_EMERGENCY_CONTACT_PHONE: validationMessage(
    'INVALID_EMERGENCY_CONTACT_PHONE',
    'El teléfono del contacto de emergencia debe ser texto.',
  ),

  REQUIRED_TRAINER_DATE: validationMessage(
    'REQUIRED_TRAINER_DATE',
    'La fecha de inicio como entrenador es obligatoria.',
  ),
  INVALID_TRAINER_DATE_TYPE: validationMessage(
    'INVALID_TRAINER_DATE_TYPE',
    'La fecha de inicio como entrenador debe ser texto.',
  ),
  INVALID_TRAINER_DATE: validationMessage(
    'INVALID_TRAINER_DATE',
    'La fecha de inicio como entrenador debe tener un formato válido.',
  ),
} as const;
