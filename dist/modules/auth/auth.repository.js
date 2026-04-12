"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const db_1 = require("../../config/db");
class AuthRepository {
    constructor() {
        this.passwordResetsEnsured = false;
        this.schemaMode = null;
    }
    async resolveSchemaMode() {
        if (this.schemaMode)
            return this.schemaMode;
        const [rows] = await db_1.pool.query(`SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name IN ('usuarios', 'users')`);
        const names = new Set(rows
            .map((r) => String(r.table_name ?? r.TABLE_NAME ?? "").toLowerCase().trim())
            .filter((x) => x.length > 0));
        if (names.has("usuarios")) {
            this.schemaMode = "es";
            return this.schemaMode;
        }
        if (names.has("users")) {
            this.schemaMode = "en";
            return this.schemaMode;
        }
        throw new Error("No se encontró tabla de usuarios compatible (usuarios/users).");
    }
    mapRoleToDb(role, mode) {
        if (mode === "es")
            return role;
        if (role === "admin")
            return "admin";
        if (role === "docente")
            return "maestro";
        return "alumno";
    }
    mapStatusToDb(status, mode) {
        if (mode === "es")
            return status;
        if (status === "activo" || status === "inactivo")
            return status;
        return "inactivo";
    }
    buildCompatDpi(input) {
        const raw = `${input.correo}:${input.nombres}:${input.apellidos}`;
        let hash = 0;
        for (let index = 0; index < raw.length; index += 1) {
            hash = (hash << 5) - hash + raw.charCodeAt(index);
            hash |= 0;
        }
        const value = Math.abs(hash).toString().padStart(10, "0");
        return `AUTO${value}`.slice(0, 20);
    }
    async ensurePasswordResetsTable() {
        if (this.passwordResetsEnsured)
            return;
        await this.resolveSchemaMode();
        await db_1.pool.execute(`CREATE TABLE IF NOT EXISTS password_resets (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_password_resets_token_hash (token_hash),
        KEY idx_password_resets_user (usuario_id),
        KEY idx_password_resets_expires (expires_at)
      )`);
        this.passwordResetsEnsured = true;
    }
    async findByEmail(correo) {
        const schemaMode = await this.resolveSchemaMode();
        if (schemaMode === "en") {
            const [rows] = await db_1.pool.query(`SELECT
          id,
          first_name AS nombres,
          last_name AS apellidos,
          email AS correo,
          password,
          phone AS telefono,
          NULL AS foto_url,
          birth_date AS fecha_nacimiento,
          address AS direccion,
          CASE
            WHEN role = 'admin' THEN 'admin'
            WHEN role = 'director' THEN 'admin'
            WHEN role = 'maestro' THEN 'docente'
            WHEN role = 'docente' THEN 'docente'
            WHEN role = 'alumno' THEN 'estudiante'
            WHEN role = 'estudiante' THEN 'estudiante'
            ELSE 'estudiante'
          END AS rol,
          CASE
            WHEN status = 'activo' THEN 'activo'
            WHEN status = 'inactivo' THEN 'inactivo'
            WHEN status = 'suspendido' THEN 'suspendido'
            ELSE 'activo'
          END AS estado,
          NULL AS ultimo_login,
          created_at,
          created_at AS updated_at
         FROM users
         WHERE email = ?
         LIMIT 1`, [correo]);
            return rows[0] ?? null;
        }
        const [rows] = await db_1.pool.query(`SELECT
        id, nombres, apellidos, correo, password, telefono, foto_url, fecha_nacimiento, direccion,
        rol, estado, ultimo_login, created_at, updated_at
       FROM usuarios
       WHERE correo = ?
       LIMIT 1`, [correo]);
        return rows[0] ?? null;
    }
    async findPublicById(id) {
        const schemaMode = await this.resolveSchemaMode();
        if (schemaMode === "en") {
            const [rows] = await db_1.pool.query(`SELECT
          id,
          first_name AS nombres,
          last_name AS apellidos,
          email AS correo,
          phone AS telefono,
          NULL AS foto_url,
          birth_date AS fecha_nacimiento,
          address AS direccion,
          CASE
            WHEN role = 'admin' THEN 'admin'
            WHEN role = 'director' THEN 'admin'
            WHEN role = 'maestro' THEN 'docente'
            WHEN role = 'docente' THEN 'docente'
            WHEN role = 'alumno' THEN 'estudiante'
            WHEN role = 'estudiante' THEN 'estudiante'
            ELSE 'estudiante'
          END AS rol,
          CASE
            WHEN status = 'activo' THEN 'activo'
            WHEN status = 'inactivo' THEN 'inactivo'
            WHEN status = 'suspendido' THEN 'suspendido'
            ELSE 'activo'
          END AS estado,
          NULL AS ultimo_login,
          created_at,
          created_at AS updated_at
         FROM users
         WHERE id = ?
         LIMIT 1`, [id]);
            return rows[0] ?? null;
        }
        const [rows] = await db_1.pool.query(`SELECT
        id, nombres, apellidos, correo, telefono, foto_url, fecha_nacimiento, direccion,
        rol, estado, ultimo_login, created_at, updated_at
       FROM usuarios
       WHERE id = ?
       LIMIT 1`, [id]);
        return rows[0] ?? null;
    }
    async createUser(input) {
        const schemaMode = await this.resolveSchemaMode();
        if (schemaMode === "en") {
            const [result] = await db_1.pool.execute(`INSERT INTO users
          (first_name, last_name, dpi, phone, birth_date, gender, address, email, password, role, status, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, NOW())`, [
                input.nombres,
                input.apellidos,
                this.buildCompatDpi(input),
                input.telefono,
                input.fechaNacimiento,
                input.direccion,
                input.correo,
                input.passwordHash,
                this.mapRoleToDb(input.rol, schemaMode),
                this.mapStatusToDb(input.estado, schemaMode),
            ]);
            return result.insertId;
        }
        const [result] = await db_1.pool.execute(`INSERT INTO usuarios
        (nombres, apellidos, correo, password, telefono, foto_url, fecha_nacimiento, direccion, rol, estado, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [
            input.nombres,
            input.apellidos,
            input.correo,
            input.passwordHash,
            input.telefono,
            input.fotoUrl,
            input.fechaNacimiento,
            input.direccion,
            input.rol,
            input.estado,
        ]);
        return result.insertId;
    }
    async updateLastLogin(id) {
        const schemaMode = await this.resolveSchemaMode();
        if (schemaMode === "en")
            return;
        await db_1.pool.execute(`UPDATE usuarios
       SET ultimo_login = NOW(), updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [id]);
    }
    async createPasswordReset(userId, tokenHash, expiresAt, conn) {
        await this.ensurePasswordResetsTable();
        const db = conn ?? db_1.pool;
        const [result] = await db.execute(`INSERT INTO password_resets (usuario_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, NOW())`, [userId, tokenHash, expiresAt]);
        return result.insertId;
    }
    async findPasswordResetByHash(tokenHash) {
        await this.ensurePasswordResetsTable();
        const [rows] = await db_1.pool.query(`SELECT id, usuario_id, token_hash, expires_at, used_at, created_at
       FROM password_resets
       WHERE token_hash = ?
       LIMIT 1`, [tokenHash]);
        return rows[0] ?? null;
    }
    async findPasswordResetByHashForUpdate(conn, tokenHash) {
        await this.ensurePasswordResetsTable();
        const [rows] = await conn.query(`SELECT id, usuario_id, token_hash, expires_at, used_at, created_at
       FROM password_resets
       WHERE token_hash = ?
       LIMIT 1
       FOR UPDATE`, [tokenHash]);
        return rows[0] ?? null;
    }
    async lockUserById(conn, userId) {
        const schemaMode = await this.resolveSchemaMode();
        const tableName = schemaMode === "en" ? "users" : "usuarios";
        const [rows] = await conn.query(`SELECT id
       FROM ${tableName}
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`, [userId]);
        return Boolean(rows[0]);
    }
    async markPasswordResetUsed(id, conn) {
        await this.ensurePasswordResetsTable();
        const db = conn ?? db_1.pool;
        const [res] = await db.execute(`UPDATE password_resets
       SET used_at = NOW()
       WHERE id = ? AND used_at IS NULL
       LIMIT 1`, [id]);
        return res.affectedRows;
    }
    async invalidateUnusedPasswordResetsForUser(userId, conn) {
        await this.ensurePasswordResetsTable();
        const db = conn ?? db_1.pool;
        const [res] = await db.execute(`UPDATE password_resets
       SET used_at = NOW()
       WHERE usuario_id = ? AND used_at IS NULL`, [userId]);
        return res.affectedRows;
    }
    async updateUserPassword(userId, passwordHash, conn) {
        const schemaMode = await this.resolveSchemaMode();
        const tableName = schemaMode === "en" ? "users" : "usuarios";
        const updateClause = schemaMode === "en"
            ? "SET password = ?"
            : "SET password = ?, updated_at = NOW()";
        const db = conn ?? db_1.pool;
        const [res] = await db.execute(`UPDATE ${tableName}
       ${updateClause}
       WHERE id = ?
       LIMIT 1`, [passwordHash, userId]);
        return res.affectedRows;
    }
}
exports.AuthRepository = AuthRepository;
