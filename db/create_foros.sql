-- Tablas: foros_temas, foros_respuestas
-- Requiere: cursos, usuarios

CREATE TABLE IF NOT EXISTS foros_temas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  curso_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  mensaje LONGTEXT NOT NULL,
  estado ENUM('activo', 'cerrado', 'oculto') NOT NULL DEFAULT 'activo',
  fijado TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_foros_temas_curso FOREIGN KEY (curso_id) REFERENCES cursos(id),
  CONSTRAINT fk_foros_temas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS foros_respuestas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tema_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  mensaje LONGTEXT NOT NULL,
  estado ENUM('activo', 'oculto') NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_foros_respuestas_tema FOREIGN KEY (tema_id) REFERENCES foros_temas(id),
  CONSTRAINT fk_foros_respuestas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_foros_temas_curso ON foros_temas(curso_id);
CREATE INDEX idx_foros_temas_curso_estado ON foros_temas(curso_id, estado, fijado);
CREATE INDEX idx_foros_respuestas_tema ON foros_respuestas(tema_id);

