// Página del panel. Se escribe en C:\CLAUDE\consumo\index.html al iniciar la sesión.
// Lee datos.js cada segundo (recargado con un script nuevo) y redibuja.
// Sin acentos graves, sin dólar-llave y sin barras invertidas dentro: es un template literal.
// Todo en línea, sin CDN: tiene que funcionar offline desde file://.
//
// Tamaños de ventana:
//   >= 1600 px  rejilla completa (contexto, coste, reparto, gráfica, últimos turnos, agentes).
//   900-1599    dos columnas, sin la gráfica de tokens por turno.
//   < 900       una columna: contexto, coste, reparto por modelo, agentes, últimos turnos.
//   Mínimo 420 px de ancho sin desplazamiento horizontal.
// Tecla D o botón de la cabecera: modo cómodo / compacto (se guarda en localStorage).
export const PAGE = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Consumo · HUD</title>
<style>
:root{
  --bg:#03060a;--cy:#4fd8ff;--cy2:#1d8fb8;--cyd:rgba(79,216,255,.16);
  --am:#ffb347;--rd:#ff5f6e;--txt:#e6f6fc;--sub:#a9cbdb;--faint:#163040;
  --f-opus:#ffb347;--f-haiku:#4fd8ff;--f-fable:#7cffc4;--f-sonnet:#c4adff;--f-otro:#b4c7d4;
  --fa:rgba(79,216,255,.75);--fb:rgba(255,179,71,.6);--glow:rgba(79,216,255,.22);
  --cut:14px;
  --mono:'Cascadia Mono','Cascadia Code',Consolas,'JetBrains Mono','DejaVu Sans Mono','Liberation Mono',monospace;
  /* Texto: etiquetas >= 14 px, valores >= 16 px; crecen con la ventana. */
  --fk:clamp(14px,calc(.32vw + .38vh + 5px),18px);
  --fv:clamp(16px,calc(.42vw + .5vh + 5px),22px);
  --fbig:clamp(34px,calc(1.6vw + 2.2vh),64px);
  --gap:clamp(10px,1vw,18px);
  --pad:clamp(12px,1vw,20px);
}
body.lv-w{--fa:rgba(255,179,71,.85);--fb:rgba(255,179,71,.5);--glow:rgba(255,179,71,.28)}
body.lv-x{--fa:rgba(255,95,110,.9);--fb:rgba(255,95,110,.55);--glow:rgba(255,95,110,.35)}
body.compact{--gap:clamp(8px,.6vw,12px);--pad:clamp(10px,.7vw,14px);--fbig:clamp(30px,calc(1.3vw + 1.8vh),52px)}
*{box-sizing:border-box}
html,body{min-height:100%}
body{margin:0;background:var(--bg);color:var(--txt);font:var(--fv)/1.4 var(--mono);overflow-x:hidden;min-width:0;
  background-image:radial-gradient(ellipse at 30% 20%,rgba(29,143,184,.12),transparent 60%),
  linear-gradient(rgba(79,216,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(79,216,255,.03) 1px,transparent 1px);
  background-size:auto,40px 40px,40px 40px}
body:after{content:"";position:fixed;inset:0;pointer-events:none;z-index:9;
  background:repeating-linear-gradient(0deg,rgba(255,255,255,.015) 0 1px,transparent 1px 3px)}
body:before{content:"";position:fixed;inset:0;pointer-events:none;z-index:8;opacity:0;transition:opacity .6s;
  box-shadow:inset 0 0 120px rgba(255,95,110,.45)}
body.lv-x:before{opacity:1;animation:alarm 1.6s ease-in-out infinite}
body.lv-w:before{opacity:.5;box-shadow:inset 0 0 90px rgba(255,179,71,.3)}
.wrap{min-height:100vh;display:flex;flex-direction:column;gap:var(--gap);padding:var(--pad) clamp(16px,1.4vw,26px);max-width:2200px;margin:0 auto}
.k{color:var(--sub);font-size:var(--fk);letter-spacing:.06em;text-transform:uppercase}
.num{font-variant-numeric:tabular-nums}

/* Cabecera */
header{display:flex;align-items:center;flex-wrap:wrap;gap:10px 18px;border-bottom:1px solid var(--cyd);padding-bottom:10px;position:relative}
header:after{content:"";position:absolute;left:0;bottom:-1px;width:180px;height:1px;background:var(--cy);box-shadow:0 0 8px var(--cy)}
.logo{flex:none;width:26px;height:26px;border:1px solid var(--cy);border-radius:50%;position:relative;box-shadow:0 0 10px rgba(79,216,255,.5),inset 0 0 8px rgba(79,216,255,.4)}
.logo:after{content:"";position:absolute;inset:7px;border-radius:50%;background:var(--cy);box-shadow:0 0 10px var(--cy);animation:pulse 2.4s ease-in-out infinite}
h1{margin:0;font-size:var(--fv);font-weight:normal;letter-spacing:.2em;color:var(--cy);text-shadow:0 0 10px rgba(79,216,255,.55);text-transform:uppercase;white-space:nowrap}
h1 .brand{color:var(--sub)}
.alerts{display:flex;gap:10px;flex-wrap:wrap;min-width:0}
.al{display:none;font-size:var(--fk);letter-spacing:.08em;text-transform:uppercase;padding:4px 14px;border:1px solid currentColor;
  clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);background:rgba(0,0,0,.5)}
