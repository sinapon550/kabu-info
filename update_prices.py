"""毎朝1回 GitHub Actions から実行。
株価・前日比・時価総額・目標株価・レーティングを prices.json に、
掲載企業の最近ニュースを news.json に書き出す。
非上場の OpenAI / Anthropic、投資信託(のむラップ)は対象外（サイト側で手動表示）。
"""
import json
import datetime
import urllib.parse
import urllib.request
import yfinance as yf

# (ticker, 表示名)
COMPANIES = [
    ("9984.T", "ソフトバンクG"),
    ("9434.T", "ソフトバンク"),
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
    # つるはし企業（製造装置・材料）
    ("ASML",   "ASML"),
    ("8035.T", "東京エレクトロン"),
    ("6920.T", "レーザーテック"),
    ("6146.T", "ディスコ"),
    ("4063.T", "信越化学"),
    ("3436.T", "SUMCO"),
    # 海外メモリ・その他
    ("000660.KS", "SKハイニックス"),
    ("005930.KS", "サムスン電子"),
    ("SNDK",   "SanDisk"),
    ("6506.T", "安川電機"),
    ("6861.T", "キーエンス"),
    ("6324.T", "ハーモニック"),
    # 親の保有
    ("8306.T", "三菱UFJ"),
    # 個人の保有（株価のみ・ニュース対象外）
    ("2502.T", "アサヒグループHD"),
    ("2768.T", "双日"),
    ("2914.T", "日本たばこ産業"),
    ("4565.T", "ネクセラファーマ"),
    ("4755.T", "楽天グループ"),
    ("7267.T", "本田技研工業"),
    ("8058.T", "三菱商事"),
    ("8267.T", "イオン"),
    ("8591.T", "オリックス"),
    ("8729.T", "ソニーフィナンシャルG"),
    ("9432.T", "NTT"),
    ("9433.T", "KDDI"),
    ("1417.T", "ミライト・ワン"),
]

def translate_ja(text):
    """無料の翻訳エンドポイントで日本語化（失敗時は原文のまま）。"""
    if not text:
        return text
    try:
        url = ("https://translate.googleapis.com/translate_a/single"
               "?client=gtx&sl=auto&tl=ja&dt=t&q=" + urllib.parse.quote(text))
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=12) as r:
            data = json.loads(r.read().decode("utf-8"))
        return "".join(seg[0] for seg in data[0] if seg and seg[0])
    except Exception as e:
        print("translate err", e)
        return text

RATING_MAP = {
    "strong_buy": "強い買い", "buy": "買い", "outperform": "やや買い",
    "hold": "中立", "underperform": "やや売り",
    "sell": "売り", "strong_sell": "強い売り",
}

JST = datetime.timezone(datetime.timedelta(hours=9))

# 決算・業績系のキーワード（英・日）
EARNINGS_KW = [
    "earnings", "results", "result", "profit", "revenue", "sales", "quarter",
    "guidance", "forecast", "outlook", "dividend", "income", "margin", "ipo",
    "決算", "業績", "売上", "利益", "増益", "減益", "最高益", "営業利益",
    "純利益", "配当", "上方修正", "下方修正", "見通し",
]

