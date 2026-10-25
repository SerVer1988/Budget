import React, { useEffect, useState } from "react";
import { C } from "./constants.js";
import { vkApi } from "./storage.js";
import { vk } from "./vk.js";

/* Строка в профиле: привязать VK к аккаунту (чтобы входить одним нажатием) или отвязать. Скрыта, если VK не настроен. */
export function VkLinkRow() {
  const [linked, setLinked] = useState(null); // null — не знаем, true / false
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    vkApi.status().then((v) => { if (alive) setLinked(v); }).catch(() => { if (alive) setLinked(null); });
    return () => { alive = false; };
  }, []);

  if (!vk.available() || linked === null) return null;

  async function unlink() {
    if (!window.confirm("Отвязать VK? Входить через VK больше не получится, останется вход по почте и паролю.")) return;
    setBusy(true);
    setError("");
    try {
      await vkApi.unlink();
      setLinked(false);
    } catch (e) {
      setError(e.message || "Не получилось отвязать");
    }
    setBusy(false);
  }

  async function link() {
    setBusy(true);
    setError("");
    try {
      await vk.start("link");
    } catch (e) {
      setError(e.message || "Не получилось открыть VK");
      setBusy(false);
    }
  }

  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        Вход через VK: <b style={{ color: linked ? C.sber : C.inkMuted }}>{linked ? "привязан" : "не привязан"}</b>
      </div>
      <button type="button" className="btn" style={{ width: "100%" }} disabled={busy} onClick={linked ? unlink : link}>
        {linked ? "Отвязать VK" : "Привязать VK"}
      </button>
      {error && <div style={{ color: C.danger, fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
