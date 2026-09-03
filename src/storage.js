// Same shape as Claude's artifact `window.storage` API (get/set are async and
// `get` throws when the key doesn't exist yet), so the rest of the app code
// doesn't need to know it's talking to plain localStorage under the hood.
const PREFIX = "budget-app:";

export const storage = {
  async get(key) {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) throw new Error("not found");
    return { key, value: raw };
  },
  async set(key, value) {
    localStorage.setItem(PREFIX + key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(PREFIX + key);
    return { key, deleted: true };
  },
};
