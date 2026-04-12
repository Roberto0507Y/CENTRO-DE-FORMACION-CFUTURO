"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchPricingStatusBodySchema = exports.updatePricingBodySchema = exports.createPricingBodySchema = exports.listPricingQuerySchema = exports.pricingIdParamsSchema = void 0;
const zod_1 = require("zod");
const paymentLink_1 = require("../../common/utils/paymentLink");
const idFromParam = zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive());
const httpUrl = (fieldName) => zod_1.z.preprocess((v) => (0, paymentLink_1.normalizePaymentLinkValue)(v), zod_1.z.string()
    .min(1, `${fieldName} es requerido`)
    .max(500)
    .url(`${fieldName} inválido`)
    .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
}, `${fieldName} debe usar http o https`));
exports.pricingIdParamsSchema = zod_1.z.object({ id: idFromParam }).strict();
exports.listPricingQuerySchema = zod_1.z
    .object({
    estado: zod_1.z.enum(["activo", "inactivo", "all"]).optional(),
})
    .strict();
exports.createPricingBodySchema = zod_1.z
    .object({
    precio: zod_1.z.number().nonnegative(),
    payment_link: httpUrl("payment_link"),
})
    .strict();
exports.updatePricingBodySchema = zod_1.z
    .object({
    precio: zod_1.z.number().nonnegative().optional(),
    payment_link: httpUrl("payment_link").optional(),
    estado: zod_1.z.enum(["activo", "inactivo"]).optional(),
})
    .strict()
    .refine((obj) => Object.keys(obj).length > 0, { message: "Debes enviar al menos un campo para actualizar" });
exports.patchPricingStatusBodySchema = zod_1.z
    .object({
    estado: zod_1.z.enum(["activo", "inactivo"]),
})
    .strict();