.al.on{display:block;animation:blink 1.2s steps(2,start) infinite}
#al-ctx.w{color:var(--am);box-shadow:inset 0 0 12px rgba(255,179,71,.35)}
#al-ctx.x{color:var(--rd);box-shadow:inset 0 0 14px rgba(255,95,110,.5)}
#al-sig{color:var(--rd);box-shadow:inset 0 0 14px rgba(255,95,110,.5)}
.hstat{margin-left:auto;display:flex;gap:clamp(12px,1.4vw,26px);align-items:center;flex-wrap:wrap}
.hstat>div{text-align:right}
.hstat .v{color:var(--txt);font-size:var(--fv);white-space:nowrap}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--cy);box-shadow:0 0 8px var(--cy);margin-right:8px;vertical-align:1px;animation:pulse 1.6s ease-in-out infinite}
.dot.wait{background:var(--am);box-shadow:0 0 8px var(--am)}
.dot.off{background:var(--rd);box-shadow:0 0 8px var(--rd);animation:blink 1s steps(2,start) infinite}
#dens{font:var(--fk) var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--cy);background:rgba(79,216,255,.08);
  border:1px solid var(--cy2);padding:6px 12px;cursor:pointer;white-space:nowrap}
#dens:hover,#dens:focus-visible{background:rgba(79,216,255,.18);outline:none;border-color:var(--cy)}
#dens kbd{font:inherit;color:var(--am);border:1px solid var(--am);padding:0 5px;margin-right:8px}

/* Paneles con esquinas recortadas y brillo */
.pnl{position:relative;filter:drop-shadow(0 0 5px var(--glow));min-width:0;min-height:0}
.pnl>.fr{position:absolute;inset:0;background:linear-gradient(135deg,var(--fa),rgba(79,216,255,.2) 40%,rgba(79,216,255,.2) 60%,var(--fb));transition:background .6s;
  clip-path:polygon(var(--cut) 0,100% 0,100% calc(100% - var(--cut)),calc(100% - var(--cut)) 100%,0 100%,0 var(--cut))}
.pnl>.in{position:relative;margin:1px;height:calc(100% - 2px);padding:var(--pad);
  background:linear-gradient(180deg,rgba(8,22,32,.97),rgba(3,9,14,.97));
  clip-path:polygon(var(--cut) 0,100% 0,100% calc(100% - var(--cut)),calc(100% - var(--cut)) 100%,0 100%,0 var(--cut));display:flex;flex-direction:column;min-height:0}
.pnl:before,.pnl:after{content:"";position:absolute;width:18px;height:18px;z-index:2;pointer-events:none}
.pnl:before{right:-3px;top:-3px;border-top:2px solid var(--am);border-right:2px solid var(--am)}
.pnl:after{left:-3px;bottom:-3px;border-bottom:2px solid var(--am);border-left:2px solid var(--am)}
body.lv-x .pnl:before,body.lv-x .pnl:after{border-color:var(--rd)}
.ph{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin-bottom:10px;padding-bottom:7px;border-bottom:1px dashed var(--faint);flex:none;min-width:0}
.ph .t{font-size:var(--fk);letter-spacing:.12em;text-transform:uppercase;color:var(--cy);text-shadow:0 0 8px rgba(79,216,255,.5);white-space:nowrap}
.ph .r{margin-left:auto;font-size:var(--fk);color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}

/* Rejilla: una sola, con áreas que cambian según el ancho */
.grid{flex:1;display:grid;gap:var(--gap);min-height:0;min-width:0;
  grid-template-columns:minmax(0,1fr);
  grid-template-areas:"ctx" "cost" "mod" "agt" "hist"}
#p-ctx{grid-area:ctx}#p-cost{grid-area:cost}#p-mod{grid-area:mod}#p-chart{grid-area:chart;display:none}#p-hist{grid-area:hist}#p-agt{grid-area:agt}
body.compact #p-hist{display:none}
body.compact .grid{grid-template-areas:"ctx" "cost" "mod" "agt"}

