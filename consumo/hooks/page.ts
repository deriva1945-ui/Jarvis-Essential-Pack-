// Página del panel. Se escribe en C:\CLAUDE\consumo\index.html al iniciar la sesión.
// Lee datos.js cada segundo (recargado con un script nuevo) y redibuja.
export const PAGE = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Consumo</title>
<style>
:root{--bg:#0b0e14;--panel:#121722;--line:#1f2736;--txt:#d6deeb;--dim:#6b7a90;--acc:#7dd3fc;--ok:#86efac}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.5 Consolas,'Cascadia Mono',monospace;padding:24px}
h1{font-size:12px;letter-spacing:.22em;color:var(--dim);margin:0 0 16px;text-transform:uppercase}
.grid{display:grid;grid-template-columns:320px 1fr;gap:16px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:18px}
.label{color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.12em}
.big{font-size:26px;color:var(--acc);margin:6px 0}
table{width:100%;border-collapse:collapse}
th,td{text-align:right;padding:9px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
th{color:var(--dim);font-weight:normal;font-size:11px;text-transform:uppercase}
td:first-child,th:first-child{text-align:left}
.share{width:150px}
.share i{display:block;height:6px;margin-top:4px;background:linear-gradient(90deg,var(--acc),var(--ok));border-radius:3px}
#ts{color:var(--dim);font-size:11px;margin-top:14px}
</style></head>
<body>
<h1>Consumo · sesión de Claude Code</h1>
<div class="grid">
  <div class="card">
    <div class="label">Contexto</div>
    <svg width="180" height="180" viewBox="0 0 120 120" style="display:block;margin:12px auto">
      <circle cx="60" cy="60" r="50" fill="none" stroke="#1f2736" stroke-width="10"/>
      <circle id="ring" cx="60" cy="60" r="50" fill="none" stroke="#7dd3fc" stroke-width="10" stroke-linecap="round" stroke-dasharray="0 314" transform="rotate(-90 60 60)"/>
      <text id="pct" x="60" y="67" text-anchor="middle" font-size="22" fill="#d6deeb">0%</text>
    </svg>
    <div id="ctx" style="text-align:center;color:var(--dim)"></div>
    <div class="label" style="margin-top:22px">Coste acumulado</div>
    <div class="big" id="coste">0 USD</div>
    <div class="label" style="margin-top:22px">Modelo de la sesión</div>
    <div id="modelo">—</div>
  </div>
  <div class="card">
    <div class="label">Por agente</div>
    <table>
      <thead><tr><th>Agente</th><th>Modelo</th><th>Entrada</th><th>Salida</th><th>Caché</th><th>Turnos</th><th class="share">Reparto</th></tr></thead>
      <tbody id="rows"><tr><td colspan="7" style="text-align:left;color:var(--dim)">Sin turnos todavía.</td></tr></tbody>
    </table>
  </div>
</div>
<div id="ts"></div>
<script>
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function n(x){return Number(x||0).toLocaleString('es-ES')}
function render(d){
  if(!d)return;
  var c=d.contexto||{tokens:0,window:1,percent:0};
  var p=Math.min(100,Number(c.percent)||0);
  document.getElementById('ring').setAttribute('stroke-dasharray',(p*3.14).toFixed(1)+' 314');
  document.getElementById('pct').textContent=p+'%';
  document.getElementById('ctx').textContent=n(c.tokens)+' / '+n(c.window)+' tokens';
  document.getElementById('coste').textContent=Number(d.coste||0).toFixed(4)+' USD';
  document.getElementById('modelo').textContent=d.modelo||'—';
  var agentes=d.agentes||[];
  var total=agentes.reduce(function(a,x){return a+x.input+x.output},0)||1;
  document.getElementById('rows').innerHTML=agentes.length?agentes.map(function(x){
    var s=Math.round((x.input+x.output)*100/total);
    return '<tr><td>'+esc(x.nombre)+'</td><td>'+esc(x.modelo)+'</td><td>'+n(x.input)+'</td><td>'+n(x.output)+'</td><td>'+n(x.cacheRead)+'</td><td>'+x.turns+'</td><td class="share">'+s+'%<i style="width:'+s+'%"></i></td></tr>';
  }).join(''):'<tr><td colspan="7" style="text-align:left;color:var(--dim)">Sin turnos todavía.</td></tr>';
  document.getElementById('ts').textContent='actualizado '+new Date(d.actualizado).toLocaleTimeString('es-ES');
}
function load(){
  var s=document.createElement('script');
  s.src='datos.js?'+Date.now();
  s.onload=function(){s.remove();render(window.CONSUMO)};
  s.onerror=function(){s.remove()};
  document.head.appendChild(s);
}
load();
setInterval(load,1000);
</script>
</body></html>`
