export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function receiptStoragePath(userId: string, recordId: string, ext = "webp", stamp = Date.now()) {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "webp";
  return `${userId}/${recordId}-${stamp}.${safeExt}`;
}

export function validateReceiptFile(file: Pick<File, "size" | "type">): "type" | "size" | null {
  if (file.type && !ALLOWED_TYPES.has(file.type.toLowerCase())) return "type";
  if (file.size > MAX_RECEIPT_BYTES) return "size";
  return null;
}

/**
 * Compresses a browser image file to WebP (max 1400px on the longest edge)
 * to keep Supabase Storage small and uploads fast on mobile networks.
 * Falls back to the original file if canvas compression is unavailable.
 */
export async function compressReceiptImage(file: File): Promise<{ blob: Blob; ext: string; contentType: string }> {
  if (typeof window === "undefined" || typeof createImageBitmap !== "function") {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    return { blob: file, ext, contentType: file.type || "image/jpeg" };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1400;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return { blob: file, ext: "jpg", contentType: file.type || "image/jpeg" };
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
    if (blob && blob.size > 0) {
      return { blob, ext: "webp", contentType: "image/webp" };
    }
  } catch {
    // Fallback to original file when decode/canvas fails (e.g. HEIC on desktop).
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return { blob: file, ext, contentType: file.type || "image/jpeg" };
}
