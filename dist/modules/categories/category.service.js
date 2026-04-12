"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const category_repository_1 = require("./category.repository");
class CategoryService {
    constructor() {
        this.repo = new category_repository_1.CategoryRepository();
    }
    async listPublic() {
        return this.repo.listActive();
    }
    async listAdmin(requester, q) {
        if (requester.role !== "admin")
            throw (0, httpErrors_1.forbidden)("Solo admin puede ver todas las categorías");
        return this.repo.listAdmin(q);
    }
    async getPublicById(id) {
        const category = await this.repo.findActiveById(id);
        if (!category)
            throw (0, httpErrors_1.notFound)("Categoría no encontrada");
        return category;
    }
    async getAdminById(requester, id) {
        if (requester.role !== "admin")
            throw (0, httpErrors_1.forbidden)("Solo admin puede ver categorías inactivas");
        const cat = await this.repo.findByIdWithCount(id);
        if (!cat)
            throw (0, httpErrors_1.notFound)("Categoría no encontrada");
        return cat;
    }
    async create(input) {
        const nombre = input.nombre.trim();
        const existing = await this.repo.findByName(nombre);
        if (existing)
            throw (0, httpErrors_1.conflict)("Ya existe una categoría con ese nombre");
        const id = await this.repo.create({
            nombre,
            descripcion: input.descripcion ?? null,
            imagen_url: input.imagen_url ?? null,
        });
        const category = await this.repo.findById(id);
        if (!category)
            throw new Error("No se pudo crear la categoría");
        return category;
    }
    async update(id, input) {
        const existing = await this.repo.findById(id);
        if (!existing)
            throw (0, httpErrors_1.notFound)("Categoría no encontrada");
        if (input.nombre !== undefined) {
            const nombre = input.nombre.trim();
            const byName = await this.repo.findByName(nombre);
            if (byName && byName.id !== id) {
                throw (0, httpErrors_1.conflict)("Ya existe una categoría con ese nombre");
            }
        }
        if (input.estado === "inactivo") {
            const count = await this.repo.countCoursesByCategoryId(id);
            if (count > 0)
                throw (0, httpErrors_1.conflict)("No puedes inactivar una categoría con cursos asociados");
        }
        await this.repo.updateById(id, {
            nombre: input.nombre?.trim(),
            descripcion: input.descripcion === undefined ? undefined : input.descripcion,
            imagen_url: input.imagen_url === undefined ? undefined : input.imagen_url,
            estado: input.estado,
        });
        const updated = await this.repo.findById(id);
        if (!updated)
            throw (0, httpErrors_1.notFound)("Categoría no encontrada");
        return updated;
    }
    async remove(id) {
        const count = await this.repo.countCoursesByCategoryId(id);
        if (count > 0)
            throw (0, httpErrors_1.conflict)("No puedes inactivar una categoría con cursos asociados");
        const ok = await this.repo.softDeleteById(id);
        if (!ok)
            throw (0, httpErrors_1.notFound)("Categoría no encontrada");
    }
    async patchStatus(requester, id, estado) {
        if (requester.role !== "admin")
            throw (0, httpErrors_1.forbidden)("Solo admin puede cambiar el estado");
        const existing = await this.repo.findById(id);
        if (!existing)
            throw (0, httpErrors_1.notFound)("Categoría no encontrada");
        if (estado === "inactivo") {
            const count = await this.repo.countCoursesByCategoryId(id);
            if (count > 0)
                throw (0, httpErrors_1.conflict)("No puedes inactivar una categoría con cursos asociados");
        }
        const ok = await this.repo.updateStatusById(id, estado);
        if (!ok)
            throw (0, httpErrors_1.notFound)("Categoría no encontrada");
        const updated = await this.repo.findById(id);
        if (!updated)
            throw (0, httpErrors_1.notFound)("Categoría no encontrada");
        return updated;
    }
}
exports.CategoryService = CategoryService;
