import { RecurringSettings } from "./RecurringSettings.jsx";
import { HouseholdSettings } from "./HouseholdSettings.jsx";
import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Trash2,
  Upload,
} from "lucide-react";
import badgeSberImg from "./assets/badge-sber.webp";
import badgeAlfaImg from "./assets/badge-alfa.webp";
import badgeOzonImg from "./assets/badge-ozon.webp";
import { SectionTitle } from "./ui.jsx";
import { BUCKET_LABEL, C, CATEGORY_COLORS, ICON_KEYS, ICON_MAP, getIcon } from "./constants.js";
import { exportCsv, exportJsonBackup } from "./backup.js";
import { bucketName, bucketNameGen } from "./format.js";

/* ============================================================ Settings */
/* Выбор банка для одного из трёх бюджетов (50/30/20): три готовых логотипа
   (Сбер/Альфа/Озон) плюс кнопка загрузки своей картинки. */
export function BankIconPicker({ icon, onChange }) {
  const fileRef = useRef(null);
  const presets = [
    { key: "sber", src: badgeSberImg },
    { key: "alfa", src: badgeAlfaImg },
    { key: "ozon", src: badgeOzonImg },
  ];

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ type: "custom", dataUrl: reader.result });
    reader.readAsDataURL(file);
  }

  return (
    <div className="bank-icon-picker">
      {presets.map((p) => (
        <button
          key={p.key}
          type="button"
          className={`bank-icon-option${icon?.type !== "custom" && (icon?.key || "sber") === p.key ? " active" : ""}`}
          onClick={() => onChange({ type: "builtin", key: p.key })}
          aria-label={p.key}
        >
          <img src={p.src} alt="" />
        </button>
      ))}
      <button
        type="button"
        className={`bank-icon-option${icon?.type === "custom" ? " active" : ""}`}
        onClick={() => fileRef.current?.click()}
        aria-label="Свой значок"
      >
        {icon?.type === "custom" && icon.dataUrl ? <img src={icon.dataUrl} alt="" /> : <Upload size={16} />}
      </button>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

export function CategoryPickerPanel({ cat, onChange }) {
  const colorIndex = Math.max(0, CATEGORY_COLORS.indexOf(cat.color));

  return (
    <div className="icon-picker">
      <input
        className="icon-picker-name"
        value={cat.name}
        onChange={(e) => onChange({ ...cat, name: e.target.value })}
        placeholder="Название категории"
      />

      <input
        type="range"
        className="color-slider"
        min={0}
        max={CATEGORY_COLORS.length - 1}
        step={1}
        value={colorIndex}
        onChange={(e) => onChange({ ...cat, color: CATEGORY_COLORS[Number(e.target.value)] })}
        style={{ background: `linear-gradient(to right, ${CATEGORY_COLORS.join(", ")})` }}
      />

      <div className="icon-grid">
        {ICON_KEYS.map((key) => {
          const IconOpt = ICON_MAP[key];
          const active = cat.icon === key;
          return (
            <button
              key={key}
              type="button"
              className={`icon-grid-btn${active ? " active" : ""}`}
              style={active ? { background: cat.color + "22", borderColor: cat.color, color: cat.color } : undefined}
              onClick={() => onChange({ ...cat, icon: key })}
              aria-label={key}
            >
              <IconOpt size={18} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CategoryRow({ cat, open, onToggleOpen, onChange, onDelete }) {
  const Icon = getIcon(cat.icon);

  return (
    <div className="cat-edit-row">
      <div className="tx-row">
        <button
          type="button"
          className="quick-icon"
          style={{ width: 38, height: 38, background: cat.color + "22", border: 0, padding: 0, cursor: "pointer" }}
          onClick={onToggleOpen}
          aria-label="Изменить иконку и цвет"
        >
          <Icon size={18} style={{ color: cat.color }} />
        </button>

        <div className="tx-main">
          <input
            value={cat.name}
            onChange={(e) => onChange({ ...cat, name: e.target.value })}
            style={{
              width: "100%",
              height: 34,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "0 10px",
              background: C.surface2,
              color: C.ink,
            }}
          />
        </div>

        <button onClick={onDelete} className="delete-btn" type="button" aria-label="Удалить">
          <Trash2 size={14} />
        </button>
      </div>

      {open && <CategoryPickerPanel cat={cat} onChange={onChange} />}
    </div>
  );
}

export function SettingsView({ settings, transactions, onImport, onSaveSettings, onSave, onWipeAll, onResetTracking, userEmail, onSignOut }) {
  const importInputRef = useRef(null);
  const [importMsg, setImportMsg] = useState("");

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || data.app !== "budget" || !Array.isArray(data.transactions) || typeof data.settings !== "object") {
        setImportMsg("Это не резервная копия приложения.");
        return;
      }
      const ok = window.confirm(
        `Заменить текущие данные (операций: ${(transactions || []).length}) данными из файла (операций: ${data.transactions.length})? Сначала сохраните копию текущих данных, если они нужны.`
      );
      if (!ok) return;
      onImport(data);
      setImportMsg(`Восстановлено: операций ${data.transactions.length}.`);
    } catch {
      setImportMsg("Не удалось прочитать файл.");
    }
  }
  const [draft, setDraft] = useState(settings);
  const [daysText, setDaysText] = useState((settings.reminderDays || []).join(", "));
  const [saved, setSaved] = useState(false);
  const [needsOpen, setNeedsOpen] = useState(false);
  const [wantsOpen, setWantsOpen] = useState(false);
  const [openCatKey, setOpenCatKey] = useState(null);

  useEffect(() => {
    setDraft(settings);
    setDaysText((settings.reminderDays || []).join(", "));
  }, [settings]);

  function numberValue(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function save() {
    const reminderDays = daysText
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => Number.isFinite(x) && x >= 1 && x <= 31);

    const next = {
      ...draft,
      wantPct: numberValue(draft.wantPct),
      savePct: numberValue(draft.savePct),
      goal: numberValue(draft.goal),
      reminderDays,
      openingBalance: {
        sber: numberValue(draft.openingBalance?.sber),
        alfa: numberValue(draft.openingBalance?.alfa),
        ozon: numberValue(draft.openingBalance?.ozon),
      },
    };

    onSave(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1300);
  }

  function updateNeedCat(index, next) {
    setDraft((d) => {
      const arr = [...d.needCats];
      arr[index] = next;
      return { ...d, needCats: arr };
    });
  }

  function updateWantCat(index, next) {
    setDraft((d) => {
      const arr = [...d.wantCats];
      arr[index] = next;
      return { ...d, wantCats: arr };
    });
  }

  return (
    <div className="screen-stack">
      <div className="panel">
        <SectionTitle>Банки бюджета (50/30/20)</SectionTitle>

        {[
          { bucket: "needs", pct: 100 - Number(draft.wantPct || 0) - Number(draft.savePct || 0) },
          { bucket: "wants", pct: Number(draft.wantPct || 0) },
          { bucket: "savings", pct: Number(draft.savePct || 0) },
        ].map(({ bucket, pct }) => (
          <div key={bucket} className="bucket-config-row">
            <BankIconPicker
              icon={draft.bucketIcons?.[bucket]}
              onChange={(icon) => setDraft((d) => ({ ...d, bucketIcons: { ...d.bucketIcons, [bucket]: icon } }))}
            />
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>{pct}% дохода</label>
              <input
                value={draft.bucketNames?.[bucket] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, bucketNames: { ...d.bucketNames, [bucket]: e.target.value } }))}
                placeholder={BUCKET_LABEL[bucket]}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="panel panel-compact">
        <SectionTitle>Правило распределения</SectionTitle>

        <div className="form-grid-2">
          <div className="field">
            <label>{bucketName(draft, "wants")}, %</label>
            <input
              type="number"
              value={draft.wantPct}
              onChange={(e) => setDraft({ ...draft, wantPct: e.target.value })}
            />
          </div>
          <div className="field">
            <label>{bucketName(draft, "savings")}, %</label>
            <input
              type="number"
              value={draft.savePct}
              onChange={(e) => setDraft({ ...draft, savePct: e.target.value })}
            />
          </div>
        </div>


        <div className="form-grid-2">
          <div className="field">
            <label>Дни напоминаний</label>
            <input value={daysText} onChange={(e) => setDaysText(e.target.value)} placeholder="5, 15, 30" />
          </div>

          <div className="field">
            <label>Цель {bucketNameGen(draft, "savings").toLowerCase()}</label>
            <input
              type="number"
              inputMode="decimal"
              value={draft.goal}
              onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="panel">
        <SectionTitle>Сверка «{bucketName(draft, "needs")}» и «{bucketName(draft, "wants")}»</SectionTitle>
        <button
          className="btn"
          type="button"
          style={{ width: "100%" }}
          onClick={() => {
            if (window.confirm(`Сбросить точку отсчёта ${bucketNameGen(draft, "needs")}/${bucketNameGen(draft, "wants")} на сегодня?`)) {
              onResetTracking();
            }
          }}
        >
          Сбросить отсчёт на сегодня
        </button>
      </div>

      <div className="panel panel-compact">
        <SectionTitle>Начальные балансы</SectionTitle>

        <div className="form-grid-3">
          {[["sber", "needs"], ["alfa", "wants"], ["ozon", "savings"]].map(([card, bucket]) => (
            <div className="field" key={card}>
              <label>{bucketName(draft, bucket)}</label>
              <input
                type="number"
                inputMode="decimal"
                value={draft.openingBalance?.[card] ?? 0}
                onChange={(e) => setDraft({
                  ...draft,
                  openingBalance: { ...draft.openingBalance, [card]: e.target.value },
                })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <button
          type="button"
          className="section-title-toggle"
          onClick={() => setNeedsOpen((v) => !v)}
        >
          <SectionTitle>Категории {bucketNameGen(draft, "needs").toLowerCase()}</SectionTitle>
          <ChevronDown size={16} className={`section-chevron${needsOpen ? " open" : ""}`} />
        </button>

        {needsOpen && (
          <>
            <div className="history-list">
              {draft.needCats.map((cat, i) => (
                <CategoryRow
                  key={`needs-${i}`}
                  cat={cat}
                  open={openCatKey === `needs-${i}`}
                  onToggleOpen={() => setOpenCatKey((k) => (k === `needs-${i}` ? null : `needs-${i}`))}
                  onChange={(next) => updateNeedCat(i, next)}
                  onDelete={() => setDraft((d) => ({ ...d, needCats: d.needCats.filter((_, k) => k !== i) }))}
                />
              ))}
            </div>

            <button
              className="btn"
              type="button"
              style={{ width: "100%", marginTop: 10 }}
              onClick={() => {
                const idx = draft.needCats.length;
                setDraft((d) => ({
                  ...d,
                  needCats: [
                    ...d.needCats,
                    { name: "Новая категория", icon: "HelpCircle", color: CATEGORY_COLORS[d.needCats.length % CATEGORY_COLORS.length] },
                  ],
                }));
                setOpenCatKey(`needs-${idx}`);
              }}
            >
              Добавить категорию
            </button>
          </>
        )}
      </div>

      <div className="panel">
        <button
          type="button"
          className="section-title-toggle"
          onClick={() => setWantsOpen((v) => !v)}
        >
          <SectionTitle>Категории {bucketNameGen(draft, "wants").toLowerCase()}</SectionTitle>
          <ChevronDown size={16} className={`section-chevron${wantsOpen ? " open" : ""}`} />
        </button>

        {wantsOpen && (
          <>
            <div className="history-list">
              {draft.wantCats.map((cat, i) => (
                <CategoryRow
                  key={`wants-${i}`}
                  cat={cat}
                  open={openCatKey === `wants-${i}`}
                  onToggleOpen={() => setOpenCatKey((k) => (k === `wants-${i}` ? null : `wants-${i}`))}
                  onChange={(next) => updateWantCat(i, next)}
                  onDelete={() => setDraft((d) => ({ ...d, wantCats: d.wantCats.filter((_, k) => k !== i) }))}
                />
              ))}
            </div>

            <button
              className="btn"
              type="button"
              style={{ width: "100%", marginTop: 10 }}
              onClick={() => {
                const idx = draft.wantCats.length;
                setDraft((d) => ({
                  ...d,
                  wantCats: [
                    ...d.wantCats,
                    { name: "Новая категория", icon: "HelpCircle", color: CATEGORY_COLORS[d.wantCats.length % CATEGORY_COLORS.length] },
                  ],
                }));
                setOpenCatKey(`wants-${idx}`);
              }}
            >
              Добавить категорию
            </button>
          </>
        )}
      </div>

      <div className="button-row">
        <button className="btn primary" type="button" onClick={save}>
          {saved ? "Сохранено" : "Сохранить"}
        </button>
        <button
          className="btn"
          type="button"
          style={{ color: C.danger }}
          onClick={() => {
            if (window.confirm("Удалить все операции? Настройки останутся.")) {
              onWipeAll();
            }
          }}
        >
          Очистить
        </button>
      </div>

      <RecurringSettings settings={settings} onSaveSettings={onSaveSettings} />

      <HouseholdSettings />

      <div className="panel">
        <SectionTitle>Данные</SectionTitle>
        <div className="button-row" style={{ marginBottom: 8 }}>
          <button className="btn" type="button" onClick={() => exportJsonBackup(settings, transactions || [])}>
            Резервная копия (JSON)
          </button>
          <button className="btn" type="button" onClick={() => exportCsv(settings, transactions || [])}>
            Таблица (CSV)
          </button>
        </div>
        <button className="btn" type="button" style={{ width: "100%" }} onClick={() => importInputRef.current?.click()}>
          Восстановить из копии
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={handleImportFile}
        />
        {importMsg && (
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{importMsg}</div>
        )}
      </div>

      <div className="panel">
        <SectionTitle>Аккаунт</SectionTitle>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10, wordBreak: "break-all" }}>
          {userEmail ? `Вы вошли как ${userEmail}.` : "Вы вошли."}
        </div>
        <button className="btn" type="button" style={{ width: "100%" }} onClick={onSignOut}>
          Выйти
        </button>
      </div>
    </div>
  );
}
