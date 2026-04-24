import type { PaymentConcept, PaymentStatus } from "../payments/payment.types";

type PaymentStatusEmailParams = {
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  concepto: PaymentConcept;
  estado: Extract<PaymentStatus, "pagado" | "rechazado" | "reembolsado">;
  observaciones?: string | null;
  paymentId: number;
  frontendUrl?: string | null;
};

export type PaymentStatusContent = {
  title: string;
  message: string;
  subject: string;
  text: string;
  html: string;
};

export function buildPaymentStatusContent(params: PaymentStatusEmailParams): PaymentStatusContent {
  const reason = params.observaciones?.trim();
  const targetLabel =
    params.concepto === "admision"
      ? `el examen de admisión de “${params.courseTitle}”`
      : `el curso “${params.courseTitle}”`;
  const actionLabel = params.concepto === "admision" ? "presentar el examen" : "ingresar al curso";
  const paymentsUrl = params.frontendUrl
    ? `${params.frontendUrl.replace(/\/+$/, "")}/student/payments`
    : null;

  let title = "Pago aprobado";
  let subject = "Pago confirmado - C.FUTURO";
  let message = `Tu pago para ${targetLabel} fue aprobado. Ya puedes ${actionLabel}.`;
  let badgeLabel = "Pago confirmado";
  let badgeColor = "#065f46";
  let badgeBg = "#dcfce7";
  let panelBg = "#ecfdf5";
  let panelBorder = "#a7f3d0";

  if (params.estado === "rechazado") {
    title = "Pago rechazado";
    subject = "Pago rechazado - C.FUTURO";
    message = `Tu pago para ${targetLabel} fue rechazado.${reason ? ` Motivo: ${reason}` : " Revisa tu comprobante y vuelve a intentarlo."}`;
    badgeLabel = "Pago rechazado";
    badgeColor = "#9f1239";
    badgeBg = "#ffe4e6";
    panelBg = "#fff1f2";
    panelBorder = "#fecdd3";
  } else if (params.estado === "reembolsado") {
    title = "Pago reembolsado";
    subject = "Pago reembolsado - C.FUTURO";
    message =
      params.concepto === "admision"
        ? `Tu pago para ${targetLabel} fue reembolsado.${reason ? ` Motivo: ${reason}` : ""}`
        : `Tu pago para ${targetLabel} fue reembolsado y el acceso quedó cancelado.${reason ? ` Motivo: ${reason}` : ""}`;
    badgeLabel = "Pago reembolsado";
    badgeColor = "#1d4ed8";
    badgeBg = "#dbeafe";
    panelBg = "#eff6ff";
    panelBorder = "#bfdbfe";
  }

  const text = [
    `Hola ${params.studentName},`,
    "",
    message,
    "",
    `Referencia de pago: #${params.paymentId}`,
    paymentsUrl ? `Puedes revisar el detalle aquí: ${paymentsUrl}` : "",
    "",
    "— Equipo C.FUTURO",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f1f5f9;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;width:100%;">
            <tr>
              <td align="center" style="padding:0 0 18px 0;">
                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-weight:900;letter-spacing:-0.04em;color:#0f172a;font-size:18px;line-height:1;">
                  C.FUTURO
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border-radius:20px;box-shadow:0 12px 40px rgba(15,23,42,0.12);border:1px solid #e2e8f0;overflow:hidden;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="background:linear-gradient(135deg,#0f172a 0%, #2563eb 55%, #06b6d4 100%);padding:24px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#ffffff;">
                        <div style="font-size:22px;line-height:1.25;font-weight:900;letter-spacing:-0.02em;margin:0 0 6px 0;">
                          ${escapeHtml(subject)}
                        </div>
                        <div style="font-size:13px;line-height:1.5;font-weight:600;opacity:0.95;margin:0;">
                          Actualización de tu transacción registrada.
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:22px 24px 0 24px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#0f172a;">
                        <div style="font-size:14px;line-height:1.7;color:#334155;margin:0 0 14px 0;">
                          Hola <strong>${escapeHtml(params.studentName)}</strong>, te compartimos el resultado de tu pago para <strong>${escapeHtml(params.courseTitle)}</strong>.
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 24px 0 24px;">
                      <div style="display:inline-block;border-radius:999px;padding:8px 14px;background:${badgeBg};color:${badgeColor};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:12px;font-weight:900;">
                        ${escapeHtml(badgeLabel)}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:14px 24px 0 24px;">
                      <div style="background:${panelBg};border:1px solid ${panelBorder};border-radius:14px;padding:14px;">
                        <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:13px;line-height:1.7;color:#0f172a;margin:0;">
                          ${escapeHtml(message)}
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 24px 0 24px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:12px;line-height:1.6;color:#64748b;">
                        Referencia de pago: <strong>#${params.paymentId}</strong>
                      </div>
                      ${
                        paymentsUrl
                          ? `<div style="margin-top:14px;">
                        <a href="${paymentsUrl}"
                           style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-weight:900;font-size:14px;padding:12px 18px;border-radius:14px;box-shadow:0 10px 22px rgba(37,99,235,0.25);">
                          Ver mis pagos
                        </a>
                      </div>`
                          : ""
                      }
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 24px 22px 24px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:12px;line-height:1.6;color:#94a3b8;margin:0;">
                        Este correo fue enviado automáticamente por C.FUTURO.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:14px 8px 0 8px;">
                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Este correo fue enviado a ${escapeHtml(params.studentEmail)} · © ${new Date().getFullYear()} C.FUTURO
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  return { title, message, subject, text, html };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
