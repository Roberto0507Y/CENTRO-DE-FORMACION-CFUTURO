function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  const a = parts[0]?.[0] ?? "U";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${a}${b}`.toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 56,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.36)) }}
      aria-label={name}
      title={name}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </div>
  );
}

