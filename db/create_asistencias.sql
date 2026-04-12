CREATE TABLE asistencias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  curso_id INT UNSIGNED NOT NULL,
  estudiante_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  estado ENUM('presente','ausente','tarde','justificado') NOT NULL DEFAULT 'ausente',
  comentario VARCHAR(255) NULL,
  registrado_por INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_asistencias UNIQUE (curso_id, estudiante_id, fecha),
  CONSTRAINT fk_asistencias_curso FOREIGN KEY (curso_id) REFERENCES cursos(id),
  CONSTRAINT fk_asistencias_estudiante FOREIGN KEY (estudiante_id) REFERENCES usuarios(id),
  CONSTRAINT fk_asistencias_registrado_por FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
);

