// Página del panel. Se escribe en C:\CLAUDE\consumo\index.html al iniciar la sesión.
// Lee datos.js cada segundo (recargado con un script nuevo) y redibuja.
// Sin acentos graves, sin dólar-llave y sin barras invertidas dentro: es un template literal.
// Todo en línea, sin CDN: tiene que funcionar offline desde file://.
export const PAGE = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Consumo · HUD</title>
<style>
:root{
  --bg:#03060a;--cy:#4fd8ff;--cy2:#1d8fb8;--cyd:rgba(79,216,255,.16);
  --am:#ffb347;--rd:#ff4d5e;--txt:#cfeaf7;--dim:#5f8597;--faint:#163040;
  --f-opus:#ffb347;--f-haiku:#4fd8ff;--f-fable:#7cffc4;--f-sonnet:#b79bff;--f-otro:#8aa3b5;
  --fa:rgba(79,216,255,.75);--fb:rgba(255,179,71,.6);--glow:rgba(79,216,255,.22);
  --cut:14px;
  --mono:'Cascadia Mono','Cascadia Code',Consolas,'JetBrains Mono','DejaVu Sans Mono','Liberation Mono',monospace;
}
body.lv-w{--fa:rgba(255,179,71,.85);--fb:rgba(255,179,71,.5);--glow:rgba(255,179,71,.28)}
body.lv-x{--fa:rgba(255,77,94,.9);--fb:rgba(255,77,94,.55);--glow:rgba(255,77,94,.35)}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--txt);font:13px/1.45 var(--mono);overflow-x:hidden;
  background-image:radial-gradient(ellipse at 30% 20%,rgba(29,143,184,.12),transparent 60%),
  linear-gradient(rgba(79,216,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(79,216,255,.035) 1px,transparent 1px);
  background-size:auto,40px 40px,40px 40px}
body:after{content:"";position:fixed;inset:0;pointer-events:none;z-index:9;
  background:repeating-linear-gradient(0deg,rgba(255,255,255,.022) 0 1px,transparent 1px 3px)}
body:before{content:"";position:fixed;inset:0;pointer-events:none;z-index:8;opacity:0;transition:opacity .6s;
  box-shadow:inset 0 0 120px rgba(255,77,94,.45)}
body.lv-x:before{opacity:1;animation:alarm 1.6s ease-in-out infinite}
body.lv-w:before{opacity:.5;box-shadow:inset 0 0 90px rgba(255,179,71,.3)}
.wrap{min-height:100vh;display:flex;flex-direction:column;gap:12px;padding:14px 18px 10px;max-width:1900px;margin:0 auto}
.k{color:var(--dim);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase}
.num{font-variant-numeric:tabular-nums}

/* Cabecera */
header{display:flex;align-items:center;gap:18px;border-bottom:1px solid var(--cyd);padding-bottom:9px;position:relative}
header:after{content:"";position:absolute;left:0;bottom:-1px;width:180px;height:1px;background:var(--cy);box-shadow:0 0 8px var(--cy)}
.logo{flex:none;width:26px;height:26px;border:1px solid var(--cy);border-radius:50%;position:relative;box-shadow:0 0 10px rgba(79,216,255,.5),inset 0 0 8px rgba(79,216,255,.4)}
.logo:after{content:"";position:absolute;inset:7px;border-radius:50%;background:var(--cy);box-shadow:0 0 10px var(--cy);animation:pulse 2.4s ease-in-out infinite}
h1{margin:0;font-size:15px;font-weight:normal;letter-spacing:.32em;color:var(--cy);text-shadow:0 0 10px rgba(79,216,255,.55);text-transform:uppercase;white-space:nowrap}
h1 span{color:var(--dim)}
.alerts{display:flex;gap:10px;flex-wrap:wrap;min-width:0}
.al{display:none;font-size:11px;letter-spacing:.2em;text-transform:uppercase;padding:4px 12px;border:1px solid currentColor;white-space:nowrap;
  clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);background:rgba(0,0,0,.4)}
