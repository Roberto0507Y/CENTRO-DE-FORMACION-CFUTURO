-- Schema completo de C.FUTURO
-- Generado desde la base local actual. No incluye datos y no borra tablas existentes.
CREATE DATABASE IF NOT EXISTS `cfuturo` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `cfuturo`;

-- usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `correo` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `foto_url` varchar(255) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `rol` enum('admin','docente','estudiante') NOT NULL DEFAULT 'estudiante',
  `estado` enum('activo','inactivo','suspendido') NOT NULL DEFAULT 'activo',
  `ultimo_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- categorias
CREATE TABLE IF NOT EXISTS `categorias` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `imagen_url` varchar(255) DEFAULT NULL,
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- cursos
CREATE TABLE IF NOT EXISTS `cursos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `categoria_id` int unsigned NOT NULL,
  `docente_id` int unsigned NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `slug` varchar(180) NOT NULL,
  `descripcion_corta` varchar(255) DEFAULT NULL,
  `descripcion` text,
  `imagen_url` varchar(255) DEFAULT NULL,
  `video_intro_url` varchar(255) DEFAULT NULL,
  `payment_link` varchar(500) DEFAULT NULL,
  `tipo_acceso` enum('gratis','pago') NOT NULL DEFAULT 'gratis',
  `precio` decimal(10,2) NOT NULL DEFAULT '0.00',
  `nivel` enum('basico','intermedio','avanzado') NOT NULL DEFAULT 'basico',
  `estado` enum('borrador','publicado','oculto') NOT NULL DEFAULT 'borrador',
  `duracion_horas` decimal(5,2) DEFAULT NULL,
  `requisitos` text,
  `objetivos` text,
  `fecha_publicacion` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `fk_cursos_categoria` (`categoria_id`),
  KEY `fk_cursos_docente` (`docente_id`),
  CONSTRAINT `fk_cursos_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`),
  CONSTRAINT `fk_cursos_docente` FOREIGN KEY (`docente_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- pricing_settings
CREATE TABLE IF NOT EXISTS `pricing_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL DEFAULT 'default',
  `precio` decimal(10,2) NOT NULL DEFAULT '0.00',
  `payment_link` varchar(500) NOT NULL,
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- inscripciones
CREATE TABLE IF NOT EXISTS `inscripciones` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned NOT NULL,
  `curso_id` int unsigned NOT NULL,
  `tipo_inscripcion` enum('gratis','pagada') NOT NULL DEFAULT 'gratis',
  `estado` enum('activa','pendiente','cancelada','finalizada') NOT NULL DEFAULT 'activa',
  `progreso` decimal(5,2) NOT NULL DEFAULT '0.00',
  `fecha_inscripcion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_finalizacion` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inscripcion_usuario_curso` (`usuario_id`,`curso_id`),
  KEY `fk_inscripciones_curso` (`curso_id`),
  CONSTRAINT `fk_inscripciones_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`),
  CONSTRAINT `fk_inscripciones_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- modulos
CREATE TABLE IF NOT EXISTS `modulos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `curso_id` int unsigned NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `orden` int NOT NULL DEFAULT '1',
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_modulos_curso` (`curso_id`),
  CONSTRAINT `fk_modulos_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- lecciones
CREATE TABLE IF NOT EXISTS `lecciones` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `modulo_id` int unsigned NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `tipo` enum('video','pdf','texto','enlace') NOT NULL DEFAULT 'texto',
  `contenido` longtext,
  `video_url` varchar(255) DEFAULT NULL,
  `archivo_url` varchar(255) DEFAULT NULL,
  `enlace_url` varchar(255) DEFAULT NULL,
  `duracion_minutos` int unsigned DEFAULT NULL,
  `orden` int NOT NULL DEFAULT '1',
  `es_preview` tinyint(1) NOT NULL DEFAULT '0',
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_lecciones_modulo` (`modulo_id`),
  CONSTRAINT `fk_lecciones_modulo` FOREIGN KEY (`modulo_id`) REFERENCES `modulos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- progreso_lecciones
CREATE TABLE IF NOT EXISTS `progreso_lecciones` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned NOT NULL,
  `leccion_id` int unsigned NOT NULL,
  `completado` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_completado` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_progreso_usuario_leccion` (`usuario_id`,`leccion_id`),
  KEY `fk_progreso_leccion` (`leccion_id`),
  CONSTRAINT `fk_progreso_leccion` FOREIGN KEY (`leccion_id`) REFERENCES `lecciones` (`id`),
  CONSTRAINT `fk_progreso_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- tareas
CREATE TABLE IF NOT EXISTS `tareas` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `curso_id` int unsigned NOT NULL,
  `modulo_id` int unsigned DEFAULT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text,
  `instrucciones` longtext,
  `archivo_url` varchar(255) DEFAULT NULL,
  `puntos` decimal(5,2) NOT NULL DEFAULT '100.00',
  `fecha_apertura` datetime DEFAULT NULL,
  `fecha_entrega` datetime NOT NULL,
  `fecha_cierre` datetime DEFAULT NULL,
  `permite_entrega_tardia` tinyint(1) NOT NULL DEFAULT '0',
  `estado` enum('borrador','publicada','cerrada') NOT NULL DEFAULT 'borrador',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_tareas_curso` (`curso_id`),
  KEY `fk_tareas_modulo` (`modulo_id`),
  CONSTRAINT `fk_tareas_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`),
  CONSTRAINT `fk_tareas_modulo` FOREIGN KEY (`modulo_id`) REFERENCES `modulos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- entregas_tareas
CREATE TABLE IF NOT EXISTS `entregas_tareas` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tarea_id` int unsigned NOT NULL,
  `estudiante_id` int unsigned NOT NULL,
  `archivo_url` varchar(255) DEFAULT NULL,
  `subidas_archivo` int unsigned NOT NULL DEFAULT '0',
  `enlace_url` varchar(500) DEFAULT NULL,
  `comentario_estudiante` text,
  `fecha_entrega` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('entregada','revisada','devuelta','atrasada','no_entregada') NOT NULL DEFAULT 'entregada',
  `calificacion` decimal(5,2) DEFAULT NULL,
  `comentario_docente` text,
  `fecha_calificacion` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_entrega_tarea_estudiante` (`tarea_id`,`estudiante_id`),
  KEY `fk_entregas_estudiante` (`estudiante_id`),
  CONSTRAINT `fk_entregas_estudiante` FOREIGN KEY (`estudiante_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_entregas_tarea` FOREIGN KEY (`tarea_id`) REFERENCES `tareas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- quizzes
CREATE TABLE IF NOT EXISTS `quizzes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `curso_id` int unsigned NOT NULL,
  `modulo_id` int unsigned DEFAULT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text,
  `instrucciones` longtext,
  `puntaje_total` decimal(6,2) NOT NULL DEFAULT '100.00',
  `tiempo_limite_minutos` int unsigned DEFAULT NULL,
  `intentos_permitidos` int unsigned NOT NULL DEFAULT '1',
  `fecha_apertura` datetime DEFAULT NULL,
  `fecha_cierre` datetime DEFAULT NULL,
  `mostrar_resultado_inmediato` tinyint(1) NOT NULL DEFAULT '1',
  `estado` enum('borrador','publicado','cerrado') NOT NULL DEFAULT 'borrador',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_quizzes_curso` (`curso_id`),
  KEY `fk_quizzes_modulo` (`modulo_id`),
  CONSTRAINT `fk_quizzes_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`),
  CONSTRAINT `fk_quizzes_modulo` FOREIGN KEY (`modulo_id`) REFERENCES `modulos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- preguntas_quiz
CREATE TABLE IF NOT EXISTS `preguntas_quiz` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `quiz_id` int unsigned NOT NULL,
  `enunciado` text NOT NULL,
  `tipo` enum('opcion_unica','verdadero_falso','respuesta_corta') NOT NULL DEFAULT 'opcion_unica',
  `opcion_a` varchar(255) DEFAULT NULL,
  `opcion_b` varchar(255) DEFAULT NULL,
  `opcion_c` varchar(255) DEFAULT NULL,
  `opcion_d` varchar(255) DEFAULT NULL,
  `respuesta_correcta` varchar(255) NOT NULL,
  `explicacion` text,
  `puntos` decimal(5,2) NOT NULL DEFAULT '1.00',
  `orden` int NOT NULL DEFAULT '1',
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_preguntas_quiz` (`quiz_id`),
  CONSTRAINT `fk_preguntas_quiz` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- intentos_quiz
CREATE TABLE IF NOT EXISTS `intentos_quiz` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `quiz_id` int unsigned NOT NULL,
  `estudiante_id` int unsigned NOT NULL,
  `numero_intento` int unsigned NOT NULL DEFAULT '1',
  `puntaje_obtenido` decimal(6,2) DEFAULT NULL,
  `completado` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_inicio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_fin` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_intento_numero` (`quiz_id`,`estudiante_id`,`numero_intento`),
  KEY `fk_intentos_estudiante` (`estudiante_id`),
  CONSTRAINT `fk_intentos_estudiante` FOREIGN KEY (`estudiante_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_intentos_quiz` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- respuestas_intento_quiz
CREATE TABLE IF NOT EXISTS `respuestas_intento_quiz` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `intento_id` int unsigned NOT NULL,
  `pregunta_id` int unsigned NOT NULL,
  `respuesta_usuario` text,
  `es_correcta` tinyint(1) DEFAULT NULL,
  `puntos_obtenidos` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_respuesta_intento_pregunta` (`intento_id`,`pregunta_id`),
  KEY `fk_respuestas_pregunta` (`pregunta_id`),
  CONSTRAINT `fk_respuestas_intento` FOREIGN KEY (`intento_id`) REFERENCES `intentos_quiz` (`id`),
  CONSTRAINT `fk_respuestas_pregunta` FOREIGN KEY (`pregunta_id`) REFERENCES `preguntas_quiz` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- anuncios
CREATE TABLE IF NOT EXISTS `anuncios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `curso_id` int unsigned NOT NULL,
  `usuario_id` int unsigned NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `mensaje` longtext NOT NULL,
  `archivo_url` varchar(255) DEFAULT NULL,
  `estado` enum('publicado','oculto') NOT NULL DEFAULT 'publicado',
  `fecha_publicacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_anuncios_curso` (`curso_id`),
  KEY `fk_anuncios_usuario` (`usuario_id`),
  CONSTRAINT `fk_anuncios_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`),
  CONSTRAINT `fk_anuncios_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- pagos
CREATE TABLE IF NOT EXISTS `pagos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned NOT NULL,
  `referencia_pago` varchar(100) NOT NULL,
  `metodo_pago` enum('bi_pay','transferencia','deposito','efectivo','manual') NOT NULL DEFAULT 'manual',
  `monto_total` decimal(10,2) NOT NULL,
  `moneda` varchar(10) NOT NULL DEFAULT 'GTQ',
  `estado` enum('pendiente','pagado','rechazado','cancelado','reembolsado') NOT NULL DEFAULT 'pendiente',
  `transaccion_externa` varchar(150) DEFAULT NULL,
  `comprobante_url` varchar(255) DEFAULT NULL,
  `observaciones` text,
  `fecha_pago` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `curso_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referencia_pago` (`referencia_pago`),
  KEY `fk_pagos_usuario` (`usuario_id`),
  CONSTRAINT `fk_pagos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- detalle_pagos
CREATE TABLE IF NOT EXISTS `detalle_pagos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `pago_id` int unsigned NOT NULL,
  `curso_id` int unsigned NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `descuento` decimal(10,2) NOT NULL DEFAULT '0.00',
  `subtotal` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_detalle_pagos_pago` (`pago_id`),
  KEY `fk_detalle_pagos_curso` (`curso_id`),
  CONSTRAINT `fk_detalle_pagos_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`),
  CONSTRAINT `fk_detalle_pagos_pago` FOREIGN KEY (`pago_id`) REFERENCES `pagos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- notificaciones
CREATE TABLE IF NOT EXISTS `notificaciones` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `mensaje` text NOT NULL,
  `tipo` enum('anuncio','tarea','entrega','calificacion','quiz','curso','pago','sistema') NOT NULL DEFAULT 'sistema',
  `referencia_tipo` varchar(50) DEFAULT NULL,
  `referencia_id` int unsigned DEFAULT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_lectura` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_notificaciones_usuario` (`usuario_id`),
  CONSTRAINT `fk_notificaciones_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- carritos
CREATE TABLE IF NOT EXISTS `carritos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned NOT NULL,
  `estado` enum('activo','convertido','abandonado') NOT NULL DEFAULT 'activo',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_carritos_usuario` (`usuario_id`),
  CONSTRAINT `fk_carritos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- carrito_items
CREATE TABLE IF NOT EXISTS `carrito_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `carrito_id` int unsigned NOT NULL,
  `curso_id` int unsigned NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `descuento` decimal(10,2) NOT NULL DEFAULT '0.00',
  `subtotal` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_carrito_item` (`carrito_id`,`curso_id`),
  KEY `fk_carrito_items_curso` (`curso_id`),
  CONSTRAINT `fk_carrito_items_carrito` FOREIGN KEY (`carrito_id`) REFERENCES `carritos` (`id`),
  CONSTRAINT `fk_carrito_items_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- password_resets
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_password_resets_usuario_id` (`usuario_id`),
  KEY `idx_password_resets_token_hash` (`token_hash`),
  KEY `idx_password_resets_expires_at` (`expires_at`),
  CONSTRAINT `fk_password_resets_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- asistencias
CREATE TABLE IF NOT EXISTS `asistencias` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `curso_id` int unsigned NOT NULL,
  `estudiante_id` int unsigned NOT NULL,
  `fecha` date NOT NULL,
  `estado` enum('presente','ausente','tarde','justificado') NOT NULL,
  `comentario` varchar(255) DEFAULT NULL,
  `registrado_por` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `curso_id` (`curso_id`,`estudiante_id`,`fecha`),
  KEY `fk_asistencia_estudiante` (`estudiante_id`),
  KEY `fk_asistencia_docente` (`registrado_por`),
  CONSTRAINT `fk_asistencia_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`),
  CONSTRAINT `fk_asistencia_docente` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_asistencia_estudiante` FOREIGN KEY (`estudiante_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- materiales
