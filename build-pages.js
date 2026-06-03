// 企業の深掘りページを一括生成する。
// データを足して `node build-pages.js` を実行すれば、各社のHTMLが作られる。
const fs = require("fs");

const NAV = `<nav><div class="wrap">
  <a class="navpage" href="index.html">📘 基本</a>
  <a class="navpage" href="companies.html">📈 いま熱い企業・株</a>
  <a class="navpage" href="holdings.html">👪 親の保有</a>
  <a class="navpage" href="my-holdings.html">🙋 自分の保有</a>
  <span class="navsep"></span>
  <a href="#kpi">株価・指標</a><a href="#about">会社概要</a><a href="#zaimu">決算</a><a href="#sw">強みとリスク</a><a href="#mirai">今後の展望</a><a href="#news">ニュース</a>
</div></nav>`;

const NAV_NOLIST = NAV.replace('<a href="#zaimu">決算</a>', '').replace('<a href="#news">ニュース</a>', '');

function li(arr) { return arr.map(x => "・" + x).join("<br>"); }

function kpiTable(d) {
  return `<div class="scroll"><table>
      <tr><th>銘柄</th><th>株価<br>前日比</th><th>配当<br>利回り</th><th>利益率<br>(純利益)</th><th>時価総額</th><th>目標株価<br>評価</th></tr>
      <tr><td><b>${d.name}</b><br>${d.code}</td><td class="px" data-ticker="${d.ticker}">—</td><td class="dy" data-ticker="${d.ticker}">—</td><td class="pm" data-ticker="${d.ticker}">—</td><td class="mcap" data-ticker="${d.ticker}">—</td><td class="tgt" data-ticker="${d.ticker}">—</td></tr>
    </table></div>`;
}

