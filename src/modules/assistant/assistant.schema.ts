import { z } from "zod";

export const assistantChatBodySchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Escribe tu consulta")
    .max(600, "La consulta es demasiado larga"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(600),
      })
    )
    .max(8)
    .optional(),
  pageContext: z
    .object({
      path: z.string().trim().max(200).optional(),
      courseSlug: z.string().trim().max(180).optional(),
    })
    .optional(),
});
