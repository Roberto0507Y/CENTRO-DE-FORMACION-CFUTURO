import { z } from "zod";

const idFromQuery = z.preprocess((value) => Number(value), z.number().int().positive());

export const zoneReportQuerySchema = z.object({
  course_id: idFromQuery,
}).strict();
