-- Drop the redundant duplicate unique constraint on usuario_rutina_ejercicio_override
-- The constraint `usuario_rutina_ejercicio_override_unique` already enforces uniqueness
-- on the same columns, so `usuario_rutina_ejercicio_override_usuario_rutina_ejercicio_uniq` is removed.
ALTER TABLE "app_user"."usuario_rutina_ejercicio_override"
DROP CONSTRAINT IF EXISTS "usuario_rutina_ejercicio_override_usuario_rutina_ejercicio_uniq";
