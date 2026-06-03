"""毎朝1回 GitHub Actions から実行され、株価を取得して prices.json を更新する。
非上場の OpenAI / Anthropic は対象外（サイト側で手動表示）。
"""
import json
import datetime
import yfinance as yf

# サイトの data-ticker と一致させること
TICKERS = [
    "9984.T",  # ソフトバンクG
    "NVDA",    # NVIDIA
    "TSM",     # TSMC
    "AVGO",    # Broadcom
    "MU",      # Micron
    "285A.T",  # キオクシア
    "6857.T",  # アドバンテスト
    "6963.T",  # ローム
    "7735.T",  # SCREEN HD
    "4004.T",  # レゾナック
    "5991.T",  # 日本発条
    "6954.T",  # ファナック
    "6981.T",  # 村田製作所
]


def get_price(ticker):
    tk = yf.Ticker(ticker)
    price = None
    currency = "JPY" if ticker.endswith(".T") else "USD"
    market_cap = None
    # まず fast_info（速い）
    try:
        fi = tk.fast_info
        price = fi.get("last_price") or fi.get("lastPrice")
        currency = fi.get("currency") or currency
        market_cap = fi.get("market_cap") or fi.get("marketCap")
    except Exception as e:
        print("fast_info err", ticker, e)
    # ダメなら直近終値
    if not price:
        try:
            hist = tk.history(period="5d")
            if not hist.empty:
                price = float(hist["Close"].dropna().iloc[-1])
        except Exception as e:
            print("history err", ticker, e)
    return price, currency, market_cap


def main():
    stocks = {}
    for t in TICKERS:
        price, currency, mcap = get_price(t)
        if price:
            entry = {"price": round(float(price), 2), "currency": currency}
            if mcap:
                entry["marketCap"] = int(mcap)
            stocks[t] = entry
            print("OK", t, entry)
        else:
            print("SKIP (no price)", t)

    # 日本時間の日付
    jst = datetime.timezone(datetime.timedelta(hours=9))
    today = datetime.datetime.now(jst).strftime("%Y-%m-%d")

    data = {
        "updated": today,
        "note": "GitHub Actions による自動更新（前営業日ベースの概算）",
        "stocks": stocks,
    }
    with open("prices.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("wrote prices.json:", len(stocks), "stocks /", today)


if __name__ == "__main__":
    main()
