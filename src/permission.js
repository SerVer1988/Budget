/* Запрос разрешения на уведомления с «страховкой»: на некоторых телефонах окно запроса не появляется, а промис не завершается
   никогда, и кнопка выглядела бы «мёртвой». Здесь через заданное время возвращаем "timeout", и приложение объясняет, что делать. */
export async function requestPermissionSafe(timeoutMs = 20000, api = typeof Notification === "undefined" ? undefined : Notification) {
  if (!api) return "unsupported";
  if (api.permission !== "default") return api.permission;
  try {
    const result = await Promise.race([
      Promise.resolve(api.requestPermission()),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), timeoutMs)),
    ]);
    return result;
  } catch {
    return "error";
  }
}