CREATE TABLE IF NOT EXISTS `materiales` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `curso_id` int unsigned NOT NULL,
  `modulo_id` int unsigned DEFAULT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text,
  `tipo` enum('archivo','video','enlace','pdf','imagen') NOT NULL DEFAULT 'archivo',
  `archivo_url` varchar(255) DEFAULT NULL,
  `enlace_url` varchar(500) DEFAULT NULL,
  `orden` int NOT NULL DEFAULT '1',
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_materiales_curso` (`curso_id`),
  KEY `fk_materiales_modulo` (`modulo_id`),
  CONSTRAINT `fk_materiales_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`),
  CONSTRAINT `fk_materiales_modulo` FOREIGN KEY (`modulo_id`) REFERENCES `modulos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- foros_temas
CREATE TABLE IF NOT EXISTS `foros_temas` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `curso_id` int unsigned NOT NULL,
  `usuario_id` int unsigned NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `mensaje` longtext NOT NULL,
  `estado` enum('activo','cerrado','oculto') NOT NULL DEFAULT 'activo',
  `fijado` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_foros_temas_curso` (`curso_id`),
  KEY `fk_foros_temas_usuario` (`usuario_id`),
  CONSTRAINT `fk_foros_temas_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`),
  CONSTRAINT `fk_foros_temas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- foros_respuestas
