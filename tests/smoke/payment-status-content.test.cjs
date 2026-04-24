const assert = require("node:assert/strict");

const { buildPaymentStatusContent } = require("../../dist/modules/notifications/payment-status-content.js");

module.exports = [
  {
    name: "payments smoke: pago aprobado de curso habilita acceso al curso",
    run() {
      const content = buildPaymentStatusContent({
        studentName: "Maria Fernanda",
        studentEmail: "maria@example.com",
        courseTitle: "Programación",
        concepto: "curso",
        estado: "pagado",
        paymentId: 15,
        frontendUrl: "https://centrodeformacionparaelfuturo.com",
      });

      assert.equal(content.title, "Pago aprobado");
      assert.match(content.message, /Ya puedes ingresar al curso/i);
      assert.match(content.html, /Ver mis pagos/i);
      assert.match(content.text, /Referencia de pago: #15/i);
    },
  },
  {
    name: "payments smoke: rechazo de admisión indica examen y motivo",
    run() {
      const content = buildPaymentStatusContent({
        studentName: "Pedro Garcia",
        studentEmail: "pedro@example.com",
        courseTitle: "Programación",
        concepto: "admision",
        estado: "rechazado",
        observaciones: "Comprobante ilegible",
        paymentId: 7,
      });

      assert.equal(content.subject, "Pago rechazado - C.FUTURO");
      assert.match(content.message, /examen de admisión/i);
      assert.match(content.message, /Comprobante ilegible/);
      assert.doesNotMatch(content.html, /Ver mis pagos/i);
    },
  },
];
