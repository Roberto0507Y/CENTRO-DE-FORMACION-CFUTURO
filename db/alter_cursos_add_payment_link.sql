-- Agrega enlace de pago externo por curso (pago manual por comprobante)
-- Ejecuta una sola vez:
ALTER TABLE cursos
  ADD COLUMN payment_link VARCHAR(500) NULL AFTER video_intro_url;