# 会社名の別名（タイトルに含まれていれば「その会社の記事」とみなす）
ALIASES = {
    "285A.T": ["kioxia", "キオクシア"], "NVDA": ["nvidia"],
    "TSM": ["tsmc", "taiwan semiconductor"], "AVGO": ["broadcom"], "MU": ["micron"],
    "9984.T": ["softbank", "ソフトバンク"], "9434.T": ["softbank", "ソフトバンク"],
    "6857.T": ["advantest", "アドバンテスト"], "ASML": ["asml"],
    "8035.T": ["tokyo electron", "東京エレクトロン"], "6920.T": ["lasertec", "レーザーテック"],
    "6146.T": ["disco", "ディスコ"], "4063.T": ["shin-etsu", "信越"], "3436.T": ["sumco"],
    "000660.KS": ["sk hynix", "hynix", "ハイニックス"], "005930.KS": ["samsung", "サムスン"],
    "SNDK": ["sandisk"], "6963.T": ["rohm", "ローム"], "7735.T": ["screen"],
    "4004.T": ["resonac", "レゾナック"], "5991.T": ["nhk spring", "日本発条", "ニッパツ"],
    "6954.T": ["fanuc", "ファナック"], "6981.T": ["murata", "村田"],
    "6506.T": ["yaskawa", "安川"], "6861.T": ["keyence", "キーエンス"],
    "6324.T": ["harmonic", "ハーモニック"], "8306.T": ["mitsubishi ufj", "mufg", "三菱ufj"],
    "2502.T": ["asahi", "アサヒ"], "2768.T": ["sojitz", "双日"],
    "2914.T": ["japan tobacco", "日本たばこ"], "4565.T": ["nxera", "ネクセラ", "sosei"],
    "4755.T": ["rakuten", "楽天"], "7267.T": ["honda", "ホンダ"],
    "8058.T": ["mitsubishi corp", "三菱商事"], "8267.T": ["aeon", "イオン"],
    "8591.T": ["orix", "オリックス"], "8729.T": ["sony financial", "ソニーフィナンシャル"],
    "9432.T": ["ntt"], "9433.T": ["kddi"], "1417.T": ["mirait", "ミライト"],
}


def is_relevant(item):
    ticker = item.get("ticker", "")
    text = ((item.get("title") or "") + " " + (item.get("titleJa") or "")).lower()
    # 社名がタイトルに入っていれば「その会社の記事」＝関連あり
    for a in ALIASES.get(ticker, []):
        if a.lower() in text:
            return True
    # 日本株(.T)・韓国株(.KS)は、社名が出てこない記事は除外（海外の見当違い記事を防ぐ）
    if ticker.endswith(".T") or ticker.endswith(".KS"):
        return False
    # 米国株などは決算系キーワードも関連ありとみなす
    for kw in EARNINGS_KW:
        if kw in text:
            return True
    return False


def get_price(tk, ticker):
    price = None
    prev = None
    currency = "JPY" if ticker.endswith(".T") else "USD"
    market_cap = None
    try:
        fi = tk.fast_info
        price = fi.get("last_price") or fi.get("lastPrice")
        prev = fi.get("previous_close") or fi.get("previousClose")
        currency = fi.get("currency") or currency
        market_cap = fi.get("market_cap") or fi.get("marketCap")
    except Exception as e:
        print("fast_info err", ticker, e)
    if not price:
        try:
            hist = tk.history(period="5d")
            if not hist.empty:
                closes = hist["Close"].dropna()
                price = float(closes.iloc[-1])
                if len(closes) >= 2 and not prev:
                    prev = float(closes.iloc[-2])
        except Exception as e:
            print("history err", ticker, e)
    return price, prev, currency, market_cap


def get_extras(tk, ticker):
    """目標株価・評価・配当利回り・利益率・決算数字をまとめて取得（dictで返す）。"""
    out = {}
    try:
        info = tk.info or {}
        if info.get("targetMeanPrice"):
            out["target"] = round(float(info["targetMeanPrice"]), 2)
        rk = info.get("recommendationKey")
        rating = RATING_MAP.get(rk)
        n = info.get("numberOfAnalystOpinions")
        if rating and n:
            rating = "%s(%d人)" % (rating, int(n))
        if rating:
            out["rating"] = rating
        tdy = info.get("trailingAnnualDividendYield")
        if tdy:
            out["dividendYield"] = round(float(tdy) * 100, 2)
        else:
            d2 = info.get("dividendYield")
            if d2 is not None:
                out["dividendYield"] = round(float(d2) if d2 > 1 else float(d2) * 100, 2)
        pm = info.get("profitMargins")
        if pm is not None:
            out["profitMargin"] = round(float(pm) * 100, 1)
        # 決算の数字
        if info.get("totalRevenue"):
            out["revenue"] = int(info["totalRevenue"])
        if info.get("netIncomeToCommon") is not None:
            out["netIncome"] = int(info["netIncomeToCommon"])
        if info.get("trailingEps") is not None:
            out["eps"] = round(float(info["trailingEps"]), 2)
        if info.get("trailingPE"):
            out["per"] = round(float(info["trailingPE"]), 1)
        if info.get("financialCurrency"):
            out["finCurrency"] = info["financialCurrency"]
    except Exception as e:
        print("info err", ticker, e)
    return out


