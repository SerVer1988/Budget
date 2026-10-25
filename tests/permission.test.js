import { requestPermissionSafe } from "../src/permission.js";
import { runNotifyDiagnostics } from "../src/notifyDiag.js";

describe("запрос разрешения на уведомления", () => {
  it("уже выданное или запрещённое разрешение возвращается без запроса", async () => {
    const api = { permission: "granted", requestPermission: () => { throw new Error("не должно вызываться"); } };
    expect(await requestPermissionSafe(50, api)).toBe("granted");
    expect(await requestPermissionSafe(50, { ...api, permission: "denied" })).toBe("denied");
  });

  it("обычный запрос возвращает выбор человека", async () => {
    const api = { permission: "default", requestPermission: async () => "granted" };
    expect(await requestPermissionSafe(50, api)).toBe("granted");
  });

  it("если окно не появилось и промис не завершается, через заданное время возвращает timeout", async () => {
    const api = { permission: "default", requestPermission: () => new Promise(() => {}) };
    expect(await requestPermissionSafe(30, api)).toBe("timeout");
  });

  it("сбой запроса не ломает приложение", async () => {
    const api = { permission: "default", requestPermission: async () => { throw new Error("сбой"); } };
    expect(await requestPermissionSafe(50, api)).toBe("error");
  });

  it("без поддержки уведомлений сообщает об этом", async () => {
    expect(await requestPermissionSafe(50, undefined)).toBe("unsupported");
  });
});

describe("проверка уведомлений на устройстве", () => {
  it("в среде без уведомлений честно сообщает, что они не поддерживаются", async () => {
    const rows = await runNotifyDiagnostics({ show: false });
    const row = rows.find(([label]) => label === "Уведомления поддерживаются");
    expect(row).toBeTruthy();
    expect(row[2]).toBe(false);
  });
});
