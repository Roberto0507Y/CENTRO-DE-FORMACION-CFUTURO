"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const user_repository_1 = require("./user.repository");
class UserService {
    constructor() {
        this.repo = new user_repository_1.UserRepository();
    }
    async getById(requester, id) {
        if (requester.role !== "admin" && requester.userId !== id) {
            throw (0, httpErrors_1.forbidden)("No puedes ver el perfil de otro usuario");
        }
        const user = await this.repo.findById(id);
        if (!user)
            throw (0, httpErrors_1.notFound)("Usuario no encontrado");
        return user;
    }
    async list(requester, params) {
        if (requester.role !== "admin")
            throw (0, httpErrors_1.forbidden)("Solo admin puede listar usuarios");
        return this.repo.list(params);
    }
    async update(requester, id, input) {
        const isAdmin = requester.role === "admin";
        const isSelf = requester.userId === id;
        if (!isAdmin && !isSelf) {
            throw (0, httpErrors_1.forbidden)("No puedes editar a otro usuario");
        }
        if (!isAdmin) {
            if (input.rol !== undefined)
                throw (0, httpErrors_1.forbidden)("No puedes cambiar el rol");
            if (input.estado !== undefined)
                throw (0, httpErrors_1.forbidden)("No puedes cambiar el estado");
        }
        await this.repo.updateById(id, input);
        const updated = await this.repo.findById(id);
        if (!updated)
            throw (0, httpErrors_1.notFound)("Usuario no encontrado");
        return updated;
    }
    async delete(requester, id) {
        if (requester.role !== "admin")
            throw (0, httpErrors_1.forbidden)("Solo admin puede eliminar usuarios");
        if (requester.userId === id)
            throw (0, httpErrors_1.forbidden)("No puedes eliminar tu propia cuenta");
        const existing = await this.repo.findById(id);
        if (!existing)
            throw (0, httpErrors_1.notFound)("Usuario no encontrado");
        try {
            const affected = await this.repo.deleteById(id);
            if (affected === 0)
                throw (0, httpErrors_1.notFound)("Usuario no encontrado");
            return { deleted: true };
        }
        catch (err) {
            // FK constraints: cursos, inscripciones, pagos, etc.
            const e = err;
            const code = typeof e.code === "string" ? e.code : "";
            if (code === "ER_ROW_IS_REFERENCED_2" || code === "ER_ROW_IS_REFERENCED") {
                throw (0, httpErrors_1.conflict)("No se puede eliminar este usuario porque tiene registros asociados. Desactiva la cuenta (estado=inactivo) en su lugar.");
            }
            throw err;
        }
    }
}
exports.UserService = UserService;
