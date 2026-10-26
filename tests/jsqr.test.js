import { readFileSync } from "node:fs";
import jsQR from "../src/vendor/jsQR.js";
import { parseReceiptQr } from "../src/receiptQr.js";

// Картинка QR-кода (как на кассовом чеке) хранится в файле как сырые пиксели RGBA.
const fx = JSON.parse(readFileSync(new URL("./fixtures/receipt-qr.json", import.meta.url), "utf-8"));

describe("чтение QR-кода с картинки", () => {
  it("библиотека находит и читает QR чека", () => {
    const pixels = new Uint8ClampedArray(Buffer.from(fx.data, "base64"));
    const found = jsQR(pixels, fx.width, fx.height);
    expect(found).toBeTruthy();
    expect(found.data).toBe(fx.text);
  });

  it("прочитанное содержимое превращается в сумму и дату чека", () => {
    const pixels = new Uint8ClampedArray(Buffer.from(fx.data, "base64"));
    const parsed = parseReceiptQr(jsQR(pixels, fx.width, fx.height).data);
    expect(parsed.ok).toBe(true);
    expect(parsed.amount).toBe(1850);
    expect(parsed.date).toBe("2026-10-25");
  });

  it("пустая картинка без QR-кода ничего не находит", () => {
    const blank = new Uint8ClampedArray(200 * 200 * 4).fill(255);
    expect(jsQR(blank, 200, 200)).toBeNull();
  });
});
