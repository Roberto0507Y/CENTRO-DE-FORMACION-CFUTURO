"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentRepository = void 0;
const db_1 = require("../../config/db");
class EnrollmentRepository {
    async findCourseById(courseId) {
        const [rows] = await db_1.pool.query(`SELECT id, docente_id, tipo_acceso, estado
       FROM cursos
       WHERE id = ?
       LIMIT 1`, [courseId]);
        return rows[0] ?? null;
    }
    async findEnrollmentByUserAndCourse(userId, courseId) {
        const [rows] = await db_1.pool.query(`SELECT id, usuario_id, curso_id, tipo_inscripcion, estado, progreso, fecha_inscripcion, fecha_finalizacion
       FROM inscripciones
       WHERE usuario_id = ? AND curso_id = ?
       LIMIT 1`, [userId, courseId]);
        return rows[0] ?? null;
    }
    async createEnrollment(input) {
        const [result] = await db_1.pool.execute(`INSERT INTO inscripciones
        (usuario_id, curso_id, tipo_inscripcion, estado, progreso, fecha_inscripcion, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, 0.00, NOW(), NOW(), NOW())`, [input.usuario_id, input.curso_id, input.tipo_inscripcion, input.estado]);
        return result.insertId;
    }
    async paymentExistsForUserAndCourse(userId, courseId) {
        const [rows] = await db_1.pool.query(`SELECT 1
       FROM pagos p
       JOIN detalle_pagos dp ON dp.pago_id = p.id
       WHERE p.usuario_id = ?
         AND p.estado = 'pagado'
         AND dp.curso_id = ?
       LIMIT 1`, [userId, courseId]);
        return rows.length > 0;
    }
    async listMyActiveCourses(userId) {
        const [rows] = await db_1.pool.query(`SELECT
        i.id, i.progreso, i.fecha_inscripcion, i.tipo_inscripcion, i.estado,
        c.id as curso_id, c.titulo as curso_titulo, c.slug as curso_slug, c.imagen_url as curso_imagen_url,
        c.tipo_acceso as curso_tipo_acceso, c.precio as curso_precio, c.nivel as curso_nivel,
        c.estado as curso_estado, c.fecha_publicacion as curso_fecha_publicacion,
        cat.id as categoria_id, cat.nombre as categoria_nombre, cat.imagen_url as categoria_imagen_url,
        u.id as docente_id, u.nombres as docente_nombres, u.apellidos as docente_apellidos, u.foto_url as docente_foto_url
       FROM inscripciones i
       JOIN cursos c ON c.id = i.curso_id
       JOIN categorias cat ON cat.id = c.categoria_id
       JOIN usuarios u ON u.id = c.docente_id
       WHERE i.usuario_id = ?
         AND i.estado = 'activa'
       ORDER BY i.fecha_inscripcion DESC`, [userId]);
        return rows.map((r) => ({
            id: r.id,
            progreso: r.progreso,
            fecha_inscripcion: r.fecha_inscripcion,
            tipo_inscripcion: r.tipo_inscripcion,
            estado: r.estado,
            curso: {
                id: r.curso_id,
                titulo: r.curso_titulo,
                slug: r.curso_slug,
                imagen_url: r.curso_imagen_url,
                tipo_acceso: r.curso_tipo_acceso,
                precio: r.curso_precio,
                nivel: r.curso_nivel,
                estado: r.curso_estado,
                fecha_publicacion: r.curso_fecha_publicacion,
            },
            categoria: {
                id: r.categoria_id,
                nombre: r.categoria_nombre,
                imagen_url: r.categoria_imagen_url,
            },
            docente: {
                id: r.docente_id,
                nombres: r.docente_nombres,
                apellidos: r.docente_apellidos,
                foto_url: r.docente_foto_url,
            },
        }));
    }
    async checkAccess(userId, courseId) {
        const enr = await this.findEnrollmentByUserAndCourse(userId, courseId);
        if (!enr) {
            return {
                enrolled: false,
                access: false,
                tipo_inscripcion: null,
                estado_inscripcion: null,
                progreso: null,
            };
        }
        const active = enr.estado === "activa";
        return {
            enrolled: true,
            access: active,
            tipo_inscripcion: enr.tipo_inscripcion,
            estado_inscripcion: enr.estado,
            progreso: enr.progreso,
        };
    }
    async listActiveStudents(courseId) {
        const [rows] = await db_1.pool.query(`SELECT
        u.id as usuario_id, u.nombres, u.apellidos, u.correo, u.foto_url,
        i.progreso, i.tipo_inscripcion, i.fecha_inscripcion
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.usuario_id
       WHERE i.curso_id = ?
         AND i.estado = 'activa'
       ORDER BY i.fecha_inscripcion DESC`, [courseId]);
        return rows;
    }
    async findEnrollmentById(id) {
        const [rows] = await db_1.pool.query(`SELECT id, usuario_id, curso_id, tipo_inscripcion, estado, progreso, fecha_inscripcion, fecha_finalizacion
       FROM inscripciones
       WHERE id = ?
       LIMIT 1`, [id]);
        return rows[0] ?? null;
    }
    async updateProgress(id, progreso, finalize) {
        const [result] = await db_1.pool.execute(`UPDATE inscripciones
       SET progreso = ?, estado = ?, fecha_finalizacion = ?, updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [
            progreso.toFixed(2),
            finalize ? "finalizada" : "activa",
            finalize ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
            id,
        ]);
        return result.affectedRows > 0;
    }
    async cancelEnrollment(id) {
        const [result] = await db_1.pool.execute(`UPDATE inscripciones
       SET estado = 'cancelada', updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [id]);
        return result.affectedRows > 0;
    }
}
exports.EnrollmentRepository = EnrollmentRepository;
