export type AttendanceStatus = "presente" | "ausente" | "tarde" | "justificado";

export type AttendanceItem = {
  estudiante: {
    id: number;
    nombres: string;
    apellidos: string;
    correo: string;
    foto_url: string | null;
  };
  asistencia: null | {
    id: number;
    fecha: string;
    estado: AttendanceStatus;
    comentario: string | null;
    registrado_por: number;
  };
};

export type AttendanceListResponse = {
  date: string;
  items: AttendanceItem[];
};

