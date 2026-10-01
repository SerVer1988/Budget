import {
  Home,
  PiggyBank,
  ShoppingCart,
  ShoppingBag,
  UtensilsCrossed,
  Coffee,
  Zap,
  Droplet,
  Wifi,
  Phone,
  Car,
  Bus,
  Fuel,
  Plane,
  Train,
  HeartPulse,
  Pill,
  Stethoscope,
  Dumbbell,
  GraduationCap,
  Baby,
  PawPrint,
  Gift,
  Film,
  Tv,
  Music,
  Gamepad2,
  Book,
  Shirt,
  Smartphone,
  Laptop,
  Wrench,
  Scissors,
  Coins,
  Users,
  User,
  HelpCircle,
  MoreHorizontal,
  Sparkles,
  Umbrella,
  Wine,
  Cigarette,
  Cat,
  Dog,
  Pizza,
  Sandwich,
  Disc3,
  PartyPopper,
  Trophy,
  Bike,
  Palmtree,
  Tent,
  Sofa,
  Lightbulb,
  Landmark,
  CreditCard,
} from "lucide-react";
import cardNeedsImg from "./assets/card-needs.webp";
import cardWantsImg from "./assets/card-wants.webp";
import cardSavingsImg from "./assets/card-savings.webp";
import badgeSberImg from "./assets/badge-sber.webp";
import badgeAlfaImg from "./assets/badge-alfa.webp";
import badgeOzonImg from "./assets/badge-ozon.webp";

/* ============================================================ design tokens */
export const C = {
  bg: "#F1F4F2",
  surface: "#FFFFFF",
  surface2: "#FAFBF7",
  ink: "#16201B",
  inkMuted: "#5B6B62",
  border: "#DCE3DD",
  sber: "#1E8E4F",
  sberSoft: "#E7F5EC",
  alfa: "#D6362B",
  alfaSoft: "#FBEAE8",
  ozon: "#1268C9",
  ozonSoft: "#E7F1FC",
  amber: "#C97A1E",
  amberSoft: "#FBF0DF",
  danger: "#C0392B",
  dangerSoft: "#FBEAE8",

  // «Дачный уголок» — палитра раздела «Добавить» + нижняя панель (из присланных макетов)
  gardenInk: "#00733B",
  gardenInkDeep: "#08352C",
  gardenCard: "#FCFDF6",
  gardenCardBorder: "#D0D6C1",
  gardenNav: "#FDFDF6",
  gardenNavBorder: "#A6BC98",
  gardenNavActive: "#E3EFD1",
  gardenNavActiveBorder: "#CEDFBF",
};

export const MONTHS_RU = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];

export const MONTHS_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];

/* ============================================================ category icons & colors */
export const ICON_MAP = {
  ShoppingCart, ShoppingBag, UtensilsCrossed, Coffee, Home, Zap, Droplet, Wifi, Phone,
  Car, Bus, Fuel, Plane, Train, HeartPulse, Pill, Stethoscope, Dumbbell, GraduationCap,
  Baby, PawPrint, Gift, Film, Tv, Music, Gamepad2, Book, Shirt, Smartphone, Laptop,
  Wrench, Scissors, Coins, Users, User, HelpCircle, MoreHorizontal, Sparkles, Umbrella, Wine,
  Cigarette, Cat, Dog, Pizza, Sandwich, Disc3, PartyPopper, Trophy, Bike,
  Palmtree, Tent, Sofa, Lightbulb, Landmark, CreditCard, PiggyBank,
};

export const ICON_KEYS = Object.keys(ICON_MAP);

export function getIcon(key) { return ICON_MAP[key] || HelpCircle; }

// Приглушённая «садовая» палитра категорий — под новый стиль (вместо ярких цветов)
export const CATEGORY_COLORS = ["#C97A4E", "#7C9473", "#6B93AD", "#C4A54A", "#9B7BA6", "#4F8C82", "#C48A93", "#A67C52", "#5E7C4F", "#8C8577"];

export const DEFAULT_NEED_CATS = [
  { name: "Аренда/ипотека", icon: "Home", color: "#9B7BA6" },
  { name: "ЖКХ", icon: "Zap", color: "#C4A54A" },
  { name: "Продукты", icon: "ShoppingCart", color: "#C97A4E" },
  { name: "Транспорт", icon: "Bus", color: "#6B93AD" },
  { name: "Связь", icon: "Wifi", color: "#4F8C82" },
  { name: "Лекарства/здоровье", icon: "HeartPulse", color: "#C48A93" },
  { name: "Прочее", icon: "MoreHorizontal", color: "#8C8577" },
];

export const DEFAULT_WANT_CATS = [
  { name: "Кафе/рестораны", icon: "UtensilsCrossed", color: "#C97A4E" },
  { name: "Кино/развлечения", icon: "Film", color: "#9B7BA6" },
  { name: "Шоппинг", icon: "ShoppingBag", color: "#C48A93" },
  { name: "Подписки", icon: "Tv", color: "#6B93AD" },
  { name: "Подарки", icon: "Gift", color: "#5E7C4F" },
  { name: "Прочее", icon: "MoreHorizontal", color: "#8C8577" },
];

