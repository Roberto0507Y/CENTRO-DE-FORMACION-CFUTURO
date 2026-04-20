import { conflict, forbidden, notFound } from "../../common/errors/httpErrors";
import { TtlCache } from "../../common/utils/ttlCache";
import { CategoryRepository } from "./category.repository";
import type { AuthContext } from "../../common/types/express";
import type { Category, CategoryAdminListItem, CreateCategoryInput, ListCategoriesQuery, UpdateCategoryInput } from "./category.types";

export class CategoryService {
  private static readonly publicListCache = new TtlCache<"active", Category[]>({
    ttlMs: 60_000,
    maxEntries: 1,
  });

  private readonly repo = new CategoryRepository();

  async listPublic(): Promise<Category[]> {
    return CategoryService.publicListCache.getOrSet("active", () => this.repo.listActive());
  }

  async listAdmin(requester: AuthContext, q: ListCategoriesQuery): Promise<CategoryAdminListItem[]> {
    if (requester.role !== "admin") throw forbidden("Solo admin puede ver todas las categorías");
    return this.repo.listAdmin(q);
  }

  async getPublicById(id: number): Promise<Category> {
    const category = await this.repo.findActiveById(id);
    if (!category) throw notFound("Categoría no encontrada");
    return category;
  }

  async getAdminById(requester: AuthContext, id: number): Promise<CategoryAdminListItem> {
    if (requester.role !== "admin") throw forbidden("Solo admin puede ver categorías inactivas");
    const cat = await this.repo.findByIdWithCount(id);
    if (!cat) throw notFound("Categoría no encontrada");
    return cat;
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const nombre = input.nombre.trim();
    const existing = await this.repo.findByName(nombre);
    if (existing) throw conflict("Ya existe una categoría con ese nombre");

    const id = await this.repo.create({
      nombre,
      descripcion: input.descripcion ?? null,
      imagen_url: input.imagen_url ?? null,
    });
    const category = await this.repo.findById(id);
    if (!category) throw new Error("No se pudo crear la categoría");
    CategoryService.publicListCache.clear();
    return category;
  }

  async update(id: number, input: UpdateCategoryInput): Promise<Category> {
    const existing = await this.repo.findById(id);
    if (!existing) throw notFound("Categoría no encontrada");

    if (input.nombre !== undefined) {
      const nombre = input.nombre.trim();
      const byName = await this.repo.findByName(nombre);
      if (byName && byName.id !== id) {
        throw conflict("Ya existe una categoría con ese nombre");
      }
    }

    if (input.estado === "inactivo") {
      const count = await this.repo.countCoursesByCategoryId(id);
      if (count > 0) throw conflict("No puedes inactivar una categoría con cursos asociados");
    }

    await this.repo.updateById(id, {
      nombre: input.nombre?.trim(),
      descripcion: input.descripcion === undefined ? undefined : input.descripcion,
      imagen_url: input.imagen_url === undefined ? undefined : input.imagen_url,
      estado: input.estado,
    });

    const updated = await this.repo.findById(id);
    if (!updated) throw notFound("Categoría no encontrada");
    CategoryService.publicListCache.clear();
    return updated;
  }

  async remove(id: number): Promise<void> {
    const count = await this.repo.countCoursesByCategoryId(id);
    if (count > 0) throw conflict("No puedes inactivar una categoría con cursos asociados");
    const ok = await this.repo.softDeleteById(id);
    if (!ok) throw notFound("Categoría no encontrada");
    CategoryService.publicListCache.clear();
  }

  async patchStatus(requester: AuthContext, id: number, estado: "activo" | "inactivo"): Promise<Category> {
    if (requester.role !== "admin") throw forbidden("Solo admin puede cambiar el estado");
    const existing = await this.repo.findById(id);
    if (!existing) throw notFound("Categoría no encontrada");

    if (estado === "inactivo") {
      const count = await this.repo.countCoursesByCategoryId(id);
      if (count > 0) throw conflict("No puedes inactivar una categoría con cursos asociados");
    }

    const ok = await this.repo.updateStatusById(id, estado);
    if (!ok) throw notFound("Categoría no encontrada");
    const updated = await this.repo.findById(id);
    if (!updated) throw notFound("Categoría no encontrada");
    CategoryService.publicListCache.clear();
    return updated;
  }
}
