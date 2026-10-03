import React, { useContext } from "react";
import { Paperclip, ReceiptContext } from "./ReceiptViewer.jsx";
import {
  ChevronDown,
  Trash2,
} from "lucide-react";
import { BankBadge } from "./ui.jsx";
import { C, CARD_BUCKET } from "./constants.js";
import { bucketIconSrc, bucketName, cardLabel, formatMoney, ruPlural } from "./format.js";
import { shortDate } from "./forecast.js";

export function TotalBalanceCard({ total, settings, onToggle }) {
  const items = [
    { key: "sber", label: bucketName(settings, "needs"), color: C.sber },
    { key: "alfa", label: bucketName(settings, "wants"), color: C.alfa },
    { key: "ozon", label: bucketName(settings, "savings"), color: C.ozon },
  ];

  return (
    <div className="soft-card total-balance">
      <div className="check-row">
        {items.map((it) => (
          <label key={it.key}>
            <input
              type="checkbox"
              checked={!!settings.includeInTotal?.[it.key]}
              onChange={() => onToggle(it.key)}
            />
            <span style={{ color: it.color }}>{it.label}</span>
          </label>
        ))}
      </div>
      <div className="total-balance-info">
        <div className="label">Общий баланс</div>
        <div className="value">{formatMoney(total)}</div>
      </div>
    </div>
  );
}

export function BankCard({ stripe, icon, name, bigValue, forecast, expanded, onToggle, children }) {
  return (
    <div
      className="bank-card"
      style={{ borderLeftColor: stripe }}
      onClick={onToggle}
      role="button"
      tabIndex={0}
    >
      <div className="bank-row">
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {icon && <img src={icon} alt="" className="bank-card-icon" />}
          <span className="bank-name">{name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="bank-value">{formatMoney(bigValue)}</span>
          <ChevronDown size={16} className={`bank-chevron${expanded ? " open" : ""}`} />
        </div>
      </div>
      {forecast && <BankForecast forecast={forecast} />}
      {expanded && <div className="bank-detail">{children}</div>}
    </div>
  );
}

/* Строка прогноза до аванса под названием карты: темп трат и хватит ли денег. */
function BankForecast({ forecast: f }) {
  let value;
  let color;
  if (f.status === "ok") { value = `хватит · +${formatMoney(Math.round(f.left))}`; color = C.sber; }
  else if (f.status === "short") { value = `закончится ${shortDate(f.runOutDate)}`; color = C.danger; }
  else { value = "баланс исчерпан"; color = C.danger; }
  return (
    <div className="bank-forecast">
      <span className="small-note">
        ≈ {formatMoney(Math.round(f.rate))}/день · до аванса {f.daysLeft} {ruPlural(f.daysLeft, "день", "дня", "дней")}
      </span>
      <span className="bank-forecast-value" style={{ color }}>{value}</span>
    </div>
  );
}

/* Строка деталей внутри развёрнутой карточки банка: мини-бар + остаток в день
   (или «превышен») + сравнение с прошлым месяцем — вместо старой вкладки
   с фиксированным % распределения бюджета, который и так известен заранее. */
/* spent — сколько списано с карты (все покупки, оплаченные этой картой). bucketSpent — сколько потрачено
   на этот бюджет (все покупки категорий бюджета, какой бы картой ни платили): именно эта сумма на круговой
   диаграмме и плитках категорий. Они расходятся, если картой платили за другой бюджет (так появляется долг). */
export function BankCardDetail({ stripe, soft, spent, avail, prevSpent, bucketSpent, prevBucketSpent, bucketLabel, daysLeft, isCurrentMonth, dangerColor }) {
  const over = avail > 0 && spent > avail;
  const pct = avail > 0 ? Math.min(100, (spent / avail) * 100) : spent > 0 ? 100 : 0;
  const barColor = over ? dangerColor : stripe;

  let statusText = null;
  if (over) {
    statusText = <span style={{ color: dangerColor }}>превышен на {formatMoney(spent - avail)}</span>;
  } else if (isCurrentMonth && daysLeft > 0 && avail > 0) {
    statusText = <span style={{ color: stripe }}>≈ {formatMoney((avail - spent) / daysLeft)}/день</span>;
  }

  const showBucket = Number.isFinite(bucketSpent) && Math.abs(bucketSpent - spent) >= 1;
  const trendNow = showBucket ? bucketSpent : spent;
  const trendPrev = showBucket ? prevBucketSpent : prevSpent;

  let trendText = null;
  if (trendPrev > 0) {
    const diffPct = Math.round(((trendNow - trendPrev) / trendPrev) * 100);
    trendText = diffPct === 0 ? "как в прошлом мес." : `${diffPct > 0 ? "+" : ""}${diffPct}% к прошлому мес.`;
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="bank-progress" style={{ background: soft }}>
          <div style={{ width: `${pct}%`, background: barColor }} />
        </div>
        {statusText && <span className="small-note mono" style={{ whiteSpace: "nowrap" }}>{statusText}</span>}
      </div>
      <div className="small-note" style={{ marginTop: 3 }}>
        {showBucket ? (
          <>
            на «{bucketLabel}» {formatMoney(bucketSpent)} · с карты{" "}
            {avail > 0 ? <>{formatMoney(spent)} из {formatMoney(avail)}</> : formatMoney(spent)}
          </>
        ) : avail > 0 ? (
          <>{formatMoney(spent)} из {formatMoney(avail)}</>
        ) : (
          <>потрачено {formatMoney(spent)}</>
        )}
        {trendText && <> · {trendText}</>}
      </div>
    </>
  );
}

export function TxRow({ tx, settings, onDelete, onEdit }) {
  const openReceipt = useContext(ReceiptContext);
  const color = tx.type === "income" ? C.sber
    : tx.type === "expense" ? (tx.card === "sber" ? C.sber : C.alfa)
    : tx.type === "transfer" ? C.amber
    : tx.type === "debt" ? C.amber
    : (tx.card === "sber" ? C.sber : tx.card === "alfa" ? C.alfa : (tx.amount < 0 ? C.danger : C.ozon));

  const sign = tx.type === "expense" ? "−"
    : tx.type === "transfer" ? ""
    : tx.type === "debt" ? ""
    : (tx.type === "adjustment" && tx.amount < 0) ? "−" : "+";

  const label = tx.type === "income" ? (tx.note || `Доход (${cardLabel(settings, tx.card)})`)
    : tx.type === "expense" ? (tx.note || tx.category)
    : tx.type === "transfer" ? (tx.note || `${cardLabel(settings, tx.fromCard)} → ${cardLabel(settings, tx.toCard)}`)
    : tx.type === "debt" ? (tx.note || `Долг: «${bucketName(settings, tx.toBucket)}» → «${bucketName(settings, tx.fromBucket)}»${tx.repaid ? " · погашено" : ` · осталось ${formatMoney(tx.remainingAmount)}`}`)
    : (tx.note || `Корректировка (${cardLabel(settings, tx.card)})`);

  const day = tx.date.slice(8, 10);
  const editable = tx.type !== "debt";

  return (
    <div
      className="tx-row"
      style={{ cursor: editable ? "pointer" : "default" }}
      onClick={() => editable && onEdit(tx)}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
    >
      <div className="tx-day">{day}</div>
      <div className="tx-dot" style={{ background: color }} />
      <div className="tx-main">
        <div className="tx-label">
          {label}
          {tx.receipt && (
            <button
              type="button"
              aria-label="Показать чек"
              onClick={(e) => { e.stopPropagation(); openReceipt(tx.id); }}
              style={{ border: 0, background: "transparent", color: C.inkMuted, padding: "0 0 0 6px", verticalAlign: "middle" }}
            >
              <Paperclip size={13} />
            </button>
          )}
        </div>
        {tx.type === "expense" && <div className="tx-sub">{tx.category}</div>}
      </div>
      <div className="tx-amount" style={{ color }}>
        {sign}{formatMoney(Math.abs(tx.amount))}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }}
        className="delete-btn"
        type="button"
        aria-label="Удалить"
      >
        <Trash2 size={14} />
      </button>

    </div>
  );
}

