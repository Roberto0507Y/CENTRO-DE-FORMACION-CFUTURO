import type { PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../../config/db";
import type { AuthUserPublic, AuthUserWithPassword, CreateUserInput, PasswordResetRow } from "./auth.types";

type UserWithPasswordRow = RowDataPacket & AuthUserWithPassword;
type UserPublicRow = RowDataPacket & AuthUserPublic;
type PasswordResetDbRow = RowDataPacket & PasswordResetRow;
type UserIdLockRow = RowDataPacket & { id: number };
type SchemaTableRow = RowDataPacket & { table_name?: string; TABLE_NAME?: string };
type SchemaMode = "es" | "en";

export class AuthRepository {
  private passwordResetsEnsured = false;
  private schemaMode: SchemaMode | null = null;

  private async resolveSchemaMode(): Promise<SchemaMode> {
    if (this.schemaMode) return this.schemaMode;

    const [rows] = await pool.query<SchemaTableRow[]>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name IN ('usuarios', 'users')`
    );

    const names = new Set(
      rows
        .map((r) => String(r.table_name ?? r.TABLE_NAME ?? "").toLowerCase().trim())
        .filter((x) => x.length > 0)
    );
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

  private mapRoleToDb(role: CreateUserInput["rol"], mode: SchemaMode): string {
    if (mode === "es") return role;
    if (role === "admin") return "admin";
    if (role === "docente") return "maestro";
    return "alumno";
  }

  private mapStatusToDb(status: CreateUserInput["estado"], mode: SchemaMode): string {
    if (mode === "es") return status;
    if (status === "activo" || status === "inactivo") return status;
    return "inactivo";
  }

  private buildCompatDpi(input: CreateUserInput): string {
    const raw = `${input.correo}:${input.nombres}:${input.apellidos}`;
    let hash = 0;
    for (let index = 0; index < raw.length; index += 1) {
      hash = (hash << 5) - hash + raw.charCodeAt(index);
      hash |= 0;
    }
    const value = Math.abs(hash).toString().padStart(10, "0");
    return `AUTO${value}`.slice(0, 20);
  }

  private async ensurePasswordResetsTable(): Promise<void> {
    if (this.passwordResetsEnsured) return;
    await this.resolveSchemaMode();
    await pool.execute(
      `CREATE TABLE IF NOT EXISTS password_resets (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_password_resets_token_hash (token_hash),
        KEY idx_password_resets_user (usuario_id),
        KEY idx_password_resets_expires (expires_at)
      )`
    );
    this.passwordResetsEnsured = true;
  }

  async findByEmail(correo: string): Promise<AuthUserWithPassword | null> {
    const schemaMode = await this.resolveSchemaMode();
    if (schemaMode === "en") {
      const [rows] = await pool.query<UserWithPasswordRow[]>(
        `SELECT
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
         LIMIT 1`,
        [correo]
      );
      return rows[0] ?? null;
    }

    const [rows] = await pool.query<UserWithPasswordRow[]>(
      `SELECT
        id, nombres, apellidos, correo, password, telefono, foto_url, fecha_nacimiento, direccion,
        rol, estado, ultimo_login, created_at, updated_at
       FROM usuarios
       WHERE correo = ?
       LIMIT 1`,
      [correo]
    );
    return rows[0] ?? null;
  }

  async findPublicById(id: number): Promise<AuthUserPublic | null> {
    const schemaMode = await this.resolveSchemaMode();
    if (schemaMode === "en") {
      const [rows] = await pool.query<UserPublicRow[]>(
        `SELECT
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
         LIMIT 1`,
        [id]
      );
      return rows[0] ?? null;
    }

    const [rows] = await pool.query<UserPublicRow[]>(
      `SELECT
        id, nombres, apellidos, correo, telefono, foto_url, fecha_nacimiento, direccion,
        rol, estado, ultimo_login, created_at, updated_at
       FROM usuarios
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async createUser(input: CreateUserInput): Promise<number> {
    const schemaMode = await this.resolveSchemaMode();
    if (schemaMode === "en") {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO users
          (first_name, last_name, dpi, phone, birth_date, gender, address, email, password, role, status, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, NOW())`,
        [
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
        ]
      );
      return result.insertId;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO usuarios
        (nombres, apellidos, correo, password, telefono, foto_url, fecha_nacimiento, direccion, rol, estado, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
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
      ]
    );
    return result.insertId;
  }

  async updateLastLogin(id: number): Promise<void> {
    const schemaMode = await this.resolveSchemaMode();
    if (schemaMode === "en") return;

    await pool.execute(
      `UPDATE usuarios
       SET ultimo_login = NOW(), updated_at = NOW()
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
  }

  async createPasswordReset(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
    conn?: PoolConnection
  ): Promise<number> {
    await this.ensurePasswordResetsTable();
    const db = conn ?? pool;
    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO password_resets (usuario_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, NOW())`,
      [userId, tokenHash, expiresAt]
    );
    return result.insertId;
  }

  async findPasswordResetByHash(tokenHash: string): Promise<PasswordResetRow | null> {
    await this.ensurePasswordResetsTable();
    const [rows] = await pool.query<PasswordResetDbRow[]>(
      `SELECT id, usuario_id, token_hash, expires_at, used_at, created_at
       FROM password_resets
       WHERE token_hash = ?
       LIMIT 1`,
      [tokenHash]
    );
    return rows[0] ?? null;
  }

  async findPasswordResetByHashForUpdate(
    conn: PoolConnection,
    tokenHash: string
  ): Promise<PasswordResetRow | null> {
    await this.ensurePasswordResetsTable();
    const [rows] = await conn.query<PasswordResetDbRow[]>(
      `SELECT id, usuario_id, token_hash, expires_at, used_at, created_at
       FROM password_resets
       WHERE token_hash = ?
       LIMIT 1
       FOR UPDATE`,
      [tokenHash]
    );
    return rows[0] ?? null;
  }

  async lockUserById(conn: PoolConnection, userId: number): Promise<boolean> {
    const schemaMode = await this.resolveSchemaMode();
    const tableName = schemaMode === "en" ? "users" : "usuarios";
    const [rows] = await conn.query<UserIdLockRow[]>(
      `SELECT id
       FROM ${tableName}
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );
    return Boolean(rows[0]);
  }

  async markPasswordResetUsed(id: number, conn?: PoolConnection): Promise<number> {
    await this.ensurePasswordResetsTable();
    const db = conn ?? pool;
    const [res] = await db.execute<ResultSetHeader>(
      `UPDATE password_resets
       SET used_at = NOW()
       WHERE id = ? AND used_at IS NULL
       LIMIT 1`,
      [id]
    );
    return res.affectedRows;
  }

  async invalidateUnusedPasswordResetsForUser(
    userId: number,
    conn?: PoolConnection
  ): Promise<number> {
    await this.ensurePasswordResetsTable();
    const db = conn ?? pool;
    const [res] = await db.execute<ResultSetHeader>(
      `UPDATE password_resets
       SET used_at = NOW()
       WHERE usuario_id = ? AND used_at IS NULL`,
      [userId]
    );
    return res.affectedRows;
  }

  async updateUserPassword(
    userId: number,
    passwordHash: string,
    conn?: PoolConnection
  ): Promise<number> {
    const schemaMode = await this.resolveSchemaMode();
    const tableName = schemaMode === "en" ? "users" : "usuarios";
    const updateClause = schemaMode === "en"
      ? "SET password = ?"
      : "SET password = ?, updated_at = NOW()";
    const db = conn ?? pool;
    const [res] = await db.execute<ResultSetHeader>(
      `UPDATE ${tableName}
       ${updateClause}
       WHERE id = ?
       LIMIT 1`,
      [passwordHash, userId]
    );
    return res.affectedRows;
  }
}
