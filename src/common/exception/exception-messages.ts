export class ExceptionMessages {
  static readonly dictionary: Record<string, string> = {
    APELLIDO_PATERNO_VACIO: 'El apellido paterno no puede estar vacío',
    APELLIDO_MATERNO_VACIO: 'El apellido materno no puede estar vacío',
    NOMBRE_VACIO: 'El nombre no puede estar vacío',
    CORREO_VACIO: 'El correo no puede estar vacío',
    CONTRASENA_VACIA: 'La contraseña no puede estar vacía',
    FECHA_NACIMIENTO_VACIA: 'La fecha de nacimiento no puede estar vacía',
    CORREO_INVALIDO: 'El correo es inválido',
    CONTRASENA_DEBIL:
      'La contraseña es débil, debe tener al menos 8 caracteres, incluyendo una letra mayúscula, una letra minúscula y un número',
    NOMBRE_DEBIL: 'El nombre es demasiado corto, debe tener al menos 2 caracteres',
    APELLIDO_PATERNO_DEBIL:
      'El apellido paterno es demasiado corto, debe tener al menos 2 caracteres',
    APELLIDO_MATERNO_DEBIL:
      'El apellido materno es demasiado corto, debe tener al menos 2 caracteres',
    CORREO_LARGO: 'El correo es demasiado largo, debe tener como máximo 60 caracteres',
    CONTRASENA_LARGA: 'La contraseña es demasiado larga, debe tener como máximo 60 caracteres',
    NOMBRE_LARGO: 'El nombre es demasiado largo, debe tener como máximo 20 caracteres',
    APELLIDO_PATERNO_LARGO:
      'El apellido paterno es demasiado largo, debe tener como máximo 20 caracteres',
    APELLIDO_MATERNO_LARGO:
      'El apellido materno es demasiado largo, debe tener como máximo 20 caracteres',
    FECHA_NACIMIENTO_LARGA:
      'La fecha de nacimiento es demasiado larga, debe tener como máximo 10 caracteres',
  };
}
