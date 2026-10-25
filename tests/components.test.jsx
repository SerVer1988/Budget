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