function page(d) {
  const listed = !!d.ticker;
  const kpi = listed
    ? `<section id="kpi"><h2>株価・主要指標<span class="en">KEY METRICS</span></h2>
    <p class="intro">毎朝自動更新（概算）。前日比は<span style="color:#c0392f">▲赤=上昇</span>/<span style="color:#2156a8">▼青=下落</span>。</p>
    ${kpiTable(d)}</section>`
    : `<section id="kpi"><h2>評価額<span class="en">VALUATION</span></h2>
    <div class="card"><div class="kv">${d.valuation}</div></div></section>`;
  const zaimu = listed
    ? `<section id="zaimu"><h2>📊 決算（業績）の数字<span class="en">FINANCIALS</span></h2>
    <p class="intro">直近の業績（自動・概算）。正確な決算は会社の公式資料で。</p>
    <div class="scroll"><table>
      <tr><th>売上高</th><th>純利益</th><th>利益率</th><th>PER</th><th>1株利益<br>(EPS)</th></tr>
      <tr><td class="rev" data-ticker="${d.ticker}">—</td><td class="ni" data-ticker="${d.ticker}">—</td><td class="pm" data-ticker="${d.ticker}">—</td><td class="per" data-ticker="${d.ticker}">—</td><td class="eps" data-ticker="${d.ticker}">—</td></tr>
    </table></div>
    <h3 style="margin:14px 0 4px;color:var(--green-d)">📅 3年間の推移</h3>
    <div class="scroll"><div class="hist3" data-ticker="${d.ticker}"><div class="kv">読み込み中…</div></div></div>
    <div class="card"><h3>🔰 決算の見方（やさしく）</h3><div class="kv">
      ・<b>売上高</b>＝会社が稼いだ総額（お店でいう売上）<br>
      ・<b>純利益</b>＝費用を引いて最後に残った“もうけ”（▲はマイナス＝赤字）<br>
      ・<b>利益率</b>＝売上のうち何%がもうけか（高いほど良い商売）<br>
      ・<b>PER</b>＝株価が利益の何年分か（低いほど割安の目安／高いほど期待大）<br>
      ・<b>1株利益(EPS)</b>＝1株あたりのもうけ
    </div></div>
    <div class="card tsuru"><h3>📏 数字の目安（どれくらいが普通？）</h3><div class="kv">
      ・<b>PER</b>：だいたい<b>15倍前後</b>が標準（10〜20倍が普通）。<b>30倍以上</b>＝成長期待が高い（割高にも）／<b>10倍未満</b>＝割安の目安だが業績不安の裏返しのことも。<br>
      ・<b>配当利回り</b>：<b>2〜4%</b>が一般的。<b>3%超</b>で高配当の目安。高すぎ(6%超)は株価下落・減配リスクの裏返しのことも。<br>
      ・<b>利益率</b>：業種による。製造業<b>5〜10%</b>、優良企業<b>15%超</b>、半導体・ソフトで<b>30%超</b>なら超優良。<br>
      ・<b>PBR</b>：<b>1倍</b>が目安（1倍割れは割安だが“万年割安”のことも）。<br>
      <span style="color:var(--sub);font-size:12px">※あくまで一般的な目安。業種・成長段階で“正常値”は変わります。</span>
    </div></div></section>`
    : "";
  const news = listed
    ? `<section id="news"><h2>📰 ${d.name} 決算・関連ニュース<span class="en">NEWS</span></h2>
    <p class="intro">決算・業績寄りに絞って表示（毎朝自動収集・日本語訳）。<span id="news-updated"></span></p>
    <div id="news-list" class="card" data-tickers="${d.ticker}" data-relevant="1" data-limit="8"><div class="kv">読み込み中…</div></div></section>`
    : "";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>株なるほどメモ｜${d.name} 深掘り</title>
<link rel="stylesheet" href="style.css?v=7">
</head>
<body>
<header><div class="wrap">
  <span class="badge">深掘りページ</span>
  <h1>${d.emoji} ${d.name} 深掘り</h1>
  <p class="lead">${d.lead}</p>
  <p class="updated"><span id="auto-upd">株価は毎朝 自動更新</span>／家族の勉強メモ</p>
</div></header>
${listed ? NAV : NAV_NOLIST}
<div class="wrap">
  <div class="disc"><b>⚠️ はじめに</b>：家族の<b>勉強メモ</b>で、<b>投資のおすすめではありません</b>。数字は概算で日々変わります。判断は最新の公式情報を見て自己責任で。</div>
  ${kpi}
  <section id="about"><h2>どんな会社？<span class="en">ABOUT</span></h2>
    <div class="card"><h3>${d.aboutTitle}</h3><div class="kv">${d.about}</div></div>
  </section>
  ${zaimu}
  <section id="sw"><h2>強みとリスク<span class="en">STRENGTHS & RISKS</span></h2>
    <div class="card"><h3>💪 強み</h3><div class="kv">${li(d.strengths)}</div></div>
    <div class="card tsuru"><h3>⚠️ リスク</h3><div class="kv">${li(d.risks)}</div></div>
  </section>
  <section id="mirai"><h2>今後の展望<span class="en">OUTLOOK</span></h2>
    <div class="card" style="border-left:5px solid #7b3ea8"><h3>🚀 注目テーマ</h3><div class="kv">${li(d.outlook)}</div></div>
  </section>
  ${news}
  <div class="disc"><b>もう一度</b>：勉強用です。<b>買うことを勧めるものではありません</b>。判断は最新の公式情報を確認し自己責任で。</div>
</div>
<footer><div class="wrap"><b>株なるほどメモ</b>｜<a href="companies.html">📈 いま熱い企業・株へ戻る</a></div></footer>
<script src="prices.js?v=7"></script>
</body></html>
`;
}

const DATA = [
  // ===== つるはし（装置・材料）=====
  { file: "asml.html", name: "ASML", code: "ASML／蘭", ticker: "ASML", emoji: "🔬",
    lead: "半導体製造で最重要の露光装置をほぼ独占「ASML（エーエスエムエル・オランダ）」。",
    aboutTitle: "🔬 “回路を焼く”最重要装置の独占企業",
    about: "チップに極細の回路を焼き付ける<b>露光装置（EUV）</b>を作るオランダの会社。最先端チップに必須で、<b>露光装置で約83%のシェア</b>。この装置が無いと最先端半導体は作れない、究極のつるはし。",
    strengths: ["EUV露光装置を<b>事実上独占</b>", "1台数百億円の高付加価値、参入不可能レベルの技術", "TSMC・サムスン等との長期関係"],
    risks: ["対中輸出規制など<b>地政学リスク</b>", "半導体の設備投資サイクルに業績が左右される", "受注の振れ（季節・客の都合）が大きい"],
    outlook: ["AI需要で2026年見通しを<b>上方修正</b>", "次世代(High-NA EUV)で技術リードを継続"] },
  { file: "tokyo-electron.html", name: "東京エレクトロン", code: "8035", ticker: "8035.T", emoji: "🏭",
    lead: "日本最大の半導体製造装置メーカー「東京エレクトロン（8035）」。",
    aboutTitle: "🏭 製造装置の総合メーカー（日本最大）",
    about: "半導体を作る<b>各工程の装置</b>（塗布・現像のコータ/デベロッパ、成膜、エッチングなど）を幅広く手がける日本最大の装置メーカー。<b>コータ/デベロッパでは9割超のシェア</b>。",
    strengths: ["多くの工程で<b>高シェア</b>", "AIチップ・先端パッケージの装置需要を総取り", "幅広い装置を“ワンストップ”で提供"],
    risks: ["半導体の設備投資サイクル", "対中規制の影響", "海外売上比率が高く為替の影響"],
    outlook: ["AI向け設備投資で<b>需要増</b>", "先端パッケージ・新工程で領域拡大"] },
  { file: "lasertec.html", name: "レーザーテック", code: "6920", ticker: "6920.T", emoji: "🔍",
    lead: "EUVマスク検査でほぼ独壇場「レーザーテック（6920）」。",
    aboutTitle: "🔍 EUVマスクの“欠陥”を見つける唯一級の会社",
    about: "回路の“原版”である<b>EUVマスク</b>に欠陥が無いか調べる検査装置で<b>ほぼ独壇場</b>。最先端チップの歩留まり（良品率）を支える縁の下の力持ち。",
    strengths: ["EUVマスク検査を<b>独占的に</b>担う", "最先端化が進むほど需要が増える", "高い利益率"],
    risks: ["特定分野・特定客への依存度が高い", "株価の変動が大きい（人気化しやすい）", "市場規模が小さく成長の頭打ち懸念"],
    outlook: ["微細化（2nm等）の進展が追い風", "EUV採用拡大で検査需要増"] },
  { file: "disco.html", name: "ディスコ", code: "6146", ticker: "6146.T", emoji: "🪚",
    lead: "ウエハーを“切る・削る”装置で世界トップ級「ディスコ（6146）」。",
    aboutTitle: "🪚 切る・削るの精密加工装置",
    about: "ウエハーからチップを切り出す<b>ダイシング</b>や、薄く削る<b>研削（グラインダ）</b>の装置で世界高シェア。AIチップの<b>先端パッケージ（積層）</b>需要で出番が増えている。",
    strengths: ["ダイシング/研削で<b>高シェア</b>", "高収益体質", "消耗品（替刃）で安定した収益"],
    risks: ["半導体市況・設備投資サイクル", "株価の期待が高め", "中国向け比率の変動"],
    outlook: ["<b>先端パッケージ（チップ積層）</b>需要で堅調", "HBMなど積層メモリ向けの加工需要"] },
  { file: "shinetsu.html", name: "信越化学", code: "4063", ticker: "4063.T", emoji: "🧪",
    lead: "チップの土台シリコンウエハーで世界トップ級「信越化学（4063）」。",
    aboutTitle: "🧪 半導体の“土台”を作る素材の巨人",
    about: "チップの土台になる<b>シリコンウエハー（円板）</b>で世界トップ級。塩ビ（プラスチック原料）など化学事業も大きく、<b>高収益で財務も盤石</b>な日本の優良企業。",
    strengths: ["シリコンウエハー世界トップ級＋<b>多角化で安定</b>", "高収益・好財務", "塩ビ世界トップという“もう一本の柱”"],
    risks: ["半導体・化学市況の影響", "為替の影響", "巨額の設備投資負担"],
    outlook: ["半導体拡大の<b>“土台”需要</b>", "AI向け大口径ウエハーの需要"] },
  { file: "sumco.html", name: "SUMCO", code: "3436", ticker: "3436.T", emoji: "🧪",
    lead: "シリコンウエハー世界2位級「SUMCO（3436）」。",
    aboutTitle: "🧪 ウエハー専業の世界2位級",
    about: "<b>シリコンウエハー</b>の専業大手（世界2位級）。信越化学と並ぶウエハーの主要供給者で、半導体の生産量が増えるほど需要が伸びる。",
    strengths: ["ウエハーで世界2位級のシェア", "AI向け大口径ウエハーの需要", "大手との長期契約で需要を確保"],
    risks: ["ウエハー市況の波（在庫調整）", "設備投資の負担", "価格下落局面に弱い専業ゆえの集中リスク"],
    outlook: ["AI・データセンター向けで需要回復・拡大", "300mmウエハーの増産"] },
  // ===== 日本の半導体・関連 =====
  { file: "rohm.html", name: "ローム", code: "6963", ticker: "6963.T", emoji: "⚡",
    lead: "パワー半導体（SiC）に強い「ローム（6963）」。",
    aboutTitle: "⚡ 電力を制御するパワー半導体",
    about: "電気を効率よく制御する<b>パワー半導体</b>（特に高耐圧の<b>SiC＝炭化ケイ素</b>）や電子部品を作る京都の会社。EV（電気自動車）やAIサーバーの電源で需要が伸びる分野。",
    strengths: ["SiCパワー半導体に<b>早くから投資</b>", "電子部品も幅広い", "車載向けの高い信頼性"],
    risks: ["車載・産業の景気変動", "SiCの価格競争が激化", "SiC投資の回収に時間がかかる"],
    outlook: ["<b>EV・AI電源</b>でパワー半導体需要", "車載向けの拡大"] },
  { file: "screen.html", name: "SCREEN HD", code: "7735", ticker: "7735.T", emoji: "🚿",
    lead: "ウエハー洗浄装置で世界トップ「SCREENホールディングス（7735）」。",
    aboutTitle: "🚿 ウエハーを“洗う”装置の世界一",
    about: "半導体製造で欠かせない<b>ウエハー洗浄装置</b>で世界トップシェア。微細化が進むほど、ゴミ一つが不良の原因になるため洗浄の重要性が増す。",
    strengths: ["ウエハー洗浄で<b>世界トップ</b>", "微細化の進展が追い風", "高シェアによる価格競争力"],
    risks: ["半導体市況の波", "主力一本足のリスク", "顧客の投資計画に左右される"],
    outlook: ["先端工程で洗浄需要増", "AI半導体の生産拡大で恩恵"] },
  { file: "resonac.html", name: "レゾナック", code: "4004", ticker: "4004.T", emoji: "🧱",
    lead: "半導体の後工程材料で世界的「レゾナック（4004・旧昭和電工）」。",
    aboutTitle: "🧱 チップを“組み立てる”材料の会社",
    about: "旧・昭和電工。<b>半導体の後工程材料</b>（チップをパッケージに組み立てる材料）で世界的なシェアを持つ化学会社。AIチップの先端パッケージ材料で注目。",
    strengths: ["後工程材料で<b>世界的シェア</b>", "AI先端パッケージ材料の需要", "幅広い材料の総合力"],
    risks: ["化学事業の市況変動", "事業再編の途上", "汎用化学の市況が重し"],
    outlook: ["<b>先端パッケージ材料</b>でAI恩恵", "半導体材料に集中・強化"] },
  { file: "nhk-spring.html", name: "日本発条", code: "5991", ticker: "5991.T", emoji: "🔩",
    lead: "ばね世界トップ級、HDD用精密ばねも「日本発条（ニッパツ・5991）」。",
    aboutTitle: "🔩 ばねの世界トップ級メーカー",
    about: "自動車の<b>サスペンション・シート</b>が主力の世界トップ級ばねメーカー。実は<b>HDD（ハードディスク）用の超精密ばね</b>も作り、データ保存の世界とも縁がある。安定・配当系。",
    strengths: ["ばねで<b>世界トップ級</b>＋HDD精密部品", "配当もある安定・実業系", "幅広い顧客基盤"],
    risks: ["自動車生産の変動", "急成長テーマではない（地味）", "EV化で部品構成が変わるリスク"],
    outlook: ["車載・電動化部品で需要", "<b>親御さんの保有銘柄</b>（安定重視）"] },
  // ===== フィジカルAI =====
  { file: "fanuc.html", name: "ファナック", code: "6954", ticker: "6954.T", emoji: "🦾",
    lead: "産業用ロボット・CNCで世界トップ級「ファナック（6954）」。",
    aboutTitle: "🦾 工場自動化＝フィジカルAIの“体”",
    about: "黄色い<b>産業用ロボット</b>と、工作機械を動かす頭脳<b>CNC</b>で世界トップ級。工場の自動化を支える会社で、AIが進むほどロボットが賢くなり出番が増える。",
    strengths: ["産業用ロボット・CNCで<b>世界トップ級</b>", "高い技術力とブランド", "無借金の超健全な財務"],
    risks: ["設備投資の景気変動", "中国市場の動向", "円高に弱い（海外売上が多い）"],
    outlook: ["人手不足・自動化で<b>需要拡大</b>", "AIで“賢いロボット”へ進化"] },
  { file: "murata.html", name: "村田製作所", code: "6981", ticker: "6981.T", emoji: "🔌",
    lead: "電子部品MLCCで世界トップ「村田製作所（6981）」。",
    aboutTitle: "🔌 あらゆる電子機器に必須の“つるはし”",
    about: "<b>MLCC（積層セラミックコンデンサ＝電気をためる超小型部品）</b>で世界トップ。スマホ1台に1,000個以上使われる、電子機器の縁の下の力持ち。",
    strengths: ["MLCCで<b>世界トップ</b>", "電子機器が増えるほど需要増", "高い技術力と量産力"],
    risks: ["スマホ市況の影響", "価格競争", "スマホ依存の構造"],
    outlook: ["<b>EV・AI機器・ロボット</b>増で追い風", "半導体つるはしの“電子部品版”"] },
  { file: "yaskawa.html", name: "安川電機", code: "6506", ticker: "6506.T", emoji: "🤖",
    lead: "サーボモーター・ロボットの大手「安川電機（6506）」。",
    aboutTitle: "🤖 ロボットを“動かす”モーターの本命",
    about: "ロボットや機械を正確に動かす<b>サーボモーター</b>と<b>産業用ロボット</b>の大手。ファナックと並ぶロボット普及の本命格。",
    strengths: ["サーボモーターで世界高シェア", "ロボット事業の成長", "中国・北米の販売網"],
    risks: ["設備投資の景気変動", "中国市場の動向", "競合との価格競争"],
    outlook: ["自動化・ロボット普及で需要", "フィジカルAIの“体”を担う"] },
  { file: "keyence.html", name: "キーエンス", code: "6861", ticker: "6861.T", emoji: "📷",
    lead: "センサー・FA機器で超高収益「キーエンス（6861）」。",
    aboutTitle: "📷 “測る・見る”センサーの高収益企業",
    about: "工場で使う<b>センサー・測定器・画像機器</b>の大手。自社工場を持たず企画・販売に集中する<b>超高収益（営業利益率5割級）</b>で有名な日本屈指の優良企業。",
    strengths: ["<b>営業利益率5割級</b>の超高収益", "提案型営業の強さ", "無借金・現金潤沢の財務"],
    risks: ["設備投資の景気変動", "株価が高水準（期待大）", "成長鈍化時の調整リスク"],
    outlook: ["自動化・省人化で需要", "画像・AI検査で領域拡大"] },
  { file: "harmonic.html", name: "ハーモニック", code: "6324", ticker: "6324.T", emoji: "⚙️",
    lead: "ロボット関節の精密減速機「ハーモニック・ドライブ（6324）」。",
    aboutTitle: "⚙️ ロボットの“関節”を作る専業メーカー",
    about: "ロボットの関節に使う<b>精密減速機（波動歯車）</b>の専業メーカー。人型ロボット（ヒューマノイド）が普及すると関節需要が一気に増えるため注目される。",
    strengths: ["精密減速機で<b>高シェア</b>", "ヒューマノイド普及の恩恵期待", "ニッチ市場での独占的地位"],
    risks: ["需要の振れが大きい", "期待先行で株価変動大", "受注変動が業績を大きく揺らす"],
    outlook: ["<b>ヒューマノイドロボット</b>普及で注目", "ロボット高度化で関節需要増"] },
  // ===== メモリ（海外）=====
  { file: "sandisk.html", name: "SanDisk", code: "SNDK／米", ticker: "SNDK", emoji: "💾",
    lead: "SSD・SDカードのSanDisk（サンディスク・米）。キオクシアと一体運営。",
    aboutTitle: "💾 キオクシアの相棒（NAND連合）",
    about: "SDカード・SSDで有名な米メモリ会社。2025年にWestern Digitalから独立。<b>キオクシアと25年以上の相棒</b>で、四日市・北上工場を<b>共同運営</b>。「キオクシア＝SanDisk連合」で一体に近い。",
    strengths: ["NANDで世界上位（キオクシア連合）", "AIサーバー向けSSD需要", "SDカードのブランド力"],
    risks: ["<b>シリコンサイクル</b>（メモリの波）", "DRAM/HBMはやらないNAND一本足", "独立直後で経営の安定性は未知数"],
    outlook: ["AI推論時代でSSD（NAND）再評価", "キオクシアと次世代フラッシュを共同開発"] },
  { file: "sk-hynix.html", name: "SKハイニックス", code: "000660／韓国", ticker: "000660.KS", emoji: "💾",
    lead: "AI向け高速メモリHBMで首位「SKハイニックス（韓国）」。",
    aboutTitle: "💾 AI用メモリ“HBM”の王者",
    about: "韓国の巨大メモリ会社。AI向けの超高速メモリ<b>HBM</b>が大得意で<b>NVIDIAに供給</b>、AIブームの最大の勝ち組の一つ。2025年度は過去最高、営業利益率約49%。",
    strengths: ["<b>HBMで世界首位</b>、NVIDIAに供給", "AI需要を直接取り込む", "最先端HBMの技術力"],
    risks: ["シリコンサイクル（メモリの波）", "HBM競争（サムスン・Micron）", "メモリ単一事業への集中"],
    outlook: ["AIで<b>HBM需要が拡大</b>", "次世代HBMの開発競争が勝負どころ"] },
  { file: "samsung.html", name: "サムスン電子", code: "005930／韓国", ticker: "005930.KS", emoji: "📱",
    lead: "メモリ世界1位の総合電機「サムスン電子（韓国）」。",
    aboutTitle: "📱 メモリ世界1位＋スマホの巨人",
    about: "韓国最大の総合電機。<b>メモリ（DRAM/NAND）世界1位</b>、スマホ（Galaxy）、ディスプレイなど幅広い。AI向けHBMでは出遅れたが巻き返しを図る。",
    strengths: ["メモリ世界1位＋<b>事業の幅広さ</b>", "巨大な生産・投資力", "メモリ〜スマホの垂直統合"],
    risks: ["HBMでSKハイニックスに先行された", "シリコンサイクル・スマホ市況", "ファウンドリ等で苦戦の面も"],
    outlook: ["HBMで<b>巻き返し</b>を狙う", "メモリ好況の恩恵を総合的に受ける"] },
  // ===== 通信・金融 =====
  { file: "mufg.html", name: "三菱UFJ", code: "8306", ticker: "8306.T", emoji: "🏦",
    lead: "日本最大の銀行グループ「三菱UFJ（8306）」。",
    aboutTitle: "🏦 日本一の銀行グループ（メガバンク）",
    about: "三菱UFJフィナンシャル・グループ。<b>日本で一番大きい銀行グループ</b>。お金を貸して利息を得るのが本業なので、<b>金利が上がると儲けが増えやすい</b>。配当もしっかりした安定銘柄。",
    strengths: ["国内最大の<b>規模と信用力</b>", "金利上昇で収益改善＋厚めの配当", "米モルガン等の海外展開"],
    risks: ["景気後退・貸し倒れ", "金利・為替の変動", "金融規制・自己資本規制"],
    outlook: ["金利のある世界で<b>収益改善</b>", "配当・自社株買いの株主還元。<b>親御さんの保有銘柄</b>"] },
  { file: "softbank.html", name: "ソフトバンク", code: "9434", ticker: "9434.T", emoji: "📱",
    lead: "携帯・通信会社「ソフトバンク（9434）」。投資会社のSBグループ(9984)とは別。",
    aboutTitle: "📱 携帯・通信の会社（PayPay等）",
    about: "携帯電話・通信の会社。<b>PayPay</b>やYahoo!（LINEヤフー）なども傘下。<b>投資会社のソフトバンクグループ(9984)とは別会社</b>。通信は安定収益＋高めの配当が魅力。",
    strengths: ["通信の<b>安定収益</b>＋高めの配当", "PayPay・法人AIなど成長分野も", "PayPayなど決済の基盤"],
    risks: ["通信料金の競争・規制", "成長は緩やか", "親会社(SBG)の方針の影響"],
    outlook: ["<b>法人向けAI</b>事業を強化中", "安定配当狙いに向く"] },
  // ===== 自分の保有（個人）=====
  { file: "asahi.html", name: "アサヒGHD", code: "2502", ticker: "2502.T", emoji: "🍺",
    lead: "ビール・飲料大手「アサヒグループHD（2502）」。",
    aboutTitle: "🍺 ビール・飲料の大手",
    about: "スーパードライで有名なビール・飲料の大手。海外（欧州・豪州）にも展開。景気に左右されにくい<b>ディフェンシブ</b>な生活関連株。",
    strengths: ["強いブランド（スーパードライ）", "海外展開＋値上げ浸透", "値上げを通せる価格決定力"],
    risks: ["原材料・為替の影響", "国内の人口減・酒類需要の伸び悩み", "海外買収による負債"],
    outlook: ["海外事業の成長", "値上げ浸透で利益改善"] },
  { file: "sojitz.html", name: "双日", code: "2768", ticker: "2768.T", emoji: "🌐",
    lead: "総合商社（中堅）「双日（2768）」。",
    aboutTitle: "🌐 幅広く手がける総合商社",
    about: "資源・自動車・航空・化学など幅広く手がける総合商社（中堅）。近年は<b>株主還元（配当・自社株買い）を強化</b>。",
    strengths: ["事業の<b>分散</b>で安定", "株主還元の強化", "高めの配当利回り"],
    risks: ["資源価格・景気の変動", "大手商社より規模は小さい", "財務体力は大手に劣る"],
    outlook: ["非資源分野の強化", "高めの配当が魅力"] },
  { file: "jt.html", name: "日本たばこ産業(JT)", code: "2914", ticker: "2914.T", emoji: "🚬",
    lead: "たばこ世界大手・高配当「JT（2914）」。",
    aboutTitle: "🚬 高配当の代表格",
    about: "<b>たばこ</b>の世界大手（海外たばこが収益源）＋医薬・加工食品。<b>高配当の代表格</b>として知られ、配当狙いの個人に人気。",
    strengths: ["<b>高い配当利回り</b>", "海外たばこの安定収益", "世界的な販売網"],
    risks: ["たばこ規制・健康志向", "為替の影響", "数量減を値上げで補う構造の限界"],
    outlook: ["海外たばこ・加熱式で収益維持", "安定配当を継続する方針"] },
  { file: "nxera.html", name: "ネクセラファーマ", code: "4565", ticker: "4565.T", emoji: "💊",
    lead: "創薬バイオ「ネクセラファーマ（4565）」。",
    aboutTitle: "💊 新薬を生み出す創薬バイオ",
    about: "独自技術で新薬の候補を生み出す<b>創薬バイオ</b>企業。提携や新薬の進展で<b>値動きが大きい</b>のが特徴（攻めの銘柄）。",
    strengths: ["独自の創薬技術", "大手製薬との提携収入", "提携先に大手がそろう"],
    risks: ["<b>新薬開発は不確実</b>（失敗リスク）", "値動きが大きく業績も振れやすい", "黒字が安定しない"],
    outlook: ["パイプライン（新薬候補）の進展次第", "提携の拡大で収益機会"] },
  { file: "rakuten.html", name: "楽天グループ", code: "4755", ticker: "4755.T", emoji: "🛒",
    lead: "EC・モバイル・金融の「楽天グループ（4755）」。",
    aboutTitle: "🛒 ネット通販＋携帯＋金融",
    about: "ネット通販（楽天市場）・<b>金融（楽天カード/銀行/証券）</b>・携帯（楽天モバイル）を手がける。<b>モバイル事業の赤字改善が最大の課題</b>。",
    strengths: ["巨大な<b>楽天経済圏</b>", "金融事業は好調", "1億超のユーザー基盤"],
    risks: ["<b>モバイルの赤字・借入</b>", "競争が激しい", "巨額の有利子負債"],
    outlook: ["モバイル黒字化が<b>カギ</b>", "金融・ECは堅調"] },
  { file: "honda.html", name: "本田技研工業", code: "7267", ticker: "7267.T", emoji: "🏍️",
    lead: "自動車・バイク大手「ホンダ（7267）」。",
    aboutTitle: "🏍️ クルマとバイクの世界大手",
    about: "自動車・<b>バイク（世界トップ）</b>の大手。北米市場が稼ぎ頭。EV/HV（電動化）への対応が課題だが、配当・自社株買いに積極的。",
    strengths: ["バイク世界トップ＋北米の強さ", "株主還元に積極的", "エンジン等の技術ブランド"],
    risks: ["EV化への対応・競争", "為替・関税の影響", "中国市場での苦戦"],
    outlook: ["HV（ハイブリッド）の堅調", "電動化と稼ぐ力の両立がテーマ"] },
  { file: "mitsubishi-corp.html", name: "三菱商事", code: "8058", ticker: "8058.T", emoji: "🌐",
    lead: "総合商社最大手・高配当「三菱商事（8058）」。",
    aboutTitle: "🌐 日本最大の総合商社",
    about: "資源から食品・機械まで幅広く手がける<b>総合商社の最大手</b>。資源＋非資源でバランスが良く、<b>高配当</b>でバフェット（米著名投資家）も保有することで有名。",
    strengths: ["<b>事業の幅広さ</b>で安定", "高配当・株主還元", "強固な財務基盤"],
    risks: ["資源価格・景気の変動", "為替の影響", "資源価格に収益が左右される"],
    outlook: ["非資源・脱炭素分野の強化", "安定した株主還元を継続"] },
  { file: "aeon.html", name: "イオン", code: "8267", ticker: "8267.T", emoji: "🛒",
    lead: "国内最大の小売「イオン（8267）」。",
    aboutTitle: "🛒 日本最大の小売グループ",
    about: "スーパー・モール・金融・ドラッグなど<b>国内最大の小売</b>グループ。生活に密着した<b>ディフェンシブ</b>株だが、小売は利益率が薄め。",
    strengths: ["巨大な<b>生活インフラ</b>網", "金融・モールなど多角化", "PB（トップバリュ）・金融の収益源"],
    risks: ["<b>利益率が薄い</b>（薄利多売）", "物価・人件費の上昇", "ネット通販との競争"],
    outlook: ["PB（自社ブランド）・金融で収益改善", "ディフェンシブな安定感"] },
  { file: "orix.html", name: "オリックス", code: "8591", ticker: "8591.T", emoji: "💴",
    lead: "リース・金融・多角化の「オリックス（8591）」。",
    aboutTitle: "💴 何でも手がける多角金融",
    about: "リース発祥で、今は<b>金融・不動産・再エネ・事業投資</b>など幅広く手がける多角企業。<b>配当・株主優待</b>が人気で安定志向に向く。",
    strengths: ["<b>多角経営で安定</b>", "配当・優待の人気", "分散された安定収益源"],
    risks: ["景気・金利の変動", "事業が幅広く分かりにくい", "不動産・リースの景気感応度"],
    outlook: ["再エネ・事業投資の成長", "安定した株主還元"] },
  { file: "sony-fg.html", name: "ソニーフィナンシャルG", code: "8729", ticker: "8729.T", emoji: "🛡️",
    lead: "ソニー系の保険・銀行「ソニーフィナンシャルG（8729）」。",
    aboutTitle: "🛡️ ソニー系の金融グループ",
    about: "<b>生命保険</b>を主力に、銀行・損保を手がけるソニー系の金融グループ。2025年にソニーから再上場系。<b>安定志向</b>の金融株。",
    strengths: ["生保中心で<b>安定</b>", "ソニーブランド", "ソニーグループの信用・顧客基盤"],
    risks: ["金利・運用環境の変動", "保険市場の競争", "運用環境（株・金利）に左右される"],
    outlook: ["金利のある世界で運用改善", "安定した保険収益"] },
  { file: "ntt.html", name: "NTT", code: "9432", ticker: "9432.T", emoji: "📡",
    lead: "通信最大手・超安定・高配当「NTT（9432）」。",
    aboutTitle: "📡 日本の通信インフラの要",
    about: "日本の通信最大手（ドコモ等）。<b>超安定・高配当</b>で、株式分割により<b>1株から買いやすく</b>初心者にも人気。生活インフラそのもの。",
    strengths: ["<b>超安定</b>の通信インフラ", "高配当＋買いやすさ", "巨大な顧客基盤と研究開発力"],
    risks: ["通信料金の競争・規制", "成長は緩やか", "巨額の設備投資負担"],
    outlook: ["データセンター・IOWN（次世代通信）", "安定配当の継続"] },
  { file: "kddi.html", name: "KDDI", code: "9433", ticker: "9433.T", emoji: "📶",
    lead: "通信大手(au)・高配当「KDDI（9433）」。",
    aboutTitle: "📶 auの通信大手",
    about: "au・UQなどの通信大手。<b>高配当・安定</b>に加え、金融（au PAY）・DX・電力など<b>非通信分野</b>にも展開。",
    strengths: ["通信の<b>安定収益</b>＋高配当", "金融・DXなど多角化", "ライフデザイン事業の成長"],
    risks: ["通信料金の競争・規制", "成長は緩やか", "通信は飽和市場"],
    outlook: ["非通信（金融・DX）の拡大", "連続増配の方針"] },
  { file: "mirait.html", name: "ミライト・ワン", code: "1417", ticker: "1417.T", emoji: "🏗️",
    lead: "通信建設・インフラ工事「ミライト・ワン（1417）」。",
    aboutTitle: "🏗️ 通信インフラを“工事する”会社",
    about: "通信回線・基地局などの<b>建設・工事</b>を手がける会社。<b>5G・データセンター・再エネ</b>の工事需要が追い風で、AIインフラ拡大の恩恵も受けやすい。",
    strengths: ["通信インフラ工事の<b>実績</b>", "5G・DC・再エネで需要", "通信各社との安定取引"],
    risks: ["工事案件の変動", "人手不足・コスト上昇", "労務費・資材高が利益を圧迫"],
    outlook: ["<b>データセンター・AIインフラ</b>工事の拡大", "再エネ・環境分野の成長"] },
  // ===== 非上場AI =====
  { file: "openai.html", name: "OpenAI", code: "非上場／米", ticker: "", emoji: "🤖",
    valuation: "<b>評価額 約8,520億ドル（約128兆円）</b>。非上場のため<b>株は直接買えません</b>。ソフトバンクGやMicrosoftが大株主なので、そこ経由で間接的に関わる形になります。",
    aboutTitle: "🤖 ChatGPTを作ったAIの本命",
    about: "<b>ChatGPT</b>を作った会社（米）。生成AIブームの火付け役で、AIモデルの最前線を走る。巨大なデータセンター投資を進めている。",
    strengths: ["生成AIの<b>知名度・先行</b>", "Microsoft・ソフトバンクG等の強力な後ろ盾", "世界最大級の利用者（ChatGPT）"],
    risks: ["<b>非上場で直接投資できない</b>", "巨額の投資・競争（Anthropic等）", "規制・著作権・赤字の懸念"],
    outlook: ["巨大データセンター（NVIDIAと10GW提携）", "<b>上場すれば大注目</b>"] },
  { file: "anthropic.html", name: "Anthropic", code: "非上場／米", ticker: "", emoji: "🛡️",
    valuation: "<b>評価額 約9,650億ドル（約145兆円）</b>。非上場のため<b>株は直接買えません</b>が、<b>IPO（上場）を申請中</b>。上場すれば買えるようになるかもしれません。Amazon・Googleが出資。",
    aboutTitle: "🛡️ AI「Claude」を作る安全性重視の会社",
    about: "AI「<b>Claude</b>」を作る会社（米）。<b>このメモ作りを手伝っているAI</b>でもある。安全性を重視する方針で評価が急上昇し、2026年にOpenAIを抜いてAIスタートアップ最高額に。",
    strengths: ["<b>急成長</b>（評価額でOpenAI超え）", "Amazon・Googleの出資", "安全性重視で企業に支持される"],
    risks: ["<b>非上場で直接投資できない</b>", "AI開発の巨額コスト・競争", "規制・著作権・赤字の懸念"],
    outlook: ["<b>IPO（上場）を申請中</b>", "企業向けAI（Claude）の拡大"] },
];

let n = 0;
for (const d of DATA) {
  fs.writeFileSync(d.file, page(d));
  n++;
}
console.log("generated", n, "pages");
