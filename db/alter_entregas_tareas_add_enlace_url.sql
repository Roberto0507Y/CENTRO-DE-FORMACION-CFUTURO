-- (Opcional recomendado) Agrega enlace externo a entregas de tareas
ALTER TABLE entregas_tareas
  ADD COLUMN enlace_url VARCHAR(500) NULL AFTER archivo_url;

