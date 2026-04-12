CREATE TABLE IF NOT EXISTS archivos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  s3_key VARCHAR(700) NOT NULL,
  nombre_original VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150) NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT UNSIGNED NULL,
  owner_usuario_id INT UNSIGNED NULL,
  curso_id INT UNSIGNED NULL,
  access_scope ENUM('owner', 'course', 'course_manage', 'authenticated', 'admin') NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_archivos_s3_key (s3_key),
  INDEX idx_archivos_owner_usuario_id (owner_usuario_id),
  INDEX idx_archivos_curso_id (curso_id),
  CONSTRAINT fk_archivos_owner_usuario
    FOREIGN KEY (owner_usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_archivos_curso
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
);
