-- Agrega enlace externo (YouTube/Vimeo/URL) a tareas
ALTER TABLE tareas
  ADD COLUMN enlace_url VARCHAR(500) NULL AFTER archivo_url;
