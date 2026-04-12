import { z } from "zod";
import { normalizePaymentLinkValue } from "../../common/utils/paymentLink";

const idFromParam = z.preprocess((v) => Number(v), z.number().int().positive());
const httpUrl = (fieldName: string) =>
  z.preprocess((v) => normalizePaymentLinkValue(v), z.string()
    .min(1, `${fieldName} es requerido`)
    .max(500)
    .url(`${fieldName} inválido`)
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    }, `${fieldName} debe usar http o https`));

export const pricingIdParamsSchema = z.object({ id: idFromParam }).strict();

export const listPricingQuerySchema = z
  .object({
    estado: z.enum(["activo", "inactivo", "all"]).optional(),
  })
  .strict();

export const createPricingBodySchema = z
  .object({
    precio: z.number().nonnegative(),
    payment_link: httpUrl("payment_link"),
  })
  .strict();

export const updatePricingBodySchema = z
  .object({
    precio: z.number().nonnegative().optional(),
    payment_link: httpUrl("payment_link").optional(),
    estado: z.enum(["activo", "inactivo"]).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, { message: "Debes enviar al menos un campo para actualizar" });

export const patchPricingStatusBodySchema = z
  .object({
    estado: z.enum(["activo", "inactivo"]),
  })
  .strict();
