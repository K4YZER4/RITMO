  -- RenameForeignKey
  ALTER TABLE "app_user"."ejercicio_personalizado_equipo" RENAME CONSTRAINT "ejercicio_personalizado_equipo_id_ejercicio_personalizado_forei" TO "ej_per_eq_id_ej_per_fkey";

  -- RenameForeignKey
  ALTER TABLE "app_user"."ejercicio_personalizado_equipo" RENAME CONSTRAINT "ejercicio_personalizado_equipo_id_equipo_foreign" TO "ej_per_eq_id_equipo_fkey";

  -- RenameForeignKey
  ALTER TABLE "app_user"."ejercicio_personalizado_musculo" RENAME CONSTRAINT "ejercicio_personalizado_musculo_id_ejercicio_personalizado_fore" TO "ej_per_mus_id_ej_per_fkey";

  -- RenameForeignKey
  ALTER TABLE "app_user"."ejercicio_personalizado_musculo" RENAME CONSTRAINT "ejercicio_personalizado_musculo_id_musculo_foreign" TO "ej_per_mus_id_musculo_fkey";

  -- RenameForeignKey
  ALTER TABLE "app_user"."usuario_rutina_ejercicio_override" RENAME CONSTRAINT "usuario_rutina_ejercicio_override_id_rutina_ejercicio_foreign" TO "usr_rut_ej_ovr_id_rut_ej_fkey";

  -- RenameForeignKey
  ALTER TABLE "app_user"."usuario_rutina_ejercicio_override" RENAME CONSTRAINT "usuario_rutina_ejercicio_override_id_usuario_rutina_foreign" TO "usr_rut_ej_ovr_id_usr_rut_fkey";
