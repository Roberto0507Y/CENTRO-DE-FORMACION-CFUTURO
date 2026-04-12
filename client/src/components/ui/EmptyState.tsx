import type { ReactNode } from "react";
import { Card } from "./Card";
import { Button } from "./Button";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
};

function DefaultIcon() {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm ring-1 ring-black/5">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21 15V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 14l2-2 3 3 4-4 2 2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
}: Props) {
  const hasPrimary = Boolean(actionLabel && onAction);
  const hasSecondary = Boolean(secondaryActionLabel && onSecondaryAction);

  return (
    <Card className={`mx-auto w-full max-w-2xl overflow-hidden p-0 ${className}`}>
      <div className="relative p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.12),transparent_34%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.14),transparent_34%)]" />
        <div className="relative">
      <div className="mx-auto grid max-w-xl place-items-center text-center">
        {icon ? <div className="mb-4">{icon}</div> : <div className="mb-4"><DefaultIcon /></div>}

        <div className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl dark:text-white">
          {title}
        </div>
        {description ? (
          <div className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            {description}
          </div>
        ) : null}

        {hasPrimary || hasSecondary ? (
          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            {hasPrimary ? (
              <Button className="w-full sm:w-auto" onClick={onAction}>
                {actionLabel}
              </Button>
            ) : null}
            {hasSecondary ? (
              <Button className="w-full sm:w-auto" variant="secondary" onClick={onSecondaryAction}>
                {secondaryActionLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
        </div>
      </div>
    </Card>
  );
}
