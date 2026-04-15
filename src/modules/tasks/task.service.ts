import { badRequest, forbidden, notFound, serviceUnavailable } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { ALLOWED_TASK_FILES } from "../../common/services/storage.service";
import { NotificationService } from "../notifications/notification.service";
import { FileAssetService } from "../files/fileAsset.service";
import { TaskRepository } from "./task.repository";
import type {
  CreateTaskInput,
  Task,
  TaskSubmission,
  TaskSubmissionList,
  TaskSubmissionWithStudent,
  TaskSubmissionFilter,
  UpdateTaskInput,
  GradeSubmissionInput,
  ListSubmissionsQuery,
  UpsertSubmissionInput,
} from "./task.types";

function parseMysqlDatetime(dt: string | null): Date | null {
  if (!dt) return null;
  const d = new Date(dt.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

function getEffectiveTaskClose(entrega: Date | null, cierre: Date | null): Date | null {
  if (!cierre) return null;
  if (!entrega) return cierre;
  // Evita que un cierre viejo deje bloqueada la tarea si la entrega fue extendida después.
  return cierre.getTime() < entrega.getTime() ? entrega : cierre;
}

const MAX_STUDENT_FILE_UPLOADS_PER_TASK = 3;
const DEFAULT_SUBMISSIONS_LIMIT = 50;
const MAX_SUBMISSIONS_LIMIT = 50;

function normalizeSubmissionsPagination(query: Partial<ListSubmissionsQuery> | null | undefined): ListSubmissionsQuery {
  const rawLimit = Number(query?.limit);
  const rawOffset = Number(query?.offset);
  const filter: TaskSubmissionFilter = query?.filter === "no_entregados" ? "no_entregados" : "todos";

  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_SUBMISSIONS_LIMIT)
      : DEFAULT_SUBMISSIONS_LIMIT;
  const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  return { limit, offset, filter };
}

export class TaskService {
  private readonly repo = new TaskRepository();
  private readonly files = new FileAssetService();
  private readonly notifications = new NotificationService();

  async listByCourse(requester: AuthContext, courseId: number): Promise<Task[]> {
    const ctx = await this.repo.findCourseOwner(courseId);
    if (!ctx) throw notFound("Curso no encontrado");

    if (requester.role === "admin") return this.repo.listByCourse(courseId);
    if (requester.role === "docente") {
      this.assertCanManage(requester, ctx.docente_id);
      return this.repo.listByCourse(courseId);
    }

    // estudiante: solo publicadas y requiere inscripción activa
    if (ctx.curso_estado !== "publicado") throw notFound("Curso no encontrado");
    const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
    if (!enrolled) throw forbidden("No tienes acceso a este curso");
    return this.repo.listPublishedByCourse(courseId);
  }

  async getById(requester: AuthContext, id: number): Promise<Task> {
    const ctx = await this.repo.getTaskContextFull(id);
    if (!ctx) throw notFound("Tarea no encontrada");

    if (requester.role === "admin") {
      const task = await this.repo.findById(id);
      if (!task) throw notFound("Tarea no encontrada");
      return task;
    }

    if (requester.role === "docente") {
      this.assertCanManage(requester, ctx.docente_id);
      const task = await this.repo.findById(id);
      if (!task) throw notFound("Tarea no encontrada");
      return task;
    }

    // estudiante
    if (ctx.curso_estado !== "publicado") throw notFound("Tarea no encontrada");
    const enrolled = await this.repo.userIsEnrolledActive(requester.userId, ctx.curso_id);
    if (!enrolled) throw forbidden("No tienes acceso a este curso");
    if (ctx.tarea_estado !== "publicada") throw notFound("Tarea no encontrada");
    const task = await this.repo.findById(id);
    if (!task) throw notFound("Tarea no encontrada");
    return task;
  }

  async create(
    requester: AuthContext,
    courseId: number,
    input: CreateTaskInput,
    file?: Express.Multer.File
  ): Promise<Task> {
    const ctx = await this.repo.findCourseOwner(courseId);
    if (!ctx) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, ctx.docente_id);
    if (input.archivo_url) throw badRequest("No puedes asignar archivo_url manualmente. Sube un archivo.");

    const uploadedUrl = file
      ? await this.uploadTaskFile(requester, file, `tasks/instructions/course-${courseId}`, courseId, "course")
      : null;

    let id: number;
    try {
      id = await this.repo.create(courseId, {
        ...input,
        titulo: input.titulo.trim(),
        archivo_url: uploadedUrl,
        enlace_url: input.enlace_url ?? null,
      });
    } catch (err) {
      await this.deleteManagedFile(uploadedUrl);
      throw err;
    }
    const task = await this.repo.findById(id);
    if (!task) throw new Error("No se pudo crear la tarea");
    return task;
  }

  async update(
    requester: AuthContext,
    id: number,
    input: UpdateTaskInput,
    file?: Express.Multer.File
  ): Promise<Task> {
    const ctx = await this.repo.getTaskContext(id);
    if (!ctx) throw notFound("Tarea no encontrada");
    this.assertCanManage(requester, ctx.docente_id);

    const current = await this.repo.findById(id);
    if (!current) throw notFound("Tarea no encontrada");
    if (input.archivo_url && !file) throw badRequest("No puedes asignar archivo_url manualmente. Sube un archivo.");

    const nextEntrega = input.fecha_entrega ?? current.fecha_entrega;
    const nextEntregaDate = parseMysqlDatetime(nextEntrega);
    const currentCloseDate = parseMysqlDatetime(current.fecha_cierre);
    const normalizedInput: UpdateTaskInput = { ...input };

    if (
      input.fecha_entrega !== undefined &&
      input.fecha_cierre === undefined &&
      currentCloseDate &&
      nextEntregaDate &&
      currentCloseDate.getTime() < nextEntregaDate.getTime()
    ) {
      normalizedInput.fecha_cierre = nextEntrega;
    }

    const uploadedUrl = file
      ? await this.uploadTaskFile(requester, file, `tasks/instructions/course-${ctx.curso_id}/task-${id}`, ctx.curso_id, "course")
      : null;
    const shouldClearFile = input.archivo_url === null;

    try {
      await this.repo.updateById(id, {
        ...normalizedInput,
        titulo: normalizedInput.titulo?.trim(),
        archivo_url: uploadedUrl ?? (shouldClearFile ? null : undefined),
      });
    } catch (err) {
      await this.deleteManagedFile(uploadedUrl);
      throw err;
    }

    if ((uploadedUrl || shouldClearFile) && current.archivo_url !== uploadedUrl) {
      await this.deleteManagedFile(current.archivo_url);
    }

    const task = await this.repo.findById(id);
    if (!task) throw notFound("Tarea no encontrada");
    return task;
  }

  async close(requester: AuthContext, id: number): Promise<void> {
    const ctx = await this.repo.getTaskContext(id);
    if (!ctx) throw notFound("Tarea no encontrada");
    this.assertCanManage(requester, ctx.docente_id);
    const ok = await this.repo.closeById(id);
    if (!ok) throw notFound("Tarea no encontrada");
  }

  async submitMyWork(
    requester: AuthContext,
    taskId: number,
    input: UpsertSubmissionInput,
    file?: Express.Multer.File
  ): Promise<TaskSubmission> {
    if (requester.role !== "estudiante") throw forbidden("No autorizado");

    const ctx = await this.repo.getTaskContextFull(taskId);
    if (!ctx) throw notFound("Tarea no encontrada");
    if (ctx.curso_estado !== "publicado") throw notFound("Tarea no encontrada");
    if (ctx.tarea_estado !== "publicada") throw forbidden("La tarea no está disponible");

    const enrolled = await this.repo.userIsEnrolledActive(requester.userId, ctx.curso_id);
    if (!enrolled) throw forbidden("No tienes acceso a este curso");

    const now = new Date();
    const apertura = parseMysqlDatetime(ctx.fecha_apertura);
    const entrega = parseMysqlDatetime(ctx.fecha_entrega);
    const cierre = getEffectiveTaskClose(entrega, parseMysqlDatetime(ctx.fecha_cierre));

    if (apertura && now.getTime() < apertura.getTime()) {
      throw forbidden("La tarea aún no está disponible");
    }
    if (cierre && now.getTime() > cierre.getTime()) {
      throw forbidden("La tarea está cerrada");
    }
    const isLate = entrega ? now.getTime() > entrega.getTime() : false;
    if (isLate && !ctx.permite_entrega_tardia) {
      throw forbidden("La fecha de entrega ya pasó");
    }
    if (input.archivo_url && !file) throw badRequest("No puedes asignar archivo_url manualmente. Sube un archivo.");

    const previous = await this.repo.findMySubmission(taskId, requester.userId);
    const comentarioEstudiante =
      input.comentario_estudiante === undefined
        ? previous?.comentario_estudiante ?? null
        : input.comentario_estudiante?.toString().trim() || null;

    const isCommentOnlyUpdate =
      Boolean(previous) &&
      !file &&
      input.archivo_url === undefined &&
      input.enlace_url === undefined &&
      input.comentario_estudiante !== undefined;
    if (isCommentOnlyUpdate) {
      await this.repo.updateSubmissionComment(taskId, requester.userId, comentarioEstudiante);
      const updated = await this.repo.findMySubmission(taskId, requester.userId);
      if (!updated) throw new Error("No se pudo guardar la entrega");
      return updated;
    }

    const hasSomething =
      Boolean(file) ||
      Boolean(input.enlace_url) ||
      Boolean(comentarioEstudiante);
    if (!hasSomething) {
      throw badRequest("Debes agregar un archivo, enlace o comentario");
    }

    if (file) {
      await this.assertStudentUploadLimit(previous);
    }

    const uploadedUrl = file
      ? await this.uploadTaskFile(requester, file, `tasks/submissions/task-${taskId}/student-${requester.userId}`, ctx.curso_id, "owner")
      : null;
    const isReplacingWithLink = input.enlace_url !== undefined && !file;
    const isClearingFile = input.archivo_url === null;
    const enlaceUrl = file
      ? null
      : input.enlace_url === undefined
        ? previous?.enlace_url ?? null
        : input.enlace_url ?? null;

    const estado: TaskSubmission["estado"] = isLate ? "atrasada" : "entregada";
    try {
      await this.repo.upsertSubmission(taskId, requester.userId, {
        comentario_estudiante: comentarioEstudiante,
        enlace_url: enlaceUrl,
        archivo_url: uploadedUrl ?? null,
        increment_upload_count: Boolean(file),
        estado,
      });
    } catch (err) {
      await this.deleteManagedFile(uploadedUrl);
      throw err;
    }

    if ((uploadedUrl || isReplacingWithLink || isClearingFile) && previous?.archivo_url !== uploadedUrl) {
      await this.deleteManagedFile(previous?.archivo_url);
    }

    const created = await this.repo.findMySubmission(taskId, requester.userId);
    if (!created) throw new Error("No se pudo guardar la entrega");
    return created;
  }

  async getMySubmission(requester: AuthContext, taskId: number): Promise<TaskSubmission | null> {
    if (requester.role !== "estudiante") throw forbidden("No autorizado");
    const ctx = await this.repo.getTaskContextFull(taskId);
    if (!ctx) throw notFound("Tarea no encontrada");
    if (ctx.curso_estado !== "publicado") throw notFound("Tarea no encontrada");
    const enrolled = await this.repo.userIsEnrolledActive(requester.userId, ctx.curso_id);
    if (!enrolled) throw forbidden("No tienes acceso a este curso");
    return this.repo.findMySubmission(taskId, requester.userId);
  }

  async listSubmissions(
    requester: AuthContext,
    taskId: number,
    query: ListSubmissionsQuery
  ): Promise<TaskSubmissionList> {
    const ctx = await this.repo.getTaskContext(taskId);
    if (!ctx) throw notFound("Tarea no encontrada");
    this.assertCanManage(requester, ctx.docente_id);
    const normalized = normalizeSubmissionsPagination(query);
    const result = await this.repo.listSubmissionsForTask(taskId, normalized);
    return { ...result, ...normalized };
  }

  async gradeSubmission(
    requester: AuthContext,
    taskId: number,
    submissionId: number,
    input: GradeSubmissionInput
  ): Promise<TaskSubmissionWithStudent> {
    const gradingReady = await this.repo.supportsSubmissionGrading();
    if (!gradingReady) {
      throw serviceUnavailable(
        "Calificación de entregas no disponible: ejecuta db/alter_entregas_tareas_add_calificacion.sql."
      );
    }

    const ctx = await this.repo.getSubmissionContext(submissionId);
    if (!ctx || ctx.tarea_id !== taskId) throw notFound("Entrega no encontrada");
    this.assertCanManage(requester, ctx.docente_id);

    const taskPoints = Number(ctx.puntos);
    if (Number.isFinite(taskPoints) && input.calificacion > taskPoints) {
      throw badRequest(`La calificación no puede ser mayor a ${ctx.puntos} puntos`);
    }

    const current = await this.repo.findSubmissionWithStudentById(submissionId);
    if (!current) throw notFound("Entrega no encontrada");

    const ok = await this.repo.gradeSubmission(submissionId, {
      ...input,
      comentario_docente: input.comentario_docente?.toString().trim() || null,
      estado: input.estado ?? (current.has_submission ? "revisada" : "no_entregada"),
    });
    if (!ok) throw notFound("Entrega no encontrada");

    const updated = await this.repo.findSubmissionWithStudentById(submissionId);
    if (!updated) throw notFound("Entrega no encontrada");
    void this.notifications.notifyStudentTaskGraded({
      studentId: updated.estudiante_id,
      courseId: ctx.curso_id,
      taskTitle: ctx.tarea_titulo,
      courseTitle: ctx.curso_titulo,
      score: updated.calificacion ?? input.calificacion,
      maxPoints: ctx.puntos,
    });
    return updated;
  }

  async gradeStudentWithoutSubmission(
    requester: AuthContext,
    taskId: number,
    studentId: number,
    input: GradeSubmissionInput
  ): Promise<TaskSubmissionWithStudent> {
    const gradingReady = await this.repo.supportsSubmissionGrading();
    if (!gradingReady) {
      throw serviceUnavailable(
        "Calificación de entregas no disponible: ejecuta db/alter_entregas_tareas_add_calificacion.sql."
      );
    }

    const ctx = await this.repo.getTaskGradingContext(taskId);
    if (!ctx) throw notFound("Tarea no encontrada");
    this.assertCanManage(requester, ctx.docente_id);

    const enrolled = await this.repo.userIsEnrolledActive(studentId, ctx.curso_id);
    if (!enrolled) throw notFound("Estudiante no inscrito en este curso");

    const taskPoints = Number(ctx.puntos);
    if (Number.isFinite(taskPoints) && input.calificacion > taskPoints) {
      throw badRequest(`La calificación no puede ser mayor a ${ctx.puntos} puntos`);
    }

    const existing = await this.repo.findMySubmission(taskId, studentId);
    if (existing) {
      return this.gradeSubmission(requester, taskId, existing.id, {
        ...input,
        estado: input.estado ?? (existing.estado === "no_entregada" ? "no_entregada" : "revisada"),
      });
    }

    const submissionId = await this.repo.createOrGradeMissingSubmission(taskId, studentId, {
      ...input,
      comentario_docente: input.comentario_docente?.toString().trim() || null,
      estado: input.estado ?? "no_entregada",
    });

    if (!submissionId) throw new Error("No se pudo crear la calificación para el estudiante");

    const updated = await this.repo.findSubmissionWithStudentById(submissionId);
    if (!updated) throw notFound("Entrega no encontrada");

    void this.notifications.notifyStudentTaskGraded({
      studentId,
      courseId: ctx.curso_id,
      taskTitle: ctx.tarea_titulo,
      courseTitle: ctx.curso_titulo,
      score: updated.calificacion ?? input.calificacion,
      maxPoints: ctx.puntos,
    });

    return updated;
  }

  private assertCanManage(requester: AuthContext, docenteId: number): void {
    const isAdmin = requester.role === "admin";
    const isOwner = requester.role === "docente" && requester.userId === docenteId;
    if (!isAdmin && !isOwner) throw forbidden("No autorizado");
  }

  private async assertStudentUploadLimit(previous: TaskSubmission | null): Promise<void> {
    const uploadLimitReady = await this.repo.supportsSubmissionUploadLimit();
    if (!uploadLimitReady) {
      throw serviceUnavailable(
        "Límite de subidas no disponible: ejecuta db/alter_entregas_tareas_add_subidas_archivo.sql."
      );
    }

    const usedUploads = Number(previous?.subidas_archivo ?? 0);
    if (usedUploads >= MAX_STUDENT_FILE_UPLOADS_PER_TASK) {
      throw badRequest(
        `Alcanzaste el límite de ${MAX_STUDENT_FILE_UPLOADS_PER_TASK} subidas de archivo para esta tarea. Puedes entregar por enlace o pedir apoyo al docente.`
      );
    }
  }

  private async uploadTaskFile(
    requester: AuthContext,
    file: Express.Multer.File,
    keyPrefix: string,
    courseId: number,
    accessScope: "course" | "owner"
  ): Promise<string> {
    const uploaded = await this.files.uploadManaged({
      module: "tasks",
      keyPrefix,
      file,
      allowed: ALLOWED_TASK_FILES,
      ownerUsuarioId: requester.userId,
      cursoId: courseId,
      accessScope,
    });
    return uploaded.url;
  }

  private async deleteManagedFile(url: string | null | undefined): Promise<void> {
    await this.files.deleteByReference(url, ["tasks/"]);
  }
}
