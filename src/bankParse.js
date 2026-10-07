/* Разбор текста банковского уведомления для «листа ожидания».
   Форматы у банков разные и меняются, поэтому разбор «по возможности»: что не распознали, пользователь
   поправит в листе ожидания. Распознаём: направление (расход/доход), сумму, место покупки, предложение категории. */

// \\b в JS не видит кириллицу как «слово», поэтому конец слова проверяем явным списком букв
const CUR = "(?:₽|руб(?:\\.|лей|ля|ль)?|р\\.?|RUB|RUR)(?![A-Za-zА-Яа-яЁё])";
// число вида «1 250,50», «850», «12345.67» (пробелы и неразрывные пробелы — разделители тысяч)
const NUM = "(\\d{1,3}(?:[\\s\\u00a0\\u202f]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)";
const AMOUNT_RE = new RegExp(NUM + "\\s*" + CUR, "gi");
const BALANCE_BEFORE = /(баланс|остаток|доступно|у вас ещ[её]|на счёте|на счете|available|balance)[^\d]{0,14}$/i;

const EXPENSE_WORDS = /(покупк|оплат|списани|снятие|платёж|платеж|расход|перевод\s+(?:на|клиенту)|purchase|payment)/i;
const INCOME_WORDS = /(зачислен|поступлен|пополнен|зарплат|аванс|возврат|кэшбэк|кешбэк|перевод\s+от|входящий\s+перевод|получен|deposit|refund)/i;

const SERVICE_WORDS = /(вход в (?:сбербанк|сбер|альфа|озон|ozon|приложение)|никому не сообщ|одноразов|код подтвержд|пароль|не сообщайте|если входили не вы|вы вошли)/i;

function toNumber(s) {
  return parseFloat(s.replace(/[\s\u00a0\u202f]/g, "").replace(",", "."));
}

/* Нормализованный ключ места: «PYATEROCHKA 1234 MOSKVA» → «pyaterochka moskva» (для запоминания категорий). */
export function merchantKey(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я]+/g, " ")
    .split(" ")
    .filter((w) => w.length >= 2)
    .slice(0, 2)
    .join(" ");
}

