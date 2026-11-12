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
// Arriba, a todo el ancho: barra de progreso del plan de Claude (TaskCreate / TaskUpdate), con la lista plegable.
// Tecla D o botón de la cabecera: modo cómodo / compacto (se guarda en localStorage).
// Estética blanco-cian: fondo azul-negro, bordes y cifras en blanco con cian; rojo solo en alertas.
// Globo holográfico en canvas con un anillo blanco-cian inclinado (CSS 3D) que gira al revés, paneles de cristal y escaneo sutil.
// Fondo: degradado radial, nebulosa difuminada y rejilla de perspectiva que avanza despacio (quieta en compacto y con movimiento reducido).
import { LOGICA } from './senal'

export const PAGE = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Consumo · HUD</title>
<style>
:root{
  /* Paleta blanco-cian: blanco (#eaffff / #f4feff) y cian (#7fe7ff) en bordes, cifras y acentos; cian pálido en etiquetas.
     Aviso (contexto alto) en blanco puro; rojo solo en alerta crítica y señal caída. */
  --bg:#070b10;--txt:#f4feff;--sub:#a8f0ff;--wh:#eaffff;--ce:#7fe7ff;--wn:#ffffff;--rd:#ff4d4d;--ok:#eaffff;
  --line:rgba(127,231,255,.18);--faint:rgba(127,231,255,.10);--track:#03070b;--edge:rgba(127,231,255,.22);--edge-on:rgba(234,255,255,.8);
  --bord:linear-gradient(135deg,rgba(234,255,255,.5),rgba(127,231,255,.2) 45%,rgba(127,231,255,.42));
  --bord-on:linear-gradient(135deg,rgba(234,255,255,.95),rgba(127,231,255,.7));
  --wc:linear-gradient(90deg,#eaffff,#7fe7ff);
  --glass:rgba(12,22,32,.55);--glass2:rgba(5,9,14,.72);--thbg:#0a131c;
  --f-opus:#e8fbff;--f-haiku:#7fe7ff;--f-fable:#c4b5fd;--f-sonnet:#dbeafe;--f-otro:#dbeafe;
  --sans:Bahnschrift,'Segoe UI','Inter','Liberation Sans','DejaVu Sans',sans-serif;
  /* Texto: etiquetas >= 14 px, valores >= 16 px; crecen con la ventana. */
  --fk:clamp(14px,calc(.32vw + .38vh + 5px),18px);
  --fv:clamp(16px,calc(.42vw + .5vh + 5px),22px);
  --fbig:clamp(34px,calc(1.6vw + 2.2vh),64px);
  --gap:clamp(10px,1vw,18px);
  --pad:clamp(12px,1vw,20px);
}
body.lv-x{--edge:rgba(255,77,77,.4);--bord:linear-gradient(135deg,rgba(255,77,77,.55),rgba(255,77,77,.22) 45%,rgba(255,77,77,.4))}
body.compact{--gap:clamp(8px,.6vw,12px);--pad:clamp(10px,.7vw,14px);--fbig:clamp(30px,calc(1.3vw + 1.8vh),52px)}
*{box-sizing:border-box}
html,body{min-height:100%}
body{margin:0;background-color:var(--bg);color:var(--txt);font:var(--fv)/1.4 var(--sans);overflow-x:hidden;min-width:0;
  background-image:radial-gradient(ellipse 60% 55% at 22% 30%,rgba(127,231,255,.05),transparent 70%),radial-gradient(ellipse 70% 45% at 80% 110%,rgba(234,255,255,.035),transparent 70%),radial-gradient(ellipse 120% 100% at 50% 45%,#05080d 0%,#070c13 55%,#0a1420 100%);background-attachment:fixed}
/* Fondo: nebulosa (dos radiales difuminados) y rejilla de perspectiva en cian muy tenue. Detrás de todo, sin eventos. */
.neb{position:fixed;inset:-10%;z-index:0;pointer-events:none;filter:blur(40px);
  background:radial-gradient(ellipse 38% 30% at 28% 26%,rgba(127,231,255,.07),transparent 70%),radial-gradient(ellipse 34% 28% at 76% 70%,rgba(140,170,255,.06),transparent 70%)}
.floor{position:fixed;left:-40%;right:-40%;bottom:0;height:46vh;z-index:0;pointer-events:none;overflow:hidden;
  transform:perspective(380px) rotateX(64deg);transform-origin:50% 100%;
  -webkit-mask-image:linear-gradient(0deg,#000,transparent 88%);mask-image:linear-gradient(0deg,#000,transparent 88%)}
.floor i{position:absolute;left:0;right:0;top:-64px;bottom:0;opacity:.55;animation:floor 7s linear infinite;
  background-image:linear-gradient(rgba(127,231,255,.11) 1px,transparent 1px),linear-gradient(90deg,rgba(127,231,255,.11) 1px,transparent 1px);background-size:64px 64px}
body.compact .floor i{animation:none}
/* Línea de escaneo horizontal, muy sutil */
.scan{position:fixed;left:0;right:0;top:0;height:90px;z-index:7;pointer-events:none;animation:scan 9s cubic-bezier(.4,0,.6,1) infinite;
  background:linear-gradient(180deg,transparent,rgba(127,231,255,.025) 85%,rgba(200,245,255,.12) 99%,transparent)}
body:before{content:"";position:fixed;inset:0;pointer-events:none;z-index:8;opacity:0;transition:opacity .6s;
  box-shadow:inset 0 0 130px rgba(255,77,77,.42)}
body.lv-x:before{opacity:1;animation:alarm 1.6s ease-in-out infinite}
body.lv-w:before{opacity:.5;box-shadow:inset 0 0 90px rgba(234,255,255,.2)}
.wrap{position:relative;z-index:2;min-height:100vh;display:flex;flex-direction:column;gap:var(--gap);padding:var(--pad) clamp(16px,1.4vw,26px);max-width:2200px;margin:0 auto}
.k{color:var(--sub);font-size:var(--fk);letter-spacing:.08em;text-transform:uppercase}
.num{font-variant-numeric:tabular-nums}

/* Cabecera */
header{display:flex;align-items:center;flex-wrap:wrap;gap:10px 18px;border-bottom:1px solid var(--line);padding-bottom:10px;position:relative}
header:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1px;background:linear-gradient(90deg,var(--wh),var(--ce) 18%,transparent 40%)}
.logo{flex:none;width:28px;height:28px;border:2px solid var(--wh);border-radius:50%;position:relative;box-shadow:0 0 10px rgba(127,231,255,.5)}
.logo:after{content:"";position:absolute;inset:4px;border-radius:50%;border:1px dashed var(--ce);animation:spin 8s linear infinite}
h1{margin:0;font-size:var(--fv);font-weight:normal;letter-spacing:.28em;color:var(--txt);text-shadow:0 0 12px rgba(127,231,255,.45);text-transform:uppercase;white-space:nowrap}
h1 .brand{color:var(--sub)}
.alerts{display:flex;gap:10px;flex-wrap:wrap;min-width:0}
.al{display:none;font-size:var(--fk);letter-spacing:.08em;text-transform:uppercase;padding:4px 14px;border:1px solid currentColor;border-radius:999px;background:rgba(7,11,16,.6)}
.al.on{display:block;animation:blink 1.2s steps(2,start) infinite}
#al-ctx.w{color:var(--wn);box-shadow:inset 0 0 12px rgba(127,231,255,.35);animation:none}
#al-ctx.x{color:var(--rd);box-shadow:inset 0 0 14px rgba(255,77,77,.45)}
#al-sig{color:var(--rd);box-shadow:inset 0 0 14px rgba(255,77,77,.45)}
.hstat{margin-left:auto;display:flex;gap:clamp(12px,1.4vw,26px);align-items:center;flex-wrap:wrap}
.hstat>div{text-align:right}
.hstat .v{color:var(--txt);font-size:var(--fv);white-space:nowrap}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--ce);box-shadow:0 0 8px var(--ce);margin-right:8px;vertical-align:1px;animation:pulse 1.6s ease-in-out infinite}
.dot.wait{background:var(--wh);box-shadow:0 0 8px var(--wh)}
.dot.off{background:var(--rd);box-shadow:0 0 8px var(--rd);animation:blink 1s steps(2,start) infinite}
#dens{font:var(--fk) var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--txt);background:rgba(127,231,255,.06);
  border:1px solid var(--edge);border-radius:8px;padding:6px 12px;cursor:pointer;white-space:nowrap;transition:border-color .3s,background .3s,box-shadow .3s}
#dens:hover,#dens:focus-visible{background:rgba(127,231,255,.14);outline:none;border-color:var(--ce);box-shadow:0 0 12px rgba(127,231,255,.3)}
#dens kbd{font:inherit;color:var(--ce);border:1px solid var(--ce);border-radius:4px;padding:0 5px;margin-right:8px}

/* Paneles de cristal: fondo translúcido con desenfoque y borde en degradado blanco-cian; se ilumina en cian suave al pasar el ratón o al cambiar de estado. */
.pnl{position:relative;min-width:0;min-height:0;border-radius:12px;border:1px solid transparent;
  background:linear-gradient(160deg,var(--glass),var(--glass2)) padding-box,var(--bord) border-box;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  box-shadow:0 18px 36px rgba(0,0,0,.4);transition:box-shadow .8s}
.pnl:hover,.pnl.lit{background:linear-gradient(160deg,var(--glass),var(--glass2)) padding-box,var(--bord-on) border-box;box-shadow:0 0 22px rgba(127,231,255,.18),0 18px 36px rgba(0,0,0,.4);transition:box-shadow .25s}
body.lv-w #p-ctx{background:linear-gradient(160deg,var(--glass),var(--glass2)) padding-box,var(--bord-on) border-box;box-shadow:0 0 20px rgba(234,255,255,.16),0 18px 36px rgba(0,0,0,.4)}
body.lv-x #p-ctx{box-shadow:inset 0 0 0 1px rgba(255,77,77,.85),0 0 22px rgba(255,77,77,.2),0 18px 36px rgba(0,0,0,.4)}
.pnl>.in{position:relative;height:100%;padding:var(--pad);overflow:hidden;border-radius:inherit;display:flex;flex-direction:column;min-height:0}
.pnl>.in:before{content:"";position:absolute;left:14px;top:0;width:36%;height:1px;background:linear-gradient(90deg,var(--wh),var(--ce) 55%,transparent);pointer-events:none;opacity:.9}
body.lv-x .pnl>.in:before{background:linear-gradient(90deg,var(--rd),transparent)}
.pnl:before,.pnl:after{content:"";position:absolute;width:14px;height:14px;z-index:2;pointer-events:none;opacity:.8}
.pnl:before{right:-1px;top:-1px;border-top:2px solid var(--wh);border-right:2px solid var(--ce);border-top-right-radius:12px}
.pnl:after{left:-1px;bottom:-1px;border-left:2px solid var(--wh);border-bottom:2px solid var(--ce);border-bottom-left-radius:12px}
body.lv-x .pnl:before,body.lv-x .pnl:after{border-color:var(--rd)}
.ph{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--line);border-image:linear-gradient(90deg,rgba(234,255,255,.45),rgba(127,231,255,.22) 50%,rgba(127,231,255,.06)) 1;flex:none;min-width:0}
.ph .t{font-size:var(--fk);letter-spacing:.18em;text-transform:uppercase;color:var(--txt);text-shadow:0 0 10px rgba(127,231,255,.35);white-space:nowrap}
.ph .t:before{content:"";display:inline-block;width:14px;height:1px;background:var(--wc);vertical-align:.3em;margin-right:10px}
.ph .r{margin-left:auto;font-size:var(--fk);color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}

