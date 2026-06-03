"""毎朝1回 GitHub Actions から実行。
株価・時価総額を取得して prices.json を、掲載企業の最近ニュースを news.json を更新する。
非上場の OpenAI / Anthropic は対象外（サイト側で手動表示）。
"""
import json
import datetime
import yfinance as yf

# (ticker, 表示名)
COMPANIES = [
    ("9984.T", "ソフトバンクG"),
    ("NVDA",   "NVIDIA"),
    ("TSM",    "TSMC"),
    ("AVGO",   "Broadcom"),
    ("MU",     "Micron"),
    ("285A.T", "キオクシア"),
    ("6857.T", "アドバンテスト"),
    ("6963.T", "ローム"),
    ("7735.T", "SCREEN HD"),
    ("4004.T", "レゾナック"),
    ("5991.T", "日本発条"),
    ("6954.T", "ファナック"),
    ("6981.T", "村田製作所"),
]

JST = datetime.timezone(datetime.timedelta(hours=9))


def get_price(tk, ticker):
    price = None
    currency = "JPY" if ticker.endswith(".T") else "USD"
    market_cap = None
    try:
        fi = tk.fast_info
        price = fi.get("last_price") or fi.get("lastPrice")
        currency = fi.get("currency") or currency
        market_cap = fi.get("market_cap") or fi.get("marketCap")
    except Exception as e:
        print("fast_info err", ticker, e)
    if not price:
        try:
            hist = tk.history(period="5d")
            if not hist.empty:
                price = float(hist["Close"].dropna().iloc[-1])
        except Exception as e:
            print("history err", ticker, e)
    return price, currency, market_cap


def parse_time(item, content):
    # 新形式: content.pubDate (ISO) / 旧形式: providerPublishTime (unix)
    try:
        if content.get("pubDate"):
            return content["pubDate"]
        if item.get("providerPublishTime"):
            return datetime.datetime.utcfromtimestamp(
                int(item["providerPublishTime"])
            ).replace(tzinfo=datetime.timezone.utc).isoformat()
    except Exception:
        pass
    return ""


def get_news(tk, ticker, company):
    out = []
    try:
        items = tk.news or []
    except Exception as e:
        print("news err", ticker, e)
        return out
    for it in items:
        try:
            c = it.get("content", it) if isinstance(it, dict) else {}
            title = c.get("title") or it.get("title")
            link = None
            for key in ("canonicalUrl", "clickThroughUrl"):
                if isinstance(c.get(key), dict) and c[key].get("url"):
                    link = c[key]["url"]
                    break
            if not link:
                link = it.get("link")
            pub = ""
            if isinstance(c.get("provider"), dict):
                pub = c["provider"].get("displayName", "")
            if not pub:
                pub = it.get("publisher", "")
            t = parse_time(it, c)
            if title and link:
                out.append({
                    "ticker": ticker, "company": company,
                    "title": title.strip(), "publisher": pub,
                    "link": link, "time": t,
                })
        except Exception as e:
            print("parse news err", ticker, e)
    return out


def to_dt(iso):
    if not iso:
        return None
    try:
        s = iso.replace("Z", "+00:00")
        return datetime.datetime.fromisoformat(s)
    except Exception:
        return None


def main():
    stocks = {}
    all_news = []
    for ticker, company in COMPANIES:
        tk = yf.Ticker(ticker)
        price, currency, mcap = get_price(tk, ticker)
        if price:
            entry = {"price": round(float(price), 2), "currency": currency}
            if mcap:
                entry["marketCap"] = int(mcap)
            stocks[ticker] = entry
            print("PRICE OK", ticker, entry)
        else:
            print("PRICE SKIP", ticker)

        news = get_news(tk, ticker, company)
        # 1社あたり最新2件まで
        news_sorted = sorted(news, key=lambda n: n["time"] or "", reverse=True)
        all_news.extend(news_sorted[:2])
        print("NEWS", ticker, len(news_sorted[:2]))

    today = datetime.datetime.now(JST).strftime("%Y-%m-%d")

    # 価格
    with open("prices.json", "w", encoding="utf-8") as f:
        json.dump({
            "updated": today,
            "note": "GitHub Actions による自動更新（前営業日ベースの概算）",
            "stocks": stocks,
        }, f, ensure_ascii=False, indent=2)

    # ニュース: 直近6日以内・新しい順・最大15件
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=6)
    recent = []
    for n in all_news:
        dt = to_dt(n["time"])
        if dt is None or dt >= cutoff:
            recent.append(n)
    recent.sort(key=lambda n: n["time"] or "", reverse=True)
    recent = recent[:15]
    with open("news.json", "w", encoding="utf-8") as f:
        json.dump({"updated": today, "items": recent}, f, ensure_ascii=False, indent=2)

    print("wrote prices.json:", len(stocks), "/ news.json:", len(recent), "/", today)


if __name__ == "__main__":
    main()
