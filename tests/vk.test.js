import { buildAuthUrl, challengeOf, parseCallback, randomString, VK_CLIENT_ID, VK_REDIRECT_URL } from "../src/vk.js";

describe("вход через VK: проверочные коды (PKCE)", () => {
  it("code_challenge считается по стандарту (контрольный пример из RFC 7636)", async () => {
    expect(await challengeOf("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("случайные строки подходят для code_verifier и разные при каждом вызове", () => {
    const a = randomString(48);
    const b = randomString(48);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(43); // PKCE: 43–128 символов
    expect(a.length).toBeLessThanOrEqual(128);
    expect(a).not.toBe(b);
  });
});

describe("вход через VK: ссылка на страницу VK", () => {
  it("содержит всё, что требует VK ID, и именно наш зарегистрированный адрес возврата", () => {
    const url = new URL(buildAuthUrl({ state: "st", challenge: "ch" }));
    expect(url.origin + url.pathname).toMatch(/^https:\/\/id\.vk\.(ru|com)\/authorize$/);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe(VK_CLIENT_ID);
    expect(url.searchParams.get("redirect_uri")).toBe(VK_REDIRECT_URL);
    expect(url.searchParams.get("state")).toBe("st");
    expect(url.searchParams.get("code_challenge")).toBe("ch");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("права добавляются только если заданы", () => {
    expect(new URL(buildAuthUrl({ state: "s", challenge: "c" })).searchParams.has("scope")).toBe(false);
    expect(new URL(buildAuthUrl({ state: "s", challenge: "c", scope: "email" })).searchParams.get("scope")).toBe("email");
  });
});

describe("вход через VK: разбор возврата со страницы VK", () => {
  it("обычные параметры", () => {
    expect(parseCallback("?code=abc&state=xyz&device_id=dev1")).toMatchObject({ code: "abc", state: "xyz", deviceId: "dev1" });
  });

  it("данные одним JSON в параметре payload", () => {
    const payload = encodeURIComponent(JSON.stringify({ code: "c1", state: "s1", device_id: "d1" }));
    expect(parseCallback(`?payload=${payload}`)).toMatchObject({ code: "c1", state: "s1", deviceId: "d1" });
  });

  it("отказ пользователя или ошибка VK возвращается как ошибка", () => {
    const cb = parseCallback("?error=access_denied&error_description=User+denied");
    expect(cb.error).toBe("access_denied");
    expect(cb.errorDescription).toBe("User denied");
  });

  it("обычная загрузка сайта без параметров VK не считается возвратом", () => {
    expect(parseCallback("")).toBeNull();
    expect(parseCallback("?utm=1")).toBeNull();
  });

  it("повреждённый payload не ломает разбор", () => {
    expect(parseCallback("?payload=%7Bне-json&code=abc")).toMatchObject({ code: "abc" });
  });
});