.al.on{display:block;animation:blink 1.2s steps(2,start) infinite}
#al-ctx.w{color:var(--am);box-shadow:inset 0 0 12px rgba(255,179,71,.35)}
#al-ctx.x{color:var(--rd);box-shadow:inset 0 0 14px rgba(255,77,94,.5)}
#al-sig{color:var(--rd);box-shadow:inset 0 0 14px rgba(255,77,94,.5)}
.hstat{margin-left:auto;display:flex;gap:22px;align-items:center}
.hstat div{text-align:right}
.hstat .v{color:var(--txt);font-size:13px;letter-spacing:.08em;white-space:nowrap}
.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--cy);box-shadow:0 0 8px var(--cy);margin-right:7px;vertical-align:1px;animation:pulse 1.6s ease-in-out infinite}
.dot.wait{background:var(--am);box-shadow:0 0 8px var(--am)}
.dot.off{background:var(--rd);box-shadow:0 0 8px var(--rd);animation:blink 1s steps(2,start) infinite}

/* Paneles con esquinas recortadas y brillo */
.pnl{position:relative;filter:drop-shadow(0 0 5px var(--glow));min-width:0;min-height:0}
.pnl>.fr{position:absolute;inset:0;background:linear-gradient(135deg,var(--fa),rgba(79,216,255,.2) 40%,rgba(79,216,255,.2) 60%,var(--fb));transition:background .6s;
  clip-path:polygon(var(--cut) 0,100% 0,100% calc(100% - var(--cut)),calc(100% - var(--cut)) 100%,0 100%,0 var(--cut))}
.pnl>.in{position:relative;margin:1px;height:calc(100% - 2px);padding:12px 15px;
  background:linear-gradient(180deg,rgba(8,22,32,.97),rgba(3,9,14,.97));
  clip-path:polygon(var(--cut) 0,100% 0,100% calc(100% - var(--cut)),calc(100% - var(--cut)) 100%,0 100%,0 var(--cut));display:flex;flex-direction:column;min-height:0}