def _cell(row, col):
    try:
        v = row[col]
        if v is None:
            return None
        v = float(v)
        if v != v:  # NaN
            return None
        return int(v)
    except Exception:
        return None


def get_history(tk):
    """直近3年の売上高・純利益を取得（新しい年が先頭）。"""
    out = []
    try:
        df = tk.income_stmt
        if df is None or getattr(df, "empty", True):
            return out
        cols = list(df.columns)[:3]
        idx = list(df.index)
        rev_label = next((x for x in ["Total Revenue", "Operating Revenue"] if x in idx), None)
        ni_label = next((x for x in [
            "Net Income", "Net Income Common Stockholders",
            "Net Income From Continuing Operation Net Minority Interest",
        ] if x in idx), None)
        for c in cols:
            year = str(getattr(c, "year", str(c)[:4]))
            entry = {"year": year}
            if rev_label:
                v = _cell(df.loc[rev_label], c)
                if v is not None:
                    entry["revenue"] = v
            if ni_label:
                v = _cell(df.loc[ni_label], c)
                if v is not None:
                    entry["netIncome"] = v
            if len(entry) > 1:
                out.append(entry)
    except Exception as e:
        print("hist err", e)
    return out


def parse_time(item, content):
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
        return datetime.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except Exception:
        return None


def main():
    stocks = {}
    all_news = []
    for ticker, company in COMPANIES:
        tk = yf.Ticker(ticker)
        price, prev, currency, mcap = get_price(tk, ticker)
        if price:
            entry = {"price": round(float(price), 2), "currency": currency}
            if mcap:
                entry["marketCap"] = int(mcap)
            if prev:
                entry["prevClose"] = round(float(prev), 2)
                entry["changePct"] = round((float(price) - float(prev)) / float(prev) * 100, 2)
            entry.update(get_extras(tk, ticker))
            hist = get_history(tk)
            if hist:
                entry["history"] = hist
            stocks[ticker] = entry
            print("PRICE OK", ticker, entry)
        else:
            print("PRICE SKIP", ticker)

        news = sorted(get_news(tk, ticker, company),
                      key=lambda n: n["time"] or "", reverse=True)
        all_news.extend(news[:2])

    today = datetime.datetime.now(JST).strftime("%Y-%m-%d")

    with open("prices.json", "w", encoding="utf-8") as f:
        json.dump({
            "updated": today,
            "note": "GitHub Actions による自動更新（前営業日ベースの概算）",
            "stocks": stocks,
        }, f, ensure_ascii=False, indent=2)

    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=6)
    recent = [n for n in all_news if (to_dt(n["time"]) is None or to_dt(n["time"]) >= cutoff)]
    recent.sort(key=lambda n: n["time"] or "", reverse=True)
    recent = recent[:50]
    # 見出しを日本語訳＋関連度フラグ
    for n in recent:
        n["titleJa"] = translate_ja(n["title"])
        n["relevant"] = is_relevant(n)
    with open("news.json", "w", encoding="utf-8") as f:
        json.dump({"updated": today, "items": recent}, f, ensure_ascii=False, indent=2)

    print("wrote prices.json:", len(stocks), "/ news.json:", len(recent), "/", today)


if __name__ == "__main__":
    main()
