import { getBiPayEmbedUrl, isBiPayCheckoutLink, normalizePaymentLinkInput } from "../../utils/paymentLink";

export function BiPayEmbed({
  paymentLink,
  title = "Boton de pago BI Pay",
  className = "",
}: {
  paymentLink: string | null | undefined;
  title?: string;
  className?: string;
}) {
  const normalizedLink = normalizePaymentLinkInput(paymentLink);
  const embedUrl = getBiPayEmbedUrl(paymentLink);
  const canOpenDirectly = isBiPayCheckoutLink(paymentLink) || Boolean(normalizedLink);

  if (!embedUrl && !canOpenDirectly) return null;

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(224,242,254,0.8),rgba(248,250,252,0.96)_45%,rgba(255,255,255,1)_100%)] p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),rgba(15,23,42,0.92)_48%,rgba(2,6,23,0.96)_100%)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Pago seguro
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">BI Pay / EBI</div>
          </div>
          <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            Enlace oficial
          </div>
        </div>

        {embedUrl ? (
          <div className="flex justify-center rounded-[1.5rem] border border-slate-200/80 bg-white p-3 shadow-inner dark:border-slate-700 dark:bg-slate-950/70">
            <iframe
              src={embedUrl}
              title={title}
              frameBorder="0"
              width="175"
              height="75"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="max-w-full rounded-xl bg-white"
            />
          </div>
        ) : normalizedLink ? (
          <a
            href={normalizedLink}
            target="_blank"
            rel="noreferrer"
            className="group relative flex min-h-[96px] w-full items-center justify-between gap-4 overflow-hidden rounded-[1.5rem] bg-slate-950 px-5 py-4 text-white shadow-[0_20px_45px_-28px_rgba(15,23,42,0.9)] ring-1 ring-slate-900/80 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_55px_-30px_rgba(14,165,233,0.45)] dark:bg-slate-900"
            aria-label={title}
          >
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.28),transparent_38%),linear-gradient(135deg,rgba(37,99,235,0.2),rgba(15,23,42,0.08)_55%,rgba(15,23,42,0.04))]" />
            <span className="relative flex min-w-0 items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10 backdrop-blur-sm">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-cyan-300" fill="none" aria-hidden="true">
                  <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M4.75 9.5h14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M8 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300/80">
                  Pago seguro
                </span>
                <span className="mt-1 block text-lg font-black tracking-tight text-white">
                  Continuar con BI Pay
                </span>
                <span className="mt-1 block text-sm text-white/70">
                  Abrir enlace oficial de EBI
                </span>
              </span>
            </span>
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-slate-950 shadow-sm transition duration-300 group-hover:translate-x-0.5">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                <path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </a>
        ) : null}
      </div>
    </div>
  );
}