.pnl:before,.pnl:after{content:"";position:absolute;width:18px;height:18px;z-index:2;pointer-events:none}
.pnl:before{right:-3px;top:-3px;border-top:2px solid var(--am);border-right:2px solid var(--am)}
.pnl:after{left:-3px;bottom:-3px;border-bottom:2px solid var(--am);border-left:2px solid var(--am)}
body.lv-x .pnl:before,body.lv-x .pnl:after{border-color:var(--rd)}
.ph{display:flex;align-items:baseline;gap:10px;margin-bottom:9px;padding-bottom:6px;border-bottom:1px dashed var(--faint);flex:none}
.ph .t{font-size:11.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--cy);text-shadow:0 0 8px rgba(79,216,255,.5);white-space:nowrap}
.ph .c{font-size:10px;letter-spacing:.2em;color:var(--am);white-space:nowrap}
.ph .r{margin-left:auto;font-size:10px;letter-spacing:.16em;color:var(--dim);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* Rejilla */
.grid{flex:1;display:grid;grid-template-columns:minmax(290px,340px) minmax(0,1fr);gap:14px;min-height:0}
.col{display:flex;flex-direction:column;gap:14px;min-height:0;min-width:0}
.right{display:grid;grid-template-rows:auto minmax(0,1.15fr) minmax(0,1fr);gap:14px}
.pair{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px;min-height:0}
.grow{flex:1}

/* Reactor */
.reactor{position:relative;width:100%;max-width:270px;margin:0 auto 4px;aspect-ratio:1}
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
.rc .p{font-size:40px;color:#eaf9ff;text-shadow:0 0 14px rgba(79,216,255,.9),0 0 30px rgba(79,216,255,.5);letter-spacing:.02em;line-height:1;transition:color .5s}
.rc .p small{font-size:18px;color:var(--cy)}
.rc .k{margin-top:6px}
body.lv-w .rc .p{color:#ffe2b8;text-shadow:0 0 14px rgba(255,179,71,.9)}
body.lv-x .rc .p{color:#ffd0d5;text-shadow:0 0 14px rgba(255,77,94,.95)}
.kv{display:grid;grid-template-columns:1fr auto;gap:4px 12px;font-size:12px}
.kv .v{text-align:right;color:var(--txt)}
.cost{font-size:28px;color:var(--am);text-shadow:0 0 12px rgba(255,179,71,.55);letter-spacing:.04em;line-height:1.1;margin:0 0 2px}
.cost small{font-size:12px;color:var(--dim);letter-spacing:.2em;margin-left:6px}
.mdl{color:var(--cy);font-size:13px;word-break:break-all}

/* Barras segmentadas */
.seg{display:flex;gap:2px;height:10px;align-items:stretch}
.seg i{flex:1;background:var(--faint);transition:background .5s,box-shadow .5s;transform:skewX(-20deg)}
.seg i.on{background:var(--c,var(--cy));box-shadow:0 0 5px var(--c,var(--cy))}
.seg.sm{height:6px;gap:1px}
.stack{display:flex;height:12px;gap:3px;margin:0 0 10px}
.stack div{height:100%;background:var(--c);box-shadow:0 0 8px var(--c);opacity:.85;min-width:3px;
  background-image:repeating-linear-gradient(90deg,transparent 0 6px,rgba(3,6,10,.55) 6px 8px)}
.stack.empty{background:var(--faint)}

/* Comparativa por modelo */
.cmp{display:grid;grid-template-columns:150px minmax(0,1fr) 58px minmax(0,.7fr) 46px 150px;gap:6px 12px;align-items:center}
.cmp .hd{font-size:9.5px;letter-spacing:.18em;color:var(--dim);text-transform:uppercase}
.cmp .nm{display:flex;flex-direction:column;min-width:0;border-left:2px solid var(--c);padding-left:8px}
.cmp .nm b{font-weight:normal;color:var(--c);letter-spacing:.22em;font-size:13px;text-shadow:0 0 8px var(--c);white-space:nowrap}
.cmp .nm b em{font-style:normal;font-size:8.5px;letter-spacing:.16em;color:var(--bg);background:var(--am);padding:0 4px;margin-left:6px;text-shadow:none;vertical-align:2px}
.cmp .nm span{color:var(--dim);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cmp .pc{font-size:17px;color:#eaf9ff;text-align:right;text-shadow:0 0 8px var(--c)}
.cmp .pc small{font-size:10px;color:var(--dim)}
.cmp .tn{font-size:12px;color:var(--txt);text-align:right}
.cmp .tk{font-size:10.5px;color:var(--dim);text-align:right;white-space:nowrap}
.cmp .tk b{font-weight:normal;color:var(--txt)}
.cmp .zero{opacity:.45}

/* Gráfica */
.chart{position:relative;flex:1;min-height:120px}
.chart svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.chart text{font:9.5px var(--mono);fill:var(--dim);letter-spacing:.06em}
.legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:9.5px;letter-spacing:.14em;color:var(--dim);text-transform:uppercase}
.legend i{display:inline-block;width:9px;height:9px;background:var(--c);box-shadow:0 0 6px var(--c);margin-right:5px;vertical-align:-1px}
.legend i.ln{height:2px;vertical-align:3px}
.bar{transition:height .6s,y .6s}

/* Tablas */
.tblw{overflow:auto;min-height:0;flex:1;scrollbar-width:thin;scrollbar-color:var(--cy2) transparent}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{text-align:right;padding:5px 7px;border-bottom:1px solid rgba(22,48,64,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
th{color:var(--dim);font-weight:normal;font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;position:sticky;top:0;background:#061018;z-index:1}
.al-l{text-align:left}
tbody tr:hover td{background:rgba(79,216,255,.05)}
td .ftag{color:var(--c);letter-spacing:.14em;text-shadow:0 0 6px var(--c)}
td .mid{color:var(--dim);font-size:10.5px;margin-left:6px}
td.dimc{color:var(--dim)}
td.amc{color:var(--am)}
tr.new td{animation:flash 1.4s ease-out}
.share .seg{margin-top:3px}
.share .sv{font-size:10.5px}
.empty-row{color:var(--dim);text-align:left!important;letter-spacing:.14em;text-transform:uppercase;font-size:11px;padding:14px 8px!important}
#hist td,#hist th{font-size:11.5px}
#hist th{font-size:9.5px}

footer{display:flex;gap:18px;justify-content:space-between;font-size:10px;letter-spacing:.2em;color:var(--dim);text-transform:uppercase;border-top:1px solid var(--cyd);padding-top:7px}
footer .line{flex:1;align-self:center;height:1px;background:linear-gradient(90deg,var(--cyd),transparent)}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.75}50%{opacity:1}}
@keyframes blink{to{opacity:.6}}
@keyframes alarm{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes flash{from{background:rgba(79,216,255,.22)}to{background:transparent}}
@media (prefers-reduced-motion:reduce){.spin,.spinr,.core,.dot,.logo:after,.al.on,body.lv-x:before{animation:none}}

/* Ventana de 1280x800: todo cabe sin desplazar la página */
@media (min-width:1000px) and (min-height:640px){
  .wrap{height:100vh}
  .grid{overflow:hidden}
}
@media (min-width:1700px){
  body{font-size:14px}
  .grid{grid-template-columns:minmax(340px,420px) minmax(0,1fr)}
  .reactor{max-width:360px}
  .rc .p{font-size:52px}
  .cost{font-size:36px}
  .cmp{grid-template-columns:190px minmax(0,1fr) 64px minmax(0,.7fr) 50px 190px}
  .chart text{font-size:11px}
}
@media (max-width:1199px){
  .cmp{grid-template-columns:120px minmax(0,1fr) 52px minmax(0,.6fr) 40px}
  .cmp .tk{display:none}
}
@media (max-width:999px){
  .grid{grid-template-columns:1fr}
  .right{display:flex;flex-direction:column}
  .pair{grid-template-columns:1fr}
  .chart{min-height:200px}
  .tblw{max-height:420px}
  .hstat .opt{display:none}
  header{flex-wrap:wrap}
}
@media (max-width:560px){
  .wrap{padding:12px 10px}
  h1{font-size:12px;letter-spacing:.2em}
  .cmp{grid-template-columns:96px minmax(0,1fr) 48px}
  .cmp .tn,.cmp .tb,.cmp .hd.tb{display:none}
  #atab{table-layout:auto}
  #atab col{width:auto!important}
  #atab th:nth-child(3),#atab td:nth-child(3),#atab th:nth-child(4),#atab td:nth-child(4),#atab th:nth-child(5),#atab td:nth-child(5){display:none}
  #atab td:first-child{max-width:110px}
  #atab .share .seg{width:90px}
  td .mid{display:none}
}
</style></head>
<body>
<div class="wrap">
<header>
  <div class="logo"></div>
  <h1>J.A.R.V.I.S <span>//</span> Consumo</h1>
  <div class="alerts">
    <div class="al" id="al-ctx">CTX // Alerta</div>
    <div class="al" id="al-sig">LNK // Sin señal</div>
  </div>
  <div class="hstat">
    <div class="opt"><div class="k">LNK // Señal</div><div class="v" id="link"><span class="dot wait"></span>Esperando</div></div>
    <div class="opt"><div class="k">SYS // Turnos</div><div class="v num" id="hturns">0</div></div>
    <div><div class="k">SYS // Reloj</div><div class="v num" id="clock">--:--:--</div></div>
  </div>
</header>

<div class="grid">
  <div class="col">
    <section class="pnl grow"><div class="fr"></div><div class="in" style="justify-content:space-between">
      <div class="ph"><span class="c">SYS // CTX</span><span class="t">Contexto</span><span class="r" id="ctxstate">Nominal</span></div>
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
          <line class="mark" x1="100" y1="8" x2="100" y2="34" stroke="#ff4d5e" transform="rotate(306 100 100)"/>
          <g class="spinr"><circle cx="100" cy="100" r="58" fill="none" stroke="#ffb347" stroke-opacity=".6" stroke-width="1.2" stroke-dasharray="26 6 4 6"/></g>
          <circle cx="100" cy="100" r="52" fill="none" stroke="#163040" stroke-width="1"/>
          <circle class="core" id="core" cx="100" cy="100" r="48" fill="url(#g)" opacity=".35"/>
        </svg>
        <div class="rc"><div class="p num" id="pct">0<small>%</small></div><div class="k">CTX // Uso</div></div>
      </div>
      <div class="kv">
        <span class="k">Tokens</span><span class="v num" id="ctxtok">0</span>
        <span class="k">Ventana</span><span class="v num" id="ctxwin">0</span>
        <span class="k">Libre</span><span class="v num" id="ctxfree">0</span>
        <span class="k">Umbrales</span><span class="v num"><span style="color:var(--am)">70%</span> / <span style="color:var(--rd)">85%</span></span>
      </div>
    </div></section>

    <section class="pnl"><div class="fr"></div><div class="in">
      <div class="ph"><span class="c">FIN // USD</span><span class="t">Coste</span><span class="r" id="clast"></span></div>
      <div class="cost num" id="coste">0.0000<small>USD</small></div>
      <div class="ph" style="margin-top:8px"><span class="c">SYS // MDL</span><span class="t">Sesión</span></div>
      <div class="mdl" id="modelo">—</div>
    </div></section>
  </div>

  <div class="col right">
    <section class="pnl"><div class="fr"></div><div class="in">
      <div class="ph"><span class="c">MDL // DIST</span><span class="t">Reparto por modelo</span><span class="r" id="mtot">0 tokens</span></div>
      <div class="stack empty" id="stack"></div>
      <div class="cmp" id="cmp"></div>
    </div></section>

    <div class="pair">
      <section class="pnl"><div class="fr"></div><div class="in">
        <div class="ph"><span class="c">TRN // FLUX</span><span class="t">Tokens por turno</span><span class="r" id="cmax"></span></div>
        <div class="chart" id="chart"></div>
        <div class="legend" id="clegend"></div>
      </div></section>
      <section class="pnl"><div class="fr"></div><div class="in">
        <div class="ph"><span class="c">TRN // LOG</span><span class="t">Últimos 20</span><span class="r" id="hcount">0 turnos</span></div>
        <div class="tblw">
          <table id="hist">
            <colgroup><col style="width:76px"><col><col style="width:64px"><col style="width:62px"><col style="width:72px"></colgroup>
            <thead><tr><th class="al-l">Hora</th><th class="al-l">Agente</th><th class="al-l">Mdl</th><th>Tokens</th><th>≈ USD</th></tr></thead>
            <tbody id="hrows"><tr><td colspan="5" class="empty-row">Sin turnos todavía</td></tr></tbody>
          </table>
        </div>
      </div></section>
    </div>

    <section class="pnl"><div class="fr"></div><div class="in">
      <div class="ph"><span class="c">AGT // LOG</span><span class="t">Por agente</span><span class="r" id="acount">0 activos</span></div>
      <div class="tblw">
        <table id="atab">
          <colgroup><col style="width:22%"><col style="width:21%"><col><col><col><col style="width:62px"><col style="width:120px"></colgroup>
          <thead><tr><th class="al-l">Agente</th><th class="al-l">Modelo</th><th>Entrada</th><th>Salida</th><th>Caché</th><th>Turnos</th><th>Reparto</th></tr></thead>
          <tbody id="rows"><tr><td colspan="7" class="empty-row">Sin turnos todavía</td></tr></tbody>
        </table>
      </div>
    </div></section>
  </div>
</div>

<footer><span id="ts">Ult. dato // —</span><span class="line"></span><span id="beat">Latido // —</span><span>Offline // file</span></footer>
</div>
<script>
var FAM={opus:'Opus',haiku:'Haiku',fable:'Fable',sonnet:'Sonnet',otro:'Otro'};
var WARN=70,CRIT=85,STALE=10000,NT=60;
var lastData=null,lastBeat=null,beatSeen=0,loadOk=false,seenTurns={},firstRender=true;
function $id(i){return document.getElementById(i)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function n(x){return Number(x||0).toLocaleString('es-ES')}
function kn(x){x=Number(x||0);if(x>=1e6)return (x/1e6).toFixed(x>=1e7?1:2)+'M';if(x>=1e4)return (x/1e3).toFixed(1)+'k';return n(x)}
function fam(m){m=String(m||'').toLowerCase();for(var k in FAM){if(k!=='otro'&&m.indexOf(k)>=0)return k}return 'otro'}
function col(f){return 'var(--f-'+(FAM[f]?f:'otro')+')'}
var HEX={opus:'#ffb347',haiku:'#4fd8ff',fable:'#7cffc4',sonnet:'#b79bff',otro:'#8aa3b5'};
function segs(p,c,cls,count){count=count||24;var on=Math.round(Math.max(0,Math.min(100,p))*count/100);if(p>0&&on===0)on=1;var h='';for(var i=0;i<count;i++)h+='<i'+(i<on?' class="on"':'')+'></i>';return '<div class="seg'+(cls?' '+cls:'')+'" style="--c:'+c+'">'+h+'</div>'}
function pc(x){x=Number(x||0);return (x>=10||x===0?Math.round(x):x.toFixed(1))}
function hhmm(t){return t?new Date(t).toLocaleTimeString('es-ES'):'—'}
(function(){
  var g=$id('ticks'),h='';
  for(var i=0;i<NT;i++){var a=(i/NT)*360;h+='<line class="tick" x1="100" y1="16" x2="100" y2="30" transform="rotate('+a.toFixed(2)+' 100 100)"/>'}
  g.innerHTML=h;
})();

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
  $id('mtot').textContent=kn(work)+' tokens // '+n(turns)+' turnos';
  var st=$id('stack');
  st.className='stack'+(work?'':' empty');
  st.innerHTML=work?ms.map(function(x){return '<div title="'+esc(x.modelo)+' '+pc(x.reparto)+'%" style="--c:'+col(x.familia)+';flex-grow:'+((x.entrada+x.salida)||0)+'"></div>'}).join(''):'';
  var h='<span class="hd">Modelo</span><span class="hd">Trabajo // entrada + salida</span><span class="hd" style="text-align:right">%</span><span class="hd tb">Turnos</span><span class="hd tb" style="text-align:right">N</span><span class="hd tk" style="text-align:right">Ent / Sal / Caché</span>';
  comparativa(d,ms).forEach(function(r){
    var x=r.x,c=col(x.familia),z=x.zero?' zero':'';
    h+='<div class="nm'+z+'" style="--c:'+c+'"><b>'+esc((FAM[x.familia]||x.familia).toUpperCase())+(r.rol?'<em>PRINCIPAL</em>':'')+'</b><span title="'+esc(x.modelo)+'">'+esc(x.modelo)+'</span></div>'+
      '<div class="'+z+'">'+segs(x.reparto,c,'',32)+'</div>'+
      '<div class="pc num'+z+'" style="--c:'+c+'">'+pc(x.reparto)+'<small>%</small></div>'+
      '<div class="tb'+z+'">'+segs(x.repartoTurnos,c,'sm',24)+'</div>'+
      '<div class="tn tb num'+z+'">'+n(x.turnos)+'</div>'+
      '<div class="tk num'+z+'"><b>'+kn(x.entrada)+'</b> / <b>'+kn(x.salida)+'</b> / '+kn(x.cache)+'</div>';
  });
  $id('cmp').innerHTML=h;
}

// Gráfica SVG: barras apiladas entrada/salida por turno, color del modelo; línea ámbar con el coste.
function renderChart(d){
  var hs=d.historial||[],box=$id('chart');
  var W=Math.max(200,box.clientWidth),H=Math.max(110,box.clientHeight);
  var L=44,R=hs.some(function(t){return t.coste!=null})?48:10,T=8,B=20;
  var iw=W-L-R,ih=H-T-B;
  var mx=hs.reduce(function(a,t){return Math.max(a,t.entrada+t.salida)},0);
  var cm=hs.reduce(function(a,t){return Math.max(a,t.coste||0)},0);
  function nice(v){if(v<=0)return 1;var p=Math.pow(10,Math.floor(Math.log(v)/Math.LN10)),f=v/p;return (f<=1?1:f<=2?2:f<=5?5:10)*p}
  var top=mx>0?nice(mx):1000,ctop=cm>0?nice(cm):0;
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">';
  for(var i=0;i<=4;i++){
    var y=T+ih-ih*i/4;
    s+='<line x1="'+L+'" x2="'+(L+iw)+'" y1="'+y+'" y2="'+y+'" stroke="'+(i?'#10283a':'#1d8fb8')+'" stroke-width="1" '+(i?'stroke-dasharray="2 4"':'')+'/>';
    s+='<text x="'+(L-6)+'" y="'+(y+3)+'" text-anchor="end">'+kn(top*i/4)+'</text>';
    if(ctop)s+='<text x="'+(L+iw+6)+'" y="'+(y+3)+'" style="fill:#b98a4a">'+(ctop*i/4).toFixed(ctop<0.1?3:2)+'</text>';
  }
  if(!hs.length){
    s+='<text x="'+(L+iw/2)+'" y="'+(T+ih/2)+'" text-anchor="middle" style="letter-spacing:.2em">SIN TURNOS // ESPERANDO DATOS</text>';
  }
  var slot=iw/Math.max(hs.length,20),bw=Math.max(3,Math.min(26,slot*0.62)),pts=[];
  hs.forEach(function(t,j){
    var f=t.familia||fam(t.modelo),c=HEX[f]||HEX.otro;
    var x=L+slot*j+(slot-bw)/2;
    var hi=ih*t.entrada/top,ho=ih*t.salida/top;
    var y0=T+ih;
    s+='<g><title>'+esc(hhmm(t.hora)+' · '+t.agente+' · '+t.modelo+' · entrada '+n(t.entrada)+' · salida '+n(t.salida)+(t.coste!=null?' · '+Number(t.coste).toFixed(4)+' USD':''))+'</title>'+
      '<rect class="bar" x="'+x.toFixed(1)+'" y="'+(y0-hi).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,hi).toFixed(1)+'" fill="'+c+'" fill-opacity=".38" stroke="'+c+'" stroke-opacity=".7" stroke-width="1"/>'+
      '<rect class="bar" x="'+x.toFixed(1)+'" y="'+(y0-hi-ho).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,ho).toFixed(1)+'" fill="'+c+'" style="filter:drop-shadow(0 0 3px '+c+')"/></g>';
    if((j%Math.ceil(hs.length/10))===0||j===hs.length-1)s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-5)+'" text-anchor="middle">'+(j+1)+'</text>';
    if(ctop&&t.coste!=null)pts.push((x+bw/2).toFixed(1)+','+(T+ih-ih*t.coste/ctop).toFixed(1));
  });
  if(pts.length>1)s+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="#ffb347" stroke-width="1.5" style="filter:drop-shadow(0 0 3px #ffb347)"/>';
  pts.forEach(function(p){var q=p.split(',');s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="2.2" fill="#03060a" stroke="#ffb347" stroke-width="1.2"/>'});
  s+='</svg>';
  box.innerHTML=s;
  $id('cmax').textContent=hs.length?('pico '+kn(mx)+' tok'):'';
  var fams={};hs.forEach(function(t){fams[t.familia||fam(t.modelo)]=1});
  var lg=Object.keys(fams).map(function(f){return '<span><i style="--c:'+col(f)+'"></i>'+FAM[f]+'</span>'}).join('');
  lg+='<span><i style="--c:var(--dim);opacity:.6"></i>Claro = entrada · vivo = salida</span>';
  if(ctop)lg+='<span><i class="ln" style="--c:var(--am)"></i>Coste por turno (USD)</span>';
  $id('clegend').innerHTML=lg;
}

function renderHist(d){
  var hs=(d.historial||[]).slice().reverse();
  $id('hcount').textContent=hs.length+(hs.length===1?' turno':' turnos');
  var fresh={};
  $id('hrows').innerHTML=hs.length?hs.map(function(t){
    var f=t.familia||fam(t.modelo),c=col(f),id=t.hora+'|'+t.agente;
    var isNew=!firstRender&&!seenTurns[id];fresh[id]=1;
    return '<tr'+(isNew?' class="new"':'')+'><td class="al-l dimc num">'+esc(hhmm(t.hora))+'</td>'+
      '<td class="al-l" title="'+esc(t.agente)+'">'+esc(t.agente)+'</td>'+
      '<td class="al-l" style="--c:'+c+'" title="'+esc(t.modelo)+'"><span class="ftag">'+esc((FAM[f]||f).toUpperCase())+'</span></td>'+
      '<td class="num">'+kn(t.entrada+t.salida)+'</td>'+
      '<td class="num amc">'+(t.coste!=null?Number(t.coste).toFixed(4):'—')+'</td></tr>';
  }).join(''):'<tr><td colspan="5" class="empty-row">Sin turnos todavía</td></tr>';
  seenTurns=fresh;firstRender=false;
  var last=d.historial&&d.historial[d.historial.length-1];
  $id('clast').textContent=last&&last.coste!=null?('último turno ≈ '+Number(last.coste).toFixed(4)):'';
}

function renderAgents(d){
  var agentes=d.agentes||[];
  var total=agentes.reduce(function(a,x){return a+x.input+x.output},0)||1;
  $id('acount').textContent=agentes.length+(agentes.length===1?' activo':' activos');
  $id('rows').innerHTML=agentes.length?agentes.map(function(x){
    var s=(x.input+x.output)*100/total,f=fam(x.modelo),cc=col(f);
    return '<tr><td class="al-l" title="'+esc(x.nombre)+'">'+esc(x.nombre)+'</td>'+
      '<td class="al-l" title="'+esc(x.modelo)+'" style="--c:'+cc+'"><span class="ftag">'+esc((FAM[f]||f).toUpperCase())+'</span><span class="mid">'+esc(x.modelo)+'</span></td>'+
      '<td class="num">'+n(x.input)+'</td><td class="num">'+n(x.output)+'</td><td class="num">'+kn(x.cacheRead)+'</td><td class="num">'+n(x.turns)+'</td>'+
      '<td class="share"><span class="sv num">'+pc(s)+'%</span>'+segs(s,cc,'sm',20)+'</td></tr>';
  }).join(''):'<tr><td colspan="7" class="empty-row">Sin turnos todavía</td></tr>';
}

function renderCtx(d){
  var c=d.contexto||{tokens:0,window:1,percent:0};
  var p=Math.max(0,Math.min(100,Number(c.percent)||0));
  var lvl=d.alerta?(d.alerta==='critica'?'x':d.alerta==='alta'?'w':''):(p>=CRIT?'x':p>=WARN?'w':'');
  document.body.classList.toggle('lv-w',lvl==='w');
  document.body.classList.toggle('lv-x',lvl==='x');
  var on=Math.round(p*NT/100),ts=document.querySelectorAll('.tick');
  for(var i=0;i<ts.length;i++)ts[i].setAttribute('class','tick'+(i<on?' on'+(lvl?' '+lvl:''):''));
  var arc=$id('arc'),hex=lvl==='x'?'#ff4d5e':lvl==='w'?'#ffb347':'#4fd8ff';
  arc.style.strokeDashoffset=(590.6*(1-p/100)).toFixed(1);
  arc.setAttribute('stroke',hex);arc.style.color=hex;
  $id('pct').innerHTML=pc(p)+'<small>%</small>';
  var st=$id('ctxstate');
  st.textContent=lvl==='x'?'Crítico':lvl==='w'?'Alto':'Nominal';
  st.style.color=lvl==='x'?'var(--rd)':lvl==='w'?'var(--am)':'';
  var al=$id('al-ctx');
  al.className='al'+(lvl?' on '+lvl:'');
  al.textContent=lvl==='x'?'CTX // Crítico '+pc(p)+'% ≥ '+CRIT+'%':'CTX // Alto '+pc(p)+'% ≥ '+WARN+'%';
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
  $id('ts').textContent='Ult. dato // '+hhmm(d.actualizado);
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
  a.textContent=!loadOk?'LNK // datos.js no responde':'LNK // Sin señal hace '+secs+' s';
  $id('beat').textContent='Latido // '+(secs==null?'—':'hace '+secs+' s');
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
