"use client";
import { useEffect, useState } from "react";
import { convertCurrency } from "@/lib/currency";
const STORAGE = "mongolia-exchange-rate";
export function CurrencyConverter() {
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState("10000");
  const [direction, setDirection] = useState<"KRW" | "MNT">("MNT");
  useEffect(() => {
    try {
      setRate(localStorage.getItem(STORAGE) ?? "");
    } catch {}
  }, []);
  const validRate =
    rate.trim() !== "" && Number.isFinite(Number(rate)) && Number(rate) > 0;
  const result = convertCurrency(amount, rate, direction);
  const formatted = (value: number) =>
    value.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  return (
    <section className="currency-card" aria-label="원화 투그릭 변환기">
      <p className="kicker">여행 중 간편 계산</p>
      <h2>원화 ↔ 투그릭</h2>
      <p className="currency-note">
        환전한 환율을 한 번 입력하면 다음에도 기억해요.
      </p>
      <label htmlFor="exchange-rate">적용 환율 · 1원 = 몇 투그릭인가요?</label>
      <div className="currency-input">
        <input
          id="exchange-rate"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={rate}
          placeholder="환율 입력"
          onChange={(e) => {
            setRate(e.target.value);
            try {
              if (
                Number(e.target.value) > 0 &&
                Number.isFinite(Number(e.target.value))
              )
                localStorage.setItem(STORAGE, e.target.value);
              else localStorage.removeItem(STORAGE);
            } catch {}
          }}
        />
        <span>₮ / 원</span>
      </div>
      <div className="currency-directions">
        <button
          type="button"
          aria-pressed={direction === "MNT"}
          onClick={() => setDirection("MNT")}
        >
          투그릭 → 원화
        </button>
        <button
          type="button"
          aria-pressed={direction === "KRW"}
          onClick={() => setDirection("KRW")}
        >
          원화 → 투그릭
        </button>
      </div>
      <label htmlFor="currency-amount">
        {direction === "MNT" ? "투그릭" : "원화"} 금액
      </label>
      <div className="currency-input">
        <input
          id="currency-amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <span>{direction === "MNT" ? "₮" : "원"}</span>
      </div>
      <div className="currency-presets">
        {[1000, 10000, 50000, 100000].map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => setAmount(String(value))}
          >
            {formatted(value)}
          </button>
        ))}
      </div>
      <output className="currency-result" aria-live="polite">
        {result !== null && Number.isFinite(result) ? (
          <>
            <small>약</small> {formatted(result)}{" "}
            <small>{direction === "MNT" ? "원" : "₮"}</small>
          </>
        ) : (
          <small>
            {!validRate
              ? "양수인 환율을 입력해 주세요"
              : "계산할 금액을 확인해 주세요"}
          </small>
        )}
      </output>
      <p className="currency-note">
        직접 입력한 환율 기준 · 수수료 제외 · 정수 반올림
        <br />
        계산할 때 추가 데이터를 사용하지 않아요.
      </p>
    </section>
  );
}
