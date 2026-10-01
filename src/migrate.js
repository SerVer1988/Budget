import { CATEGORY_COLORS, DEFAULT_NEED_CATS, DEFAULT_SETTINGS, DEFAULT_WANT_CATS } from "../constants.js";
import { computeIncomeSplit } from "./debts.js";
import { uid } from "./format.js";

/* ============================================================ migration (old data shapes) */
export function migrateCategoryList(list, defaults) {
  if (!Array.isArray(list) || list.length === 0) return defaults;
  return list.map((item, i) => {
    if (typeof item === "string") {
      const found = defaults.find((d) => d.name === item);
      return found || { name: item, icon: "HelpCircle", color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] };
    }
    return {
      name: item.name || defaults[i]?.name || "Категория",
      icon: item.icon || defaults[i]?.icon || "HelpCircle",
      color: item.color || defaults[i]?.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    };
  });
}

export function migrateSettings(raw) {
  if (!raw) return DEFAULT_SETTINGS;

  const looksOld = "salary" in raw || !("savePct" in raw);
  if (looksOld) {
    return {
      ...DEFAULT_SETTINGS,
      goal: raw.goal ?? DEFAULT_SETTINGS.goal,
      openingBalance: { sber: 0, alfa: 0, ozon: raw.savedBefore || 0 },
      needCats: migrateCategoryList(raw.needCats, DEFAULT_NEED_CATS),
      wantCats: migrateCategoryList(raw.wantCats, DEFAULT_WANT_CATS),
    };
  }

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    needCats: migrateCategoryList(raw.needCats, DEFAULT_NEED_CATS),
    wantCats: migrateCategoryList(raw.wantCats, DEFAULT_WANT_CATS),
    openingBalance: { ...DEFAULT_SETTINGS.openingBalance, ...(raw.openingBalance || {}) },
    includeInTotal: { ...DEFAULT_SETTINGS.includeInTotal, ...(raw.includeInTotal || {}) },
    bucketNames: { ...DEFAULT_SETTINGS.bucketNames, ...(raw.bucketNames || {}) },
    bucketIcons: { ...DEFAULT_SETTINGS.bucketIcons, ...(raw.bucketIcons || {}) },
    closedMonths: Array.isArray(raw.closedMonths) ? raw.closedMonths : [],
    needsWantsResetDate: raw.needsWantsResetDate || null,
  };
}

export function migrateTransactions(list, settings) {
  const out = [];

  (list || []).forEach((t) => {
    if (t.type === "saving") {
      out.push({ ...t, type: "adjustment", card: "ozon" });
      return;
    }

    if (t.type === "income" && !t.card) {
      const s = computeIncomeSplit(t.amount, settings);
      out.push({ ...t, card: "sber" });

      const alfaAmt = Math.round(s.toAlfa);
      const ozonAmt = Math.round(s.toOzon);

      if (alfaAmt > 0) {
        out.push({
          id: uid(),
          type: "transfer",
          date: t.date,
          amount: alfaAmt,
          fromCard: "sber",
          toCard: "alfa",
          note: "Авто-перенос при обновлении приложения",
        });
      }

      if (ozonAmt > 0) {
        out.push({
          id: uid(),
          type: "transfer",
          date: t.date,
          amount: ozonAmt,
          fromCard: "sber",
          toCard: "ozon",
          note: "Авто-перенос при обновлении приложения",
        });
      }

      return;
    }

    if (t.type === "expense" && !t.bucket) {
      out.push({ ...t, bucket: t.card === "alfa" ? "wants" : "needs" });
      return;
    }

    out.push(t);
  });

  return out;
}
