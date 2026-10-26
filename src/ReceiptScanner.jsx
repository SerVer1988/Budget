import React, { useEffect, useRef, useState } from "react";
import { ImageUp, X } from "lucide-react";
import { parseReceiptQr } from "./receiptQr.js";

/* Сканер QR-кода кассового чека. Камера и распознавание работают целиком на устройстве: картинка нигде не сохраняется
   и никуда не отправляется. Используем встроенный в Chrome распознаватель, а если его нет, библиотеку jsQR. */

let jsQRPromise = null;
const loadJsQR = () => (jsQRPromise ||= import("./vendor/jsQR.js").then((m) => m.default));

async function makeDetector() {
  try {
    if (typeof window !== "undefined" && "BarcodeDetector" in window) return new window.BarcodeDetector({ formats: ["qr_code"] });
  } catch { /* встроенного распознавателя нет */ }
  return null;
}

/* Ищет QR на холсте. Возвращает текст или "". */
async function readQr(canvas, detector, both = false) {
  if (detector) {
    try {
      const found = await detector.detect(canvas);
      if (found && found.length && found[0].rawValue) return found[0].rawValue;
    } catch { /* пробуем библиотеку */ }
  }
  const jsQR = await loadJsQR();
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: both ? "attemptBoth" : "dontInvert" });
  return hit ? hit.data : "";
}

/* Фото чека из галереи или камеры: пробуем разные размеры, мелкий QR на большом снимке легко потерять. */
async function readQrFromFile(file, detector) {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  for (const side of [1600, 2400, 1000]) {
    const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext("2d", { willReadFrequently: true }).drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const text = await readQr(canvas, detector, true);
    if (text) return text;
  }
  return "";
}

const frameCorner = { position: "absolute", width: 28, height: 28, borderColor: "#fff", borderStyle: "solid", borderWidth: 0 };

export function ReceiptScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const [hint, setHint] = useState("Наведите камеру на QR-код внизу чека");
  const [fatal, setFatal] = useState("");
  const fileRef = useRef(null);

  function accept(raw) {
    const parsed = parseReceiptQr(raw);
    if (parsed.ok) {
      try { navigator.vibrate?.(60); } catch { /* не везде есть */ }
      onResult(parsed);
      return true;
    }
    setHint(parsed.error + ". Наведите на QR-код кассового чека");
    return false;
  }

  useEffect(() => {
    let alive = true;
    let stream = null;
    let timer = null;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setFatal("Камера недоступна в этом окне. Можно загрузить фото чека кнопкой ниже.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        setFatal(
          e && e.name === "NotAllowedError"
            ? "Нет доступа к камере. Разрешите камеру для «Бюджета» в настройках телефона (Chrome → Настройки сайтов → Камера) или загрузите фото чека."
            : "Не удалось включить камеру. Загрузите фото чека кнопкой ниже."
        );
        return;
      }
      if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
      const video = videoRef.current;
      video.srcObject = stream;
      try { await video.play(); } catch { /* автозапуск мог быть уже выполнен */ }

      const detector = await makeDetector();
      const canvas = document.createElement("canvas");
      let busy = false;
      let lastBad = "";
      const tick = async () => {
        if (!alive) return;
        if (!busy && video.videoWidth) {
          busy = true;
          try {
            const k = Math.min(1, 1280 / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * k);
            canvas.height = Math.round(video.videoHeight * k);
            canvas.getContext("2d", { willReadFrequently: true }).drawImage(video, 0, 0, canvas.width, canvas.height);
            const raw = await readQr(canvas, detector);
            if (raw && raw !== lastBad) {
              if (accept(raw)) return; // готово: камера выключится при закрытии окна
              lastBad = raw;
            }
          } catch { /* кадр пропускаем */ }
          busy = false;
        }
        timer = setTimeout(tick, 160);
      };
      tick();
    })();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setHint("Ищем QR-код на фото…");
    try {
      const raw = await readQrFromFile(file, await makeDetector());
      if (!raw) setHint("QR-код на фото не найден. Сфотографируйте его крупнее и ровнее.");
      else accept(raw);
    } catch {
      setHint("Не удалось прочитать фото. Попробуйте ещё раз.");
    }
  }

  return (
    <div role="dialog" aria-modal="true" onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "#000", color: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Сканировать чек</div>
        <button type="button" aria-label="Закрыть" onClick={onClose} style={{ border: 0, background: "rgba(255,255,255,0.15)", color: "#fff", width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ position: "relative", flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <video ref={videoRef} playsInline muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: fatal ? 0 : 1 }} />
        {!fatal && (
          <div style={{ position: "relative", width: "62%", maxWidth: 280, aspectRatio: "1 / 1" }}>
            <span style={{ ...frameCorner, top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 }} />
            <span style={{ ...frameCorner, top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 }} />
            <span style={{ ...frameCorner, bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 }} />
            <span style={{ ...frameCorner, bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 }} />
          </div>
        )}
        {fatal && <div style={{ position: "relative", padding: 24, textAlign: "center", fontSize: 14, lineHeight: 1.5 }}>{fatal}</div>}
      </div>

      <div style={{ padding: "14px 16px 22px", textAlign: "center" }}>
        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12, minHeight: 18 }}>{fatal ? "" : hint}</div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={onFile} />
        <button
          type="button"
          onClick={() => fileRef.current && fileRef.current.click()}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 18px", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 14, background: "transparent", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          <ImageUp size={18} /> Загрузить фото чека
        </button>
        {fatal && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 10 }}>{hint}</div>}
      </div>
    </div>
  );
}
