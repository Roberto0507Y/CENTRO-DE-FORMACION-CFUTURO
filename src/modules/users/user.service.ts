import { conflict, forbidden, notFound } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { UserRepository } from "./user.repository";
import type { ListUsersParams, ListUsersResult, UpdateUserInput, UserPublic } from "./user.types";

export class UserService {
  private readonly repo = new UserRepository();

  async getById(requester: AuthContext, id: number): Promise<UserPublic> {
    if (requester.role !== "admin" && requester.userId !== id) {
      throw forbidden("No puedes ver el perfil de otro usuario");
    }
    const user = await this.repo.findById(id);
    if (!user) throw notFound("Usuario no encontrado");
    return user;
  }

  async list(requester: AuthContext, params: ListUsersParams): Promise<ListUsersResult> {
    if (requester.role !== "admin") throw forbidden("Solo admin puede listar usuarios");
    return this.repo.list(params);
  }

  async update(
    requester: AuthContext,
    id: number,
    input: UpdateUserInput
  ): Promise<UserPublic> {
    const isAdmin = requester.role === "admin";
    const isSelf = requester.userId === id;

    if (!isAdmin && !isSelf) {
      throw forbidden("No puedes editar a otro usuario");
    }

    if (!isAdmin) {
      if (input.rol !== undefined) throw forbidden("No puedes cambiar el rol");
      if (input.estado !== undefined) throw forbidden("No puedes cambiar el estado");
    }

    await this.repo.updateById(id, input);
    const updated = await this.repo.findById(id);
    if (!updated) throw notFound("Usuario no encontrado");
    return updated;
  }

  async delete(requester: AuthContext, id: number): Promise<{ deleted: true }> {
    if (requester.role !== "admin") throw forbidden("Solo admin puede eliminar usuarios");
    if (requester.userId === id) throw forbidden("No puedes eliminar tu propia cuenta");

    const existing = await this.repo.findById(id);
    if (!existing) throw notFound("Usuario no encontrado");

    try {
      const affected = await this.repo.deleteById(id);
      if (affected === 0) throw notFound("Usuario no encontrado");
      return { deleted: true };
    } catch (err) {
      // FK constraints: cursos, inscripciones, pagos, etc.
      const e = err as { code?: unknown; errno?: unknown };
      const code = typeof e.code === "string" ? e.code : "";
      if (code === "ER_ROW_IS_REFERENCED_2" || code === "ER_ROW_IS_REFERENCED") {
        throw conflict(
          "No se puede eliminar este usuario porque tiene registros asociados. Desactiva la cuenta (estado=inactivo) en su lugar."
        );
      }
      throw err;
    }
  }
}
