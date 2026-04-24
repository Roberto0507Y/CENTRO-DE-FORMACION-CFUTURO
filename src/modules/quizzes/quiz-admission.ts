const POINT_EPSILON = 1e-9;

export function admissionPercent(score: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.round(((score / total) * 100 + Number.EPSILON) * 100) / 100;
}

export function admissionPassed(
  score: number,
  puntajeTotal: number | string,
  porcentajeAprobacion: number | string
): boolean {
  return admissionPercent(score, Number(puntajeTotal)) + POINT_EPSILON >= Number(porcentajeAprobacion);
}

export function remainingAdmissionAttempts(attemptLimit: number, attemptsUsed: number): number {
  return Math.max(attemptLimit - attemptsUsed, 0);
}

export function admissionNeedsNewPayment(params: {
  passed: boolean;
  attemptsRemaining: number;
  requiresPaymentRetry: boolean;
}): boolean {
  return !params.passed && params.attemptsRemaining <= 0 && params.requiresPaymentRetry;
}

export function admissionCanTakeExam(params: {
  passed: boolean;
  hasPaid: boolean;
  attemptsRemaining: number;
  available: boolean;
}): boolean {
  return !params.passed && params.hasPaid && params.attemptsRemaining > 0 && params.available;
}
