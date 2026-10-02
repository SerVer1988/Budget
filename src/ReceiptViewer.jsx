import React, { createContext, useEffect, useRef, useState } from "react";
import { Camera, Paperclip, X } from "lucide-react";
import { C } from "./constants.js";
import { compressImage, loadReceipt } from "./receipts.js";

/* Контекст: любой ряд операции может открыть просмотр чека, не пробрасывая обработчик через все экраны. */
export const ReceiptContext = createContext(() => {});

export { Paperclip };

export function ReceiptModal({ txId, onClose }) {
  const [state, setState] = useState({ loading: true, src: null, error: "" });

  useEffect(() => {
    let alive = true;
    loadReceipt(txId)
      .then((src) => alive && setState({ loading: false, src, error: src ? "" : "Фото не найдено" }))
      .catch(() => alive && setState({ loading: false, src: null, error: "Не удалось загрузить фото (нужен интернет)" }));
    return () => { alive = false; };
  }, [txId]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.86)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}
    >
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 12px)", right: 12, color: "#fff", background: "transparent", border: 0 }}
      >
        <X size={26} />
      </button>
      {state.loading && <div style={{ color: "#fff" }}>Загрузка…</div>}
      {state.error && <div style={{ color: "#fff", textAlign: "center" }}>{state.error}</div>}
      {state.src && <img src={state.src} alt="Чек" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />}
    </div>
  );
}

/* Поле «Чек» в форме операции. receipt = { data, remove }; had — у операции уже есть сохранённое фото. */
export function ReceiptField({ had, receipt, onChange, txId }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState(null);

  // Для редактируемой операции подгружаем уже сохранённое фото (миниатюра).
  useEffect(() => {
    if (!had || !txId) return undefined;
    let alive = true;
    loadReceipt(txId).then((src) => alive && setExisting(src)).catch(() => {});
    return () => { alive = false; };
  }, [had, txId]);

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange({ data: await compressImage(file), remove: false });
    } catch (err) {
      setError(err.message || "Не удалось обработать фото");
    } finally {
      setBusy(false);
    }
  }

  const preview = receipt.data || (had && !receipt.remove ? existing : null);
  const has = !!receipt.data || (had && !receipt.remove);

  return (
    <div className="field">
      <label>Чек</label>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pick} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {preview && <img src={preview} alt="Чек" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />}
        <button type="button" className="btn" disabled={busy} onClick={() => inputRef.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Camera size={15} /> {busy ? "Обработка…" : has ? "Заменить фото" : "Добавить фото"}
        </button>
        {has && (
          <button type="button" className="btn" onClick={() => onChange({ data: null, remove: true })}>
            Убрать
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: 12, color: C.danger, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
