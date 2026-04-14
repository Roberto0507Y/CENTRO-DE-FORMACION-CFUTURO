import type { PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../../config/db";
import type {
  ListPaymentsQuery,
  ManualCoursePaymentInput,
  MyCoursePayment,
  MyPaymentHistoryItem,
  MyPaymentsCourseItem,
  PaymentDetail,
  PaymentDetailItem,
  PaymentListItem,
  PaymentsSummary,
  RevenuePoint,
} from "./payment.types";
import type { PaymentMethod, PaymentStatus } from "./payment.types";

type PaymentListRow = RowDataPacket & {
  id: number;
  referencia_pago: string;
  usuario_id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  cursos: string | null;
  monto_total: string;
  moneda: string;
  metodo_pago: PaymentListItem["metodo_pago"];
  estado: PaymentListItem["estado"];
  comprobante_url: string | null;
  fecha_pago: string | null;
  created_at: string;
};

type PaymentDetailRow = RowDataPacket & Omit<PaymentDetail, "usuario" | "items" | "cursos"> & {
  usuario_id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  cursos: string | null;
};

type PaymentItemRow = RowDataPacket & {
  id: number;
  curso_id: number;
  titulo: string;
  precio_unitario: string;
  descuento: string;
  subtotal: string;
};

type SummaryRow = RowDataPacket & {
  totalRevenue: string;
  monthPaidCount: number;
  pendingCount: number;
  refundsTotal: string;
};

type RevenueRow = RowDataPacket & { date: string; total: string };

type CoursePayRow = RowDataPacket & {
  id: number;
  estado: "borrador" | "publicado" | "oculto";
  tipo_acceso: "gratis" | "pago";
  precio: string;
  titulo: string;
};

type MyPaymentRow = RowDataPacket & {
  id: number;
  estado: PaymentStatus;
  metodo_pago: PaymentMethod;
  monto_total: string;
  moneda: string;
  comprobante_url: string | null;
  observaciones: string | null;
  created_at: string;
  fecha_pago: string | null;
};

type MyEnrollmentRow = RowDataPacket & {
  id: number;
  estado: "activa" | "pendiente" | "cancelada" | "finalizada";
  tipo_inscripcion: "gratis" | "pagada";
};

type PendingPaymentRow = RowDataPacket & { id: number };
type PaidPaymentRow = RowDataPacket & { id: number };

type PaymentMetaRow = RowDataPacket & { usuario_id: number };
type PaymentCourseRow = RowDataPacket & { curso_id: number };
type PaymentProofRow = RowDataPacket & {
  id: number;
  usuario_id: number;
  comprobante_url: string | null;
};

type MyPaymentsCourseRow = RowDataPacket & {
  course_id: number;
  titulo: string;
  slug: string;
  imagen_url: string | null;
  tipo_acceso: "gratis" | "pago";
  precio: string;
  nivel: "basico" | "intermedio" | "avanzado";
  course_estado: "borrador" | "publicado" | "oculto";
  fecha_publicacion: string | null;

  payment_id: number;
  payment_estado: PaymentStatus;
  metodo_pago: PaymentMethod;
  monto_total: string;
  moneda: string;
  comprobante_url: string | null;
  observaciones: string | null;
  payment_created_at: string;
  fecha_pago: string | null;

  enrollment_id: number | null;
  enrollment_estado: "activa" | "pendiente" | "cancelada" | "finalizada" | null;
  tipo_inscripcion: "gratis" | "pagada" | null;
};

type UserNameRow = RowDataPacket & { nombres: string; apellidos: string };

export class PaymentRepository {
  private proofDownloadPath(paymentId: number, proofValue: string | null): string | null {
    return proofValue ? `/api/payments/${paymentId}/proof/download` : null;
  }

  private normalizeWindow(q: ListPaymentsQuery): Pick<ListPaymentsQuery, "limit" | "offset"> {
    return {
      limit: Math.max(1, Math.min(Number(q.limit) || 20, 100)),
      offset: Math.max(0, Number(q.offset) || 0),
    };
  }

  private buildWhere(q: ListPaymentsQuery) {
    const where: string[] = ["1=1"];
    const params: Array<string | number> = [];

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
      where.push("p.created_at >= ?");
      params.push(q.date_from);
    }
    if (q.date_to) {
      where.push("p.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(q.date_to);
    }

    return { whereSql: where.join(" AND "), params };
  }

  async list(q: ListPaymentsQuery): Promise<{ items: PaymentListItem[]; total: number }> {
    const { whereSql, params } = this.buildWhere(q);
    const { limit, offset } = this.normalizeWindow(q);

    const [countResult, rowsResult] = await Promise.all([
      pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
         FROM pagos p
         WHERE ${whereSql}`,
        params
      ),
      pool.query<PaymentListRow[]>(
        `SELECT
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
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
    ]);
    const [countRows] = countResult;
    const total = Number((countRows[0] as { total?: unknown } | undefined)?.total ?? 0);

    const [rows] = rowsResult;

    const items: PaymentListItem[] = rows.map((r) => ({
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

  async findById(id: number): Promise<PaymentDetail | null> {
    const [rows] = await pool.query<PaymentDetailRow[]>(
      `SELECT
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
       LIMIT 1`,
      [id]
    );
    const base = rows[0];
    if (!base) return null;

    const [itemRows] = await pool.query<PaymentItemRow[]>(
      `SELECT
        dp.id,
        dp.curso_id,
        c.titulo,
        dp.precio_unitario,
        dp.descuento,
        dp.subtotal
       FROM detalle_pagos dp
       JOIN cursos c ON c.id = dp.curso_id
       WHERE dp.pago_id = ?
       ORDER BY dp.id ASC`,
      [id]
    );

    const items: PaymentDetailItem[] = itemRows.map((it) => ({
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

  async findProofById(id: number): Promise<PaymentProofRow | null> {
    const [rows] = await pool.query<PaymentProofRow[]>(
      `SELECT id, usuario_id, comprobante_url
       FROM pagos
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async updateStatus(id: number, estado: "pendiente" | "pagado" | "reembolsado"): Promise<number> {
    const [res] = await pool.execute<ResultSetHeader>(
      `UPDATE pagos
       SET estado = ?,
           fecha_pago = CASE
             WHEN ? = 'pagado' THEN COALESCE(fecha_pago, NOW())
             ELSE fecha_pago
           END,
           updated_at = NOW()
       WHERE id = ?
       LIMIT 1`,
      [estado, estado, id]
    );
    return res.affectedRows;
  }

  async summary(): Promise<PaymentsSummary> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yyyy = monthStart.getFullYear();
    const mm = String(monthStart.getMonth() + 1).padStart(2, "0");
    const dd = String(monthStart.getDate()).padStart(2, "0");
    const monthStartStr = `${yyyy}-${mm}-${dd}`;

    const [rows] = await pool.query<SummaryRow[]>(
      `SELECT
        COALESCE(SUM(CASE WHEN estado = 'pagado' THEN monto_total ELSE 0 END), 0) AS totalRevenue,
        COALESCE(SUM(CASE WHEN estado = 'reembolsado' THEN monto_total ELSE 0 END), 0) AS refundsTotal,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendingCount,
        SUM(CASE WHEN estado = 'pagado' AND DATE(COALESCE(fecha_pago, created_at)) >= ? THEN 1 ELSE 0 END) AS monthPaidCount
       FROM pagos`,
      [monthStartStr]
    );
    const r = rows[0];
    return {
      totalRevenue: r?.totalRevenue ?? "0",
      monthPaidCount: Number(r?.monthPaidCount ?? 0),
      pendingCount: Number(r?.pendingCount ?? 0),
      refundsTotal: r?.refundsTotal ?? "0",
    };
  }

  async revenueByDay(days: number): Promise<RevenuePoint[]> {
    const [rows] = await pool.query<RevenueRow[]>(
      `SELECT
        DATE(COALESCE(fecha_pago, created_at)) AS date,
        COALESCE(SUM(monto_total), 0) AS total
       FROM pagos
       WHERE estado = 'pagado'
         AND DATE(COALESCE(fecha_pago, created_at)) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(COALESCE(fecha_pago, created_at))
       ORDER BY date ASC`,
      [days]
    );
    return rows.map((r) => ({ date: r.date, total: r.total }));
  }

  async findCourseForManualPayment(courseId: number): Promise<CoursePayRow | null> {
    const [rows] = await pool.query<CoursePayRow[]>(
      `SELECT id, estado, tipo_acceso, precio, titulo
       FROM cursos
       WHERE id = ?
       LIMIT 1`,
      [courseId]
    );
    return rows[0] ?? null;
  }

  async findUserName(userId: number): Promise<{ nombres: string; apellidos: string } | null> {
    const [rows] = await pool.query<UserNameRow[]>(
      `SELECT nombres, apellidos
       FROM usuarios
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );
    const r = rows[0];
    return r ? { nombres: r.nombres, apellidos: r.apellidos } : null;
  }

  async myCoursePayment(userId: number, courseId: number): Promise<MyCoursePayment> {
    const [[payRows], [enrRows]] = await Promise.all([
      pool.query<MyPaymentRow[]>(
        `SELECT
          p.id, p.estado, p.metodo_pago, p.monto_total, p.moneda, p.comprobante_url, p.observaciones,
          p.created_at, p.fecha_pago
         FROM pagos p
         JOIN detalle_pagos dp ON dp.pago_id = p.id
         WHERE p.usuario_id = ?
           AND dp.curso_id = ?
         ORDER BY p.created_at DESC
         LIMIT 1`,
        [userId, courseId]
      ),
      pool.query<MyEnrollmentRow[]>(
        `SELECT id, estado, tipo_inscripcion
         FROM inscripciones
         WHERE usuario_id = ? AND curso_id = ?
         LIMIT 1`,
        [userId, courseId]
      ),
    ]);

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

  async myPaymentsCourses(userId: number): Promise<MyPaymentsCourseItem[]> {
    const [rows] = await pool.query<MyPaymentsCourseRow[]>(
      `SELECT
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
       ORDER BY p.created_at DESC`,
      [userId]
    );

    const byCourse = new Map<number, MyPaymentsCourseItem & { _seenPaymentIds: Set<number> }>();

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
          enrollment:
            r.enrollment_id && r.enrollment_estado && r.tipo_inscripcion
              ? {
                  id: r.enrollment_id,
                  estado: r.enrollment_estado,
                  tipo_inscripcion: r.tipo_inscripcion,
                }
              : null,
          paymentsCount: 1,
          _seenPaymentIds: new Set<number>([r.payment_id]),
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

  async myCoursePaymentHistory(userId: number, courseId: number): Promise<MyPaymentHistoryItem[]> {
    const [rows] = await pool.query<MyPaymentRow[]>(
      `SELECT
        p.id, p.estado, p.metodo_pago, p.monto_total, p.moneda, p.comprobante_url, p.observaciones,
        p.created_at, p.fecha_pago
       FROM pagos p
       JOIN detalle_pagos dp ON dp.pago_id = p.id
       WHERE p.usuario_id = ?
         AND dp.curso_id = ?
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [userId, courseId]
    );

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

  async findPendingPaymentIdForUserCourse(
    conn: PoolConnection,
    userId: number,
    courseId: number
  ): Promise<number | null> {
    const [rows] = await conn.query<PendingPaymentRow[]>(
      `SELECT p.id
       FROM pagos p
       JOIN detalle_pagos dp ON dp.pago_id = p.id
       WHERE p.usuario_id = ?
         AND p.estado = 'pendiente'
         AND dp.curso_id = ?
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [userId, courseId]
    );
    return rows[0]?.id ?? null;
  }

  async updatePendingPaymentProof(
    conn: PoolConnection,
    paymentId: number,
    metodo: ManualCoursePaymentInput["metodo_pago"],
    comprobanteUrl: string
  ): Promise<string | null> {
    const [rows] = await conn.query<(RowDataPacket & { comprobante_url: string | null })[]>(
      `SELECT comprobante_url
       FROM pagos
       WHERE id = ?
       LIMIT 1`,
      [paymentId]
    );
    const previousProof = rows[0]?.comprobante_url ?? null;

    await conn.execute(
      `UPDATE pagos
       SET metodo_pago = ?, comprobante_url = ?, observaciones = NULL, updated_at = NOW()
       WHERE id = ?
       LIMIT 1`,
      [metodo, comprobanteUrl, paymentId]
    );
    return previousProof;
  }

  async createManualPayment(
    conn: PoolConnection,
    input: {
      userId: number;
      referencia: string;
      metodo: ManualCoursePaymentInput["metodo_pago"];
      monto_total: string;
      moneda: string;
      comprobanteUrl: string;
    }
  ): Promise<number> {
    const [res] = await conn.execute<ResultSetHeader>(
      `INSERT INTO pagos
        (usuario_id, referencia_pago, metodo_pago, monto_total, moneda, estado, comprobante_url, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, ?, 'pendiente', ?, NOW(), NOW())`,
      [input.userId, input.referencia, input.metodo, input.monto_total, input.moneda, input.comprobanteUrl]
    );
    return res.insertId;
  }

  async createPaymentDetail(
    conn: PoolConnection,
    input: { pago_id: number; curso_id: number; precio_unitario: string }
  ): Promise<void> {
    await conn.execute(
      `INSERT INTO detalle_pagos (pago_id, curso_id, precio_unitario, descuento, subtotal, created_at, updated_at)
       VALUES (?, ?, ?, 0.00, ?, NOW(), NOW())`,
      [input.pago_id, input.curso_id, input.precio_unitario, input.precio_unitario]
    );
  }

  async findEnrollmentForUserCourse(
    conn: PoolConnection,
    userId: number,
    courseId: number
  ): Promise<MyEnrollmentRow | null> {
    const [rows] = await conn.query<MyEnrollmentRow[]>(
      `SELECT id, estado, tipo_inscripcion
       FROM inscripciones
       WHERE usuario_id = ? AND curso_id = ?
       LIMIT 1`,
      [userId, courseId]
    );
    return rows[0] ?? null;
  }

  async hasPaidPaymentForUserCourse(
    conn: PoolConnection,
    userId: number,
    courseId: number
  ): Promise<boolean> {
    const [rows] = await conn.query<PaidPaymentRow[]>(
      `SELECT p.id
       FROM pagos p
       JOIN detalle_pagos dp ON dp.pago_id = p.id
       WHERE p.usuario_id = ?
         AND p.estado = 'pagado'
         AND dp.curso_id = ?
       LIMIT 1`,
      [userId, courseId]
    );
    return Boolean(rows[0]);
  }

  async createEnrollmentPendingPaid(
    conn: PoolConnection,
    userId: number,
    courseId: number
  ): Promise<number> {
    const [res] = await conn.execute<ResultSetHeader>(
      `INSERT INTO inscripciones
        (usuario_id, curso_id, tipo_inscripcion, estado, progreso, fecha_inscripcion, created_at, updated_at)
       VALUES
        (?, ?, 'pagada', 'pendiente', 0.00, NOW(), NOW(), NOW())`,
      [userId, courseId]
    );
    return res.insertId;
  }

  async updateEnrollmentToPendingPaid(conn: PoolConnection, id: number): Promise<void> {
    await conn.execute(
      `UPDATE inscripciones
       SET tipo_inscripcion = 'pagada', estado = 'pendiente', updated_at = NOW()
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
  }

  async updateEnrollmentStatusByUserCourse(
    conn: PoolConnection,
    userId: number,
    courseId: number,
    status: "activa" | "cancelada"
  ): Promise<void> {
    await conn.execute(
      `UPDATE inscripciones
       SET tipo_inscripcion = 'pagada', estado = ?, updated_at = NOW()
       WHERE usuario_id = ? AND curso_id = ?
       LIMIT 1`,
      [status, userId, courseId]
    );
  }

  async createEnrollmentActivePaid(conn: PoolConnection, userId: number, courseId: number): Promise<void> {
    await conn.execute(
      `INSERT INTO inscripciones
        (usuario_id, curso_id, tipo_inscripcion, estado, progreso, fecha_inscripcion, created_at, updated_at)
       VALUES
        (?, ?, 'pagada', 'activa', 0.00, NOW(), NOW(), NOW())`,
      [userId, courseId]
    );
  }

  async updateStatusWithObservaciones(
    conn: PoolConnection,
    id: number,
    estado: PaymentStatus,
    observaciones: string | null | undefined
  ): Promise<number> {
    const [res] = await conn.execute<ResultSetHeader>(
      `UPDATE pagos
       SET estado = ?,
           observaciones = ?,
           fecha_pago = CASE
             WHEN ? = 'pagado' THEN COALESCE(fecha_pago, NOW())
             ELSE fecha_pago
           END,
           updated_at = NOW()
       WHERE id = ?
       LIMIT 1`,
      [estado, observaciones ?? null, estado, id]
    );
    return res.affectedRows;
  }

  async findPaymentUser(conn: PoolConnection, id: number): Promise<number | null> {
    const [rows] = await conn.query<PaymentMetaRow[]>(
      `SELECT usuario_id FROM pagos WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0]?.usuario_id ?? null;
  }

  async listCourseIdsByPaymentId(conn: PoolConnection, id: number): Promise<number[]> {
    const [rows] = await conn.query<PaymentCourseRow[]>(
      `SELECT curso_id FROM detalle_pagos WHERE pago_id = ? ORDER BY id ASC`,
      [id]
    );
    return rows.map((r) => Number(r.curso_id));
  }
}
