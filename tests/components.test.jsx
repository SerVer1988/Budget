import React from "react";
import { renderToString } from "react-dom/server";
import { AuthScreen, ConsentScreen } from "../src/AuthScreen.jsx";
import { EmptyAnalysis, WelcomeSheet } from "../src/Onboarding.jsx";
import { ReportProblem } from "../src/ReportProblem.jsx";
import { SupportSection } from "../src/SupportSection.jsx";
import { DEFAULT_SETTINGS } from "../src/constants.js";

const text = (el) => renderToString(el).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("экраны отрисовываются без ошибок", () => {
  it("вход: есть «Если вы забыли пароль» и «глазик» пароля", () => {
    const html = renderToString(<AuthScreen />);
    expect(html).toContain("Если вы забыли пароль");
    expect(html).toContain("Показать пароль");
  });

  it("согласие на обработку данных для тех, кто зарегистрировался раньше", () => {
    const t = text(<ConsentScreen onAccepted={() => {}} onSignOut={() => {}} />);
    expect(t).toContain("Согласие на обработку данных");
    expect(t).toContain("Принимаю и продолжаю");
  });

  it("приветствие: первый шаг объясняет три бюджета и показывает их названия", () => {
    const t = text(<WelcomeSheet settings={DEFAULT_SETTINGS} onFinish={() => {}} />);
    expect(t).toContain("Три бюджета");
    expect(t).toContain("Нужды");
    expect(t).toContain("Желания");
    expect(t).toContain("Подушка");
    expect(t).toContain("Пропустить");
  });

  it("пустой экран «Анализа» предлагает добавить операцию или посмотреть пример", () => {
    const t = text(<EmptyAnalysis onAdd={() => {}} onSample={() => {}} />);
    expect(t).toContain("Пока нет операций");
    expect(t).toContain("Добавить операцию");
    expect(t).toContain("Показать на примере");
  });

  it("«Сообщить о проблеме»: поле, согласие и прозрачность отправляемого", () => {
    const t = text(<ReportProblem onClose={() => {}} />);
    expect(t).toContain("Сообщить о проблеме");
    expect(t).toContain("Показать, что будет отправлено");
    expect(t).toContain("Ваших операций, сумм и заметок в нём нет");
    expect(t).toContain("соглашаетесь передать");
  });

  it("раздел помощи содержит контакты и политику", () => {
    const html = renderToString(<SupportSection onShowWelcome={() => {}} />);
    expect(html).toContain("Помощь и поддержка");
  });
});

import { PayPlanCard } from "../src/PayPlanCard.jsx";
import { buildSampleData } from "../src/sampleData.js";
import { todayStr } from "../src/format.js";

describe("«План до выплаты»", () => {
  const settings = { ...DEFAULT_SETTINGS, reminderDays: [5], distMode: "payday", wantPct: 30, savePct: 20 };
  const base = buildSampleData(todayStr());

  it("без долгов между бюджетами деление идёт по правилу", () => {
    const t = text(<PayPlanCard transactions={base} settings={settings} />);
    expect(t).toContain("План до выплаты");
    expect(t).not.toContain("Учтено погашение долгов");
  });

  it("при долгах между бюджетами показывает деление с учётом погашения", () => {
    const debt = { id: "d1", type: "debt", repaid: false, fromBucket: "needs", toBucket: "wants", remainingAmount: 5820, date: todayStr() };
    const t = text(<PayPlanCard transactions={[...base, debt]} settings={settings} />);
    expect(t).toContain("Учтено погашение долгов между бюджетами");
  });
});

import { FAQ } from "../src/SupportSection.jsx";
import { OP_TABS } from "../src/OpUi.jsx";

describe("помощь в приложении", () => {
  it("вопросы не пустые и не повторяются", () => {
    const qs = FAQ.map(([q]) => q);
    expect(new Set(qs).size).toBe(qs.length);
    FAQ.forEach(([q, a]) => {
      expect(q.length).toBeGreaterThan(5);
      expect(a.length).toBeGreaterThan(20);
    });
  });

  it("ответ про внесение операции называет все вкладки формы (названия не расходятся с интерфейсом)", () => {
    const answer = FAQ.find(([q]) => q.includes("внести операцию"))[1];
    OP_TABS.forEach((t) => expect(answer).toContain(`«${t.label}»`));
  });

  it("в ответах нет устаревших названий", () => {
    FAQ.forEach(([, a]) => expect(a).not.toMatch(/Коррекци/));
  });
});

