export type AdminMetrics = {
  users: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    admins: number;
    teachers: number;
    students: number;
  };
  courses: {
    total: number;
    published: number;
    draft: number;
    hidden: number;
  };
  payments: {
    total: number;
    pending: number;
    paid: number;
    refunded: number;
    revenueTotal: string;
    refundsTotal: string;
  };
  enrollments: {
    total: number;
    active: number;
    pending: number;
    cancelled: number;
    finished: number;
  };
  activity: {
    recentSignups: Array<{
      id: number;
      nombres: string;
      apellidos: string;
      correo: string;
      rol: "admin" | "docente" | "estudiante";
      estado: "activo" | "inactivo" | "suspendido";
      created_at: string;
    }>;
    recentLogins: Array<{
      id: number;
      nombres: string;
      apellidos: string;
      correo: string;
      rol: "admin" | "docente" | "estudiante";
      estado: "activo" | "inactivo" | "suspendido";
      ultimo_login: string;
    }>;
    recentPayments: Array<{
      id: number;
      usuario_id: number;
      estudiante: {
        id: number;
        nombres: string;
        apellidos: string;
        correo: string;
      };
      curso: { titulo: string | null; count: number };
      monto_total: string;
      metodo_pago: string;
      estado: string;
      created_at: string;
      fecha_pago: string | null;
    }>;
  };
};
