// prices.json を読み込み、株価(.px)と時価総額(.mcap)を表に反映。
// 取得失敗時は HTML に書いてある静的な値（フォールバック）をそのまま表示。
(function(){
  function fmtPrice(p, cur){
    if(cur === 'JPY'){ return '約' + Math.round(p).toLocaleString('ja-JP') + '円'; }
    if(cur === 'KRW'){ return '約' + Math.round(p).toLocaleString('ko-KR') + 'ウォン'; }
    if(cur === 'USD'){ return '約$' + Number(p).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}); }
    return '約' + Math.round(p).toLocaleString() + ' ' + (cur || '');
  }
  function fmtCap(v, cur){
    if(!v) return null;
    if(cur === 'JPY'){
      if(v >= 1e12) return '約' + (v/1e12).toFixed(1) + '兆円';
      return '約' + Math.round(v/1e8).toLocaleString('ja-JP') + '億円';
    }
    if(v >= 1e12) return '約' + (v/1e12).toFixed(2) + '兆ドル';
    return '約' + Math.round(v/1e8).toLocaleString('en-US') + '億ドル';
  }
  // 前日比（日本式：上昇=赤▲ / 下落=青▼）
  function chgHtml(info){
    if(info.changePct === undefined || info.changePct === null){ return ''; }
    var pct = info.changePct, up = pct >= 0;
    var color = up ? '#c0392f' : '#2156a8';
    var arrow = up ? '▲' : '▼';
    return '<br><small style="color:' + color + ';font-weight:bold">'
         + arrow + Math.abs(pct).toFixed(1) + '%</small>';
  }
  function esc(s){
    return String(s||'').replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function curSuffix(c){ return {JPY:'円',USD:'ドル',KRW:'ウォン',TWD:'台湾ドル',EUR:'ユーロ',GBP:'ポンド'}[c] || (c||''); }
  function fmtBig(v, c){
    if(v == null){ return '—'; }
    var neg = v < 0, a = Math.abs(v), suf = curSuffix(c), str;
    if(a >= 1e12){ str = (a/1e12).toFixed(2) + '兆' + suf; }
    else if(a >= 1e8){ str = Math.round(a/1e8).toLocaleString() + '億' + suf; }
    else { str = Math.round(a).toLocaleString() + suf; }
    return (neg ? '▲' : '') + str;
  }

  // 会社名のセルに Yahoo!ファイナンスのリンクを自動付与（株価データに依存せず実行）
  document.querySelectorAll('td.px[data-ticker]').forEach(function(td){
    var ticker = td.getAttribute('data-ticker');
    var row = td.closest('tr');
    if(!row){ return; }
    var nameCell = row.querySelector('td');
    if(!nameCell || nameCell.querySelector('a.yf')){ return; }
    var url = 'https://finance.yahoo.co.jp/quote/' + encodeURIComponent(ticker);
    nameCell.insertAdjacentHTML('beforeend',
      '<br><a class="yf" href="' + url + '" target="_blank" rel="noopener" style="font-size:11px">📊株価詳細</a>');
  });

  fetch('prices.json?t=' + Date.now())
    .then(function(r){ return r.json(); })
    .then(function(d){
      var s = d.stocks || {};
      document.querySelectorAll('td.px[data-ticker]').forEach(function(td){
        var info = s[td.getAttribute('data-ticker')];
        if(!info || !info.price){ return; }
        td.innerHTML = '<b>' + fmtPrice(info.price, info.currency) + '</b>'
                     + chgHtml(info);
      });
      document.querySelectorAll('td.mcap[data-ticker]').forEach(function(td){
        var info = s[td.getAttribute('data-ticker')];
        if(!info){ return; }
        var c = fmtCap(info.marketCap, info.currency);
        if(c){ td.innerHTML = c; }
      });
      document.querySelectorAll('td.dy[data-ticker]').forEach(function(td){
        var info = s[td.getAttribute('data-ticker')];
        if(!info){ return; }
        td.innerHTML = (info.dividendYield != null) ? info.dividendYield.toFixed(2) + '%' : '—';
      });
      // 平均配当利回り（#avg-yield に data-tickers で指定された銘柄の平均）
      var ay = document.getElementById('avg-yield');
      if(ay){
        var list = (ay.getAttribute('data-tickers') || '').split(',')
          .map(function(x){ return x.trim(); }).filter(Boolean);
        var sum = 0, cnt = 0;
        list.forEach(function(tk){
          var i = s[tk];
          if(i && i.dividendYield != null){ sum += i.dividendYield; cnt++; }
        });
        if(cnt){ ay.textContent = (sum / cnt).toFixed(1) + '%'; }
      }
      document.querySelectorAll('td.pm[data-ticker]').forEach(function(td){
        var info = s[td.getAttribute('data-ticker')];
        if(!info){ return; }
        td.innerHTML = (info.profitMargin != null) ? info.profitMargin.toFixed(1) + '%' : '—';
      });
      // 決算の数字（売上高・純利益・PER・EPS）
      document.querySelectorAll('td.rev[data-ticker]').forEach(function(td){
        var i = s[td.getAttribute('data-ticker')]; if(!i){ return; }
        td.innerHTML = fmtBig(i.revenue, i.finCurrency || i.currency);
      });
      document.querySelectorAll('td.ni[data-ticker]').forEach(function(td){
        var i = s[td.getAttribute('data-ticker')]; if(!i){ return; }
        td.innerHTML = fmtBig(i.netIncome, i.finCurrency || i.currency);
      });
      document.querySelectorAll('td.per[data-ticker]').forEach(function(td){
        var i = s[td.getAttribute('data-ticker')]; if(!i){ return; }
        td.innerHTML = (i.per != null) ? i.per.toFixed(1) + '倍' : '—';
      });
      document.querySelectorAll('td.eps[data-ticker]').forEach(function(td){
        var i = s[td.getAttribute('data-ticker')]; if(!i){ return; }
        td.innerHTML = (i.eps != null) ? (Math.round(i.eps*100)/100).toLocaleString() + curSuffix(i.finCurrency || i.currency) : '—';
      });
      // 3年間の業績推移
      document.querySelectorAll('div.hist3[data-ticker]').forEach(function(div){
        var i = s[div.getAttribute('data-ticker')];
        if(!i || !i.history || !i.history.length){ div.innerHTML = '<div class="kv">3年分のデータは取得できませんでした。</div>'; return; }
        var cur = i.finCurrency || i.currency;
        var rows = i.history.map(function(h){
          return '<tr><td>' + esc(h.year) + '年</td><td>' + fmtBig(h.revenue, cur) + '</td><td>' + fmtBig(h.netIncome, cur) + '</td></tr>';
        }).join('');
        div.innerHTML = '<table><tr><th>年度</th><th>売上高</th><th>純利益</th></tr>' + rows + '</table>';
      });
      document.querySelectorAll('td.tgt[data-ticker]').forEach(function(td){
        var info = s[td.getAttribute('data-ticker')];
        if(!info){ return; }
        var t = info.target ? fmtPrice(info.target, info.currency) : '—';
        var r = info.rating ? '<br><small>' + esc(info.rating) + '</small>' : '';
        td.innerHTML = t + r;
      });
      // 保有評価額（株数×株価）＋合計
      var total = 0, haveTotal = false;
      document.querySelectorAll('td.val[data-ticker][data-shares]').forEach(function(td){
        var info = s[td.getAttribute('data-ticker')];
        var sh = parseFloat(td.getAttribute('data-shares')) || 0;
        if(!info || !info.price || !sh){ return; }
        var v = info.price * sh;
        if(info.currency === 'JPY'){ total += v; haveTotal = true; }
        td.innerHTML = (info.currency === 'JPY' ? '¥' : '$')
          + Math.round(v).toLocaleString(info.currency === 'JPY' ? 'ja-JP' : 'en-US');
      });
      var tot = document.getElementById('holdings-total');
      if(tot && haveTotal){
        tot.textContent = '¥' + Math.round(total).toLocaleString('ja-JP')
          + '（約' + Math.round(total/10000).toLocaleString('ja-JP') + '万円）';
      }

      var u = document.getElementById('auto-upd');
      if(u && d.updated){ u.textContent = '株価 自動更新：' + d.updated; }
    })
    .catch(function(){ /* 失敗時は静的な値のまま */ });

  // ===== 関連ニュース =====
  function newsLink(n){
    var date = n.time ? n.time.slice(0,10) : '';
    // リンク先は「日本のYahoo!ファイナンス（その銘柄のニュース）」。海外記事の翻訳版には飛ばさない。
    var jurl = n.ticker
      ? 'https://finance.yahoo.co.jp/quote/' + encodeURIComponent(n.ticker) + '/news'
      : 'https://finance.yahoo.co.jp/';
    var title = n.titleJa || n.title;
    return '<a href="' + esc(jurl) + '" target="_blank" rel="noopener">' + esc(title) + '</a>'
      + '<div class="src">' + esc(n.publisher) + (date ? ' ・ ' + esc(date) : '') + ' ／ 日本語の詳細はYahoo!ファイナンスで</div>';
  }
  // 1つのニュース枠を描画する（複数枠に対応するため関数化）
  function renderNews(el, items){
    var scope = (el.getAttribute('data-tickers') || '').split(',')
      .map(function(x){ return x.trim(); }).filter(Boolean);
    var limit = parseInt(el.getAttribute('data-limit') || '10', 10);
    var grouped = el.getAttribute('data-group') === 'company';
    var per = parseInt(el.getAttribute('data-per') || '2', 10);
    var relOnly = el.getAttribute('data-relevant') === '1';
    var list = items.slice();
    if(scope.length){
      list = list.filter(function(n){ return scope.indexOf(n.ticker) >= 0; });
    }
    if(relOnly){
      list = list.filter(function(n){ return n.relevant; });
    }
    var seen = {}, uniq = [];
    list.forEach(function(n){ if(!seen[n.link]){ seen[n.link] = 1; uniq.push(n); } });
    if(!uniq.length){
      el.innerHTML = '<div class="kv">最近の関連ニュースは見つかりませんでした。</div>';
      return;
    }
    if(grouped){
      // 会社ごとにまとめる（各社 per 件まで）
      var order = [], groups = {};
      uniq.forEach(function(n){
        if(!groups[n.company]){ groups[n.company] = []; order.push(n.company); }
        if(groups[n.company].length < per){ groups[n.company].push(n); }
      });
      el.innerHTML = order.map(function(co){
        return '<div class="newsgroup"><div class="co">' + esc(co) + '</div>'
          + groups[co].map(function(n){
              return '<div style="padding:5px 0;border-bottom:1px solid var(--line)">' + newsLink(n) + '</div>';
            }).join('')
          + '</div>';
      }).join('');
    } else {
      el.innerHTML = uniq.slice(0, limit).map(function(n){
        return '<div style="padding:9px 0;border-bottom:1px solid var(--line)">'
          + '<span class="pill">' + esc(n.company) + '</span> ' + newsLink(n) + '</div>';
      }).join('');
    }
  }

  // #news-list（既存）＋ テーマ別の .news-auto 枠 をまとめて描画
  var newsEls = [];
  document.querySelectorAll('#news-list, .news-auto').forEach(function(el){
    if(newsEls.indexOf(el) < 0){ newsEls.push(el); }
  });
  if(newsEls.length){
    fetch('news.json?t=' + Date.now())
      .then(function(r){ return r.json(); })
      .then(function(d){
        var items = d.items || [];
        var nu = document.getElementById('news-updated');
        if(nu && d.updated){ nu.textContent = '（' + d.updated + ' 時点）'; }
        newsEls.forEach(function(el){ renderNews(el, items); });
      })
      .catch(function(){
        newsEls.forEach(function(el){
          el.innerHTML = '<div class="kv">ニュースの読み込みに失敗しました。</div>';
        });
      });
  }

  // ===== 今日の経済情報 =====
  var econEl = document.getElementById('economy-box');
  if(econEl){
    fetch('economy.json?t=' + Date.now())
      .then(function(r){ return r.json(); })
      .then(function(d){
        var u = document.getElementById('economy-updated');
        if(u && d.updated){ u.textContent = '（' + d.updated + ' 時点）'; }
        if(d.summary){
          econEl.innerHTML = '<div class="kv">' + esc(d.summary).replace(/\n/g, '<br>') + '</div>';
        } else if(d.headlines && d.headlines.length){
          econEl.innerHTML = '<div class="kv" style="margin-bottom:6px;color:var(--sub)">昨日の主な見出し：</div>'
            + d.headlines.map(function(n){
                var jurl = 'https://translate.google.com/translate?sl=auto&tl=ja&u=' + encodeURIComponent(n.link);
                return '<div style="padding:6px 0;border-bottom:1px solid var(--line)"><a href="' + esc(jurl) + '" target="_blank" rel="noopener">' + esc(n.titleJa || n.title) + '</a><div class="src">' + esc(n.publisher) + '</div></div>';
              }).join('');
        } else {
          econEl.innerHTML = '<div class="kv">経済ニュースが取得できませんでした。</div>';
        }
      })
      .catch(function(){ econEl.innerHTML = '<div class="kv">読み込みに失敗しました。</div>'; });
  }
})();