export const DEFAULT_SETTINGS = {
  wantPct: 30,
  savePct: 20,
  reminderDays: [5, 15, 30],
  goal: 540000,
  openingBalance: { sber: 0, alfa: 0, ozon: 0 },
  includeInTotal: { sber: true, alfa: true, ozon: true },
  needCats: DEFAULT_NEED_CATS,
  wantCats: DEFAULT_WANT_CATS,
  closedMonths: [],
  needsWantsResetDate: null,
  // Названия и иконки трёх бюджетов (50/30/20). card — внутренний идентификатор
  // «слота» в данных (не меняется), icon — какую картинку показывать:
  // { type: "builtin", key: "sber"|"alfa"|"ozon" } — один из готовых логотипов,
  // { type: "custom", dataUrl } — свой загруженный значок.
  bucketNames: { needs: "Нужды", wants: "Желания", savings: "Подушка" },
  bucketIcons: {
    needs: { type: "builtin", key: "sber" },
    wants: { type: "builtin", key: "alfa" },
    savings: { type: "builtin", key: "ozon" },
  },
};

export const BUCKET_CARD = { needs: "sber", wants: "alfa", savings: "ozon" };

export const CARD_BUCKET = { sber: "needs", alfa: "wants", ozon: "savings" };

export const BUCKET_LABEL = { needs: "Нужды", wants: "Желания", savings: "Подушка" };

// Оформление экранов «Добавить» под каждый бакет: картинка-иллюстрация, фон
// «папки» и цвет заголовка — все три взяты из присланных макетов/картинок.
export const BUCKET_STYLE = {
  needs: { card: "sber", art: cardNeedsImg, folderBg: "#F1F6E8", titleColor: "rgb(0, 102, 51)" },
  wants: { card: "alfa", art: cardWantsImg, folderBg: "#FEF2DF", titleColor: "rgb(232, 47, 34)" },
  savings: { card: "ozon", art: cardSavingsImg, folderBg: "#E3F0F8", titleColor: "rgb(0, 51, 153)" },
};

export const DEBT_REPAY_CAP = 0.5; // максимум половины обычной доли бакета-должника уходит на погашение за раз

/* План погашения долгов между бюджетами без «посредников».
   Считаем итоговую позицию каждого бюджета (сколько ему должны минус сколько должен он сам)
   и сводим всё к минимальному числу переводов: например, если «Потребности» должны «Хотениям»
   105, а «Хотения» должны «Сбережениям» 174, то «Потребности» платят «Сбережениям» напрямую
   (105), а «Хотения» доплачивают остаток (69). Первыми платят «Потребности» — основная карта,
   на которую приходит доход. Возвращает строки: fromBucket — кому должны (кредитор),
   toBucket — кто должен (должник); ids — все открытые долги, вошедшие в расчёт. */
export const DEBT_PAYER_ORDER = { needs: 0, wants: 1, savings: 2 };

export const SMART_NOTE_THRESHOLD = 50;

/* Короткие финансовые советы для заметок. Показывается один в день: по очереди,
   в зависимости от числа года, чтобы карусель не раздувалась. */
export const FINANCE_TIPS = [
  "Сначала заплати себе: откладывайте в сбережения в день дохода, а не то, что осталось в конце месяца.",
  "Подушка безопасности — это расходы на 3–6 месяцев жизни. Начните с одного месяца, потом наращивайте.",
  "Правило 24 часов: незапланированную крупную покупку отложите на сутки. Часто желание уходит само.",
  "Погашайте сначала самый дорогой долг, то есть с самым высоким процентом, а не самый маленький.",
  "Раз в квартал просматривайте подписки и автоплатежи. Ненужные списания незаметно съедают бюджет.",
  "Мелкие траты складываются: кофе за 250 ₽ каждый будний день — это около 5 000 ₽ в месяц.",
  "Цель с суммой и сроком работает лучше, чем «накопить побольше»: ясно, сколько откладывать в месяц.",
  "Годовые платежи (страховка, налоги, отпуск) разделите на 12 и откладывайте понемногу каждый месяц.",
  "Выросли доходы — не повышайте расходы пропорционально. Разницу лучше направить в сбережения.",
  "Не вкладывайте деньги в то, что не понимаете. Инвестиции — только после того, как есть подушка.",
  "Держите подушку там, где её не съест инфляция и куда трудно залезть случайно: на отдельном накопительном счёте.",
  "Сверяйте баланс карт с приложением хотя бы раз в неделю: расхождение проще найти, пока операций немного.",
  "Автоматизируйте перевод в сбережения: решение, принятое один раз, работает лучше, чем каждый раз выбирать заново.",
  "Сравнивайте не цену, а стоимость использования: вещь за 10 000 ₽ на пять лет дешевле, чем за 3 000 ₽ на полгода.",
  "Перед кредитом посчитайте полную переплату, а не только ежемесячный платёж.",
];

/* ============================================================ Add carousel parts */
export const BADGE_IMG = { sber: badgeSberImg, alfa: badgeAlfaImg, ozon: badgeOzonImg };

/* ============================================================ Analysis */
export const TX_TYPE_FILTERS = [
  { id: "expense", label: "Траты" },
  { id: "income", label: "Доходы" },
  { id: "transfer", label: "Переводы" },
  { id: "adjustment", label: "Коррекции" },
  { id: "debt", label: "Долги" },
];

/* ---------- Резервная копия: экспорт / импорт ---------- */
export const BACKUP_VERSION = 1;

export const TX_TYPE_RU = { expense: "Трата", income: "Доход", transfer: "Перевод", adjustment: "Коррекция", debt: "Долг" };