function cleanMerchant(s) {
  return s
    .replace(/[«»"“”]/g, "")
    .replace(/^[\s,.:;·\-–—]+|[\s,.:;·\-–—]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* Место покупки: слова после суммы до «Баланс/Доступно/Карта/…», либо «в <место>» перед суммой. */
function findMerchant(text, afterIdx) {
  const tail = text.slice(afterIdx).replace(/^[\s,.:;·|\-–—]+/, "");
  const stop = /(баланс|остаток|доступно|у вас ещ[её]|сч[её]т\s+карты|сч[её]т\b|карта|карт[аы]\s*\*|\s\*\d{2,4}|[•·]{2}|available|balance|\bmir\b|мир\s|visa|mastercard|\d{1,2}:\d{2}|[·|]|\.\s|$)/i;
  const m = stop.exec(tail);
  let candidate = cleanMerchant(m ? tail.slice(0, m.index) : tail);
  candidate = candidate.replace(/^(в|на|в\s+магазине|в\s+компании|для|от)\s+/i, "");
  if (candidate.length >= 2 && !/^\d+$/.test(candidate)) return candidate.slice(0, 60);

  // «Оплата в Магнит на 450 ₽»
  const before = /(?:в|на)\s+[«"]?([^«»"\d,.;:]{2,40}?)[»"]?\s+(?:на\s+(?:сумму\s+)?)?\d/i.exec(text);
  if (before) return cleanMerchant(before[1]);
  return "";
}

/* Правила предложения категории: по ключевым словам в названии места. names — возможные названия
   категории у пользователя (берётся первое, что реально есть в его списках). */
const CATEGORY_RULES = [
  { re: /(магнит|пятерочка|пятёрочка|pyaterochka|5ka|перекресток|perekrestok|лента\b|ашан|auchan|вкусвилл|vkusvill|дикси|dixy|\bspar\b|азбука вкуса|окей|globus|гипермаркет|супермаркет|продукт|продукты)/i, names: ["Продукты", "Еда", "Питание"] },
  { re: /(метро|такси|taxi|яндекс\s*go|yandex\s*go|uber|\bgett\b|транспорт|автобус|трамвай|тройка|mosgortrans|азс|lukoil|лукойл|газпромнефть|rosneft|роснефть|shell|парковк|каршеринг|delimobil|делимобиль|ржд|rzd|аэроэкспресс|transport khab|т-карта|транспортная карта|транспорт хабаровск|yandex\*\d+\*go)/i, names: ["Транспорт", "Такси", "Авто", "Дорога"] },
  { re: /(мтс|mts|билайн|beeline|мегафон|megafon|tele2|теле2|yota|ростелеком|rostelecom|интернет|связь)/i, names: ["Связь", "Интернет", "Телефон"] },
  { re: /(аптека|apteka|ригла|rigla|здравсити|36\.6|клиника|медицин|стоматолог|лаборатори|invitro|инвитро|гемотест|farma|фарма|farm-torg|asteri|aptechnoe|semejnaya|аптекарь)/i, names: ["Лекарства/здоровье", "Здоровье", "Лекарства"] },
  { re: /(жкх|коммунал|мосэнерго|энергосбыт|водоканал|мосводоканал|теплосеть|мособлеирц|ук\s|управляющая|капремонт|электроэнерги|газпром межрегионгаз|gis_zkh|gis-zkh|гис жкх|капитальн\S* ремонт|регстройком|ркц|хабаровскэнергосбыт)/i, names: ["ЖКХ", "Коммуналка", "Коммунальные"] },
  { re: /(аренда|ипотек|найм квартиры)/i, names: ["Аренда/ипотека", "Аренда", "Ипотека"] },
  { re: /(табак|сигарет|tabak|iqos|вейп|кальян)/i, names: ["Сигареты", "Табак"] },
  { re: /(макдоналдс|mcdonald|kfc|burger|бургер|ресторан|кафе|cafe|coffee|кофе|starbucks|шоколадница|додо|dodo|пицца|pizza|суши|sushi|delivery club|деливери|яндекс\s*еда|самокат|вкусно|\bkafe\b|vypechka|выпечка|morozhennoe|мороженое|shaurma|шаурма|bufet|bulochnaya|булочная|sinor pomidor|sp_sev vorota|kitaika|ersh\b|dostavka sushi|chin-chin)/i, names: ["Кафе/рестораны", "Кафе и рестораны", "Кафе", "Рестораны", "Еда вне дома"] },
  { re: /(кино|cinema|kinopoisk|кинопоиск|театр|концерт|билет|ticket|ivi\b|okko|steam|playstation|игр|kinoteatr|кинокасса|kinokassa|kassa 2|bouling|боулинг|primnet bilety)/i, names: ["Кино/развлечения", "Развлечения", "Кино"] },
  { re: /(wildberries|вайлдберриз|ozon|озон маркет|lamoda|ламода|dns|днс|м\.видео|mvideo|eldorado|эльдорадо|zara|h&m|uniqlo|одежда|обувь|шоппинг)/i, names: ["Шоппинг", "Одежда", "Покупки"] },
  { re: /(подписк|subscription|spotify|netflix|youtube|яндекс\s*плюс|yandex\s*plus|apple\.com|google\s*play|ivi|premier|starproai|redcom|рэдком|vk\*huawei|ozon premium)/i, names: ["Подписки"] },
  { re: /(tutorplace|репетитор|курсы|школа|университет|обучен)/i, names: ["Образование", "Учёба"] },
  { re: /(produkty|ovoschi|frukty|ovoshchi|овощи|фрукты|samberi|самбери|белорское|belorskoe|dostavka pyaterochka)/i, names: ["Продукты", "Еда", "Питание"] },
  { re: /(arlekin|игрушк)/i, names: ["Дети"] },
  { re: /(sp_bigudi|парикмахер|барбер|салон красоты|маникюр)/i, names: ["Уход"] },
  { re: /(белый кролик|ветеринар|зоомагазин)/i, names: ["Животные"] },
  { re: /(цветы|подарок|gift|flowers|flowwow)/i, names: ["Подарки"] },
];

function findCategory(settings, names) {
  const lists = [["needs", settings.needCats || []], ["wants", settings.wantCats || []]];
  for (const name of names) {
    for (const [bucket, cats] of lists) {
      const hit = cats.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (hit) return { bucket, category: hit.name };
    }
  }
  return null;
}

/* Предложить категорию: сначала то, чему пользователь уже научил приложение (settings.merchantMap),
   потом ключевые слова. Возвращает { bucket, category, learned } или null. */
export function suggestCategory(merchant, settings) {
  const key = merchantKey(merchant);
  const learned = key && settings.merchantMap ? settings.merchantMap[key] : null;
  if (learned) {
    const lists = learned.bucket === "wants" ? settings.wantCats : settings.needCats;
    if ((lists || []).some((c) => c.name === learned.category)) return { ...learned, learned: true };
  }
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(merchant)) {
      const hit = findCategory(settings, rule.names);
      if (hit) return { ...hit, learned: false };
    }
  }
  return null;
}

/* Запомнить выбор пользователя: «такое место → такая категория». Возвращает новые settings. */
export function learnMerchant(settings, merchant, bucket, category) {
  const key = merchantKey(merchant);
  if (!key || !category) return settings;
  const cur = settings.merchantMap || {};
  if (cur[key] && cur[key].bucket === bucket && cur[key].category === category) return settings;
  return { ...settings, merchantMap: { ...cur, [key]: { bucket, category } } };
}

/* Главная функция. source: sber | alfa | ozon | other. Возвращает:
   { type: "expense"|"income", amount, merchant, card, suggestion, understood } */
export function parseBankText(raw, source, settings) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  const card = source === "alfa" ? "alfa" : source === "ozon" ? "ozon" : source === "sber" ? "sber" : null;

  // сумма: первая «число + валюта», перед которой не стоит «Баланс/Доступно/Остаток»
  let amount = null;
  let amountEnd = 0;
  let sign = ""; // «+» или «−» вплотную к сумме: «+17 744 ₽», «-1 730 ₽»
  AMOUNT_RE.lastIndex = 0;
  let m;
  while ((m = AMOUNT_RE.exec(text))) {
    if (BALANCE_BEFORE.test(text.slice(Math.max(0, m.index - 20), m.index))) continue;
    amount = toNumber(m[1]);
    amountEnd = m.index + m[0].length;
    const prevCh = m.index > 0 ? text[m.index - 1] : "";
    if (prevCh === "+") sign = "+";
    else if (prevCh === "-" || prevCh === "−" || prevCh === "–") sign = "-";
    break;
  }

  // Направление определяет то из слов, что встретилось в тексте раньше:
  // «Возврат покупки» — доход, «Покупка … кэшбэк» — расход.
  const iIn = text.search(INCOME_WORDS);
  const iEx = text.search(EXPENSE_WORDS);
  let type = iIn >= 0 && (iEx < 0 || iIn < iEx) ? "income" : "expense";
  if (sign === "+") type = "income"; // знак надёжнее слов
  else if (sign === "-") type = "expense";

  let merchant = amount != null ? findMerchant(text, amountEnd) : "";
  // «Списание со счета…», «Получатель: …» — это не название места, а служебные слова банка
  if (/^(списание|перевод|поступлени|пополнени|получатель|зачислени)/i.test(merchant)) merchant = "";
  const suggestion = type === "expense" && merchant ? suggestCategory(merchant, settings || {}) : null;

  const understood = amount != null && amount > 0;
  return {
    type,
    amount: understood ? amount : null,
    merchant,
    card,
    suggestion,
    understood,
    // «Вход в СберБанк Онлайн…», коды, пароли: денег в них нет, показывать в листе ожидания незачем
    ignorable: !understood && SERVICE_WORDS.test(text),
  };
}

/* Возможно, такая операция уже внесена: та же сумма и карта в пределах суток. */
export function looksDuplicate(parsed, receivedDate, transactions) {
  if (!parsed.amount) return false;
  return transactions.some(
    (t) =>
      t.type === parsed.type &&
      Math.abs(t.amount - parsed.amount) < 0.5 &&
      (!parsed.card || t.card === parsed.card) &&
      Math.abs((Date.parse(t.date) - Date.parse(receivedDate)) / 86400000) <= 1
  );
}

/* Перевод между своими картами приходит двумя уведомлениями: «списано» с одной карты и «поступило» на другую.
   Склеиваем такие пары: одна и та же сумма, разные карты, не дальше 10 минут друг от друга, и хотя бы в одном
   тексте есть слова про перевод или пополнение (чтобы не склеить случайное совпадение сумм у покупок).
   items — [{ row, parsed }]. Возвращает [{ out, in, amount }] (out и in — элементы items). */
const TRANSFER_WORDS = /(перевод|пополнен|поступлен|зачислен)/i;
export function findTransferPairs(items, windowMinutes = 10) {
  const used = new Set();
  const pairs = [];
  const sorted = items
    .filter((it) => it.parsed.understood && it.parsed.card)
    .sort((a, b) => Date.parse(a.row.received_at) - Date.parse(b.row.received_at));
  for (const out of sorted) {
    if (used.has(out.row.id) || out.parsed.type !== "expense") continue;
    const match = sorted.find(
      (inn) =>
        !used.has(inn.row.id) &&
        inn.row.id !== out.row.id &&
        inn.parsed.type === "income" &&
        inn.parsed.card !== out.parsed.card &&
        Math.abs(inn.parsed.amount - out.parsed.amount) < 0.5 &&
        Math.abs(Date.parse(inn.row.received_at) - Date.parse(out.row.received_at)) <= windowMinutes * 60000 &&
        (TRANSFER_WORDS.test(inn.row.raw_text) || TRANSFER_WORDS.test(out.row.raw_text))
    );
    if (match) {
      used.add(out.row.id);
      used.add(match.row.id);
      pairs.push({ out, in: match, amount: out.parsed.amount });
    }
  }
  return pairs;
}
