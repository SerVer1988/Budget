/* Слияние правок двух устройств/двух человек (трёхстороннее: base — последняя общая версия,
   local — наша, remote — чужая на сервере). Нужно, чтобы при совместном бюджете одновременные
   правки не отбрасывались, а складывались. Всё работает со строками JSON. */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* Массивы объектов с полем id (операции, цели, платежи). */
export function mergeById(base, local, remote) {
  const B = new Map((base || []).map((x) => [x.id, x]));
  const L = new Map((local || []).map((x) => [x.id, x]));
  const R = new Map((remote || []).map((x) => [x.id, x]));
  const out = [];
  const used = new Set();

  const pick = (id) => {
    const b = B.get(id), l = L.get(id), r = R.get(id);
    const inB = B.has(id), inL = L.has(id), inR = R.has(id);
    if (inB && (!inL || !inR)) return undefined;        // кто-то удалил — удаление побеждает
    if (inL && inR) {
      if (same(l, r)) return l;
      if (same(b, l)) return r;                         // меняли только они
      if (same(b, r)) return l;                         // меняли только мы
      return l;                                         // правили оба — побеждает наша версия
    }
    return inL ? l : r;                                 // добавлено с одной стороны
  };

  (remote || []).forEach((x) => {                       // порядок — как на сервере
    used.add(x.id);
    const v = pick(x.id);
    if (v !== undefined) out.push(v);
  });
  (local || []).forEach((x) => {                        // наши новые — в конец
    if (used.has(x.id)) return;
    used.add(x.id);
    const v = pick(x.id);
    if (v !== undefined) out.push(v);
  });
  return out;
}

const ID_ARRAY_FIELDS = ["goals", "recurring"];
const KEY_MERGE_FIELDS = ["merchantMap"]; // объект «ключ → значение»: сливаем по ключам
const SET_ARRAY_FIELDS = ["closedMonths"];

function mergeKeys(base, local, remote) {
  const b = base || {}, l = local || {}, r = remote || {};
  const out = {};
  new Set([...Object.keys(l), ...Object.keys(r)]).forEach((k) => {
    if (k in l && k in r) out[k] = same(l[k], r[k]) ? l[k] : same(b[k], l[k]) ? r[k] : l[k];
    else if (k in l) { if (!(k in b)) out[k] = l[k]; else if (!same(b[k], l[k])) out[k] = l[k]; }  // новое/изменённое у нас
    else if (!(k in b) || !same(b[k], r[k])) out[k] = r[k];                                         // новое/изменённое у них
  });
  return out;
}

export function mergeSettings(base, local, remote) {
  const b = base || {};
  const out = { ...remote };
  Object.keys({ ...local, ...remote }).forEach((k) => {
    const l = local[k], r = remote[k], bb = b[k];
    if (ID_ARRAY_FIELDS.includes(k)) out[k] = mergeById(bb, l, r);
    else if (KEY_MERGE_FIELDS.includes(k)) out[k] = mergeKeys(bb, l, r);
    else if (SET_ARRAY_FIELDS.includes(k)) out[k] = [...new Set([...(Array.isArray(r) ? r : []), ...(Array.isArray(l) ? l : [])])];
    else if (same(l, bb)) out[k] = r;                   // мы не меняли — берём чужое
    else if (same(r, bb)) out[k] = l;                   // они не меняли — берём наше
    else out[k] = l;                                    // меняли оба — наше
    if (out[k] === undefined) delete out[k];
  });
  return out;
}

/* key — ключ записи; значения — JSON-строки. Возвращает строку или null, если слить нельзя. */
export function mergeValues(key, baseStr, localStr, remoteStr) {
  try {
    const base = baseStr ? JSON.parse(baseStr) : null;
    const local = JSON.parse(localStr);
    const remote = JSON.parse(remoteStr);
    if (key === "transactions" && Array.isArray(local) && Array.isArray(remote)) {
      return JSON.stringify(mergeById(Array.isArray(base) ? base : [], local, remote));
    }
    if (key === "settings" && local && remote && typeof local === "object" && typeof remote === "object") {
      return JSON.stringify(mergeSettings(base && typeof base === "object" ? base : {}, local, remote));
    }
    return null;
  } catch {
    return null;
  }
}
