-- Tabla: materiales
-- Requiere tablas: cursos, modulos

CREATE TABLE IF NOT EXISTS materiales (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  curso_id INT UNSIGNED NOT NULL,
  modulo_id INT UNSIGNED NULL,
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  tipo ENUM('archivo', 'video', 'enlace', 'pdf', 'imagen') NOT NULL DEFAULT 'archivo',
  archivo_url VARCHAR(255) NULL,
  enlace_url VARCHAR(500) NULL,
  orden INT NOT NULL DEFAULT 1,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_materiales_curso FOREIGN KEY (curso_id) REFERENCES cursos(id),
  CONSTRAINT fk_materiales_modulo FOREIGN KEY (modulo_id) REFERENCES modulos(id)
);

CREATE INDEX idx_materiales_curso ON materiales(curso_id);
CREATE INDEX idx_materiales_curso_modulo ON materiales(curso_id, modulo_id);