import { FullAddForm } from "../src/form.jsx";
import { ReceiptScanner } from "../src/ReceiptScanner.jsx";

describe("форма «Новая операция»: сканирование чека и места", () => {
  const props = { settings: DEFAULT_SETTINGS, onSubmit: () => {}, onCancel: () => {} };
  const spent = (note, date) => ({ id: note + date, type: "expense", amount: 100, date, card: "sber", bucket: "needs", category: "Продукты", note });

  it("у траты есть кнопка сканирования чека, у дохода и перевода нет", () => {
    expect(renderToString(<FullAddForm {...props} transactions={[]} initial={{ type: "expense" }} />)).toContain('aria-label="Сканировать чек"');
    expect(renderToString(<FullAddForm {...props} transactions={[]} initial={{ type: "income" }} />)).not.toContain("Сканировать чек");
    expect(renderToString(<FullAddForm {...props} transactions={[]} initial={{ type: "transfer" }} />)).not.toContain("Сканировать чек");
  });

  it("при редактировании существующей траты сканер не предлагается", () => {
    const html = renderToString(<FullAddForm {...props} transactions={[]} initial={{ type: "expense", editId: "x", amount: 5 }} />);
    expect(html).not.toContain("Сканировать чек");
  });

  it("поле места называется понятно, и показываются частые места", () => {
    const today = new Date().toISOString().slice(0, 10);
    const html = renderToString(<FullAddForm {...props} transactions={[spent("Магнит", today), spent("Магнит", today), spent("Аптека", today)]} initial={{ type: "expense" }} />);
    expect(html).toContain("Где купили или заметка");
    expect(html).toContain("Частые места");
    expect(html).toContain("Магнит");
    expect(html).toContain("Аптека");
  });

  it("без истории покупок блок «Частые места» не показывается", () => {
    const html = renderToString(<FullAddForm {...props} transactions={[]} initial={{ type: "expense" }} />);
    expect(html).not.toContain("Частые места");
  });

  it("экран сканера: подсказка и запасной путь через фото", () => {
    const t = text(<ReceiptScanner onResult={() => {}} onClose={() => {}} />);
    expect(t).toContain("Сканировать чек");
    expect(t).toContain("Загрузить фото чека");
    expect(t).toContain("QR-код");
  });
});

import { OpQuick } from "../src/OpUi.jsx";

describe("доработки после проверки на телефоне", () => {
  const props = { settings: DEFAULT_SETTINGS, onSubmit: () => {}, onCancel: () => {} };

  it("в новой трате нет строки «Фото чека»", () => {
    expect(renderToString(<FullAddForm {...props} transactions={[]} initial={{ type: "expense" }} />)).not.toContain("Фото чека");
  });

  it("у сохранённой траты с чеком фото можно посмотреть и заменить", () => {
    const html = renderToString(<FullAddForm {...props} transactions={[]} initial={{ type: "expense", editId: "x", amount: 5, receipt: true }} />);
    expect(html).toContain("Фото чека");
  });

  it("у долга фото осталось (оно нужно для значка в «Фонде»)", () => {
    expect(renderToString(<FullAddForm {...props} transactions={[]} initial={{ type: "loan" }} />)).toContain("Фото должника");
  });

  it("полоса «Частых мест» не пропускает касания наверх, чтобы не листались вкладки формы", () => {
    const el = OpQuick({ label: "Частые места", items: ["Магнит"], onPick: () => {} });
    const stripe = React.Children.toArray(el.props.children).find((c) => c && c.props && c.props.style && c.props.style.overflowX === "auto");
    expect(stripe).toBeTruthy();
    const e = { stopPropagation: vi.fn() };
    stripe.props.onTouchStart(e);
    stripe.props.onTouchEnd(e);
    expect(e.stopPropagation).toHaveBeenCalledTimes(2);
  });

  it("приветствие: значки по центру колонок (картинки блочные и выровнены автоматически)", () => {
    const html = renderToString(<WelcomeSheet settings={DEFAULT_SETTINGS} onFinish={() => {}} />);
    expect(html).toContain("margin:0 auto");
    expect(html).toContain("display:block");
  });
});