/* Plan: barra de progreso a todo el ancho, encima de la rejilla */
#p-plan{flex:none}
#p-plan>.in{gap:10px}
.plh{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 16px;min-width:0}
.plt{font-size:clamp(18px,calc(.6vw + .7vh + 6px),30px);color:var(--txt);letter-spacing:.08em;white-space:nowrap}
.plt b{font-weight:normal;color:var(--txt);text-shadow:0 0 10px rgba(127,231,255,.5)}
.plt.vacio{color:var(--sub);font-size:var(--fv)}
.plok{display:none;font-size:var(--fk);letter-spacing:.12em;color:var(--bg);background:var(--ok);padding:2px 10px;border-radius:4px;box-shadow:0 0 12px rgba(127,231,255,.6)}
.plcur{margin-left:auto;font-size:var(--fk);color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;max-width:100%}
.plcur em{font-style:normal;color:var(--ce)}
.plbar{position:relative;height:clamp(16px,2vh,24px);background:var(--track);border:1px solid var(--edge);border-radius:999px;overflow:hidden}
.plfill{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:inherit;background-color:var(--ce);box-shadow:0 0 14px rgba(127,231,255,.6);
  background-image:repeating-linear-gradient(90deg,transparent 0 14px,rgba(7,11,16,.35) 14px 16px),var(--wc);
  transition:width 1.1s cubic-bezier(.2,.8,.2,1),background-color .6s,box-shadow .6s}