CREATE TABLE IF NOT EXISTS `foros_respuestas` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tema_id` int unsigned NOT NULL,
  `usuario_id` int unsigned NOT NULL,
  `mensaje` longtext NOT NULL,
  `estado` enum('activo','oculto') NOT NULL DEFAULT 'activo',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_foros_respuestas_tema` (`tema_id`),
  KEY `fk_foros_respuestas_usuario` (`usuario_id`),
  CONSTRAINT `fk_foros_respuestas_tema` FOREIGN KEY (`tema_id`) REFERENCES `foros_temas` (`id`),
  CONSTRAINT `fk_foros_respuestas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- archivos
CREATE TABLE IF NOT EXISTS `archivos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `s3_key` varchar(700) NOT NULL,
  `nombre_original` varchar(255) NOT NULL,
  `mime_type` varchar(150) NOT NULL DEFAULT 'application/octet-stream',
  `size_bytes` bigint unsigned DEFAULT NULL,
  `owner_usuario_id` int unsigned DEFAULT NULL,
  `curso_id` int unsigned DEFAULT NULL,
  `access_scope` enum('owner','course','course_manage','authenticated','admin') NOT NULL DEFAULT 'owner',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_archivos_s3_key` (`s3_key`),
  KEY `idx_archivos_owner_usuario_id` (`owner_usuario_id`),
  KEY `idx_archivos_curso_id` (`curso_id`),
  CONSTRAINT `fk_archivos_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`),
  CONSTRAINT `fk_archivos_owner_usuario` FOREIGN KEY (`owner_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
