import { getBiPayEmbedUrl } from "../../utils/paymentLink";

export function BiPayEmbed({
  paymentLink,
  title = "Boton de pago BI Pay",
  className = "",
}: {
  paymentLink: string | null | undefined;
  title?: string;
  className?: string;
}) {
  const embedUrl = getBiPayEmbedUrl(paymentLink);
  if (!embedUrl) return null;

  return (
    <div className={className}>
      <div className="flex justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
        <iframe
          src={embedUrl}
          title={title}
          frameBorder="0"
          width="175"
          height="75"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="max-w-full"
        />
      </div>
    </div>
  );
}
