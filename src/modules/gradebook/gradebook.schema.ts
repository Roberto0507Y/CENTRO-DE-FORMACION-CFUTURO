import { z } from "zod";

const idFromParam = z.preprocess((v) => Number(v), z.number().int().positive());

export const courseIdParamsSchema = z.object({ courseId: idFromParam }).strict();
