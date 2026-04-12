import type { AxiosInstance } from "axios";

function getFilenameFromContentDisposition(value: string | undefined, fallback: string): string {
  if (!value) return fallback;

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const asciiMatch = value.match(/filename="([^"]+)"/i);
  return asciiMatch?.[1] ?? fallback;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadApiFile(api: AxiosInstance, endpoint: string, fallbackFilename: string): Promise<void> {
  const response = await api.get<Blob>(endpoint, {
    responseType: "blob",
  });
  const filename = getFilenameFromContentDisposition(
    response.headers["content-disposition"],
    fallbackFilename,
  );
  saveBlob(response.data, filename);
}

function protectedFileEndpoint(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl, window.location.origin);
    if (!url.pathname.startsWith("/api/files/download/")) return null;
    return url.pathname.replace(/^\/api/, "");
  } catch {
    return null;
  }
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function downloadFileUrl(
  api: AxiosInstance,
  fileUrl: string,
  fallbackFilename = "archivo"
): Promise<void> {
  const protectedEndpoint = protectedFileEndpoint(fileUrl);
  if (protectedEndpoint) {
    await downloadApiFile(api, protectedEndpoint, fallbackFilename);
    return;
  }

  if (!isSafeHttpUrl(fileUrl)) return;
  window.open(fileUrl, "_blank", "noopener,noreferrer");
}

export async function downloadPaymentProof(api: AxiosInstance, paymentId: number): Promise<void> {
  await downloadApiFile(api, `/payments/${paymentId}/proof/download`, `comprobante-pago-${paymentId}`);
}
