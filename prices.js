// prices.json を読み込み、株価(.px)と時価総額(.mcap)を表に反映。
// 取得失敗時は HTML に書いてある静的な値（フォールバック）をそのまま表示。
(function(){
  function fmtPrice(p, cur){
    if(cur === 'JPY'){
      return '約' + Math.round(p).toLocaleString('ja-JP') + '円';
    }
    return '約$' + Number(p).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
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
      document.querySelectorAll('td.tgt[data-ticker]').forEach(function(td){
        var info = s[td.getAttribute('data-ticker')];
        if(!info){ return; }
        var t = info.target ? fmtPrice(info.target, info.currency) : '—';
        var r = info.rating ? '<br><small>' + esc(info.rating) + '</small>' : '';
        td.innerHTML = t + r;
      });
      var u = document.getElementById('auto-upd');
      if(u && d.updated){ u.textContent = '株価 自動更新：' + d.updated; }
    })
    .catch(function(){ /* 失敗時は静的な値のまま */ });

  // ===== 関連ニュース =====
  var newsEl = document.getElementById('news-list');
  if(newsEl){
    fetch('news.json?t=' + Date.now())
      .then(function(r){ return r.json(); })
      .then(function(d){
        var items = d.items || [];
        var nu = document.getElementById('news-updated');
        if(nu && d.updated){ nu.textContent = '（' + d.updated + ' 時点）'; }
        if(!items.length){
          newsEl.innerHTML = '<div class="kv">今朝は新しいニュースは見つかりませんでした。</div>';
          return;
        }
        newsEl.innerHTML = items.map(function(n){
          var date = n.time ? n.time.slice(0,10) : '';
          return '<div style="padding:9px 0;border-bottom:1px solid var(--line)">'
            + '<span class="pill">' + esc(n.company) + '</span> '
            + '<a href="' + esc(n.link) + '" target="_blank" rel="noopener">' + esc(n.title) + '</a>'
            + '<div class="src">' + esc(n.publisher) + (date ? ' ・ ' + esc(date) : '') + '</div>'
            + '</div>';
        }).join('');
      })
      .catch(function(){
        newsEl.innerHTML = '<div class="kv">ニュースの読み込みに失敗しました。</div>';
      });
  }
})();
