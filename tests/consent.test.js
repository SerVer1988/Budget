import { sessionFromResponse } from "../src/storage.js";
import { CONSENT_VERSION } from "../src/support.js";

const response = (meta) => ({
  access_token: "a",
  refresh_token: "r",
  expires_in: 3600,
  user: { id: "u1", email: "anna@mail.ru", user_metadata: meta },
});

describe("согласие на обработку данных сохраняется между входами", () => {
  it("версия согласия переживает вход и обновление сессии", () => {
    const s = sessionFromResponse(response({ name: "Анна", consent_version: CONSENT_VERSION }));
    expect(s.user.consentVersion).toBe(CONSENT_VERSION);
    expect(s.user.name).toBe("Анна");
  });

  it("если согласия на сервере нет, версия пустая (экран согласия покажется один раз)", () => {
    expect(sessionFromResponse(response({ name: "Анна" })).user.consentVersion).toBe("");
    expect(sessionFromResponse(response(undefined)).user.consentVersion).toBe("");
  });

  it("при смене версии политики старое согласие больше не считается действующим", () => {
    const s = sessionFromResponse(response({ consent_version: "2000-01-01" }));
    expect(s.user.consentVersion).not.toBe(CONSENT_VERSION);
  });
});
