const assert = require("node:assert/strict");

const {
  admissionCanTakeExam,
  admissionNeedsNewPayment,
  admissionPassed,
  admissionPercent,
  remainingAdmissionAttempts,
} = require("../../dist/modules/quizzes/quiz-admission.js");

module.exports = [
  {
    name: "admission smoke: calcula porcentaje con precisión de dos decimales",
    run() {
      assert.equal(admissionPercent(7.5, 10), 75);
      assert.equal(admissionPercent(1, 3), 33.33);
    },
  },
  {
    name: "admission smoke: detecta aprobación correctamente",
    run() {
      assert.equal(admissionPassed(6, 10, 60), true);
      assert.equal(admissionPassed(5.99, 10, 60), false);
    },
  },
  {
    name: "admission smoke: bloquea al agotar intentos y pedir nuevo pago",
    run() {
      const attemptsRemaining = remainingAdmissionAttempts(2, 2);
      assert.equal(attemptsRemaining, 0);
      assert.equal(
        admissionNeedsNewPayment({
          passed: false,
          attemptsRemaining,
          requiresPaymentRetry: true,
        }),
        true,
      );
      assert.equal(
        admissionCanTakeExam({
          passed: false,
          hasPaid: true,
          attemptsRemaining,
          available: true,
        }),
        false,
      );
    },
  },
];
