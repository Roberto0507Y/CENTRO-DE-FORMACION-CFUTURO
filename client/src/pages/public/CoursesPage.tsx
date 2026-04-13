import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { CourseCard } from "../../components/ui/CourseCard";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { CourseListItem, CourseListResponse } from "../../types/course";

const PAGE_SIZE = 12;

export function CoursesPage() {
  const { api } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const rawPage = Number(searchParams.get("page") ?? 1);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.trunc(rawPage) : 1;

  const [items, setItems] = useState<CourseListItem[]>([]);
  const [list, setList] = useState<CourseListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => ({ search: search || undefined, page, limit: PAGE_SIZE }), [page, search]);

  const updateParams = (next: { search?: string; page?: number }) => {
    const nextSearch = next.search ?? search;
    const nextPage = next.page ?? page;
    const params: Record<string, string> = {};
    if (nextSearch) params.search = nextSearch;
    if (nextPage > 1) params.page = String(nextPage);
    setSearchParams(params);
  };

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setIsLoading(true);
        const res = await api.get<ApiResponse<CourseListResponse>>("/courses", { params: query });
        const data = res.data.data;
        const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
        if (data.total > 0 && page > totalPages) {
          updateParams({ page: totalPages });
          return;
        }
        if (data.total === 0 && page > 1) {
          updateParams({ page: 1 });
          return;
        }
        setList(data);
        setItems(data.items);
      } catch {
        setError("No se pudieron cargar los cursos.");
        setList({ items: [], total: 0, page, limit: PAGE_SIZE });
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, query]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cursos"
        subtitle="Explora cursos publicados."
        right={
          <div className="w-full md:w-80">
            <Input
              value={search}
              onChange={(e) => {
                const v = e.target.value;
                updateParams({ search: v, page: 1 });
              }}
              placeholder="Buscar por título…"
            />
          </div>
        }
      />

      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Spinner />
        </div>
      ) : error ? (
        <Card className="p-4 text-sm text-rose-600 dark:text-rose-200">{error}</Card>
      ) : items.length === 0 ? (
        <Card className="p-4 text-sm text-slate-600 dark:text-slate-300">No hay cursos publicados.</Card>
      ) : (
        <Card className="overflow-hidden border-white/80 bg-white/80 p-0 shadow-[0_22px_70px_-50px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:p-6">
            {items.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
          {list ? (
            <PaginationControls
              page={page}
              pageSize={list.limit}
              total={list.total}
              isLoading={isLoading}
              onPageChange={(nextPage) => updateParams({ page: nextPage })}
            />
          ) : null}
        </Card>
      )}
    </div>
  );
}