#p-plan.done .plt b{color:var(--ok);text-shadow:0 0 12px rgba(127,231,255,.6)}
#p-plan.done .plok{display:inline-block}
#p-plan.done .plfill{background-color:var(--ok);box-shadow:0 0 18px rgba(127,231,255,.75)}
#p-plan.done .plbar{border-color:rgba(234,255,255,.6)}
.pll summary{cursor:pointer;font-size:var(--fk);color:var(--ce);letter-spacing:.08em;text-transform:uppercase;list-style:none;display:inline-block}
.pll summary::-webkit-details-marker{display:none}
.pll summary:before{content:"+ ";color:var(--wh)}
.pll[open] summary:before{content:"- "}
.pll summary:focus-visible{outline:1px solid var(--ce);outline-offset:3px}
.pll ol{margin:8px 0 0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));gap:4px 18px;max-height:min(16vh,9em);overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(127,231,255,.4) transparent}
.pll li{display:flex;gap:10px;align-items:baseline;min-width:0;font-size:var(--fk);color:var(--txt)}
.pll li span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.pll li i{font-style:normal;flex:none;width:7.5em;color:var(--sub);text-transform:uppercase;letter-spacing:.04em}
.pll li.c i{color:var(--ce)}.pll li.c span{color:var(--sub);text-decoration:line-through}
.pll li.e i{color:var(--wn);text-shadow:0 0 8px rgba(127,231,255,.6)}
.pll.off{display:none}
body.compact .pll,body.compact .plcur{display:none}
body.compact #p-plan>.in{gap:6px}

/* Rejilla: una sola, con áreas que cambian según el ancho */
.grid{flex:1;display:grid;gap:var(--gap);min-height:0;min-width:0;
  grid-template-columns:minmax(0,1fr);
  grid-template-areas:"ctx" "cost" "mod" "agt" "hist"}
#p-ctx{grid-area:ctx}#p-cost{grid-area:cost}#p-mod{grid-area:mod}#p-chart{grid-area:chart;display:none}#p-hist{grid-area:hist}#p-agt{grid-area:agt}
body.compact #p-hist{display:none}
body.compact .grid{grid-template-areas:"ctx" "cost" "mod" "agt"}

/* Contexto: globo holográfico (canvas) con un anillo blanco-cian inclinado (CSS 3D) que gira al revés, sobre un halo cian */
.ctxb{display:flex;flex-direction:column;align-items:center;gap:var(--gap);flex:1;min-height:0;justify-content:center}
.reactor{position:relative;width:100%;max-width:min(300px,29vh);aspect-ratio:1;flex:none}
/* Halo cian detrás del globo */
.reactor:before{content:"";position:absolute;inset:-18%;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(127,231,255,.16),rgba(127,231,255,.06) 42%,transparent 68%)}
body.lv-x .reactor:before{background:radial-gradient(circle,rgba(255,77,77,.14),rgba(255,77,77,.05) 42%,transparent 68%)}
#globe{position:absolute;inset:0;width:100%;height:100%;display:block}
.face{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible}
.halo{position:absolute;inset:0;perspective:700px;pointer-events:none}
.gring{position:absolute;inset:3%;transform-style:preserve-3d;transform:rotateX(72deg) rotateY(-14deg)}
.gring svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;animation:spin 16s linear infinite;filter:drop-shadow(0 0 4px rgba(127,231,255,.7))}
body.lv-x .gring svg{animation-duration:5s}
.tick{stroke:rgba(127,231,255,.14);stroke-width:2;transition:stroke .5s}
.tick.on{stroke:var(--ce)}
.tick.on.w{stroke:var(--wn)}
.tick.on.x{stroke:var(--rd)}
.mark{stroke-width:1.5}
#arc{transition:stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1),stroke .5s;filter:drop-shadow(0 0 4px currentColor)}
#pct,#coste{transition:color .8s,text-shadow .8s}
.rc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;z-index:1}
.rc .p{font-size:var(--fbig);color:var(--txt);line-height:1;transition:color .5s;
  text-shadow:0 0 4px var(--bg),0 0 14px rgba(7,11,16,.95),0 0 26px rgba(127,231,255,.4)}
