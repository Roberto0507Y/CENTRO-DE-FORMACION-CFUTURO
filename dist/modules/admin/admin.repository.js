"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRepository = void 0;
const db_1 = require("../../config/db");
class AdminRepository {
    async metrics() {
        const [[userRows], [courseRows], [paymentRows], [enrollmentRows], [signupRows], [loginRows], [recentPaymentRows],] = await Promise.all([
            db_1.pool.query(`SELECT
          COUNT(*) AS total,
          SUM(estado = 'activo') AS active,
          SUM(estado = 'inactivo') AS inactive,
          SUM(estado = 'suspendido') AS suspended,
          SUM(rol = 'admin') AS admins,
          SUM(rol = 'docente') AS teachers,
          SUM(rol = 'estudiante') AS students
        FROM usuarios`),
            db_1.pool.query(`SELECT
          COUNT(*) AS total,
          SUM(estado = 'publicado') AS published,
          SUM(estado = 'borrador') AS draft,
          SUM(estado = 'oculto') AS hidden
        FROM cursos`),
            db_1.pool.query(`SELECT
          COUNT(*) AS total,
          SUM(estado = 'pendiente') AS pending,
          SUM(estado = 'pagado') AS paid,
          SUM(estado = 'reembolsado') AS refunded,
          COALESCE(SUM(CASE WHEN estado = 'pagado' THEN monto_total ELSE 0 END), 0) AS revenueTotal,
          COALESCE(SUM(CASE WHEN estado = 'reembolsado' THEN monto_total ELSE 0 END), 0) AS refundsTotal
        FROM pagos`),
            db_1.pool.query(`SELECT
          COUNT(*) AS total,
          SUM(estado = 'activa') AS active,
          SUM(estado = 'pendiente') AS pending,
          SUM(estado = 'cancelada') AS cancelled,
          SUM(estado = 'finalizada') AS finished
        FROM inscripciones`),
            db_1.pool.query(`SELECT id, nombres, apellidos, correo, rol, estado, created_at
         FROM usuarios
         ORDER BY created_at DESC
         LIMIT 5`),
            db_1.pool.query(`SELECT id, nombres, apellidos, correo, rol, estado, ultimo_login
         FROM usuarios
         WHERE ultimo_login IS NOT NULL
         ORDER BY ultimo_login DESC
         LIMIT 5`),
            db_1.pool.query(`SELECT
          p.id,
          p.usuario_id,
          u.nombres,
          u.apellidos,
          u.correo,
          CAST(p.monto_total AS CHAR) AS monto_total,
          p.metodo_pago,
          p.estado,
          p.created_at,
          p.fecha_pago,
          c_first.titulo AS curso_titulo,
          COALESCE(dp_stats.cursos_count, 0) AS cursos_count
        FROM pagos p
        JOIN usuarios u ON u.id = p.usuario_id
        LEFT JOIN (
          SELECT
            dp.pago_id,
            COUNT(*) AS cursos_count,
            MIN(dp.id) AS first_detail_id
          FROM detalle_pagos dp
          GROUP BY dp.pago_id
        ) dp_stats ON dp_stats.pago_id = p.id
        LEFT JOIN detalle_pagos dp_first ON dp_first.id = dp_stats.first_detail_id
        LEFT JOIN cursos c_first ON c_first.id = dp_first.curso_id
        ORDER BY p.created_at DESC
        LIMIT 5`),
        ]);
        const u = userRows[0];
        const c = courseRows[0];
        const p = paymentRows[0];
        const e = enrollmentRows[0];
        return {
            users: {
                total: Number(u?.total ?? 0),
                active: Number(u?.active ?? 0),
                inactive: Number(u?.inactive ?? 0),
                suspended: Number(u?.suspended ?? 0),
                admins: Number(u?.admins ?? 0),
                teachers: Number(u?.teachers ?? 0),
                students: Number(u?.students ?? 0),
            },
            courses: {
                total: Number(c?.total ?? 0),
                published: Number(c?.published ?? 0),
                draft: Number(c?.draft ?? 0),
                hidden: Number(c?.hidden ?? 0),
            },
            payments: {
                total: Number(p?.total ?? 0),
                pending: Number(p?.pending ?? 0),
                paid: Number(p?.paid ?? 0),
                refunded: Number(p?.refunded ?? 0),
                revenueTotal: p?.revenueTotal ?? "0",
                refundsTotal: p?.refundsTotal ?? "0",
            },
            enrollments: {
                total: Number(e?.total ?? 0),
                active: Number(e?.active ?? 0),
                pending: Number(e?.pending ?? 0),
                cancelled: Number(e?.cancelled ?? 0),
                finished: Number(e?.finished ?? 0),
            },
            activity: {
                recentSignups: signupRows.map((r) => ({
                    id: Number(r.id),
                    nombres: r.nombres,
                    apellidos: r.apellidos,
                    correo: r.correo,
                    rol: r.rol,
                    estado: r.estado,
                    created_at: r.created_at,
                })),
                recentLogins: loginRows.map((r) => ({
                    id: Number(r.id),
                    nombres: r.nombres,
                    apellidos: r.apellidos,
                    correo: r.correo,
                    rol: r.rol,
                    estado: r.estado,
                    ultimo_login: r.ultimo_login,
                })),
                recentPayments: recentPaymentRows.map((r) => ({
                    id: Number(r.id),
                    usuario_id: Number(r.usuario_id),
                    estudiante: {
                        id: Number(r.usuario_id),
                        nombres: r.nombres,
                        apellidos: r.apellidos,
                        correo: r.correo,
                    },
                    curso: { titulo: r.curso_titulo, count: Number(r.cursos_count ?? 0) },
                    monto_total: r.monto_total,
                    metodo_pago: r.metodo_pago,
                    estado: r.estado,
                    created_at: r.created_at,
                    fecha_pago: r.fecha_pago,
                })),
            },
        };
    }
}
exports.AdminRepository = AdminRepository;
