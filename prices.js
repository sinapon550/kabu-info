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
    var jurl = 'https://translate.google.com/translate?sl=auto&tl=ja&u=' + encodeURIComponent(n.link);
    var title = n.titleJa || n.title;
    return '<a href="' + esc(jurl) + '" target="_blank" rel="noopener">' + esc(title) + '</a>'
      + '<div class="src">' + esc(n.publisher) + (date ? ' ・ ' + esc(date) : '') + '</div>';
  }
  var newsEl = document.getElementById('news-list');
  if(newsEl){
    var scope = (newsEl.getAttribute('data-tickers') || '').split(',')
      .map(function(x){ return x.trim(); }).filter(Boolean);
    var limit = parseInt(newsEl.getAttribute('data-limit') || '10', 10);
    var grouped = newsEl.getAttribute('data-group') === 'company';
    var per = parseInt(newsEl.getAttribute('data-per') || '2', 10);
    var relOnly = newsEl.getAttribute('data-relevant') === '1';
    fetch('news.json?t=' + Date.now())
      .then(function(r){ return r.json(); })
      .then(function(d){
        var items = d.items || [];
        var nu = document.getElementById('news-updated');
        if(nu && d.updated){ nu.textContent = '（' + d.updated + ' 時点）'; }
        if(scope.length){
          items = items.filter(function(n){ return scope.indexOf(n.ticker) >= 0; });
        }
        if(relOnly){
          items = items.filter(function(n){ return n.relevant; });
        }
        var seen = {}, uniq = [];
        items.forEach(function(n){ if(!seen[n.link]){ seen[n.link] = 1; uniq.push(n); } });
        if(!uniq.length){
          newsEl.innerHTML = '<div class="kv">最近の関連ニュースは見つかりませんでした。</div>';
          return;
        }
        if(grouped){
          // 会社ごとにまとめる（各社 per 件まで）
          var order = [], groups = {};
          uniq.forEach(function(n){
            if(!groups[n.company]){ groups[n.company] = []; order.push(n.company); }
            if(groups[n.company].length < per){ groups[n.company].push(n); }
          });
          newsEl.innerHTML = order.map(function(co){
            return '<div class="newsgroup"><div class="co">' + esc(co) + '</div>'
              + groups[co].map(function(n){
                  return '<div style="padding:5px 0;border-bottom:1px solid var(--line)">' + newsLink(n) + '</div>';
                }).join('')
              + '</div>';
          }).join('');
        } else {
          newsEl.innerHTML = uniq.slice(0, limit).map(function(n){
            return '<div style="padding:9px 0;border-bottom:1px solid var(--line)">'
              + '<span class="pill">' + esc(n.company) + '</span> ' + newsLink(n) + '</div>';
          }).join('');
        }
      })
      .catch(function(){
        newsEl.innerHTML = '<div class="kv">ニュースの読み込みに失敗しました。</div>';
      });
  }
})();
