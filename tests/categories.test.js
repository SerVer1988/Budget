import { learnMerchant, merchantKey, suggestCategory } from "../src/bankParse.js";
import { DEFAULT_SETTINGS } from "../src/constants.js";

// Набор категорий, похожий на реальный: у разных людей он разный, и подсказка должна подстраиваться.
const settings = {
  ...DEFAULT_SETTINGS,
  needCats: [{ name: "Продукты" }, { name: "ЖКХ" }, { name: "Транспорт" }, { name: "Связь" }, { name: "Для дома" }, { name: "Дети" }],
  wantCats: [{ name: "Алкоголь" }, { name: "Сигареты" }, { name: "Кафе/рестораны" }, { name: "Подписки" }, { name: "Уход" }],
  merchantMap: {},
};
const pick = (text, st = settings) => {
  const r = suggestCategory(text, st);
  return r ? `${r.bucket}:${r.category}` : null;
};

describe("подсказка категории по названию места или заметке", () => {
  it("известные сети: продукты, кафе, транспорт", () => {
    expect(pick("MAGNIT 1234 MOSKVA")).toBe("needs:Продукты");
    expect(pick("Пятёрочка")).toBe("needs:Продукты");
    expect(pick("McDonalds")).toBe("wants:Кафе/рестораны");
    expect(pick("Яндекс Go такси")).toBe("needs:Транспорт");
  });

  it("товары по ключевым словам: алкоголь, табак, дом", () => {
    expect(pick("пиво")).toBe("wants:Алкоголь");
    expect(pick("Красное&Белое")).toBe("wants:Алкоголь");
    expect(pick("вино красное")).toBe("wants:Алкоголь");
    expect(pick("сигареты")).toBe("wants:Сигареты");
    expect(pick("батарейки")).toBe("needs:Для дома");
    expect(pick("Fix Price")).toBe("needs:Для дома");
  });

  it("похожие слова не путаются с алкоголем", () => {
    expect(pick("виноград")).toBeNull();     // «вино» внутри слова «виноград»
    expect(pick("джинсы")).toBeNull();       // «джин» не ловим вообще
    expect(pick("ромашка")).toBeNull();
  });

  it("если нужной категории у человека нет, подсказки нет (ничего не выдумываем)", () => {
    const poor = { ...settings, wantCats: [{ name: "Кафе/рестораны" }] };
    expect(pick("пиво", poor)).toBeNull();
    expect(pick("сигареты", poor)).toBeNull();
  });

  it("то, чему человек научил приложение, главнее словаря", () => {
    const learned = learnMerchant(settings, "Магнит", "wants", "Алкоголь");
    expect(pick("Магнит", learned)).toBe("wants:Алкоголь");            // выученное написание
    expect(pick("MAGNIT 1234", learned)).toBe("needs:Продукты");       // другое написание ключа не совпало: работает словарь
  });

  it("запоминание не создаёт лишних записей и не портит исходные настройки", () => {
    const once = learnMerchant(settings, "Магнит", "needs", "Продукты");
    const twice = learnMerchant(once, "Магнит", "needs", "Продукты");
    expect(twice).toBe(once);
    expect(settings.merchantMap).toEqual({});
  });

  it("ключ места: регистр, цифры и лишние слова не мешают", () => {
    expect(merchantKey("PYATEROCHKA 1234 MOSKVA")).toBe("pyaterochka moskva");
    expect(merchantKey("Магнит  №15")).toBe("магнит");
    expect(merchantKey("")).toBe("");
  });
});
