"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentRepository = void 0;
const db_1 = require("../../config/db");
class PaymentRepository {
    proofDownloadPath(paymentId, proofValue) {
        return proofValue ? `/api/payments/${paymentId}/proof/download` : null;
    }
    buildWhere(q) {
        const where = ["1=1"];
        const params = [];
        if (q.estado) {
            where.push("p.estado = ?");
            params.push(q.estado);
        }
        if (q.metodo_pago) {
            where.push("p.metodo_pago = ?");
            params.push(q.metodo_pago);
        }
        if (q.usuario_id) {
            where.push("p.usuario_id = ?");
            params.push(q.usuario_id);
        }
        if (q.curso_id) {
            where.push("EXISTS (SELECT 1 FROM detalle_pagos dp WHERE dp.pago_id = p.id AND dp.curso_id = ?)");
            params.push(q.curso_id);
        }
        if (q.date_from) {
            where.push("DATE(p.created_at) >= ?");
            params.push(q.date_from);
        }
        if (q.date_to) {
            where.push("DATE(p.created_at) <= ?");
            params.push(q.date_to);
        }
        return { whereSql: where.join(" AND "), params };
    }
    async list(q) {
        const { whereSql, params } = this.buildWhere(q);
        const [countRows] = await db_1.pool.query(`SELECT COUNT(DISTINCT p.id) AS total
       FROM pagos p
       LEFT JOIN detalle_pagos dp ON dp.pago_id = p.id
       WHERE ${whereSql}`, params);
        const total = Number(countRows[0]?.total ?? 0);
        const [rows] = await db_1.pool.query(`SELECT
        p.id,
        p.referencia_pago,
        p.usuario_id,
        u.nombres,
        u.apellidos,
        u.correo,
        GROUP_CONCAT(DISTINCT c.titulo ORDER BY c.titulo SEPARATOR ' · ') AS cursos,
        p.monto_total,
        p.moneda,
        p.metodo_pago,
        p.estado,
        p.comprobante_url,
        p.fecha_pago,
        p.created_at
       FROM pagos p
       JOIN usuarios u ON u.id = p.usuario_id
       LEFT JOIN detalle_pagos dp ON dp.pago_id = p.id
       LEFT JOIN cursos c ON c.id = dp.curso_id
       WHERE ${whereSql}
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`, [...params, q.limit, q.offset]);
        const items = rows.map((r) => ({
            id: r.id,
            referencia_pago: r.referencia_pago,
            usuario: { id: r.usuario_id, nombres: r.nombres, apellidos: r.apellidos, correo: r.correo },
            cursos: r.cursos,
            monto_total: r.monto_total,
            moneda: r.moneda,
            metodo_pago: r.metodo_pago,
            estado: r.estado,
            comprobante_url: this.proofDownloadPath(r.id, r.comprobante_url),
            fecha_pago: r.fecha_pago,
            created_at: r.created_at,
        }));
        return { items, total };
    }
    async findById(id) {
        const [rows] = await db_1.pool.query(`SELECT
        p.id,
        p.referencia_pago,
        p.usuario_id,
        u.nombres,
        u.apellidos,
        u.correo,
        GROUP_CONCAT(DISTINCT c.titulo ORDER BY c.titulo SEPARATOR ' · ') AS cursos,
        p.metodo_pago,
        p.monto_total,
        p.moneda,
        p.estado,
        p.transaccion_externa,
        p.comprobante_url,
        p.observaciones,
        p.fecha_pago,
        p.created_at
       FROM pagos p
       JOIN usuarios u ON u.id = p.usuario_id
       LEFT JOIN detalle_pagos dp ON dp.pago_id = p.id
       LEFT JOIN cursos c ON c.id = dp.curso_id
       WHERE p.id = ?
       GROUP BY p.id
       LIMIT 1`, [id]);
        const base = rows[0];
        if (!base)
            return null;
        const [itemRows] = await db_1.pool.query(`SELECT
        dp.id,
        dp.curso_id,
        c.titulo,
        dp.precio_unitario,
        dp.descuento,
        dp.subtotal
       FROM detalle_pagos dp
       JOIN cursos c ON c.id = dp.curso_id
       WHERE dp.pago_id = ?
       ORDER BY dp.id ASC`, [id]);
        const items = itemRows.map((it) => ({
            id: it.id,
            curso: { id: it.curso_id, titulo: it.titulo },
            precio_unitario: it.precio_unitario,
            descuento: it.descuento,
            subtotal: it.subtotal,
        }));
        return {
            id: base.id,
            referencia_pago: base.referencia_pago,
            usuario: {
                id: base.usuario_id,
                nombres: base.nombres,
                apellidos: base.apellidos,
                correo: base.correo,
            },
            cursos: base.cursos,
            metodo_pago: base.metodo_pago,
            monto_total: base.monto_total,
            moneda: base.moneda,
            estado: base.estado,
            transaccion_externa: base.transaccion_externa,
            comprobante_url: this.proofDownloadPath(base.id, base.comprobante_url),
            observaciones: base.observaciones,
            fecha_pago: base.fecha_pago,
            created_at: base.created_at,
            items,
        };
    }
    async findProofById(id) {
        const [rows] = await db_1.pool.query(`SELECT id, usuario_id, comprobante_url
       FROM pagos
       WHERE id = ?
       LIMIT 1`, [id]);
        return rows[0] ?? null;
    }
    async updateStatus(id, estado) {
        const [res] = await db_1.pool.execute(`UPDATE pagos
       SET estado = ?,
           fecha_pago = CASE
             WHEN ? = 'pagado' THEN COALESCE(fecha_pago, NOW())
             ELSE fecha_pago
           END,
           updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [estado, estado, id]);
        return res.affectedRows;
    }
    async summary() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yyyy = monthStart.getFullYear();
        const mm = String(monthStart.getMonth() + 1).padStart(2, "0");
        const dd = String(monthStart.getDate()).padStart(2, "0");
        const monthStartStr = `${yyyy}-${mm}-${dd}`;
        const [rows] = await db_1.pool.query(`SELECT
        COALESCE(SUM(CASE WHEN estado = 'pagado' THEN monto_total ELSE 0 END), 0) AS totalRevenue,
        COALESCE(SUM(CASE WHEN estado = 'reembolsado' THEN monto_total ELSE 0 END), 0) AS refundsTotal,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendingCount,
        SUM(CASE WHEN estado = 'pagado' AND DATE(COALESCE(fecha_pago, created_at)) >= ? THEN 1 ELSE 0 END) AS monthPaidCount
       FROM pagos`, [monthStartStr]);
        const r = rows[0];
        return {
            totalRevenue: r?.totalRevenue ?? "0",
            monthPaidCount: Number(r?.monthPaidCount ?? 0),
            pendingCount: Number(r?.pendingCount ?? 0),
            refundsTotal: r?.refundsTotal ?? "0",
        };
    }
    async revenueByDay(days) {
        const [rows] = await db_1.pool.query(`SELECT
        DATE(COALESCE(fecha_pago, created_at)) AS date,
        COALESCE(SUM(monto_total), 0) AS total
       FROM pagos
       WHERE estado = 'pagado'
         AND DATE(COALESCE(fecha_pago, created_at)) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(COALESCE(fecha_pago, created_at))
       ORDER BY date ASC`, [days]);
        return rows.map((r) => ({ date: r.date, total: r.total }));
    }
    async findCourseForManualPayment(courseId) {
        const [rows] = await db_1.pool.query(`SELECT id, estado, tipo_acceso, precio, titulo
       FROM cursos
       WHERE id = ?
       LIMIT 1`, [courseId]);
        return rows[0] ?? null;
    }
    async findUserName(userId) {
        const [rows] = await db_1.pool.query(`SELECT nombres, apellidos
       FROM usuarios
       WHERE id = ?
       LIMIT 1`, [userId]);
        const r = rows[0];
        return r ? { nombres: r.nombres, apellidos: r.apellidos } : null;
    }
    async myCoursePayment(userId, courseId) {
        const [payRows] = await db_1.pool.query(`SELECT
        p.id, p.estado, p.metodo_pago, p.monto_total, p.moneda, p.comprobante_url, p.observaciones,
        p.created_at, p.fecha_pago
       FROM pagos p
       JOIN detalle_pagos dp ON dp.pago_id = p.id
       WHERE p.usuario_id = ?
         AND dp.curso_id = ?
       ORDER BY p.created_at DESC
       LIMIT 1`, [userId, courseId]);
        const [enrRows] = await db_1.pool.query(`SELECT id, estado, tipo_inscripcion
       FROM inscripciones
       WHERE usuario_id = ? AND curso_id = ?
       LIMIT 1`, [userId, courseId]);
        const p = payRows[0];
        const e = enrRows[0];
        return {
            payment: p
                ? {
                    id: p.id,
                    estado: p.estado,
                    metodo_pago: p.metodo_pago,
                    monto_total: p.monto_total,
                    moneda: p.moneda,
                    comprobante_url: this.proofDownloadPath(p.id, p.comprobante_url),
                    observaciones: p.observaciones,
                    created_at: p.created_at,
                    fecha_pago: p.fecha_pago,
                }
                : null,
            enrollment: e
                ? { id: e.id, estado: e.estado, tipo_inscripcion: e.tipo_inscripcion }
                : null,
        };
    }
    async myPaymentsCourses(userId) {
        const [rows] = await db_1.pool.query(`SELECT
        c.id AS course_id,
        c.titulo,
        c.slug,
        c.imagen_url,
        c.tipo_acceso,
        c.precio,
        c.nivel,
        c.estado AS course_estado,
        c.fecha_publicacion,

        p.id AS payment_id,
        p.estado AS payment_estado,
        p.metodo_pago,
        p.monto_total,
        p.moneda,
        p.comprobante_url,
        p.observaciones,
        p.created_at AS payment_created_at,
        p.fecha_pago,

        i.id AS enrollment_id,
        i.estado AS enrollment_estado,
        i.tipo_inscripcion
       FROM pagos p
       JOIN detalle_pagos dp ON dp.pago_id = p.id
       JOIN cursos c ON c.id = dp.curso_id
       LEFT JOIN inscripciones i ON i.usuario_id = p.usuario_id AND i.curso_id = c.id
       WHERE p.usuario_id = ?
       ORDER BY p.created_at DESC`, [userId]);
        const byCourse = new Map();
        for (const r of rows) {
            const existing = byCourse.get(r.course_id);
            if (!existing) {
                byCourse.set(r.course_id, {
                    course: {
                        id: r.course_id,
                        titulo: r.titulo,
                        slug: r.slug,
                        imagen_url: r.imagen_url,
                        tipo_acceso: r.tipo_acceso,
                        precio: r.precio,
                        nivel: r.nivel,
                        estado: r.course_estado,
                        fecha_publicacion: r.fecha_publicacion,
                    },
                    latestPayment: {
                        id: r.payment_id,
                        estado: r.payment_estado,
                        metodo_pago: r.metodo_pago,
                        monto_total: r.monto_total,
                        moneda: r.moneda,
                        comprobante_url: this.proofDownloadPath(r.payment_id, r.comprobante_url),
                        observaciones: r.observaciones,
                        created_at: r.payment_created_at,
                        fecha_pago: r.fecha_pago,
                    },
                    enrollment: r.enrollment_id && r.enrollment_estado && r.tipo_inscripcion
                        ? {
                            id: r.enrollment_id,
                            estado: r.enrollment_estado,
                            tipo_inscripcion: r.tipo_inscripcion,
                        }
                        : null,
                    paymentsCount: 1,
                    _seenPaymentIds: new Set([r.payment_id]),
                });
                continue;
            }
            if (!existing._seenPaymentIds.has(r.payment_id)) {
                existing._seenPaymentIds.add(r.payment_id);
                existing.paymentsCount += 1;
            }
            // Mantener enrollment si antes era null y ahora existe.
            if (!existing.enrollment && r.enrollment_id && r.enrollment_estado && r.tipo_inscripcion) {
                existing.enrollment = {
                    id: r.enrollment_id,
                    estado: r.enrollment_estado,
                    tipo_inscripcion: r.tipo_inscripcion,
                };
            }
        }
        return Array.from(byCourse.values()).map(({ _seenPaymentIds, ...rest }) => rest);
    }
    async myCoursePaymentHistory(userId, courseId) {
        const [rows] = await db_1.pool.query(`SELECT
        p.id, p.estado, p.metodo_pago, p.monto_total, p.moneda, p.comprobante_url, p.observaciones,
        p.created_at, p.fecha_pago
       FROM pagos p
       JOIN detalle_pagos dp ON dp.pago_id = p.id
       WHERE p.usuario_id = ?
         AND dp.curso_id = ?
       ORDER BY p.created_at DESC
       LIMIT 50`, [userId, courseId]);
        return rows.map((p) => ({
            id: p.id,
            estado: p.estado,
            metodo_pago: p.metodo_pago,
            monto_total: p.monto_total,
            moneda: p.moneda,
            comprobante_url: this.proofDownloadPath(p.id, p.comprobante_url),
            observaciones: p.observaciones,
            created_at: p.created_at,
            fecha_pago: p.fecha_pago,
        }));
    }
    async findPendingPaymentIdForUserCourse(conn, userId, courseId) {
        const [rows] = await conn.query(`SELECT p.id
       FROM pagos p
       JOIN detalle_pagos dp ON dp.pago_id = p.id
       WHERE p.usuario_id = ?
         AND p.estado = 'pendiente'
         AND dp.curso_id = ?
       ORDER BY p.created_at DESC
       LIMIT 1`, [userId, courseId]);
        return rows[0]?.id ?? null;
    }
    async updatePendingPaymentProof(conn, paymentId, metodo, comprobanteUrl) {
        const [rows] = await conn.query(`SELECT comprobante_url
       FROM pagos
       WHERE id = ?
       LIMIT 1`, [paymentId]);
        const previousProof = rows[0]?.comprobante_url ?? null;
        await conn.execute(`UPDATE pagos
       SET metodo_pago = ?, comprobante_url = ?, observaciones = NULL, updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [metodo, comprobanteUrl, paymentId]);
        return previousProof;
    }
    async createManualPayment(conn, input) {
        const [res] = await conn.execute(`INSERT INTO pagos
        (usuario_id, referencia_pago, metodo_pago, monto_total, moneda, estado, comprobante_url, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, ?, 'pendiente', ?, NOW(), NOW())`, [input.userId, input.referencia, input.metodo, input.monto_total, input.moneda, input.comprobanteUrl]);
        return res.insertId;
    }
    async createPaymentDetail(conn, input) {
        await conn.execute(`INSERT INTO detalle_pagos (pago_id, curso_id, precio_unitario, descuento, subtotal, created_at, updated_at)
       VALUES (?, ?, ?, 0.00, ?, NOW(), NOW())`, [input.pago_id, input.curso_id, input.precio_unitario, input.precio_unitario]);
    }
    async findEnrollmentForUserCourse(conn, userId, courseId) {
        const [rows] = await conn.query(`SELECT id, estado, tipo_inscripcion
       FROM inscripciones
       WHERE usuario_id = ? AND curso_id = ?
       LIMIT 1`, [userId, courseId]);
        return rows[0] ?? null;
    }
    async hasPaidPaymentForUserCourse(conn, userId, courseId) {
        const [rows] = await conn.query(`SELECT p.id
       FROM pagos p
       JOIN detalle_pagos dp ON dp.pago_id = p.id
       WHERE p.usuario_id = ?
         AND p.estado = 'pagado'
         AND dp.curso_id = ?
       LIMIT 1`, [userId, courseId]);
        return Boolean(rows[0]);
    }
    async createEnrollmentPendingPaid(conn, userId, courseId) {
        const [res] = await conn.execute(`INSERT INTO inscripciones
        (usuario_id, curso_id, tipo_inscripcion, estado, progreso, fecha_inscripcion, created_at, updated_at)
       VALUES
        (?, ?, 'pagada', 'pendiente', 0.00, NOW(), NOW(), NOW())`, [userId, courseId]);
        return res.insertId;
    }
    async updateEnrollmentToPendingPaid(conn, id) {
        await conn.execute(`UPDATE inscripciones
       SET tipo_inscripcion = 'pagada', estado = 'pendiente', updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [id]);
    }
    async updateEnrollmentStatusByUserCourse(conn, userId, courseId, status) {
        await conn.execute(`UPDATE inscripciones
       SET tipo_inscripcion = 'pagada', estado = ?, updated_at = NOW()
       WHERE usuario_id = ? AND curso_id = ?
       LIMIT 1`, [status, userId, courseId]);
    }
    async createEnrollmentActivePaid(conn, userId, courseId) {
        await conn.execute(`INSERT INTO inscripciones
        (usuario_id, curso_id, tipo_inscripcion, estado, progreso, fecha_inscripcion, created_at, updated_at)
       VALUES
        (?, ?, 'pagada', 'activa', 0.00, NOW(), NOW(), NOW())`, [userId, courseId]);
    }
    async updateStatusWithObservaciones(conn, id, estado, observaciones) {
        const [res] = await conn.execute(`UPDATE pagos
       SET estado = ?,
           observaciones = ?,
           fecha_pago = CASE
             WHEN ? = 'pagado' THEN COALESCE(fecha_pago, NOW())
             ELSE fecha_pago
           END,
           updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [estado, observaciones ?? null, estado, id]);
        return res.affectedRows;
    }
    async findPaymentUser(conn, id) {
        const [rows] = await conn.query(`SELECT usuario_id FROM pagos WHERE id = ? LIMIT 1`, [id]);
        return rows[0]?.usuario_id ?? null;
    }
    async listCourseIdsByPaymentId(conn, id) {
        const [rows] = await conn.query(`SELECT curso_id FROM detalle_pagos WHERE pago_id = ? ORDER BY id ASC`, [id]);
        return rows.map((r) => Number(r.curso_id));
    }
}
exports.PaymentRepository = PaymentRepository;
