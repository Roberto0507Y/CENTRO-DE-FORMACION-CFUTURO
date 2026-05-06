import type { RowDataPacket } from "mysql2/promise";
import { TtlCache } from "../../common/utils/ttlCache";
import { pool } from "../../config/db";
import type { AssistantCourseCard } from "./assistant.types";

type AssistantCourseRow = RowDataPacket & {
  id: number;
  titulo: string;
  slug: string;
  descripcion_corta: string | null;
  imagen_url: string | null;
  tipo_acceso: "gratis" | "pago";
  precio: string;
  nivel: "basico" | "intermedio" | "avanzado";
  categoria_nombre: string;
  docente_nombre: string;
  requiere_admision: 0 | 1;
  precio_admision: string | null;
};

const courseSearchCache = new TtlCache<string, AssistantCourseCard[]>({
  ttlMs: 60_000,
  maxEntries: 120,
});

const featuredCourseCache = new TtlCache<string, AssistantCourseCard[]>({
  ttlMs: 90_000,
  maxEntries: 20,
});

function mapCourse(row: AssistantCourseRow): AssistantCourseCard {
  return {
    id: row.id,
    titulo: row.titulo,
    slug: row.slug,
    descripcion_corta: row.descripcion_corta,
    imagen_url: row.imagen_url,
    tipo_acceso: row.tipo_acceso,
    precio: String(row.precio),
    nivel: row.nivel,
    categoria_nombre: row.categoria_nombre,
    docente_nombre: row.docente_nombre,
    requiere_admision: Number(row.requiere_admision) === 1,
    precio_admision: row.precio_admision ? String(row.precio_admision) : null,
  };
}

function baseCourseSelect(whereSql: string, limit: number) {
  return {
    sql: `SELECT
      c.id,
      c.titulo,
      c.slug,
      c.descripcion_corta,
      c.imagen_url,
      c.tipo_acceso,
      c.precio,
      c.nivel,
      cat.nombre AS categoria_nombre,
      CONCAT(u.nombres, ' ', u.apellidos) AS docente_nombre,
      EXISTS(
        SELECT 1
        FROM quizzes q
        WHERE q.curso_id = c.id
          AND q.tipo = 'admision'
          AND q.estado = 'publicado'
      ) AS requiere_admision,
      (
        SELECT CAST(MIN(q2.precio_admision) AS CHAR)
        FROM quizzes q2
        WHERE q2.curso_id = c.id
          AND q2.tipo = 'admision'
          AND q2.estado = 'publicado'
      ) AS precio_admision
     FROM cursos c
     JOIN categorias cat ON cat.id = c.categoria_id AND cat.estado = 'activo'
     JOIN usuarios u ON u.id = c.docente_id
     ${whereSql}
     ORDER BY c.fecha_publicacion DESC, c.created_at DESC
     LIMIT ${limit}`,
  };
}

export class AssistantRepository {
  async listFeaturedCourses(limit = 4): Promise<AssistantCourseCard[]> {
    const safeLimit = Math.max(1, Math.min(limit, 8));
    const cacheKey = `featured:${safeLimit}`;
    return featuredCourseCache.getOrSet(cacheKey, async () => {
      const { sql } = baseCourseSelect(
        "WHERE c.estado = 'publicado'",
        safeLimit
      );
      const [rows] = await pool.query<AssistantCourseRow[]>(sql);
      return rows.map(mapCourse);
    });
  }

  async listCoursesByAccess(tipo: "gratis" | "pago", limit = 5): Promise<AssistantCourseCard[]> {
    const safeLimit = Math.max(1, Math.min(limit, 8));
    const cacheKey = `access:${tipo}:${safeLimit}`;
    return courseSearchCache.getOrSet(cacheKey, async () => {
      const { sql } = baseCourseSelect(
        "WHERE c.estado = 'publicado' AND c.tipo_acceso = ?",
        safeLimit
      );
      const [rows] = await pool.query<AssistantCourseRow[]>(sql, [tipo]);
      return rows.map(mapCourse);
    });
  }

  async listAdmissionCourses(limit = 5): Promise<AssistantCourseCard[]> {
    const safeLimit = Math.max(1, Math.min(limit, 8));
    const cacheKey = `admission:${safeLimit}`;
    return courseSearchCache.getOrSet(cacheKey, async () => {
      const { sql } = baseCourseSelect(
        `WHERE c.estado = 'publicado'
         AND EXISTS (
           SELECT 1
           FROM quizzes q
           WHERE q.curso_id = c.id
             AND q.tipo = 'admision'
             AND q.estado = 'publicado'
         )`,
        safeLimit
      );
      const [rows] = await pool.query<AssistantCourseRow[]>(sql);
      return rows.map(mapCourse);
    });
  }

  async searchPublishedCourses(query: string, limit = 5): Promise<AssistantCourseCard[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    const safeLimit = Math.max(1, Math.min(limit, 8));
    const cacheKey = `search:${normalizedQuery}:${safeLimit}`;
    return courseSearchCache.getOrSet(cacheKey, async () => {
      const like = `%${normalizedQuery}%`;
      const { sql } = baseCourseSelect(
        `WHERE c.estado = 'publicado'
         AND (
           LOWER(c.titulo) LIKE ?
           OR LOWER(COALESCE(c.descripcion_corta, '')) LIKE ?
           OR LOWER(cat.nombre) LIKE ?
           OR LOWER(CONCAT(u.nombres, ' ', u.apellidos)) LIKE ?
         )`,
        safeLimit
      );

      const [rows] = await pool.query<AssistantCourseRow[]>(sql, [like, like, like, like]);
      return rows.map(mapCourse);
    });
  }

  async findPublicCourseBySlug(slug: string): Promise<AssistantCourseCard | null> {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) return null;

    const { sql } = baseCourseSelect(
      "WHERE c.estado = 'publicado' AND LOWER(c.slug) = ?",
      1
    );
    const [rows] = await pool.query<AssistantCourseRow[]>(sql, [normalizedSlug]);
    return rows[0] ? mapCourse(rows[0]) : null;
  }
}
