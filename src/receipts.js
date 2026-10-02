import { storage } from "./storage.js";

/* Фото чеков. Каждое фото сжимается до ~1280 px (JPEG) и хранится в облаке отдельной записью
   «receipt:<id операции>». В самой операции лежит только флаг receipt: true. */
export const receiptKey = (txId) => `receipt:${txId}`;

export async function compressImage(file, maxSide = 1280, quality = 0.72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Не удалось открыть фото"));
      i.src = url;
    });
    const k = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * k));
    const h = Math.max(1, Math.round(img.height * k));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function saveReceipt(txId, dataUrl) {
  return storage.setBlob(receiptKey(txId), dataUrl);
}

export function loadReceipt(txId) {
  return storage.getBlob(receiptKey(txId));
}

/* Удаление не критично: если не вышло (нет сети), просто останется неиспользуемая запись. */
export async function removeReceipt(txId) {
  try {
    await storage.deleteBlob(receiptKey(txId));
  } catch {
    /* ignore */
  }
}
