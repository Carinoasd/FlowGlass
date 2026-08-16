// 流璃 FlowGlass — 開場同步腳本
// 在 <body> 開頭同步執行,先把玻璃/動畫的 class 與 CSS 變數就定位,
// 避免 app.js(module,defer)接手前先閃一次預設樣式。
// 這裡只做「畫面外觀」,不碰任何邏輯;app.js 之後會再套一次(冪等)。
(function () {
  var g = { blur: 18, opacity: 14, refract: 60, edge: true, parallax: true, entrance: true };
  var dim = 18;
  var accent = null;
  try {
    var s = JSON.parse(localStorage.getItem('fg.settings.v1'));
    if (s && s.glass) for (var k in g) if (k in s.glass) g[k] = s.glass[k];
    if (s && s.wallpaper && typeof s.wallpaper.dim === 'number') dim = s.wallpaper.dim;
    if (s && s.theme && s.theme.auto === false && s.theme.accent) accent = s.theme.accent;
  } catch (e) { /* 壞掉的設定就用預設值 */ }

  var b = document.body;
  if (g.edge) b.classList.add('edge');
  if (g.entrance) b.classList.add('entrance');
  if (!g.parallax) b.classList.add('no-parallax');
  if (g.refract > 0) b.classList.add('refract');

  var root = document.documentElement.style;
  root.setProperty('--blur', g.blur + 'px');
  root.setProperty('--glass-a', (g.opacity / 100).toFixed(3));
  root.setProperty('--wp-dim', (dim / 100).toFixed(2));
  if (accent) {
    root.setProperty('--accent', accent);
    var m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(accent);
    if (m) {
      root.setProperty('--accent-soft', 'rgba(' + parseInt(m[1], 16) + ',' +
        parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',.35)');
    }
  }
})();
