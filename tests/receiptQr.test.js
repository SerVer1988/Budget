import { parseReceiptQr } from "../src/receiptQr.js";

describe("QR-код кассового чека", () => {
  it("разбирает обычный чек: сумма, дата, время, ключ", () => {
    const r = parseReceiptQr("t=20261025T1245&s=1850.00&fn=7380440800123456&i=12345&fp=3216549870&n=1");
    expect(r).toMatchObject({ ok: true, amount: 1850, date: "2026-10-25", time: "12:45", kind: "purchase" });
    expect(r.key).toBe("7380440800123456-12345-3216549870");
  });

  it("понимает копейки и запятую вместо точки", () => {
    expect(parseReceiptQr("t=20261025T1245&s=349.93&fn=1&i=2&fp=3&n=1").amount).toBe(349.93);
    expect(parseReceiptQr("t=20261025T1245&s=349,93&fn=1&i=2&fp=3&n=1").amount).toBe(349.93);
    expect(parseReceiptQr("t=20261025T1245&s=100&fn=1&i=2&fp=3&n=1").amount).toBe(100);
  });

  it("время с секундами и с разделителями тоже подходит", () => {
    expect(parseReceiptQr("t=20261025T124530&s=10.00&fn=1&i=2&fp=3&n=1").time).toBe("12:45");
    expect(parseReceiptQr("t=2026-10-25T12:45&s=10.00&fn=1&i=2&fp=3&n=1").date).toBe("2026-10-25");
  });

  it("находит реквизиты внутри ссылки", () => {
    const r = parseReceiptQr("https://check.example.ru/view?t=20261025T1245&s=10.00&fn=1&i=2&fp=3&n=1");
    expect(r.ok).toBe(true);
    expect(r.amount).toBe(10);
  });

  it("чек на возврат отмечается отдельно", () => {
    expect(parseReceiptQr("t=20261025T1245&s=500.00&fn=1&i=2&fp=3&n=2").kind).toBe("refund");
  });

  it("лишние пробелы вокруг не мешают", () => {
    expect(parseReceiptQr("  t=20261025T1245&s=10.00&fn=1&i=2&fp=3&n=1 \n").ok).toBe(true);
  });

  it("не принимает посторонние QR-коды и мусор", () => {
    ["", "   ", "https://example.com", "hello world", "t=1&s=2", "t=20261025T1245&s=abc&fn=1&i=2&fp=3"].forEach((raw) => {
      const r = parseReceiptQr(raw);
      expect(r.ok).toBe(false);
      expect(typeof r.error).toBe("string");
    });
  });

  it("не принимает несуществующую дату и нулевую сумму", () => {
    expect(parseReceiptQr("t=20261345T1245&s=10.00&fn=1&i=2&fp=3&n=1").ok).toBe(false);
    expect(parseReceiptQr("t=20261025T2561&s=10.00&fn=1&i=2&fp=3&n=1").ok).toBe(false);
    expect(parseReceiptQr("t=20261025T1245&s=0.00&fn=1&i=2&fp=3&n=1").ok).toBe(false);
  });
});