/* Contexto */
.ctxb{display:flex;flex-direction:column;align-items:center;gap:var(--gap);flex:1;min-height:0;justify-content:center}
.reactor{position:relative;width:100%;max-width:min(300px,34vh);aspect-ratio:1;flex:none}
.reactor svg{width:100%;height:100%;display:block;overflow:visible}
.spin{transform-origin:100px 100px;animation:spin 40s linear infinite}
.spinr{transform-origin:100px 100px;animation:spin 26s linear infinite reverse}
body.lv-x .spin{animation-duration:8s}
body.lv-x .spinr{animation-duration:5s}
.tick{stroke:var(--faint);stroke-width:3;transition:stroke .5s,filter .5s}
.tick.on{stroke:var(--cy);filter:drop-shadow(0 0 3px var(--cy))}
.tick.on.w{stroke:var(--am);filter:drop-shadow(0 0 3px var(--am))}
.tick.on.x{stroke:var(--rd);filter:drop-shadow(0 0 3px var(--rd))}
.mark{stroke-width:1.5}
#arc{transition:stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1),stroke .5s}
.core{animation:pulse 3.2s ease-in-out infinite}
.rc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.rc .p{font-size:var(--fbig);color:#f0fbff;text-shadow:0 0 14px rgba(79,216,255,.9),0 0 30px rgba(79,216,255,.5);line-height:1;transition:color .5s}
.rc .p small{font-size:max(16px,.45em);color:var(--cy)}
.rc .k{margin-top:6px}
body.lv-w .rc .p{color:#ffe2b8;text-shadow:0 0 14px rgba(255,179,71,.9)}
body.lv-x .rc .p{color:#ffd6da;text-shadow:0 0 14px rgba(255,95,110,.95)}
.kv{display:grid;grid-template-columns:auto auto;justify-content:space-between;gap:6px 16px;width:100%;align-items:baseline}
.kv .v{text-align:right;color:var(--txt);font-size:var(--fv);white-space:nowrap}
body.compact .kv .opt{display:none}

/* Coste */
.cost{font-size:var(--fbig);color:var(--am);text-shadow:0 0 12px rgba(255,179,71,.55);line-height:1.05;margin:0 0 4px;white-space:nowrap}
.cost small{font-size:var(--fk);color:var(--sub);letter-spacing:.1em;margin-left:8px}
.sub{color:var(--sub);font-size:var(--fk);margin-bottom:8px}
.mdl{color:var(--cy);font-size:var(--fv);overflow-wrap:anywhere}

/* Barras segmentadas */
.seg{display:flex;gap:2px;height:12px;align-items:stretch;min-width:0}
.seg i{flex:1;background:var(--faint);transition:background .5s,box-shadow .5s;transform:skewX(-20deg)}
.seg i.on{background:var(--c,var(--cy));box-shadow:0 0 5px var(--c,var(--cy))}
.seg.sm{height:8px;gap:1px}
.stack{display:flex;height:14px;gap:3px;margin:0 0 12px;flex:none}
.stack div{height:100%;background:var(--c);box-shadow:0 0 8px var(--c);opacity:.85;min-width:3px;
  background-image:repeating-linear-gradient(90deg,transparent 0 6px,rgba(3,6,10,.55) 6px 8px)}
.stack.empty{background:var(--faint)}

/* Reparto por modelo: nombre, barra, %, turnos */
.cmp{display:grid;grid-template-columns:minmax(130px,15em) minmax(60px,1fr) 4.5em 5.5em;gap:10px 16px;align-items:center}
.cmp .hd{font-size:var(--fk);color:var(--sub);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
.cmp .nm{display:flex;flex-direction:column;min-width:0;border-left:3px solid var(--c);padding-left:10px}
.cmp .nm b{font-weight:normal;color:var(--c);letter-spacing:.1em;font-size:var(--fv);text-shadow:0 0 8px var(--c);white-space:nowrap}
.cmp .nm b em{font-style:normal;font-size:14px;letter-spacing:.06em;color:var(--bg);background:var(--am);padding:0 5px;margin-left:8px;text-shadow:none;vertical-align:1px}
.cmp .nm span{color:var(--sub);font-size:var(--fk);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.compact .cmp .nm span{display:none}
.cmp .pc{font-size:var(--fv);color:#f0fbff;text-align:right;text-shadow:0 0 8px var(--c);white-space:nowrap}
.cmp .tn{font-size:var(--fv);color:var(--txt);text-align:right;white-space:nowrap}
.cmp .hd.tn{font-size:var(--fk);color:var(--sub)}
.cmp .zero{opacity:.55}
.r-al{text-align:right}

/* Gráfica */
.chart{position:relative;flex:1;min-height:180px}
.chart svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.chart text{font:14px var(--mono);fill:var(--sub)}
.legend{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:var(--fk);color:var(--sub);margin-top:8px;flex:none}
.legend i{display:inline-block;width:11px;height:11px;background:var(--c);box-shadow:0 0 6px var(--c);margin-right:6px;vertical-align:-1px}
.legend i.ln{height:3px;vertical-align:3px}
.bar{transition:height .6s,y .6s}

/* Tablas */
.tblw{overflow:auto;min-height:0;flex:1;max-height:440px;scrollbar-width:thin;scrollbar-color:var(--cy2) transparent}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{text-align:right;padding:6px 8px;border-bottom:1px solid rgba(22,48,64,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
td{font-size:var(--fv)}
th{color:var(--sub);font-weight:normal;font-size:var(--fk);letter-spacing:.06em;text-transform:uppercase;position:sticky;top:0;background:#061018;z-index:1}
th:first-child,td:first-child{padding-left:2px}
.al-l{text-align:left}
th .sh{display:none}
.w-hora{width:6.2em}.w-mdl{width:6.5em}.w-tok{width:6em}.w-usd{width:5.8em}.w-trn{width:5.5em}.w-share{width:11em}
tbody tr:hover td{background:rgba(79,216,255,.06)}
td .ftag{color:var(--c);letter-spacing:.06em;text-shadow:0 0 6px var(--c)}
td.dimc{color:var(--sub)}
td.amc{color:var(--am)}
tr.new td{animation:flash 1.4s ease-out}
.share{display:flex;align-items:center;gap:10px;justify-content:flex-end}
.share .seg{flex:1}
.share .sv{flex:none;min-width:3.5em;text-align:right}
.empty-row{color:var(--sub);text-align:left!important;font-size:var(--fk)!important;padding:14px 8px!important}

footer{display:flex;gap:18px;justify-content:space-between;font-size:var(--fk);color:var(--sub);border-top:1px solid var(--cyd);padding-top:8px;flex-wrap:wrap}
footer .line{flex:1;align-self:center;height:1px;background:linear-gradient(90deg,var(--cyd),transparent);min-width:20px}
body.compact footer{display:none}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.75}50%{opacity:1}}
@keyframes blink{to{opacity:.6}}
@keyframes alarm{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes flash{from{background:rgba(79,216,255,.22)}to{background:transparent}}
@media (prefers-reduced-motion:reduce){.spin,.spinr,.core,.dot,.logo:after,.al.on,body.lv-x:before{animation:none}}

/* < 900 px: una columna. Estrecho: menos columnas en las tablas. */
@media (max-width:899px){
  .hstat{margin-left:0;width:100%;justify-content:space-between}
  .hstat>div{text-align:left}
  .reactor{max-width:min(260px,60vw)}
}
@media (max-width:640px){
  h1{letter-spacing:.1em}
  h1 .brand{display:none}
  .hstat .opt{display:none}
  .cmp{grid-template-columns:minmax(0,1.3fr) minmax(40px,1fr) 4em}
  .cmp .tn,.cmp .hd.tn{display:none}
  .h-hora,.a-turnos{display:none}
  .w-mdl{width:5.4em}.w-tok{width:5.2em}.w-usd{width:5.4em}.w-share{width:4.2em}
}

/* 900-1599 px: dos columnas, sin la gráfica */
@media (min-width:900px){
  .grid{grid-template-columns:minmax(300px,.8fr) minmax(0,1.5fr);
    grid-template-areas:"ctx mod" "ctx agt" "cost hist"}
  body.compact .grid{grid-template-areas:"ctx mod" "ctx agt" "cost agt"}
}

/* >= 1600 px: rejilla completa */
@media (min-width:1600px){
  .grid{grid-template-columns:minmax(360px,460px) minmax(0,1.1fr) minmax(0,1fr);
    grid-template-areas:"ctx mod mod" "ctx chart hist" "cost agt agt"}
  body.compact .grid{grid-template-areas:"ctx mod mod" "ctx chart chart" "cost agt agt"}
  #p-chart{display:block}
  .reactor{max-width:min(380px,34vh)}
}

/* Si la ventana es alta y ancha, todo cabe sin desplazar la página. */
@media (min-width:900px) and (min-height:700px){
  .wrap{height:100vh}
  .grid{overflow:hidden;grid-template-rows:auto minmax(0,1fr) minmax(0,.85fr)}
  body.compact .grid{grid-template-rows:auto minmax(0,1fr) auto}
  .tblw{max-height:none}
}
@media (min-width:1600px) and (min-height:700px){
  .grid,body.compact .grid{grid-template-rows:auto minmax(0,1fr) minmax(0,1fr)}
}
/* Columna derecha estrecha (900-1199 px): reparto de agentes sin barra. */
@media (min-width:900px) and (max-width:1199px){
  .w-share{width:4.5em}
  .share .seg,th .lg{display:none}
  th .sh{display:inline}
}
@media (max-width:640px){.share .seg,th .lg{display:none}th .sh{display:inline}}
</style></head>
<body>
<div class="wrap">
<header>
  <div class="logo"></div>
  <h1><span class="brand">J.A.R.V.I.S · </span>Consumo</h1>
  <div class="alerts">
    <div class="al" id="al-ctx">Contexto alto</div>
    <div class="al" id="al-sig">Sin señal</div>
  </div>
  <div class="hstat">
    <div><div class="k">Señal</div><div class="v" id="link"><span class="dot wait"></span>Esperando</div></div>
    <div class="opt"><div class="k">Turnos</div><div class="v num" id="hturns">0</div></div>
    <div><div class="k">Reloj</div><div class="v num" id="clock">--:--:--</div></div>
    <button id="dens" type="button" title="Cambiar densidad (tecla D)"><kbd>D</kbd><span id="dens-l">Compacto</span></button>
  </div>
</header>

<div class="grid">
  <section class="pnl" id="p-ctx"><div class="fr"></div><div class="in">
    <div class="ph"><span class="t">Contexto</span><span class="r" id="ctxstate">Nominal</span></div>
    <div class="ctxb">
      <div class="reactor">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <radialGradient id="g" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#e8fbff" stop-opacity=".95"/>
              <stop offset="35%" stop-color="#4fd8ff" stop-opacity=".55"/>
              <stop offset="100%" stop-color="#4fd8ff" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="98" fill="none" stroke="#163040" stroke-width="1"/>
          <circle id="arc" cx="100" cy="100" r="94" fill="none" stroke="#4fd8ff" stroke-width="2" stroke-dasharray="590.6" stroke-dashoffset="590.6" transform="rotate(-90 100 100)" style="filter:drop-shadow(0 0 4px currentColor)"/>
          <g class="spin"><circle cx="100" cy="100" r="88" fill="none" stroke="#1d8fb8" stroke-width="1.2" stroke-dasharray="1 5"/></g>
          <g id="ticks"></g>
          <line class="mark" x1="100" y1="8" x2="100" y2="34" stroke="#ffb347" transform="rotate(252 100 100)"/>
          <line class="mark" x1="100" y1="8" x2="100" y2="34" stroke="#ff5f6e" transform="rotate(306 100 100)"/>
          <g class="spinr"><circle cx="100" cy="100" r="58" fill="none" stroke="#ffb347" stroke-opacity=".6" stroke-width="1.2" stroke-dasharray="26 6 4 6"/></g>
          <circle cx="100" cy="100" r="52" fill="none" stroke="#163040" stroke-width="1"/>
          <circle class="core" id="core" cx="100" cy="100" r="48" fill="url(#g)" opacity=".35"/>
        </svg>
        <div class="rc"><div class="p num" id="pct">0<small>%</small></div><div class="k">usado</div></div>
      </div>
      <div class="kv">
        <span class="k">Tokens</span><span class="v num" id="ctxtok">0</span>
        <span class="k">Libre</span><span class="v num" id="ctxfree">0</span>
        <span class="k opt">Ventana</span><span class="v num opt" id="ctxwin">0</span>
        <span class="k opt">Avisos</span><span class="v num opt"><span style="color:var(--am)">70%</span> / <span style="color:var(--rd)">85%</span></span>
      </div>
    </div>
  </div></section>

  <section class="pnl" id="p-cost"><div class="fr"></div><div class="in">
    <div class="ph"><span class="t">Coste</span></div>
    <div class="cost num" id="coste">0.0000<small>USD</small></div>
    <div class="sub" id="clast">Sin turnos todavía</div>
    <div class="k">Modelo de la sesión</div>
    <div class="mdl" id="modelo">—</div>
  </div></section>

  <section class="pnl" id="p-mod"><div class="fr"></div><div class="in">
    <div class="ph"><span class="t">Reparto por modelo</span><span class="r num" id="mtot">0 tokens</span></div>
    <div class="stack empty" id="stack"></div>
    <div class="cmp" id="cmp"></div>
  </div></section>

  <section class="pnl" id="p-chart"><div class="fr"></div><div class="in">
    <div class="ph"><span class="t">Tokens por turno</span><span class="r num" id="cmax"></span></div>
    <div class="chart" id="chart"></div>
    <div class="legend" id="clegend"></div>
  </div></section>

  <section class="pnl" id="p-hist"><div class="fr"></div><div class="in">
    <div class="ph"><span class="t">Últimos turnos</span><span class="r num" id="hcount">0</span></div>
    <div class="tblw">
      <table id="hist">
        <thead><tr><th class="al-l h-hora w-hora">Hora</th><th class="al-l">Agente</th><th class="al-l w-mdl">Modelo</th><th class="w-tok">Tokens</th><th class="w-usd">USD</th></tr></thead>
        <tbody id="hrows"><tr><td colspan="5" class="empty-row">Sin turnos todavía</td></tr></tbody>
      </table>
    </div>
  </div></section>

  <section class="pnl" id="p-agt"><div class="fr"></div><div class="in">
    <div class="ph"><span class="t">Agentes</span><span class="r num" id="acount">0</span></div>
    <div class="tblw">
      <table id="atab">
        <thead><tr><th class="al-l">Agente</th><th class="al-l w-mdl">Modelo</th><th class="w-tok">Tokens</th><th class="a-turnos w-trn">Turnos</th><th class="w-share"><span class="lg">Reparto</span><span class="sh">%</span></th></tr></thead>
        <tbody id="rows"><tr><td colspan="5" class="empty-row">Sin turnos todavía</td></tr></tbody>
      </table>
    </div>
  </div></section>
</div>

<footer><span id="ts">Último dato: —</span><span class="line"></span><span id="beat">Latido: —</span></footer>
</div>
<script>
var FAM={opus:'Opus',haiku:'Haiku',fable:'Fable',sonnet:'Sonnet',otro:'Otro'};
var WARN=70,CRIT=85,STALE=10000,NT=60,DKEY='consumo.densidad';
var lastData=null,lastBeat=null,beatSeen=0,loadOk=false,seenTurns={},firstRender=true;
function $id(i){return document.getElementById(i)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function n(x){return Number(x||0).toLocaleString('es-ES')}
function kn(x){x=Number(x||0);if(x>=1e6)return (x/1e6).toFixed(x>=1e7?1:2)+'M';if(x>=1e4)return (x/1e3).toFixed(1)+'k';return n(x)}
function fam(m){m=String(m||'').toLowerCase();for(var k in FAM){if(k!=='otro'&&m.indexOf(k)>=0)return k}return 'otro'}
function col(f){return 'var(--f-'+(FAM[f]?f:'otro')+')'}
var HEX={opus:'#ffb347',haiku:'#4fd8ff',fable:'#7cffc4',sonnet:'#c4adff',otro:'#b4c7d4'};
function segs(p,c,cls,count){count=count||24;var on=Math.round(Math.max(0,Math.min(100,p))*count/100);if(p>0&&on===0)on=1;var h='';for(var i=0;i<count;i++)h+='<i'+(i<on?' class="on"':'')+'></i>';return '<div class="seg'+(cls?' '+cls:'')+'" style="--c:'+c+'">'+h+'</div>'}
function pc(x){x=Number(x||0);return (x>=10||x===0?Math.round(x):x.toFixed(1))}
function hhmm(t){return t?new Date(t).toLocaleTimeString('es-ES'):'—'}
(function(){
  var g=$id('ticks'),h='';
  for(var i=0;i<NT;i++){var a=(i/NT)*360;h+='<line class="tick" x1="100" y1="16" x2="100" y2="30" transform="rotate('+a.toFixed(2)+' 100 100)"/>'}
  g.innerHTML=h;
})();

// Densidad: cómodo (por defecto) o compacto. La preferencia se guarda si el navegador deja.
function setDens(c,save){
  document.body.classList.toggle('compact',c);
  $id('dens-l').textContent=c?'Cómodo':'Compacto';
  $id('dens').setAttribute('aria-pressed',c?'true':'false');
  if(save){try{localStorage.setItem(DKEY,c?'compacto':'comodo')}catch(e){}}
  if(lastData)renderChart(lastData);
}
(function(){var v=null;try{v=localStorage.getItem(DKEY)}catch(e){}setDens(v==='compacto',false)})();
$id('dens').addEventListener('click',function(){setDens(!document.body.classList.contains('compact'),true)});
document.addEventListener('keydown',function(e){
  if(e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
  if(e.key==='d'||e.key==='D'){e.preventDefault();setDens(!document.body.classList.contains('compact'),true)}
});

function modelosDe(d){
  if(d.modelos&&d.modelos.length)return d.modelos;
  var m={},ag=d.agentes||[];
  ag.forEach(function(a){var k=a.modelo||'desconocido';var x=m[k]||(m[k]={modelo:k,familia:fam(k),entrada:0,salida:0,cache:0,cacheEscritura:0,turnos:0,principal:k===d.modelo});x.entrada+=a.input;x.salida+=a.output;x.cache+=a.cacheRead;x.turnos+=a.turns});
  var l=Object.keys(m).map(function(k){return m[k]});
  var w=l.reduce(function(a,x){return a+x.entrada+x.salida},0),t=l.reduce(function(a,x){return a+x.turnos},0);
  l.forEach(function(x){x.reparto=w?Math.round((x.entrada+x.salida)*1000/w)/10:0;x.repartoTurnos=t?Math.round(x.turnos*1000/t)/10:0});
  return l;
}

// Haiku frente a Opus frente a la sesión principal: siempre las tres filas, aunque alguna esté a cero.
function comparativa(d,ms){
  var out=[],used={};
  var main=ms.filter(function(x){return x.principal})[0];
  function vacio(f){return {modelo:'sin turnos',familia:f,entrada:0,salida:0,cache:0,turnos:0,reparto:0,repartoTurnos:0,zero:true}}
  if(main){out.push({x:main,rol:'principal'});used[main.modelo]=1}
  else out.push({x:{modelo:d.modelo||'—',familia:fam(d.modelo),entrada:0,salida:0,cache:0,turnos:0,reparto:0,repartoTurnos:0,zero:true},rol:'principal'});
  ['opus','haiku'].forEach(function(f){
    var l=ms.filter(function(x){return x.familia===f&&!used[x.modelo]});
    if(!l.length&&!(main&&main.familia===f))out.push({x:vacio(f),rol:''});
    l.forEach(function(x){out.push({x:x,rol:''});used[x.modelo]=1});
  });
  ms.forEach(function(x){if(!used[x.modelo])out.push({x:x,rol:''})});
  return out;
}

function renderModels(d){
  var ms=modelosDe(d);
  var work=ms.reduce(function(a,x){return a+x.entrada+x.salida},0);
  var turns=ms.reduce(function(a,x){return a+x.turnos},0);
  $id('hturns').textContent=n(turns);
  $id('mtot').textContent=kn(work)+' tokens · '+n(turns)+' turnos';
  var st=$id('stack');
  st.className='stack'+(work?'':' empty');
  st.innerHTML=work?ms.map(function(x){return '<div title="'+esc(x.modelo)+' '+pc(x.reparto)+'%" style="--c:'+col(x.familia)+';flex-grow:'+((x.entrada+x.salida)||0)+'"></div>'}).join(''):'';
  var h='<span class="hd">Modelo</span><span class="hd">Trabajo</span><span class="hd r-al">%</span><span class="hd tn r-al">Turnos</span>';
  comparativa(d,ms).forEach(function(r){
    var x=r.x,c=col(x.familia),z=x.zero?' zero':'';
    var tip=x.modelo+' · entrada '+n(x.entrada)+' · salida '+n(x.salida)+' · caché '+n(x.cache);
    h+='<div class="nm'+z+'" style="--c:'+c+'" title="'+esc(tip)+'"><b>'+esc(FAM[x.familia]||x.familia)+(r.rol?'<em>principal</em>':'')+'</b><span>'+esc(x.modelo)+'</span></div>'+
      '<div class="'+z+'">'+segs(x.reparto,c,'',24)+'</div>'+
      '<div class="pc num'+z+'" style="--c:'+c+'">'+pc(x.reparto)+'%</div>'+
      '<div class="tn num'+z+'">'+n(x.turnos)+'</div>';
  });
  $id('cmp').innerHTML=h;
}

// Gráfica SVG: barras apiladas entrada/salida por turno, color del modelo; línea ámbar con el coste.
function renderChart(d){
  var hs=d.historial||[],box=$id('chart');
  if(!box.offsetParent||!box.clientWidth)return;
  var W=Math.max(200,box.clientWidth),H=Math.max(140,box.clientHeight);
  var hasC=hs.some(function(t){return t.coste!=null});
  var L=60,R=hasC?62:12,T=10,B=26;
  var iw=W-L-R,ih=H-T-B;
  var mx=hs.reduce(function(a,t){return Math.max(a,t.entrada+t.salida)},0);
  var cm=hs.reduce(function(a,t){return Math.max(a,t.coste||0)},0);
  function nice(v){if(v<=0)return 1;var p=Math.pow(10,Math.floor(Math.log(v)/Math.LN10)),f=v/p;return (f<=1?1:f<=2?2:f<=5?5:10)*p}
  var top=mx>0?nice(mx):1000,ctop=cm>0?nice(cm):0;
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">';
  for(var i=0;i<=4;i++){
    var y=T+ih-ih*i/4;
    s+='<line x1="'+L+'" x2="'+(L+iw)+'" y1="'+y+'" y2="'+y+'" stroke="'+(i?'#15334a':'#1d8fb8')+'" stroke-width="1" '+(i?'stroke-dasharray="2 4"':'')+'/>';
    if(i%2===0){
      s+='<text x="'+(L-8)+'" y="'+(y+5)+'" text-anchor="end">'+kn(top*i/4)+'</text>';
      if(ctop)s+='<text x="'+(L+iw+8)+'" y="'+(y+5)+'" style="fill:#e0b06a">'+(ctop*i/4).toFixed(ctop<0.1?3:2)+'</text>';
    }
  }
  if(!hs.length){
    s+='<text x="'+(L+iw/2)+'" y="'+(T+ih/2)+'" text-anchor="middle">Sin turnos todavía</text>';
  }
  var slot=iw/Math.max(hs.length,20),bw=Math.max(3,Math.min(28,slot*0.62)),pts=[];
  var every=Math.max(1,Math.ceil(hs.length/(iw/48)));
  hs.forEach(function(t,j){
    var f=t.familia||fam(t.modelo),c=HEX[f]||HEX.otro;
    var x=L+slot*j+(slot-bw)/2;
    var hi=ih*t.entrada/top,ho=ih*t.salida/top;
    var y0=T+ih;
    s+='<g><title>'+esc(hhmm(t.hora)+' · '+t.agente+' · '+t.modelo+' · entrada '+n(t.entrada)+' · salida '+n(t.salida)+(t.coste!=null?' · '+Number(t.coste).toFixed(4)+' USD':''))+'</title>'+
      '<rect class="bar" x="'+x.toFixed(1)+'" y="'+(y0-hi).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,hi).toFixed(1)+'" fill="'+c+'" fill-opacity=".38" stroke="'+c+'" stroke-opacity=".7" stroke-width="1"/>'+
      '<rect class="bar" x="'+x.toFixed(1)+'" y="'+(y0-hi-ho).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,ho).toFixed(1)+'" fill="'+c+'" style="filter:drop-shadow(0 0 3px '+c+')"/></g>';
    if(j%every===0||j===hs.length-1)s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle">'+(j+1)+'</text>';
    if(ctop&&t.coste!=null)pts.push((x+bw/2).toFixed(1)+','+(T+ih-ih*t.coste/ctop).toFixed(1));
  });
  if(pts.length>1)s+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="#ffb347" stroke-width="1.8" style="filter:drop-shadow(0 0 3px #ffb347)"/>';
  pts.forEach(function(p){var q=p.split(',');s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="2.6" fill="#03060a" stroke="#ffb347" stroke-width="1.4"/>'});
  s+='</svg>';
  box.innerHTML=s;
  $id('cmax').textContent=hs.length?('pico '+kn(mx)+' tokens'):'';
  var fams={};hs.forEach(function(t){fams[t.familia||fam(t.modelo)]=1});
  var lg=Object.keys(fams).map(function(f){return '<span><i style="--c:'+col(f)+'"></i>'+FAM[f]+'</span>'}).join('');
  lg+='<span>claro = entrada, vivo = salida</span>';
  if(ctop)lg+='<span><i class="ln" style="--c:var(--am)"></i>USD por turno</span>';
  $id('clegend').innerHTML=lg;
}

function renderHist(d){
  var hs=(d.historial||[]).slice().reverse();
  $id('hcount').textContent=hs.length+(hs.length===1?' turno':' turnos');
  var fresh={};
  $id('hrows').innerHTML=hs.length?hs.map(function(t){
    var f=t.familia||fam(t.modelo),c=col(f),id=t.hora+'|'+t.agente;
    var isNew=!firstRender&&!seenTurns[id];fresh[id]=1;
    return '<tr'+(isNew?' class="new"':'')+'><td class="al-l dimc num h-hora">'+esc(hhmm(t.hora))+'</td>'+
      '<td class="al-l" title="'+esc(t.agente)+'">'+esc(t.agente)+'</td>'+
      '<td class="al-l" style="--c:'+c+'" title="'+esc(t.modelo)+'"><span class="ftag">'+esc(FAM[f]||f)+'</span></td>'+
      '<td class="num">'+kn(t.entrada+t.salida)+'</td>'+
      '<td class="num amc">'+(t.coste!=null?Number(t.coste).toFixed(4):'—')+'</td></tr>';
  }).join(''):'<tr><td colspan="5" class="empty-row">Sin turnos todavía</td></tr>';
  seenTurns=fresh;firstRender=false;
  var last=d.historial&&d.historial[d.historial.length-1];
  $id('clast').textContent=last&&last.coste!=null?('Último turno ≈ '+Number(last.coste).toFixed(4)+' USD'):(last?'Último turno sin coste':'Sin turnos todavía');
}

function renderAgents(d){
  var agentes=d.agentes||[];
  var total=agentes.reduce(function(a,x){return a+x.input+x.output},0)||1;
  $id('acount').textContent=agentes.length+(agentes.length===1?' agente':' agentes');
  $id('rows').innerHTML=agentes.length?agentes.map(function(x){
    var s=(x.input+x.output)*100/total,f=fam(x.modelo),cc=col(f);
    var tip=x.nombre+' · entrada '+n(x.input)+' · salida '+n(x.output)+' · caché '+n(x.cacheRead);
    return '<tr><td class="al-l" title="'+esc(x.nombre)+'">'+esc(x.nombre)+'</td>'+
      '<td class="al-l" title="'+esc(x.modelo)+'" style="--c:'+cc+'"><span class="ftag">'+esc(FAM[f]||f)+'</span></td>'+
      '<td class="num" title="'+esc(tip)+'">'+kn(x.input+x.output)+'</td><td class="num a-turnos">'+n(x.turns)+'</td>'+
      '<td><div class="share">'+segs(s,cc,'sm',16)+'<span class="sv num">'+pc(s)+'%</span></div></td></tr>';
  }).join(''):'<tr><td colspan="5" class="empty-row">Sin turnos todavía</td></tr>';
}

function renderCtx(d){
  var c=d.contexto||{tokens:0,window:1,percent:0};
  var p=Math.max(0,Math.min(100,Number(c.percent)||0));
  var lvl=d.alerta?(d.alerta==='critica'?'x':d.alerta==='alta'?'w':''):(p>=CRIT?'x':p>=WARN?'w':'');
  document.body.classList.toggle('lv-w',lvl==='w');
  document.body.classList.toggle('lv-x',lvl==='x');
  var on=Math.round(p*NT/100),ts=document.querySelectorAll('.tick');
  for(var i=0;i<ts.length;i++)ts[i].setAttribute('class','tick'+(i<on?' on'+(lvl?' '+lvl:''):''));
  var arc=$id('arc'),hex=lvl==='x'?'#ff5f6e':lvl==='w'?'#ffb347':'#4fd8ff';
  arc.style.strokeDashoffset=(590.6*(1-p/100)).toFixed(1);
  arc.setAttribute('stroke',hex);arc.style.color=hex;
  $id('pct').innerHTML=pc(p)+'<small>%</small>';
  var st=$id('ctxstate');
  st.textContent=lvl==='x'?'Crítico':lvl==='w'?'Alto':'Nominal';
  st.style.color=lvl==='x'?'var(--rd)':lvl==='w'?'var(--am)':'';
  var al=$id('al-ctx');
  al.className='al'+(lvl?' on '+lvl:'');
  al.textContent=lvl==='x'?'Contexto crítico '+pc(p)+'%':'Contexto alto '+pc(p)+'%';
  $id('ctxtok').textContent=n(c.tokens);
  $id('ctxwin').textContent=n(c.window);
  $id('ctxfree').textContent=n(Math.max(0,(c.window||0)-(c.tokens||0)));
}

function render(d){
  if(!d)return;
  lastData=d;
  renderCtx(d);
  $id('coste').innerHTML=Number(d.coste||0).toFixed(4)+'<small>USD</small>';
  $id('modelo').textContent=d.modelo||'—';
  renderModels(d);
  renderChart(d);
  renderHist(d);
  renderAgents(d);
  $id('ts').textContent='Último dato: '+hhmm(d.actualizado);
}

// Señal: datos.js debe cambiar (latido) al menos cada 10 s. Se mide con el reloj de la página.
function signal(){
  var now=Date.now(),age=beatSeen?now-beatSeen:Infinity;
  var ok=loadOk&&age<=STALE;
  var l=$id('link'),a=$id('al-sig');
  if(!beatSeen&&!loadOk){l.innerHTML='<span class="dot wait"></span>Esperando';}
  else l.innerHTML='<span class="dot'+(ok?'':' off')+'"></span>'+(ok?'En línea':'Sin señal');
  var secs=isFinite(age)?Math.round(age/1000):null;
  a.className='al'+(ok||(!beatSeen&&!loadOk&&now-started<STALE)?'':' on');
  a.textContent=!loadOk?'datos.js no responde':'Sin señal hace '+secs+' s';
  $id('beat').textContent='Latido: '+(secs==null?'—':'hace '+secs+' s');
}
var started=Date.now();
function load(){
  var s=document.createElement('script');
  s.src='datos.js?'+Date.now();
  s.onload=function(){
    s.remove();loadOk=true;
    var d=window.CONSUMO;
    if(d){var b=d.latido||d.actualizado||JSON.stringify(d).length;if(b!==lastBeat){lastBeat=b;beatSeen=Date.now()}}
    try{render(d)}catch(err){}
    signal();
  };
  s.onerror=function(){s.remove();loadOk=false;signal()};
  document.head.appendChild(s);
}
function tick(){$id('clock').textContent=new Date().toLocaleTimeString('es-ES')}
var rz;window.addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(function(){if(lastData)renderChart(lastData)},120)});
tick();load();
setInterval(function(){tick();load()},1000);
</script>
</body></html>`
