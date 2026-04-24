const assert = require("node:assert/strict");

const {
  DEFAULT_CSRF_TTL_MS,
  buildAuthCookieOptions,
  buildCsrfCookieOptions,
  parseDurationToMs,
} = require("../../dist/modules/auth/auth-cookie-policy.js");

module.exports = [
  {
    name: "auth smoke: parseDurationToMs soporta segundos y sufijos",
    run() {
      assert.equal(parseDurationToMs("3600"), 3_600_000);
      assert.equal(parseDurationToMs("2h"), 7_200_000);
      assert.equal(parseDurationToMs("15m"), 900_000);
      assert.equal(parseDurationToMs("500ms"), 500);
    },
  },
  {
    name: "auth smoke: cookie de sesión usa secure en producción y TTL resuelto",
    run() {
      const options = buildAuthCookieOptions("production", "2h");
      assert.deepEqual(options, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/api",
        maxAge: 7_200_000,
      });
    },
  },
  {
    name: "auth smoke: cookie CSRF usa fallback cuando JWT_EXPIRES_IN es inválido",
    run() {
      const options = buildCsrfCookieOptions("development", "valor-invalido");
      assert.equal(options.secure, false);
      assert.equal(options.maxAge, DEFAULT_CSRF_TTL_MS);
    },
  },
];
