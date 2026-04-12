import { Button } from "./Button";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
};

function buildPageItems(page: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const visible = Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | "ellipsis"> = [];

  for (let index = 0; index < visible.length; index += 1) {
    const current = visible[index];
    const previous = visible[index - 1];
    if (previous && current - previous > 1) items.push("ellipsis");
    items.push(current);
  }

  return items;
}

export function PaginationControls({
  page,
  pageSize,
  total,
  isLoading = false,
  onPageChange,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const items = buildPageItems(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/80 px-4 py-4 backdrop-blur md:flex-row md:items-center md:justify-between md:px-6 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
        Mostrando <span className="font-black text-slate-950 dark:text-white">{start}-{end}</span> de{" "}
        <span className="font-black text-slate-950 dark:text-white">{total}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={isLoading || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>

        {items.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-sm font-black tracking-wider text-slate-400"
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <Button
              key={item}
              size="sm"
              variant={item === page ? "secondary" : "ghost"}
              disabled={isLoading}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          )
        )}

        <Button
          size="sm"
          variant="ghost"
          disabled={isLoading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
