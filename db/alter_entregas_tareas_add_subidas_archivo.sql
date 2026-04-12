-- Cuenta subidas reales de archivos a S3 por estudiante y tarea.
ALTER TABLE entregas_tareas
  ADD COLUMN subidas_archivo INT UNSIGNED NOT NULL DEFAULT 0 AFTER archivo_url;

-- Si ya existían entregas con archivo antes de este cambio, cuentan como 1 subida.
UPDATE entregas_tareas
SET subidas_archivo = 1
WHERE archivo_url IS NOT NULL
  AND archivo_url <> ''
  AND subidas_archivo = 0;