.rc .p small{font-size:max(16px,.45em);color:var(--ce)}
.rc .k{margin-top:6px;color:var(--txt);text-shadow:0 0 6px var(--bg),0 0 10px var(--bg)}
body.lv-w .rc .p small{color:var(--wn)}
body.lv-x .rc .p{color:#ffe1dc;text-shadow:0 0 4px var(--bg),0 0 16px rgba(255,77,77,.9)}
body.lv-x .rc .p small{color:var(--rd)}
.kv{display:grid;grid-template-columns:auto auto;justify-content:space-between;gap:6px 16px;width:100%;align-items:baseline}
.kv .v{text-align:right;color:var(--txt);font-size:var(--fv);white-space:nowrap}
body.compact .kv .opt{display:none}

/* Coste */
.cost{font-size:var(--fbig);color:var(--txt);text-shadow:0 0 14px rgba(127,231,255,.45);line-height:1.05;margin:0 0 4px;white-space:nowrap}
.cost small{font-size:var(--fk);color:var(--sub);letter-spacing:.1em;margin-left:8px}
.sub{color:var(--sub);font-size:var(--fk);margin-bottom:8px}
.mdl{color:var(--ce);font-size:var(--fv);overflow-wrap:anywhere}

/* Barras segmentadas */
.seg{display:flex;gap:2px;height:10px;align-items:stretch;min-width:0}
.seg i{flex:1;background:var(--track);transition:background .5s,box-shadow .5s;transform:skewX(-20deg)}
/* Relleno: cada segmento mezcla de blanco hacia el color de la barra (cian por defecto), así la barra entera es un degradado. */
.seg i.on{background:var(--c,var(--ce));background:color-mix(in srgb,var(--c,var(--ce)) calc(var(--k,1)*100%),#eaffff);box-shadow:0 0 5px var(--c,var(--ce))}
.seg.sm{height:7px;gap:1px}
.stack{display:flex;height:8px;gap:4px;margin:0 0 14px;flex:none}
.stack div{height:100%;background:var(--c);background:linear-gradient(90deg,color-mix(in srgb,var(--c) 55%,#eaffff),var(--c));box-shadow:0 0 8px var(--c);opacity:.9;min-width:3px;border-radius:2px}
.stack.empty{background:var(--track)}

/* Reparto por modelo: nombre, barra, %, turnos */
.cmp{display:grid;grid-template-columns:minmax(130px,15em) minmax(60px,1fr) 4.5em 5.5em;gap:10px 16px;align-items:center}
.cmp .hd{font-size:var(--fk);color:var(--sub);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
.cmp .nm{display:flex;flex-direction:column;min-width:0;border-left:2px solid var(--c);padding-left:10px}
.cmp .nm b{font-weight:normal;color:var(--c);letter-spacing:.12em;font-size:var(--fv);white-space:nowrap}
.cmp .nm b em{font-style:normal;font-size:14px;letter-spacing:.06em;color:var(--bg);background:var(--ce);border-radius:3px;padding:0 5px;margin-left:8px;vertical-align:1px}
.cmp .nm span{color:var(--sub);font-size:var(--fk);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.compact .cmp .nm span{display:none}
.cmp .pc{font-size:var(--fv);color:var(--txt);text-align:right;white-space:nowrap}
.cmp .tn{font-size:var(--fv);color:var(--txt);text-align:right;white-space:nowrap}
.cmp .hd.tn{font-size:var(--fk);color:var(--sub)}
.cmp .zero{opacity:.55}
.r-al{text-align:right}

/* Gráfica */
.chart{position:relative;flex:1;min-height:70px}
.chart svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.chart text{font:14px var(--sans);fill:var(--sub)}
.legend{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:var(--fk);color:var(--sub);margin-top:8px;flex:none}
.legend i{display:inline-block;width:11px;height:11px;border-radius:50%;background:var(--c);box-shadow:0 0 6px var(--c);margin-right:6px;vertical-align:-1px}
.legend i.ln{height:3px;border-radius:0;vertical-align:3px}
.bar{transition:height .6s,y .6s}

/* Tablas */
.tblw{overflow:auto;min-height:0;flex:1;max-height:440px;scrollbar-width:thin;scrollbar-color:rgba(127,231,255,.4) transparent}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{text-align:right;padding:6px 8px;border-bottom:1px solid rgba(127,231,255,.09);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
td{font-size:var(--fv)}
th{color:var(--sub);font-weight:normal;font-size:var(--fk);letter-spacing:.06em;text-transform:uppercase;position:sticky;top:0;background:var(--thbg);z-index:1}
th:first-child,td:first-child{padding-left:2px}
.al-l{text-align:left}
th .sh{display:none}
.w-hora{width:6.2em}.w-mdl{width:6.5em}.w-tok{width:6em}.w-usd{width:5.8em}.w-trn{width:6.4em}.w-share{width:11em}
tbody tr:hover td{background:rgba(127,231,255,.05)}
td .ftag{color:var(--c);letter-spacing:.06em}
td.dimc{color:var(--sub)}
td.amc{color:var(--wh)}
tr.new td{animation:flash 1.4s ease-out}
.share{display:flex;align-items:center;gap:10px;justify-content:flex-end}
.share .seg{flex:1}
.share .sv{flex:none;min-width:3.5em;text-align:right}
.empty-row{color:var(--sub);text-align:left!important;font-size:var(--fk)!important;padding:14px 8px!important}

footer{display:flex;gap:18px;justify-content:space-between;font-size:var(--fk);color:var(--sub);border-top:1px solid var(--line);border-image:linear-gradient(90deg,rgba(234,255,255,.4),rgba(127,231,255,.2) 50%,rgba(127,231,255,.05)) 1;padding-top:8px;flex-wrap:wrap}
footer .line{flex:1;align-self:center;height:1px;background:linear-gradient(90deg,var(--line),transparent);min-width:20px}
body.compact footer{display:none}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.75}50%{opacity:1}}
@keyframes blink{to{opacity:.6}}
@keyframes alarm{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes floor{to{transform:translateY(64px)}}
@keyframes scan{from{transform:translateY(-100px)}to{transform:translateY(100vh)}}
@keyframes shift{from{opacity:.8;transform:scale(.2)}to{opacity:0;transform:scale(2.4)}}
.shift{position:fixed;left:50%;top:50%;width:60vmin;height:60vmin;margin:-30vmin 0 0 -30vmin;border-radius:50%;pointer-events:none;z-index:7;
  border:2px solid currentColor;box-shadow:0 0 40px currentColor,inset 0 0 40px currentColor;animation:shift 1.1s ease-out forwards}
@keyframes flash{from{background:rgba(127,231,255,.16)}to{background:transparent}}
@media (prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}.scan,.shift{display:none}}
/* Compacto: menos capas de efecto, la lectura primero */
body.compact .scan,body.compact .gring svg .g2{display:none}

/* < 900 px: una columna. Estrecho: menos columnas en las tablas. */
@media (max-width:899px){
  .hstat{margin-left:0;width:100%;justify-content:space-between}
  .hstat>div{text-align:left}
  .reactor{max-width:min(260px,60vw)}
}
@media (max-width:640px){
  .plcur{margin-left:0;flex-basis:100%}
  .pll li i{width:6.5em}
  h1{letter-spacing:.14em}
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
  .reactor{max-width:min(380px,24vh)}
}

/* Si la ventana es alta y ancha, todo cabe sin desplazar la página. */
@media (min-width:900px) and (min-height:700px){
  .wrap{height:100vh}
  /* La fila de abajo (coste) nunca se recorta: el alto que quita la barra del plan sale de la fila del medio. */
  .grid{overflow:hidden;grid-template-rows:auto minmax(0,1fr) minmax(min-content,.85fr)}
  body.compact .grid{grid-template-rows:auto minmax(0,1fr) auto}
  .tblw{max-height:none}
}
@media (min-width:1600px) and (min-height:700px){
  .grid,body.compact .grid{grid-template-rows:auto minmax(0,1fr) minmax(min-content,1fr)}
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
<div class="neb" aria-hidden="true"></div>
<div class="floor" aria-hidden="true"><i></i></div>
<div class="scan" aria-hidden="true"></div>
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

<section class="pnl" id="p-plan"><div class="in">
  <div class="plh">
    <span class="plt vacio num" id="pltxt">PLAN · sin tareas activas</span>
    <span class="plok">COMPLETADO</span>
    <span class="plcur" id="plcur"></span>
  </div>
  <div class="plbar" role="progressbar" aria-label="Progreso del plan" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="plbar"><div class="plfill" id="plfill"></div></div>
  <details class="pll off" id="pll"><summary id="plsum">Tareas</summary><ol id="plist"></ol></details>
</div></section>

<div class="grid">
  <section class="pnl" id="p-ctx"><div class="in">
    <div class="ph"><span class="t">Contexto</span><span class="r" id="ctxstate">Nominal</span></div>
    <div class="ctxb">
      <div class="reactor">
        <canvas id="globe" aria-hidden="true"></canvas>
        <svg class="face" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="98" fill="none" stroke="rgba(127,231,255,.18)" stroke-width=".8"/>
          <circle id="arc" cx="100" cy="100" r="94" fill="none" stroke="#7fe7ff" stroke-width="2" stroke-linecap="round" stroke-dasharray="590.6" stroke-dashoffset="590.6" transform="rotate(-90 100 100)"/>
          <g id="ticks"></g>
          <line class="mark" x1="100" y1="1" x2="100" y2="12" stroke="#eaffff" transform="rotate(252 100 100)"/>
          <line class="mark" x1="100" y1="1" x2="100" y2="12" stroke="#ff4d4d" transform="rotate(306 100 100)"/>
        </svg>
        <div class="halo" aria-hidden="true"><div class="gring"><svg viewBox="0 0 200 200">
          <defs><linearGradient id="gwc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eaffff"/><stop offset="1" stop-color="#7fe7ff"/></linearGradient></defs>
          <circle cx="100" cy="100" r="96" fill="none" stroke="url(#gwc)" stroke-width="2.4" stroke-dasharray="70 10 10 10"/>
          <circle class="g2" cx="100" cy="100" r="88" fill="none" stroke="#7fe7ff" stroke-opacity=".6" stroke-width="1.6" stroke-dasharray="2 5"/>
          <circle cx="100" cy="4" r="3" fill="#f4feff"/>
        </svg></div></div>
        <div class="rc"><div class="p num" id="pct">0<small>%</small></div><div class="k">usado</div></div>
      </div>
      <div class="kv">
        <span class="k">Tokens</span><span class="v num" id="ctxtok">0</span>
        <span class="k">Libre</span><span class="v num" id="ctxfree">0</span>
        <span class="k opt">Ventana</span><span class="v num opt" id="ctxwin">0</span>
        <span class="k opt">Avisos</span><span class="v num opt"><span style="color:var(--wn)">70%</span> / <span style="color:var(--rd)">85%</span></span>
      </div>
    </div>
  </div></section>

  <section class="pnl" id="p-cost"><div class="in">
    <div class="ph"><span class="t">Coste</span></div>
    <div class="cost num" id="coste">0.0000<small>USD</small></div>
    <div class="sub" id="clast">Sin turnos todavía</div>
    <div class="k">Modelo de la sesión</div>
    <div class="mdl" id="modelo">—</div>
  </div></section>

  <section class="pnl" id="p-mod"><div class="in">
    <div class="ph"><span class="t">Reparto por modelo</span><span class="r num" id="mtot">0 tokens</span></div>
    <div class="stack empty" id="stack"></div>
    <div class="cmp" id="cmp"></div>
  </div></section>

  <section class="pnl" id="p-chart"><div class="in">
    <div class="ph"><span class="t">Tokens por turno</span><span class="r num" id="cmax"></span></div>
    <div class="chart" id="chart"></div>
    <div class="legend" id="clegend"></div>
  </div></section>

  <section class="pnl" id="p-hist"><div class="in">
    <div class="ph"><span class="t">Últimos turnos</span><span class="r num" id="hcount">0</span></div>
    <div class="tblw">
      <table id="hist">
        <thead><tr><th class="al-l h-hora w-hora">Hora</th><th class="al-l">Agente</th><th class="al-l w-mdl">Modelo</th><th class="w-tok">Tokens</th><th class="w-usd">USD</th></tr></thead>
        <tbody id="hrows"><tr><td colspan="5" class="empty-row">Sin turnos todavía</td></tr></tbody>
      </table>
    </div>
  </div></section>

  <section class="pnl" id="p-agt"><div class="in">
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
var WARN=70,CRIT=85,NT=60,DKEY='consumo.densidad',PKEY='consumo.plan.abierto';
var lastData=null,seenTurns={},firstRender=true;
// Señal y lectura de datos.js: funciones de senal.ts, probadas en consumo.test.tsx.
/*LOGICA*/
` + LOGICA + `
/*FIN*/
var ST=nuevoEstado(Date.now());
var VACIO={modelo:'',contexto:{tokens:0,window:0,percent:0},alerta:'normal',coste:0,modelos:[],agentes:[],historial:[],plan:null,actualizado:0,latido:0};
function $id(i){return document.getElementById(i)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function n(x){return Number(x||0).toLocaleString('es-ES')}
function kn(x){x=Number(x||0);if(x>=1e6)return (x/1e6).toFixed(x>=1e7?1:2)+'M';if(x>=1e4)return (x/1e3).toFixed(1)+'k';return n(x)}
function fam(m){m=String(m||'').toLowerCase();for(var k in FAM){if(k!=='otro'&&m.indexOf(k)>=0)return k}return 'otro'}
function col(f){return 'var(--f-'+(FAM[f]?f:'otro')+')'}
var HEX={opus:'#e8fbff',haiku:'#7fe7ff',fable:'#c4b5fd',sonnet:'#dbeafe',otro:'#dbeafe'};
function segs(p,c,cls,count){count=count||24;var on=Math.round(Math.max(0,Math.min(100,p))*count/100);if(p>0&&on===0)on=1;var h='';for(var i=0;i<count;i++)h+='<i'+(i<on?' class="on" style="--k:'+(on>1?(i/(on-1)).toFixed(2):1)+'"':'')+'></i>';return '<div class="seg'+(cls?' '+cls:'')+'" style="--c:'+c+'">'+h+'</div>'}
function pc(x){x=Number(x||0);return (x>=10||x===0?Math.round(x):x.toFixed(1))}
function hhmm(t){return t?new Date(t).toLocaleTimeString('es-ES'):'—'}
(function(){
  var g=$id('ticks'),h='';
  for(var i=0;i<NT;i++){var a=(i/NT)*360;h+='<line class="tick" x1="100" y1="15" x2="100" y2="22" transform="rotate('+a.toFixed(2)+' 100 100)"/>'}
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

// Gráfica SVG: barras apiladas entrada/salida por turno, color del modelo; línea blanca con el coste.
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
    s+='<line x1="'+L+'" x2="'+(L+iw)+'" y1="'+y+'" y2="'+y+'" stroke="'+(i?'rgba(127,231,255,.12)':'rgba(127,231,255,.45)')+'" stroke-width="1" '+(i?'stroke-dasharray="2 4"':'')+'/>';
    if(i%2===0){
      s+='<text x="'+(L-8)+'" y="'+(y+5)+'" text-anchor="end">'+kn(top*i/4)+'</text>';
      if(ctop)s+='<text x="'+(L+iw+8)+'" y="'+(y+5)+'" style="fill:#eaffff">'+(ctop*i/4).toFixed(ctop<0.1?3:2)+'</text>';
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
  if(pts.length>1)s+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="#f4feff" stroke-width="1.8" style="filter:drop-shadow(0 0 3px rgba(127,231,255,.7))"/>';
  pts.forEach(function(p){var q=p.split(',');s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="2.6" fill="#070b10" stroke="#f4feff" stroke-width="1.4"/>'});
  s+='</svg>';
  box.innerHTML=s;
  $id('cmax').textContent=hs.length?('pico '+kn(mx)+' tokens'):'';
  var fams={};hs.forEach(function(t){fams[t.familia||fam(t.modelo)]=1});
  var lg=Object.keys(fams).map(function(f){return '<span><i style="--c:'+col(f)+'"></i>'+FAM[f]+'</span>'}).join('');
  lg+='<span>claro = entrada, vivo = salida</span>';
  if(ctop)lg+='<span><i class="ln" style="--c:var(--txt)"></i>USD por turno</span>';
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
  seenTurns=fresh;if(hs.length)firstRender=false;
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

// Transiciones: los números grandes se deslizan al valor nuevo y un cambio de nivel lanza una onda.
var nivel=null,tw={};
function tween(id,to,fmt){
  var el=$id(id),t=tw[id]||(tw[id]={v:to,raf:0});
  if(t.raf)cancelAnimationFrame(t.raf);
  var from=t.v,t0=performance.now(),dur=650;
  if(from===to||document.hidden){t.v=to;el.innerHTML=fmt(to);return}
  (function step(now){var k=Math.min(1,(now-t0)/dur);k=1-Math.pow(1-k,3);t.v=from+(to-from)*k;el.innerHTML=fmt(t.v);if(k<1)t.raf=requestAnimationFrame(step);else{t.v=to;t.raf=0}})(t0);
}
function onda(lvl){
  var o=document.createElement('div');o.className='shift';
  o.style.color=lvl==='x'?'#ff4d4d':lvl==='w'?'#ffffff':'#7fe7ff';
  document.body.appendChild(o);setTimeout(function(){o.remove()},1200);
}
// Borde blanco-cian que se enciende un momento cuando un panel cambia de estado.
function lit(els){for(var i=0;i<els.length;i++)(function(el){el.classList.add('lit');clearTimeout(el._lit);el._lit=setTimeout(function(){el.classList.remove('lit')},1200)})(els[i])}
var GLOBO={lvl:'',size:null};
function renderCtx(d){
  var c=d.contexto||{tokens:0,window:1,percent:0};
  var p=Math.max(0,Math.min(100,Number(c.percent)||0));
  var lvl=d.alerta?(d.alerta==='critica'?'x':d.alerta==='alta'?'w':''):(p>=CRIT?'x':p>=WARN?'w':'');
  if(lvl!==nivel){if(nivel!==null){onda(lvl);lit(document.querySelectorAll('.pnl'))}nivel=lvl;GLOBO.lvl=lvl}
  document.body.classList.toggle('lv-w',lvl==='w');
  document.body.classList.toggle('lv-x',lvl==='x');
  var on=Math.round(p*NT/100),ts=document.querySelectorAll('.tick');
  for(var i=0;i<ts.length;i++)ts[i].setAttribute('class','tick'+(i<on?' on'+(lvl?' '+lvl:''):''));
  var arc=$id('arc'),hex=lvl==='x'?'#ff4d4d':lvl==='w'?'#ffffff':'#7fe7ff';
  arc.style.strokeDashoffset=(590.6*(1-p/100)).toFixed(1);
  arc.setAttribute('stroke',hex);arc.style.color=hex;
  tween('pct',p,function(v){return pc(v)+'<small>%</small>'});
  var st=$id('ctxstate');
  st.textContent=lvl==='x'?'Crítico':lvl==='w'?'Alto':'Nominal';
  st.style.color=lvl==='x'?'var(--rd)':lvl==='w'?'var(--wn)':'';
  var al=$id('al-ctx');
  al.className='al'+(lvl?' on '+lvl:'');
  al.textContent=lvl==='x'?'Contexto crítico '+pc(p)+'%':'Contexto alto '+pc(p)+'%';
  $id('ctxtok').textContent=n(c.tokens);
  $id('ctxwin').textContent=n(c.window);
  $id('ctxfree').textContent=n(Math.max(0,(c.window||0)-(c.tokens||0)));
}

// Plan de Claude: N de M · P %, la barra se llena con transición y al 100 % pasa a blanco con brillo cian.
var ESTADO={'pendiente':'Pendiente','en curso':'En curso','completada':'Hecha'};
function renderPlan(d){
  var p=d.plan,box=$id('p-plan'),txt=$id('pltxt'),bar=$id('plbar'),lst=$id('pll');
  var ok=!!(p&&p.total>0);
  var tot=ok?Number(p.total)||0:0,hechas=ok?Math.min(tot,Number(p.completadas)||0):0;
  var pct=ok?Math.max(0,Math.min(100,Math.round(Number(p.porcentaje!=null?p.porcentaje:hechas*100/tot)||0))):0;
  if(ok&&hechas===tot)pct=100;
  var done=ok&&pct>=100;
  if(box._pct!=null&&box._pct!==pct)lit([box]);box._pct=pct;
  box.classList.toggle('done',done);
  txt.className='plt num'+(ok?'':' vacio');
  txt.innerHTML=ok?'PLAN · <b>'+n(hechas)+' de '+n(tot)+'</b> · <b>'+pct+' %</b>':'PLAN · sin tareas activas';
  $id('plfill').style.width=pct+'%';
  bar.setAttribute('aria-valuenow',String(pct));
  var ts=ok&&p.tareas?p.tareas:[];
  var cur=ts.filter(function(t){return t.estado==='en curso'})[0];
  $id('plcur').innerHTML=cur?'<em>En curso</em> · '+esc(cur.titulo):'';
  $id('plcur').title=cur?cur.titulo:'';
  lst.classList.toggle('off',!ts.length);
  $id('plsum').textContent='Tareas ('+ts.length+')';
  $id('plist').innerHTML=ts.map(function(t){
    var c=t.estado==='completada'?'c':t.estado==='en curso'?'e':'p';
    return '<li class="'+c+'" title="'+esc(t.titulo)+'"><i>'+esc(ESTADO[t.estado]||t.estado)+'</i><span>'+esc(t.titulo)+'</span></li>';
  }).join('');
}
(function(){var v=null;try{v=localStorage.getItem(PKEY)}catch(e){}if(v==='1')$id('pll').open=true})();
$id('pll').addEventListener('toggle',function(){try{localStorage.setItem(PKEY,$id('pll').open?'1':'0')}catch(e){}});

function render(d){
  if(!d)return;
  lastData=d;
  renderCtx(d);
  renderPlan(d);
  tween('coste',Number(d.coste||0),function(v){return v.toFixed(4)+'<small>USD</small>'});
  $id('modelo').textContent=d.modelo||'—';
  renderModels(d);
  renderChart(d);
  renderHist(d);
  renderAgents(d);
  $id('ts').textContent='Último dato: '+hhmm(d.actualizado);
}

function pintaSenal(){
  var r=senal(ST,Date.now());
  $id('link').innerHTML='<span class="dot'+(r.estado==='ok'?'':r.estado==='espera'?' wait':' off')+'"></span>'+r.texto;
  var a=$id('al-sig');
  a.className='al'+(r.alerta?' on':'');
  a.textContent=r.aviso;
  $id('beat').textContent='Latido: '+(r.segundos==null?'—':'hace '+r.segundos+' s');
  document.body.classList.toggle('sig-off',r.alerta);
}
// Un error de sintaxis en datos.js (escritura a medias) no debe ensuciar la consola ni parar nada.
window.onerror=function(msg,src){if(src&&String(src).indexOf('datos.js')>=0)return true};
// Una sola lectura a la vez: si una tarda, no se mezclan respuestas viejas con nuevas.
var cargando=0;
function load(){
  var now=Date.now();
  if(cargando&&now-cargando<5000)return;
  cargando=now;
  window.CONSUMO=undefined;
  var s=document.createElement('script');
  s.src='datos.js?'+now;
  s.onload=function(){
    s.remove();cargando=0;
    var d=window.CONSUMO;
    if(alCargar(ST,d,Date.now())){try{render(d)}catch(err){}}
    pintaSenal();
  };
  s.onerror=function(){s.remove();cargando=0;alFallar(ST);pintaSenal()};
  document.head.appendChild(s);
}
function tick(){$id('clock').textContent=new Date().toLocaleTimeString('es-ES')}
var rz;window.addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(function(){if(lastData)renderChart(lastData)},120)});
// Globo holográfico: meridianos y paralelos sobre un eje inclinado, con nodos fijos. Se para con la ventana oculta y con movimiento reducido.
(function(){
  var cv=$id('globe'),cx=cv.getContext&&cv.getContext('2d');if(!cx)return;
  var mq=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
  var S=0,dpr=1,a=0,last=0;
  var seed=7,nodes=[];function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647}
  for(var k=0;k<26;k++)nodes.push([Math.asin(rnd()*2-1),rnd()*Math.PI*2]);
  function size(){var r=cv.getBoundingClientRect();dpr=window.devicePixelRatio||1;S=r.width;cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);draw()}
  GLOBO.size=size;
  var tilt=0.42,ct=Math.cos(tilt),st=Math.sin(tilt);
  function pr(lat,lon,R){var x=Math.cos(lat)*Math.sin(lon+a),y=Math.sin(lat),z=Math.cos(lat)*Math.cos(lon+a);var y2=y*ct-z*st,z2=y*st+z*ct;return [S/2+x*R,S/2-y2*R,z2]}
  function rgb(){return GLOBO.lvl==='x'?'255,77,77':GLOBO.lvl==='w'?'234,255,255':'127,231,255'}
  function line(pts){for(var i=1;i<pts.length;i++){var p=pts[i-1],q=pts[i],z=(p[2]+q[2])/2;cx.globalAlpha=z>0?.14+.42*z:.05;cx.beginPath();cx.moveTo(p[0],p[1]);cx.lineTo(q[0],q[1]);cx.stroke()}}
  function draw(){
    if(!S)return;
    cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,S,S);
    var R=S*0.34,c=rgb();
    var gr=cx.createRadialGradient(S/2,S/2,R*.2,S/2,S/2,R*1.15);gr.addColorStop(0,'rgba('+c+',.09)');gr.addColorStop(.85,'rgba('+c+',.035)');gr.addColorStop(1,'rgba('+c+',0)');
    cx.globalAlpha=1;cx.fillStyle=gr;cx.beginPath();cx.arc(S/2,S/2,R*1.15,0,7);cx.fill();
    cx.strokeStyle='rgb('+c+')';cx.lineWidth=.7;
    for(var m=0;m<12;m++){var pts=[];for(var l=-90;l<=90;l+=6)pts.push(pr(l*Math.PI/180,m*Math.PI/12,R));line(pts)}
    for(var p=-60;p<=60;p+=20){var q=[];for(var o=0;o<=360;o+=6)q.push(pr(p*Math.PI/180,o*Math.PI/180,R));line(q)}
    cx.globalAlpha=.5;cx.lineWidth=1;cx.beginPath();cx.arc(S/2,S/2,R,0,7);cx.stroke();
    cx.fillStyle='rgb('+c+')';
    nodes.forEach(function(nd){var v=pr(nd[0],nd[1],R);if(v[2]<0)return;cx.globalAlpha=.35+.65*v[2];cx.beginPath();cx.arc(v[0],v[1],1.6,0,7);cx.fill()});
    cx.globalAlpha=1;
  }
  function frame(t){
    requestAnimationFrame(frame);
    if(document.hidden||(mq&&mq.matches))return;
    if(t-last<33)return;
    var dt=last?Math.min(.1,(t-last)/1000):0;last=t;
    a+=dt*0.22;draw();
  }
  size();window.addEventListener('resize',size);
  if(window.ResizeObserver)new ResizeObserver(size).observe(cv);
  requestAnimationFrame(frame);
})();
tick();
// Sin datos.js todavía la página no se queda en blanco: se pinta vacía y espera.
try{render(VACIO)}catch(err){}
pintaSenal();load();
setInterval(function(){tick();load()},1000);
</script>
</body></html>`
