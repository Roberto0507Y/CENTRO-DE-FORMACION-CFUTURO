"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseRepository = void 0;
const db_1 = require("../../config/db");
class CourseRepository {
    async categoryIsActive(id) {
        const [rows] = await db_1.pool.query(`SELECT 1 FROM categorias WHERE id = ? AND estado = 'activo' LIMIT 1`, [id]);
        return rows.length > 0;
    }
    async teacherIsValid(id) {
        const [rows] = await db_1.pool.query(`SELECT 1
       FROM usuarios
       WHERE id = ?
         AND rol IN ('docente', 'admin')
         AND estado = 'activo'
       LIMIT 1`, [id]);
        return rows.length > 0;
    }
    async findCourseOwner(courseId) {
        const [rows] = await db_1.pool.query(`SELECT id, docente_id, estado, tipo_acceso, precio, slug, fecha_publicacion
       FROM cursos
       WHERE id = ?
       LIMIT 1`, [courseId]);
        return rows[0] ?? null;
    }
    async slugExists(slug, excludeId) {
        const params = [slug];
        const excludeSql = excludeId ? "AND id <> ?" : "";
        if (excludeId)
            params.push(excludeId);
        const [rows] = await db_1.pool.query(`SELECT 1 FROM cursos WHERE slug = ? ${excludeSql} LIMIT 1`, params);
        return rows.length > 0;
    }
    async listPublished(filters, pagination) {
        const where = ["c.estado = 'publicado'", "cat.estado = 'activo'"];
        const params = [];
        if (filters.categoria_id) {
            where.push("c.categoria_id = ?");
            params.push(filters.categoria_id);
        }
        if (filters.tipo_acceso) {
            where.push("c.tipo_acceso = ?");
            params.push(filters.tipo_acceso);
        }
        if (filters.nivel) {
            where.push("c.nivel = ?");
            params.push(filters.nivel);
        }
        if (filters.docente_id) {
            where.push("c.docente_id = ?");
            params.push(filters.docente_id);
        }
        if (filters.search) {
            where.push("c.titulo LIKE ?");
            params.push(`%${filters.search}%`);
        }
        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const [countRows] = await db_1.pool.query(`SELECT COUNT(*) as total
       FROM cursos c
       JOIN categorias cat ON cat.id = c.categoria_id
       JOIN usuarios u ON u.id = c.docente_id
       ${whereSql}`, params);
        const total = countRows[0]?.total ?? 0;
        const limit = pagination.limit;
        const offset = (pagination.page - 1) * pagination.limit;
        const [rows] = await db_1.pool.query(`SELECT
        c.id, c.titulo, c.slug, c.descripcion_corta, c.imagen_url, c.tipo_acceso, c.precio, c.nivel,
        c.estado, c.fecha_publicacion, c.created_at,
        cat.id as categoria_id, cat.nombre as categoria_nombre, cat.imagen_url as categoria_imagen_url,
        u.id as docente_id, u.nombres as docente_nombres, u.apellidos as docente_apellidos, u.foto_url as docente_foto_url,
        u.rol as docente_rol
       FROM cursos c
       JOIN categorias cat ON cat.id = c.categoria_id
       JOIN usuarios u ON u.id = c.docente_id
       ${whereSql}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`, [...params, limit, offset]);
        return { items: rows.map(mapCourseListRow), total };
    }
    async findPublishedDetailById(id) {
        const [rows] = await db_1.pool.query(`SELECT
        c.id, c.titulo, c.slug, c.descripcion_corta, c.descripcion, c.imagen_url, c.video_intro_url,
        c.tipo_acceso, c.precio, c.nivel, c.estado, c.duracion_horas, c.requisitos, c.objetivos,
        c.payment_link,
        c.fecha_publicacion, c.created_at, c.updated_at,
        cat.id as categoria_id, cat.nombre as categoria_nombre, cat.imagen_url as categoria_imagen_url,
        u.id as docente_id, u.nombres as docente_nombres, u.apellidos as docente_apellidos, u.foto_url as docente_foto_url,
        u.rol as docente_rol
       FROM cursos c
       JOIN categorias cat ON cat.id = c.categoria_id AND cat.estado = 'activo'
       JOIN usuarios u ON u.id = c.docente_id
       WHERE c.id = ? AND c.estado = 'publicado'
       LIMIT 1`, [id]);
        return rows[0] ? mapCourseDetailRow(rows[0]) : null;
    }
    async findDetailById(id) {
        const [rows] = await db_1.pool.query(`SELECT
        c.id, c.titulo, c.slug, c.descripcion_corta, c.descripcion, c.imagen_url, c.video_intro_url,
        c.tipo_acceso, c.precio, c.nivel, c.estado, c.duracion_horas, c.requisitos, c.objetivos,
        c.payment_link,
        c.fecha_publicacion, c.created_at, c.updated_at,
        cat.id as categoria_id, cat.nombre as categoria_nombre, cat.imagen_url as categoria_imagen_url,
        u.id as docente_id, u.nombres as docente_nombres, u.apellidos as docente_apellidos, u.foto_url as docente_foto_url,
        u.rol as docente_rol
       FROM cursos c
       JOIN categorias cat ON cat.id = c.categoria_id
       JOIN usuarios u ON u.id = c.docente_id
       WHERE c.id = ?
       LIMIT 1`, [id]);
        return rows[0] ? mapCourseDetailPrivateRow(rows[0]) : null;
    }
    async findPublishedDetailBySlug(slug) {
        const [rows] = await db_1.pool.query(`SELECT
        c.id, c.titulo, c.slug, c.descripcion_corta, c.descripcion, c.imagen_url, c.video_intro_url,
        c.tipo_acceso, c.precio, c.nivel, c.estado, c.duracion_horas, c.requisitos, c.objetivos,
        c.payment_link,
        c.fecha_publicacion, c.created_at, c.updated_at,
        cat.id as categoria_id, cat.nombre as categoria_nombre, cat.imagen_url as categoria_imagen_url,
        u.id as docente_id, u.nombres as docente_nombres, u.apellidos as docente_apellidos, u.foto_url as docente_foto_url,
        u.rol as docente_rol
       FROM cursos c
       JOIN categorias cat ON cat.id = c.categoria_id AND cat.estado = 'activo'
       JOIN usuarios u ON u.id = c.docente_id
       WHERE c.slug = ? AND c.estado = 'publicado'
       LIMIT 1`, [slug]);
        return rows[0] ? mapCourseDetailRow(rows[0]) : null;
    }
    async createCourse(input) {
        const [result] = await db_1.pool.execute(`INSERT INTO cursos
        (categoria_id, docente_id, titulo, slug, descripcion_corta, descripcion, imagen_url, video_intro_url,
         payment_link, tipo_acceso, precio, nivel, estado, duracion_horas, requisitos, objetivos, fecha_publicacion,
         created_at, updated_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [
            input.categoria_id,
            input.docente_id,
            input.titulo,
            input.slug,
            input.descripcion_corta,
            input.descripcion,
            input.imagen_url,
            input.video_intro_url,
            input.payment_link,
            input.tipo_acceso,
            input.precio,
            input.nivel,
            input.estado,
            input.duracion_horas,
            input.requisitos,
            input.objetivos,
            input.fecha_publicacion,
        ]);
        return result.insertId;
    }
    async updateCourseById(id, input) {
        const fields = [];
        const values = [];
        const set = (column, value) => {
            if (value === undefined)
                return;
            fields.push(`${column} = ?`);
            values.push(value);
        };
        set("categoria_id", input.categoria_id);
        set("docente_id", input.docente_id);
        set("titulo", input.titulo);
        set("slug", input.slug);
        set("descripcion_corta", input.descripcion_corta);
        set("descripcion", input.descripcion);
        set("imagen_url", input.imagen_url);
        set("video_intro_url", input.video_intro_url);
        set("payment_link", input.payment_link);
        set("tipo_acceso", input.tipo_acceso);
        set("precio", input.precio);
        set("nivel", input.nivel);
        set("estado", input.estado);
        set("duracion_horas", input.duracion_horas);
        set("requisitos", input.requisitos);
        set("objetivos", input.objetivos);
        set("fecha_publicacion", input.fecha_publicacion);
        if (fields.length === 0)
            return;
        values.push(id);
        await db_1.pool.execute(`UPDATE cursos
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, values);
    }
    async hideCourseById(id) {
        const [result] = await db_1.pool.execute(`UPDATE cursos
       SET estado = 'oculto', updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [id]);
        return result.affectedRows > 0;
    }
    async listTeaching(docenteId, pagination, search) {
        const where = [];
        const params = [];
        if (docenteId) {
            where.push("c.docente_id = ?");
            params.push(docenteId);
        }
        if (search) {
            const like = `%${search}%`;
            where.push(`(c.titulo LIKE ?
          OR c.slug LIKE ?
          OR CONCAT_WS(' ', u.nombres, u.apellidos) LIKE ?
          OR cat.nombre LIKE ?
          OR c.estado LIKE ?)`);
            params.push(like, like, like, like, like);
        }
        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const [countRows] = await db_1.pool.query(`SELECT COUNT(*) as total
       FROM cursos c
       JOIN categorias cat ON cat.id = c.categoria_id
       JOIN usuarios u ON u.id = c.docente_id
       ${whereSql}`, params);
        const total = countRows[0]?.total ?? 0;
        const limit = pagination.limit;
        const offset = (pagination.page - 1) * pagination.limit;
        const [rows] = await db_1.pool.query(`SELECT
        c.id, c.titulo, c.slug, c.descripcion_corta, c.imagen_url, c.tipo_acceso, c.precio, c.nivel,
        c.estado, c.fecha_publicacion, c.created_at,
        cat.id as categoria_id, cat.nombre as categoria_nombre, cat.imagen_url as categoria_imagen_url,
        u.id as docente_id, u.nombres as docente_nombres, u.apellidos as docente_apellidos, u.foto_url as docente_foto_url,
        u.rol as docente_rol
       FROM cursos c
       JOIN categorias cat ON cat.id = c.categoria_id
       JOIN usuarios u ON u.id = c.docente_id
       ${whereSql}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`, [...params, limit, offset]);
        return {
            items: rows.map((r) => ({ ...mapCourseListRow(r), estado: r.estado })),
            total,
        };
    }
    async listEnrolled(userId) {
        const [rows] = await db_1.pool.query(`SELECT
        c.id, c.titulo, c.slug, c.descripcion_corta, c.imagen_url, c.tipo_acceso, c.precio, c.nivel,
        c.estado, c.fecha_publicacion, c.created_at,
        cat.id as categoria_id, cat.nombre as categoria_nombre, cat.imagen_url as categoria_imagen_url,
        u.id as docente_id, u.nombres as docente_nombres, u.apellidos as docente_apellidos, u.foto_url as docente_foto_url,
        u.rol as docente_rol,
        i.progreso as progreso
       FROM inscripciones i
       JOIN cursos c ON c.id = i.curso_id
       JOIN categorias cat ON cat.id = c.categoria_id
       JOIN usuarios u ON u.id = c.docente_id
       WHERE i.usuario_id = ?
         AND i.estado = 'activa'
         AND c.estado = 'publicado'
         AND cat.estado = 'activo'
       ORDER BY i.fecha_inscripcion DESC`, [userId]);
        return rows.map((r) => ({ ...mapCourseListRow(r), progreso: r.progreso }));
    }
}
exports.CourseRepository = CourseRepository;
function mapCourseListRow(r) {
    return {
        id: r.id,
        titulo: r.titulo,
        slug: r.slug,
        descripcion_corta: r.descripcion_corta,
        imagen_url: r.imagen_url,
        tipo_acceso: r.tipo_acceso,
        precio: r.precio,
        nivel: r.nivel,
        fecha_publicacion: r.fecha_publicacion,
        created_at: r.created_at,
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
            rol: r.docente_rol,
        },
    };
}
function mapCourseDetailRow(r) {
    return {
        ...mapCourseListRow(r),
        descripcion: r.descripcion,
        video_intro_url: r.video_intro_url,
        duracion_horas: r.duracion_horas,
        requisitos: r.requisitos,
        objetivos: r.objetivos,
        payment_link: r.payment_link,
    };
}
function mapCourseDetailPrivateRow(r) {
    return {
        ...mapCourseDetailRow(r),
        estado: r.estado,
        updated_at: r.updated_at,
        docente_id: r.docente_id,
        categoria_id: r.categoria_id,
    };
}
