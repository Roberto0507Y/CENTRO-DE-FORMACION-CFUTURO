export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"
      style={{ width: size, height: size }}
    />
  );
}

