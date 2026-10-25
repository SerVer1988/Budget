import { computeIncomeSplitWithDebts } from "../src/debts.js";
import { notificationHelp } from "../src/notify.js";
import { DEFAULT_SETTINGS } from "../src/constants.js";

const settings = { ...DEFAULT_SETTINGS, distMode: "payday", wantPct: 30, savePct: 20 };
const debt = (o) => ({ id: Math.random().toString(36).slice(2), type: "debt", repaid: false, ...o });

describe("распределение дохода с внутренними долгами между бюджетами", () => {
  it("без долгов делит по процентам 50/30/20", () => {
    const r = computeIncomeSplitWithDebts(10000, settings, [], {});
    expect([r.toSber, r.toAlfa, r.toOzon]).toEqual([5000, 3000, 2000]);
    expect(r.repayments).toEqual([]);
  });

  it("часть доли должника уходит кредитору, но не больше половины его доли", () => {
    // «Желания» должны «Нуждам» 5 820 ₽ (Нужды дали взаймы со своей карты)
    const d = debt({ fromBucket: "needs", toBucket: "wants", remainingAmount: 5820 });
    const r = computeIncomeSplitWithDebts(10000, settings, [d], {});
    expect(r.toAlfa).toBeCloseTo(1500, 5); // доля «Желаний» 3000, половина (1500) уходит на погашение
    expect(r.toSber).toBeCloseTo(6500, 5);
    expect(r.toOzon).toBeCloseTo(2000, 5);
    expect(r.repayments[0].amount).toBeCloseTo(1500, 5);
  });

  it("небольшой долг гасится целиком, остаток дохода делится как обычно", () => {
    const d = debt({ fromBucket: "needs", toBucket: "savings", remainingAmount: 300 });
    const r = computeIncomeSplitWithDebts(10000, settings, [d], {});
    expect(r.toOzon).toBeCloseTo(1700, 5);
    expect(r.toSber).toBeCloseTo(5300, 5);
  });

  it("сумма всех долей всегда равна доходу, погашенные долги не учитываются", () => {
    const list = [
      debt({ fromBucket: "needs", toBucket: "wants", remainingAmount: 5820 }),
      debt({ fromBucket: "needs", toBucket: "savings", remainingAmount: 4313 }),
      debt({ fromBucket: "wants", toBucket: "needs", remainingAmount: 0, repaid: true }),
    ];
    const r = computeIncomeSplitWithDebts(18429, settings, list, {});
    expect(r.toSber + r.toAlfa + r.toOzon).toBeCloseTo(18429, 5);
    expect(r.repayments).toHaveLength(2);
  });
});

describe("подсказки, если уведомления не включаются", () => {
  it("объясняют, где разрешить, и различают причины", () => {
    expect(notificationHelp("denied")).toContain("Настройки → Приложения");
    expect(notificationHelp("unsupported")).toContain("не поддерживает");
    expect(notificationHelp("default")).toContain("«Разрешить»");
  });
});
