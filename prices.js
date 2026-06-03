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

  fetch('prices.json?t=' + Date.now())
    .then(function(r){ return r.json(); })
    .then(function(d){
      var s = d.stocks || {};
      document.querySelectorAll('td.px[data-ticker]').forEach(function(td){
        var info = s[td.getAttribute('data-ticker')];
        if(!info || !info.price){ return; }
        td.innerHTML = '<b>' + fmtPrice(info.price, info.currency) + '</b>'
                     + '<br><small>(' + (d.updated || '') + ')</small>';
      });
      document.querySelectorAll('td.mcap[data-ticker]').forEach(function(td){
        var info = s[td.getAttribute('data-ticker')];
        if(!info){ return; }
        var c = fmtCap(info.marketCap, info.currency);
        if(c){ td.innerHTML = c; }
      });
      var u = document.getElementById('auto-upd');
      if(u && d.updated){ u.textContent = '株価 自動更新：' + d.updated; }
    })
    .catch(function(){ /* 失敗時は静的な値のまま */ });
})();