export const HERO_TABS = [
  { card: "sber", left: "23%" },
  { card: "alfa", left: "49%" },
  { card: "ozon", left: "75%" },
];

/* Единый «герой» Нужды/Желания/Подушка: картинка — фон во всю ширину экрана
   (стрелки ‹ › и кружок с плюсом уже нарисованы внутри нее), а три
   баланса-вкладки, Пришло/Ушло, значок банка и заголовок лежат поверх неё
   абсолютным позиционированием — в процентах от картинки, чтобы не съезжать
   на разных экранах. Проценты подобраны под нарисованные в картинке плашки. */
export function FolderHero({
  art,
  card,
  settings,
  title,
  titleColor,
  inflow,
  outflow,
  balances,
  activeIndex,
  onSelectBucket,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onAdd,
  addLabel,
}) {
  return (
    <>
      <div className="folder-hero">
        <img src={art} alt="" className="folder-hero-img" draggable="false" />

        {HERO_TABS.map((t, i) => (
          <button
            key={t.card}
            type="button"
            className={`hero-tab-num ${i === activeIndex ? "active" : ""}`}
            style={{ left: t.left }}
            onClick={() => onSelectBucket(i)}
          >
            {formatMoney(balances?.[t.card] || 0)}
          </button>
        ))}

        <div className="hero-title" style={{ color: titleColor }}>
          <span>{title}</span>
        </div>

        <div className="hero-flow hero-flow-in">
          <span>Пришло:</span>
          <b style={{ color: C.sber }}>+{formatMoney(Math.abs(inflow))}</b>
        </div>
        <div className="hero-flow hero-flow-out">
          <span>Ушло:</span>
          <b style={{ color: C.danger }}>−{formatMoney(Math.abs(outflow))}</b>
        </div>

        <div className="hero-badge">
          <BankBadge src={bucketIconSrc(settings, CARD_BUCKET[card])} />
        </div>

        <button
          type="button"
          className="hero-hit hero-hit-prev"
          disabled={!canPrev}
          onClick={onPrev}
          aria-label="Предыдущая вкладка"
        />
        <button
          type="button"
          className="hero-hit hero-hit-add"
          onClick={onAdd}
          aria-label={addLabel || "Новая операция"}
        />
        <button
          type="button"
          className="hero-hit hero-hit-next"
          disabled={!canNext}
          onClick={onNext}
          aria-label="Следующая вкладка"
        />
      </div>
    </>
  );
}
