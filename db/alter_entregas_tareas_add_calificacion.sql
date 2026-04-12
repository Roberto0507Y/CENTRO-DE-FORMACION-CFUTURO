-- (Opcional) Campos necesarios para que admin/docente califiquen entregas.
-- En el esquema base ya existen; ejecuta solo si tu tabla entregas_tareas no los tiene.
ALTER TABLE entregas_tareas
  ADD COLUMN calificacion DECIMAL(5,2) NULL AFTER estado,
  ADD COLUMN comentario_docente TEXT NULL AFTER calificacion,
  ADD COLUMN fecha_calificacion DATETIME NULL AFTER comentario_docente;
