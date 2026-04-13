"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRepository = void 0;
const db_1 = require("../../config/db");
class TaskRepository {
    static async hasColumn(table, column) {
        const key = `${table}.${column}`;
        const cached = TaskRepository.columnCache.get(key);
        if (cached !== undefined)
            return cached;
        const [rows] = await db_1.pool.query(`SELECT COUNT(*) AS cnt
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`, [table, column]);
        const exists = Number(rows?.[0]?.cnt ?? 0) > 0;
        TaskRepository.columnCache.set(key, exists);
        return exists;
    }
    async supportsSubmissionUploadLimit() {
        return TaskRepository.hasColumn("entregas_tareas", "subidas_archivo");
    }
    async supportsSubmissionGrading() {
        const [hasScore, hasComment, hasDate] = await Promise.all([
            TaskRepository.hasColumn("entregas_tareas", "calificacion"),
            TaskRepository.hasColumn("entregas_tareas", "comentario_docente"),
            TaskRepository.hasColumn("entregas_tareas", "fecha_calificacion"),
        ]);
        return hasScore && hasComment && hasDate;
    }
    async findCourseOwner(courseId) {
        const [rows] = await db_1.pool.query(`SELECT docente_id, estado AS curso_estado
       FROM cursos
       WHERE id = ?
       LIMIT 1`, [courseId]);
        return rows[0] ?? null;
    }
    async listByCourse(courseId) {
        const hasLink = await TaskRepository.hasColumn("tareas", "enlace_url");
        const [rows] = await db_1.pool.query(`SELECT
        id, curso_id, modulo_id, titulo, descripcion, instrucciones, archivo_url, ${hasLink ? "enlace_url" : "NULL AS enlace_url"},
        puntos, fecha_apertura, fecha_entrega, fecha_cierre, permite_entrega_tardia,
        estado, created_at, updated_at
       FROM tareas
       WHERE curso_id = ?
       ORDER BY fecha_entrega ASC, id ASC`, [courseId]);
        return rows;
    }
    async listPublishedByCourse(courseId) {
        const hasLink = await TaskRepository.hasColumn("tareas", "enlace_url");
        const [rows] = await db_1.pool.query(`SELECT
        id, curso_id, modulo_id, titulo, descripcion, instrucciones, archivo_url, ${hasLink ? "enlace_url" : "NULL AS enlace_url"},
        puntos, fecha_apertura, fecha_entrega, fecha_cierre, permite_entrega_tardia,
        estado, created_at, updated_at
       FROM tareas
       WHERE curso_id = ? AND estado = 'publicada'
       ORDER BY fecha_entrega ASC, id ASC`, [courseId]);
        return rows;
    }
    async findById(id) {
        const hasLink = await TaskRepository.hasColumn("tareas", "enlace_url");
        const [rows] = await db_1.pool.query(`SELECT
        id, curso_id, modulo_id, titulo, descripcion, instrucciones, archivo_url, ${hasLink ? "enlace_url" : "NULL AS enlace_url"},
        puntos, fecha_apertura, fecha_entrega, fecha_cierre, permite_entrega_tardia,
        estado, created_at, updated_at
       FROM tareas
       WHERE id = ?
       LIMIT 1`, [id]);
        return rows[0] ?? null;
    }
    async getTaskContext(id) {
        const [rows] = await db_1.pool.query(`SELECT t.id, t.curso_id, c.docente_id
       FROM tareas t
       JOIN cursos c ON c.id = t.curso_id
       WHERE t.id = ?
       LIMIT 1`, [id]);
        return rows[0] ?? null;
    }
    async getTaskContextFull(id) {
        const [rows] = await db_1.pool.query(`SELECT
        t.id,
        t.curso_id,
        c.docente_id,
        c.estado AS curso_estado,
        t.estado AS tarea_estado,
        t.permite_entrega_tardia,
        t.fecha_apertura,
        t.fecha_entrega,
        t.fecha_cierre
       FROM tareas t
       JOIN cursos c ON c.id = t.curso_id
       WHERE t.id = ?
       LIMIT 1`, [id]);
        return rows[0] ?? null;
    }
    async userIsEnrolledActive(userId, courseId) {
        const [rows] = await db_1.pool.query(`SELECT id
       FROM inscripciones
       WHERE usuario_id = ? AND curso_id = ? AND estado = 'activa'
       LIMIT 1`, [userId, courseId]);
        return Boolean(rows[0]);
    }
    async create(courseId, input) {
        const hasLink = await TaskRepository.hasColumn("tareas", "enlace_url");
        const [res] = await db_1.pool.execute(hasLink
            ? `INSERT INTO tareas
            (curso_id, modulo_id, titulo, descripcion, instrucciones, archivo_url, enlace_url, puntos,
             fecha_apertura, fecha_entrega, fecha_cierre, permite_entrega_tardia, estado, created_at, updated_at)
           VALUES
            (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`
            : `INSERT INTO tareas
            (curso_id, modulo_id, titulo, descripcion, instrucciones, archivo_url, puntos,
             fecha_apertura, fecha_entrega, fecha_cierre, permite_entrega_tardia, estado, created_at, updated_at)
           VALUES
            (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, hasLink
            ? [
                courseId,
                input.titulo,
                input.descripcion ?? null,
                input.instrucciones ?? null,
                input.archivo_url ?? null,
                input.enlace_url ?? null,
                input.puntos ?? 100,
                input.fecha_apertura ?? null,
                input.fecha_entrega,
                input.fecha_cierre ?? null,
                input.permite_entrega_tardia ? 1 : 0,
                input.estado ?? "borrador",
            ]
            : [
                courseId,
                input.titulo,
                input.descripcion ?? null,
                input.instrucciones ?? null,
                input.archivo_url ?? null,
                input.puntos ?? 100,
                input.fecha_apertura ?? null,
                input.fecha_entrega,
                input.fecha_cierre ?? null,
                input.permite_entrega_tardia ? 1 : 0,
                input.estado ?? "borrador",
            ]);
        return res.insertId;
    }
    async updateById(id, input) {
        const fields = [];
        const values = [];
        const hasLink = await TaskRepository.hasColumn("tareas", "enlace_url");
        const set = (key, column) => {
            const value = input[key];
            if (value === undefined)
                return;
            fields.push(`${column} = ?`);
            values.push(value);
        };
        set("titulo", "titulo");
        set("descripcion", "descripcion");
        set("instrucciones", "instrucciones");
        set("archivo_url", "archivo_url");
        if (hasLink)
            set("enlace_url", "enlace_url");
        set("puntos", "puntos");
        set("fecha_apertura", "fecha_apertura");
        set("fecha_entrega", "fecha_entrega");
        set("fecha_cierre", "fecha_cierre");
        if (input.permite_entrega_tardia !== undefined) {
            fields.push("permite_entrega_tardia = ?");
            values.push(input.permite_entrega_tardia ? 1 : 0);
        }
        set("estado", "estado");
        if (fields.length === 0)
            return;
        values.push(id);
        await db_1.pool.execute(`UPDATE tareas
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, values);
    }
    async closeById(id) {
        const [res] = await db_1.pool.execute(`UPDATE tareas
       SET estado = 'cerrada', updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [id]);
        return res.affectedRows > 0;
    }
    async countTasksByCourse(courseId) {
        const [rows] = await db_1.pool.query(`SELECT COUNT(*) AS total FROM tareas WHERE curso_id = ?`, [courseId]);
        return Number(rows[0]?.total ?? 0);
    }
    async upsertSubmission(taskId, studentId, input) {
        const hasLink = await TaskRepository.hasColumn("entregas_tareas", "enlace_url");
        const hasUploadCount = await this.supportsSubmissionUploadLimit();
        const columns = ["tarea_id", "estudiante_id", "archivo_url"];
        const placeholders = ["?", "?", "?"];
        const values = [taskId, studentId, input.archivo_url ?? null];
        if (hasLink) {
            columns.push("enlace_url");
            placeholders.push("?");
            values.push(input.enlace_url ?? null);
        }
        if (hasUploadCount) {
            columns.push("subidas_archivo");
            placeholders.push("?");
            values.push(input.increment_upload_count ? 1 : 0);
        }
        columns.push("comentario_estudiante", "fecha_entrega", "estado", "created_at", "updated_at");
        placeholders.push("?", "NOW()", "?", "NOW()", "NOW()");
        values.push(input.comentario_estudiante ?? null, input.estado);
        const updates = [
            "archivo_url = VALUES(archivo_url)",
            hasLink ? "enlace_url = VALUES(enlace_url)" : null,
            hasUploadCount
                ? `subidas_archivo = subidas_archivo + ${input.increment_upload_count ? "1" : "0"}`
                : null,
            "comentario_estudiante = VALUES(comentario_estudiante)",
            "fecha_entrega = NOW()",
            "estado = VALUES(estado)",
            "updated_at = NOW()",
        ].filter(Boolean);
        const [res] = await db_1.pool.execute(`INSERT INTO entregas_tareas
        (${columns.join(", ")})
       VALUES
        (${placeholders.join(", ")})
       ON DUPLICATE KEY UPDATE
         ${updates.join(",\n         ")}`, values);
        // insertId = 0 on update; fetch id separately
        if (res.insertId)
            return res.insertId;
        const existing = await this.findMySubmission(taskId, studentId);
        return existing?.id ?? 0;
    }
    async updateSubmissionComment(taskId, studentId, comment) {
        const [res] = await db_1.pool.execute(`UPDATE entregas_tareas
       SET comentario_estudiante = ?, updated_at = NOW()
       WHERE tarea_id = ? AND estudiante_id = ?
       LIMIT 1`, [comment, taskId, studentId]);
        return res.affectedRows > 0;
    }
    async findMySubmission(taskId, studentId) {
        const hasLink = await TaskRepository.hasColumn("entregas_tareas", "enlace_url");
        const hasUploadCount = await this.supportsSubmissionUploadLimit();
        const hasGrading = await this.supportsSubmissionGrading();
        const [rows] = await db_1.pool.query(`SELECT
        id, tarea_id, estudiante_id, archivo_url,
        ${hasUploadCount ? "subidas_archivo" : "0 AS subidas_archivo"},
        ${hasLink ? "enlace_url" : "NULL AS enlace_url"}, comentario_estudiante,
        fecha_entrega, estado,
        ${hasGrading ? "calificacion" : "NULL AS calificacion"},
        ${hasGrading ? "comentario_docente" : "NULL AS comentario_docente"},
        ${hasGrading ? "fecha_calificacion" : "NULL AS fecha_calificacion"},
        created_at, updated_at
       FROM entregas_tareas
       WHERE tarea_id = ? AND estudiante_id = ?
        LIMIT 1`, [taskId, studentId]);
        return rows[0] ?? null;
    }
    async listSubmissionsForTask(taskId, pagination) {
        const safeLimit = Number.isInteger(pagination.limit) && pagination.limit > 0
            ? Math.min(pagination.limit, 50)
            : 50;
        const safeOffset = Number.isInteger(pagination.offset) && pagination.offset >= 0 ? pagination.offset : 0;
        const hasLink = await TaskRepository.hasColumn("entregas_tareas", "enlace_url");
        const hasUploadCount = await this.supportsSubmissionUploadLimit();
        const hasGrading = await this.supportsSubmissionGrading();
        const [rows] = await db_1.pool.query(`SELECT
        e.id, e.tarea_id, e.estudiante_id, e.archivo_url,
        ${hasUploadCount ? "e.subidas_archivo" : "0 AS subidas_archivo"},
        ${hasLink ? "e.enlace_url" : "NULL AS enlace_url"}, e.comentario_estudiante,
        e.fecha_entrega, e.estado,
        ${hasGrading ? "e.calificacion" : "NULL AS calificacion"},
        ${hasGrading ? "e.comentario_docente" : "NULL AS comentario_docente"},
        ${hasGrading ? "e.fecha_calificacion" : "NULL AS fecha_calificacion"},
        e.created_at, e.updated_at,
        u.nombres, u.apellidos, u.correo, u.foto_url
       FROM entregas_tareas e
       JOIN usuarios u ON u.id = e.estudiante_id
       WHERE e.tarea_id = ?
       ORDER BY e.fecha_entrega DESC, e.id DESC
       LIMIT ? OFFSET ?`, [taskId, safeLimit, safeOffset]);
        return rows.map((r) => ({
            id: r.id,
            tarea_id: r.tarea_id,
            estudiante_id: r.estudiante_id,
            archivo_url: r.archivo_url,
            subidas_archivo: Number(r.subidas_archivo ?? 0),
            enlace_url: r.enlace_url,
            comentario_estudiante: r.comentario_estudiante,
            fecha_entrega: r.fecha_entrega,
            estado: r.estado,
            calificacion: r.calificacion,
            comentario_docente: r.comentario_docente,
            fecha_calificacion: r.fecha_calificacion,
            created_at: r.created_at,
            updated_at: r.updated_at,
            estudiante: {
                id: r.estudiante_id,
                nombres: r.nombres,
                apellidos: r.apellidos,
                correo: r.correo,
                foto_url: r.foto_url,
            },
        }));
    }
    async getSubmissionContext(submissionId) {
        const [rows] = await db_1.pool.query(`SELECT
        e.id,
        e.tarea_id,
        t.curso_id,
        c.docente_id,
        t.titulo AS tarea_titulo,
        c.titulo AS curso_titulo,
        t.puntos
       FROM entregas_tareas e
       JOIN tareas t ON t.id = e.tarea_id
       JOIN cursos c ON c.id = t.curso_id
       WHERE e.id = ?
       LIMIT 1`, [submissionId]);
        return rows[0] ?? null;
    }
    async gradeSubmission(submissionId, input) {
        const [res] = await db_1.pool.execute(`UPDATE entregas_tareas
       SET calificacion = ?,
           comentario_docente = ?,
           estado = ?,
           fecha_calificacion = NOW(),
           updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [
            input.calificacion,
            input.comentario_docente?.toString().trim() || null,
            input.estado ?? "revisada",
            submissionId,
        ]);
        return res.affectedRows > 0;
    }
    async findSubmissionWithStudentById(submissionId) {
        const hasLink = await TaskRepository.hasColumn("entregas_tareas", "enlace_url");
        const hasUploadCount = await this.supportsSubmissionUploadLimit();
        const hasGrading = await this.supportsSubmissionGrading();
        const [rows] = await db_1.pool.query(`SELECT
        e.id, e.tarea_id, e.estudiante_id, e.archivo_url,
        ${hasUploadCount ? "e.subidas_archivo" : "0 AS subidas_archivo"},
        ${hasLink ? "e.enlace_url" : "NULL AS enlace_url"}, e.comentario_estudiante,
        e.fecha_entrega, e.estado,
        ${hasGrading ? "e.calificacion" : "NULL AS calificacion"},
        ${hasGrading ? "e.comentario_docente" : "NULL AS comentario_docente"},
        ${hasGrading ? "e.fecha_calificacion" : "NULL AS fecha_calificacion"},
        e.created_at, e.updated_at,
        u.nombres, u.apellidos, u.correo, u.foto_url
       FROM entregas_tareas e
       JOIN usuarios u ON u.id = e.estudiante_id
       WHERE e.id = ?
       LIMIT 1`, [submissionId]);
        const r = rows[0];
        if (!r)
            return null;
        return {
            id: r.id,
            tarea_id: r.tarea_id,
            estudiante_id: r.estudiante_id,
            archivo_url: r.archivo_url,
            subidas_archivo: Number(r.subidas_archivo ?? 0),
            enlace_url: r.enlace_url,
            comentario_estudiante: r.comentario_estudiante,
            fecha_entrega: r.fecha_entrega,
            estado: r.estado,
            calificacion: r.calificacion,
            comentario_docente: r.comentario_docente,
            fecha_calificacion: r.fecha_calificacion,
            created_at: r.created_at,
            updated_at: r.updated_at,
            estudiante: {
                id: r.estudiante_id,
                nombres: r.nombres,
                apellidos: r.apellidos,
                correo: r.correo,
                foto_url: r.foto_url,
            },
        };
    }
    // Helpers for future transactions
    async findCourseOwnerTx(conn, courseId) {
        const [rows] = await conn.query(`SELECT docente_id FROM cursos WHERE id = ? LIMIT 1`, [courseId]);
        const r = rows[0];
        if (!r?.docente_id)
            return null;
        return { docente_id: Number(r.docente_id) };
    }
}
exports.TaskRepository = TaskRepository;
TaskRepository.columnCache = new Map();
