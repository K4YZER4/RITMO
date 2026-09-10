/*
  Warnings:

  - The `estado` column on the `evento_webhook` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "app_user"."EstadoEventoWebhookEnum" AS ENUM ('recibido', 'procesando', 'procesado', 'fallido');

-- AlterTable
ALTER TABLE "alumno"."alumno" ADD COLUMN     "proveedor_customer_id" VARCHAR(255),
ADD COLUMN     "prueba_utilizada" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "app_user"."evento_webhook" DROP COLUMN "estado",
ADD COLUMN     "estado" "app_user"."EstadoEventoWebhookEnum" NOT NULL DEFAULT 'recibido';

-- AlterTable
ALTER TABLE "app_user"."plan_alumno" ADD COLUMN     "periodo_prueba" SMALLINT DEFAULT 0,
ADD COLUMN     "unidad_periodo_prueba" "app_user"."unidad_periodo_enum";

-- AlterTable
ALTER TABLE "app_user"."plan_entrenador" ADD COLUMN     "periodo_prueba" SMALLINT DEFAULT 0,
ADD COLUMN     "unidad_periodo_prueba" "app_user"."unidad_periodo_enum";

-- AlterTable
ALTER TABLE "entrenador"."entrenador" ADD COLUMN     "proveedor_customer_id" VARCHAR(255),
ADD COLUMN     "prueba_utilizada" BOOLEAN DEFAULT false;

-- DropEnum
DROP TYPE "app_user"."estado_evento_webhook_enum";

-- CreateIndex
CREATE INDEX "evento_webhook_estado_recibido_idx" ON "app_user"."evento_webhook"("estado", "recibido_en");

-- RenameForeignKey
ALTER TABLE "alumno"."alumno" RENAME CONSTRAINT "alumno_id_nivel_actividad_foreign" TO "alumno_id_NivelActividad_foreign";

-- RenameForeignKey
ALTER TABLE "app_user"."suscripcion" RENAME CONSTRAINT "suscripcion_plan_alumno_pendiente_id_foreign" TO "suscripcion_planAlumnoPendienteId_foreign";

-- RenameForeignKey
ALTER TABLE "app_user"."suscripcion" RENAME CONSTRAINT "suscripcion_plan_entrenador_pendiente_id_foreign" TO "suscripcion_planEntrenadorPendienteId_foreign";

-- CheckConstraints
-- Un plan vitalicio solo puede ser gratuito (el plan basico del alumno).
ALTER TABLE "app_user"."plan_alumno" ADD CONSTRAINT "chk_plan_alumno_vitalicio_solo_gratuito" CHECK (es_vitalicio = false OR es_gratuito = true);

-- Un plan vitalicio solo puede ser gratuito (el plan basico del entrenador).
ALTER TABLE "app_user"."plan_entrenador" ADD CONSTRAINT "chk_plan_entrenador_vitalicio_solo_gratuito" CHECK (es_vitalicio = false OR es_gratuito = true);

-- Una prueba gratuita solo existe en planes de pago (no en planes gratuitos).
ALTER TABLE "app_user"."plan_alumno" ADD CONSTRAINT "chk_plan_alumno_prueba_requiere_pago" CHECK (periodo_prueba IS NULL OR periodo_prueba <= 0 OR es_gratuito = false);

-- Una prueba gratuita solo existe en planes de pago (no en planes gratuitos).
ALTER TABLE "app_user"."plan_entrenador" ADD CONSTRAINT "chk_plan_entrenador_prueba_requiere_pago" CHECK (periodo_prueba IS NULL OR periodo_prueba <= 0 OR es_gratuito = false);

-- Un plan vitalicio no tiene prueba.
ALTER TABLE "app_user"."plan_alumno" ADD CONSTRAINT "chk_plan_alumno_vitalicio_sin_prueba" CHECK (es_vitalicio = false OR periodo_prueba IS NULL OR periodo_prueba <= 0);

-- Un plan vitalicio no tiene prueba.
ALTER TABLE "app_user"."plan_entrenador" ADD CONSTRAINT "chk_plan_entrenador_vitalicio_sin_prueba" CHECK (es_vitalicio = false OR periodo_prueba IS NULL OR periodo_prueba <= 0);

-- Datos de negocio: el plan intermedio del alumno (id 2) ofrece 1 semana de prueba
-- antes del primer cobro recurrente. Los demas planes son de cobro directo.
UPDATE "app_user"."plan_alumno" SET
  periodo_prueba = 1,
  unidad_periodo_prueba = 'semana'
WHERE id = 2 AND es_gratuito = false;
