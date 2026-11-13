// Página del panel. Se escribe como index.html en la carpeta de datos (opción dataDir) al iniciar la sesión.
// Lee datos.js cada segundo (recargado con un script nuevo). Pinta una vez y después solo cambia los textos,
// atributos y estilos que cambian (dom.ts); si los datos no cambian (solo el latido), no toca nada.
// Sin acentos graves, sin dólar-llave y sin barras invertidas dentro: es un template literal.
// Todo en línea, sin CDN: tiene que funcionar offline desde file://.
//
// Tamaños de ventana (detalle en el comentario de breakpoints del CSS):
//   < 560 px          una columna, por prioridad: contexto, coste, comparativa, reparto, agentes, plan, últimos turnos, gráfica.
//   560-899           dos columnas arriba (contexto | coste y comparativa) y el resto a todo el ancho.
//   900-1199          dos columnas; reparto y agentes lado a lado; plan, últimos turnos y gráfica a todo el ancho.
//   >= 1200           tres columnas: contexto | coste y comparativa | reparto y agentes.
//   >= 1600 y alto >= 1000  todo cabe en la ventana: plan arriba y la gráfica con los últimos turnos llenan el alto que queda.
//   Desde 320 px de ancho sin desplazamiento horizontal; los paneles se ajustan por dentro con container queries.
// Arriba, a todo el ancho: barra de progreso del plan de Claude (TaskCreate / TaskUpdate), con la lista plegable.
// Densidad automática: atributo data-densidad="comodo|compacto" en <html>, según el área útil de la ventana (ver densidadDe()).
//   Compacto por debajo de 420 px de ancho o de 900 x 600 px de área: sin capas de efecto, la mitad de las partículas del
//   globo, sin últimos turnos ni pie y márgenes más justos. Cambia sola al redimensionar, sin recargar ni rehacer paneles.
//   No hay tecla ni opción para elegirla.
// Movimiento reducido (prefers-reduced-motion): sin animaciones ni transiciones; el globo y el anillo se quedan quietos y
//   las cifras cambian sin deslizarse. Los datos se leen y se pintan igual.
// Opciones del usuario (userConfig): llegan en datos.js como config y las aplica aplicaConfig(): tema, acento,
// idioma (es / en), actualizacion (segundos entre lecturas) y paneles visibles.
// Temas (atributo data-tema en <html>, lo pone aplicaConfig con config.tema): natural (por defecto), hibrido (blanco-cian con anillo
// ámbar), mark-ii, mark-l, stark y claro. El HTML sale con data-tema="natural".
// Natural: grafito cálido sin neón, paneles opacos con filo de 1 px, cifras de tabla en monoespaciada y su propia distribución
// (franja de resumen: contexto, coste y comparativa en una fila; el detalle debajo). Conserva el globo, el anillo y el núcleo 3D.
// Cada tema es un bloque de variables CSS (--bg, --panel, --txt, --sub, --acc, --acc2, --warn, --crit, --ok, --modelo-*); rojo solo en alertas.
// Globo holográfico en canvas con un anillo inclinado (CSS 3D) que gira al revés, paneles de cristal y escaneo sutil.
// Fondo: degradado radial, nebulosa difuminada y rejilla de perspectiva que avanza despacio (sin ellas en compacto; quieta con movimiento reducido).
import { DOM } from './dom'
import { IDIOMA_JS } from './idioma'
import { LOGICA } from './senal'

// Densidad automática: compacto con menos de 420 px de ancho o menos de 900 x 600 px de área útil; si no, cómodo.
// Autónoma (sin variables de fuera): se pega en el <head> de la página con toString(), igual que senal.ts y dom.ts.
export function densidadDe(w: number, h: number): 'comodo' | 'compacto' {
  return w < 420 || w * h < 900 * 600 ? 'compacto' : 'comodo'
}

export const PAGE = `<!doctype html>
<html lang="es" data-tema="natural"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Consumo · HUD</title>
<script>
// Densidad automática. Compacto si la ventana mide menos de 420 px de ancho o menos de 900 x 600 px de área útil.
// Se marca aquí, antes de pintar, y el script del final la vuelve a mirar en cada cambio de tamaño.
var densidadDe=(` + String(densidadDe) + `);
document.documentElement.setAttribute('data-densidad',densidadDe(window.innerWidth,window.innerHeight));
</script>
<style>
/* Temas. Cada tema es un bloque de variables sobre html[data-tema="..."]. El HTML sale con data-tema="natural" (el tema por defecto)
   y la opción tema lo cambia; si alguien quita el atributo, :root:not([data-tema]) deja las variables de natural.
   Variables de cada tema: --bg fondo, --panel panel opaco (y respaldo sin desenfoque), --txt texto, --sub etiquetas,
   --acc acento, --acc2 segundo acento, --warn aviso (contexto alto), --crit alerta crítica (el único rojo),
   --ok plan completado, --modelo-opus / -haiku / -fable / -otro colores de familia.
   Las versiones -rgb (r,g,b) sirven para las transparencias. Todo texto pasa 4,5:1 sobre --bg y --panel.
   --glow escala los brillos (0 en compacto), --cristal es el desenfoque de los paneles y --globo-filtro tiñe el globo del canvas. */
:root:not([data-tema]),html[data-tema="natural"]{
  /* Natural (por defecto): grafito cálido, texto marfil y un solo acento salvia. Sin brillos ni cristal; el globo, el anillo
     inclinado y el núcleo siguen en 3D. --borde y --borde-2 son los filos de 1 px de los paneles, --globo-rgb*
     tiñen las líneas del globo (normal, aviso, crítico) y --cifra es la letra de las cifras grandes. Distribución propia al final. */
  --bg:#151412;--bg-rgb:21,20,18;--panel:#1d1b18;--txt:#eee8dc;--sub:#b8af9f;
  --acc:#93c2a2;--acc-rgb:147,194,162;--acc2:#ddd5c7;--acc2-rgb:221,213,199;
  --warn:#e3b562;--warn-rgb:227,181,98;--crit:#e5735f;--crit-rgb:229,115,95;--crit-txt:#f7d6cf;--ok:#a6cfb2;
  --modelo-opus:#e4dccd;--modelo-haiku:#93c2a2;--modelo-fable:#bcaad9;--modelo-otro:#a8a194;
  --ring1:#ddd5c7;--ring2:#93c2a2;--ring-rgb:147,194,162;
  --glass:#1d1b18;--glass2:#1d1b18;--thbg:#1d1b18;--track:#2c2925;--mix:#ddd5c7;
  --bg0:#171614;--bg1:#151412;--bg2:#131210;--neb2-rgb:147,194,162;--shadow:rgba(0,0,0,.24);
  --glow:0;--cristal:none;--globo-filtro:none;--globo-filtro-x:none;
  --globo-rgb:186,212,192;--globo-rgb-w:227,181,98;--globo-rgb-x:229,115,95;
  --borde:#2d2a26;--borde-2:#3d3933;
  --sans:'Segoe UI Variable Text','Segoe UI','Inter','Helvetica Neue','Liberation Sans','DejaVu Sans',system-ui,sans-serif;
  --cifra:'Segoe UI Variable Display','Segoe UI','Inter','Helvetica Neue','Liberation Sans',sans-serif;
  --mono:'JetBrains Mono','Cascadia Mono','SF Mono',Menlo,Consolas,'DejaVu Sans Mono','Liberation Mono',monospace;
  --gap:clamp(14px,1.15vw,22px);--pad:clamp(16px,1.25vw,24px);
  color-scheme:dark;
}
html[data-tema="hibrido"]{
  /* Híbrido: blanco-cian sobre azul-negro, con el anillo del globo en ámbar. */
  --bg:#070b10;--bg-rgb:7,11,16;--panel:#0c1620;--txt:#f4feff;--sub:#a8f0ff;
  --acc:#7fe7ff;--acc-rgb:127,231,255;--acc2:#eaffff;--acc2-rgb:234,255,255;
  --warn:#ffffff;--warn-rgb:255,255,255;--crit:#ff4d4d;--crit-rgb:255,77,77;--crit-txt:#ffe1dc;--ok:#eaffff;
  --modelo-opus:#e8fbff;--modelo-haiku:#7fe7ff;--modelo-fable:#c4b5fd;--modelo-otro:#dbeafe;
  --ring1:#ffd27a;--ring2:#ffb347;--ring-rgb:255,179,71;
  --glass:rgba(12,22,32,.55);--glass2:rgba(5,9,14,.72);--thbg:#0a131c;--track:#03070b;--mix:#eaffff;
  --bg0:#05080d;--bg1:#070c13;--bg2:#0a1420;--neb2-rgb:140,170,255;--shadow:rgba(0,0,0,.4);
  --glow:1;--cristal:blur(10px);--globo-filtro:none;--globo-filtro-x:none;
  color-scheme:dark;
}
html[data-tema="mark-ii"]{
  /* Mark II: cian eléctrico sobre azul-negro profundo, brillo más intenso. */
  --bg:#02060e;--bg-rgb:2,6,14;--panel:#071526;--txt:#e8fcff;--sub:#7fd9ef;
  --acc:#00e1ff;--acc-rgb:0,225,255;--acc2:#b8f6ff;--acc2-rgb:184,246,255;
  --warn:#ffe45c;--warn-rgb:255,228,92;--crit:#ff4766;--crit-rgb:255,71,102;--crit-txt:#ffdbe2;--ok:#4dffd2;
  --modelo-opus:#f2feff;--modelo-haiku:#00e1ff;--modelo-fable:#b9a4ff;--modelo-otro:#8fb8e0;
  --ring1:#b8f6ff;--ring2:#00e1ff;--ring-rgb:0,225,255;
  --glass:rgba(6,20,38,.6);--glass2:rgba(2,8,18,.78);--thbg:#051222;--track:#010409;--mix:#b8f6ff;
  --bg0:#01030a;--bg1:#02070f;--bg2:#04142a;--neb2-rgb:0,110,255;--shadow:rgba(0,0,0,.5);
  --glow:1.3;--cristal:blur(10px);--globo-filtro:saturate(2) brightness(1.15);--globo-filtro-x:none;
  color-scheme:dark;
}
html[data-tema="mark-l"]{
  /* Mark L: blanco y celeste, paneles de cristal más claros y más desenfocados. */
  --bg:#0a1526;--bg-rgb:10,21,38;--panel:#16263d;--txt:#ffffff;--sub:#bcdcf7;
  --acc:#8fd3ff;--acc-rgb:143,211,255;--acc2:#ffffff;--acc2-rgb:255,255,255;
  --warn:#ffe7a3;--warn-rgb:255,231,163;--crit:#ff6b78;--crit-rgb:255,107,120;--crit-txt:#ffe0e3;--ok:#d2f1ff;
  --modelo-opus:#ffffff;--modelo-haiku:#8fd3ff;--modelo-fable:#d0bcff;--modelo-otro:#bcc9da;
  --ring1:#ffffff;--ring2:#8fd3ff;--ring-rgb:143,211,255;
  --glass:rgba(150,190,235,.1);--glass2:rgba(14,28,48,.62);--thbg:#13233a;--track:#07101d;--mix:#ffffff;
  --bg0:#0c1a2e;--bg1:#0a1526;--bg2:#13233c;--neb2-rgb:190,215,255;--shadow:rgba(2,8,20,.45);
  --glow:.9;--cristal:blur(18px) saturate(1.3);--globo-filtro:hue-rotate(14deg) saturate(.55) brightness(1.25);--globo-filtro-x:none;
  color-scheme:dark;
}
html[data-tema="stark"]{
  /* Stark: ámbar y oro sobre carbón; Haiku en celeste para distinguirlo de Opus. */
  --bg:#0c0b09;--bg-rgb:12,11,9;--panel:#1b1712;--txt:#fff5e3;--sub:#dcbf8f;
  --acc:#ffb02e;--acc-rgb:255,176,46;--acc2:#ffd98c;--acc2-rgb:255,217,140;
  --warn:#ffffff;--warn-rgb:255,255,255;--crit:#ff5245;--crit-rgb:255,82,69;--crit-txt:#ffe0d8;--ok:#ffd98c;
  --modelo-opus:#ffb02e;--modelo-haiku:#9bdcff;--modelo-fable:#d9bbff;--modelo-otro:#e3d3b0;
  --ring1:#ffd98c;--ring2:#ffb02e;--ring-rgb:255,176,46;
  --glass:rgba(30,25,18,.58);--glass2:rgba(12,11,9,.74);--thbg:#17140f;--track:#060504;--mix:#ffe9bf;
  --bg0:#090806;--bg1:#0c0b09;--bg2:#17130d;--neb2-rgb:255,120,30;--shadow:rgba(0,0,0,.5);
  --glow:1;--cristal:blur(10px);--globo-filtro:sepia(1) saturate(3.2) hue-rotate(-12deg) brightness(1.05);--globo-filtro-x:none;
  color-scheme:dark;
}
html[data-tema="claro"]{
  /* Claro: fondo claro con acentos en azul profundo, para trabajar de día. Brillos casi apagados. */
  --bg:#eef3f9;--bg-rgb:238,243,249;--panel:#ffffff;--txt:#0b1726;--sub:#3a4d63;
  --acc:#0b4fae;--acc-rgb:11,79,174;--acc2:#06285e;--acc2-rgb:6,40,94;
  --warn:#8a4700;--warn-rgb:138,71,0;--crit:#b3121c;--crit-rgb:179,18,28;--crit-txt:#8f0d15;--ok:#0b6b40;
  --modelo-opus:#06285e;--modelo-haiku:#00659f;--modelo-fable:#5a33c0;--modelo-otro:#4a5568;
  --ring1:#3d7fd6;--ring2:#0b4fae;--ring-rgb:11,79,174;
  --glass:rgba(255,255,255,.8);--glass2:rgba(248,251,255,.92);--thbg:#f3f7fc;--track:#dbe4ef;--mix:#bcd3f0;
  --bg0:#f7faff;--bg1:#eef3f9;--bg2:#e1e9f3;--neb2-rgb:120,170,255;--shadow:rgba(20,40,80,.12);
  --glow:.3;--cristal:blur(12px);--globo-filtro:hue-rotate(14deg) saturate(1.6) brightness(.42);--globo-filtro-x:brightness(.8) saturate(1.4);
  color-scheme:light;
}
/* Derivados: se calculan con las variables del tema activo. Los nombres cortos (--ce, --wh, --wn, --rd, --f-*) los usa el script. */
:root{
  --wh:var(--acc2);--ce:var(--acc);--wn:var(--warn);--rd:var(--crit);
  --f-opus:var(--modelo-opus);--f-haiku:var(--modelo-haiku);--f-fable:var(--modelo-fable);--f-sonnet:var(--modelo-otro);--f-otro:var(--modelo-otro);
  --line:rgba(var(--acc-rgb),.18);--faint:rgba(var(--acc-rgb),.10);--edge:rgba(var(--acc-rgb),.22);--edge-on:rgba(var(--acc2-rgb),.8);
  --bord:linear-gradient(135deg,rgba(var(--acc2-rgb),.5),rgba(var(--acc-rgb),.2) 45%,rgba(var(--acc-rgb),.42));
  --bord-on:linear-gradient(135deg,rgba(var(--acc2-rgb),.95),rgba(var(--acc-rgb),.7));
  --wc:linear-gradient(90deg,var(--acc2),var(--acc));
  --sans:Bahnschrift,'Segoe UI','Inter','Liberation Sans','DejaVu Sans',sans-serif;
  /* Texto: etiquetas >= 14 px, valores >= 16 px; crecen con la ventana. */
  --fk:clamp(14px,calc(.32vw + .38vh + 5px),22px);
  --fv:clamp(16px,calc(.42vw + .5vh + 5px),27px);
  --fbig:clamp(34px,calc(1.6vw + 2.2vh),80px);
  --gap:clamp(10px,1vw,18px);
  --pad:clamp(12px,1vw,20px);
}
body.lv-x{--edge:rgba(var(--crit-rgb),.4);--bord:linear-gradient(135deg,rgba(var(--crit-rgb),.55),rgba(var(--crit-rgb),.22) 45%,rgba(var(--crit-rgb),.4))}
html[data-densidad="compacto"] body{--gap:clamp(8px,.6vw,12px);--pad:clamp(10px,.7vw,14px);--fbig:clamp(30px,calc(1.3vw + 1.8vh),52px)}
*{box-sizing:border-box}
html,body{min-height:100%}
body{margin:0;background-color:var(--bg);color:var(--txt);font:var(--fv)/1.4 var(--sans);overflow-x:hidden;min-width:0;
  background-image:radial-gradient(ellipse 60% 55% at 22% 30%,rgba(var(--acc-rgb),.05),transparent 70%),radial-gradient(ellipse 70% 45% at 80% 110%,rgba(var(--acc2-rgb),.035),transparent 70%),radial-gradient(ellipse 120% 100% at 50% 45%,var(--bg0) 0%,var(--bg1) 55%,var(--bg2) 100%);background-attachment:fixed}
/* Fondo: nebulosa (dos radiales difuminados) y rejilla de perspectiva en cian muy tenue. Detrás de todo, sin eventos. */
.neb{position:fixed;inset:-10%;z-index:0;pointer-events:none;filter:blur(40px);
  background:radial-gradient(ellipse 38% 30% at 28% 26%,rgba(var(--acc-rgb),.07),transparent 70%),radial-gradient(ellipse 34% 28% at 76% 70%,rgba(var(--neb2-rgb),.06),transparent 70%)}
.floor{position:fixed;left:-40%;right:-40%;bottom:0;height:46vh;z-index:0;pointer-events:none;overflow:hidden;
  transform:perspective(380px) rotateX(64deg);transform-origin:50% 100%;
  -webkit-mask-image:linear-gradient(0deg,#000,transparent 88%);mask-image:linear-gradient(0deg,#000,transparent 88%)}
.floor i{position:absolute;left:0;right:0;top:-64px;bottom:0;opacity:.55;animation:floor 7s linear infinite;
  background-image:linear-gradient(rgba(var(--acc-rgb),.11) 1px,transparent 1px),linear-gradient(90deg,rgba(var(--acc-rgb),.11) 1px,transparent 1px);background-size:64px 64px}
/* Línea de escaneo horizontal, muy sutil */
.scan{position:fixed;left:0;right:0;top:0;height:90px;z-index:7;pointer-events:none;animation:scan 9s cubic-bezier(.4,0,.6,1) infinite;
  background:linear-gradient(180deg,transparent,rgba(var(--acc-rgb),.025) 85%,rgba(var(--acc2-rgb),.12) 99%,transparent)}
body:before{content:"";position:fixed;inset:0;pointer-events:none;z-index:8;opacity:0;transition:opacity .6s;
  box-shadow:inset 0 0 130px rgba(var(--crit-rgb),.42)}
body.lv-x:before{opacity:1;animation:alarm 1.6s ease-in-out infinite}
body.lv-w:before{opacity:.5;box-shadow:inset 0 0 90px rgba(var(--warn-rgb),.2)}
.wrap{position:relative;z-index:2;min-height:100vh;display:grid;gap:var(--gap);padding:var(--pad) clamp(16px,1.4vw,26px);max-width:max(2200px,86vw);margin:0 auto;
  grid-template-columns:minmax(0,1fr);align-content:start}
.k{color:var(--sub);font-size:var(--fk);letter-spacing:.08em;text-transform:uppercase}
.num{font-variant-numeric:tabular-nums}

/* Cabecera */
header{grid-area:head;min-width:0;display:flex;align-items:center;flex-wrap:wrap;gap:10px 18px;border-bottom:1px solid var(--line);padding-bottom:10px;position:relative}
header:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1px;background:linear-gradient(90deg,var(--wh),var(--ce) 18%,transparent 40%)}
.logo{flex:none;width:28px;height:28px;border:2px solid var(--wh);border-radius:50%;position:relative;box-shadow:0 0 10px rgba(var(--acc-rgb),calc(.5*var(--glow)))}
.logo:after{content:"";position:absolute;inset:4px;border-radius:50%;border:1px dashed var(--ce);animation:spin 8s linear infinite}
h1{margin:0;font-size:var(--fv);font-weight:normal;letter-spacing:.28em;color:var(--txt);text-shadow:0 0 12px rgba(var(--acc-rgb),calc(.45*var(--glow)));text-transform:uppercase;white-space:nowrap}
h1 .brand{color:var(--sub)}
.alerts{display:flex;gap:10px;flex-wrap:wrap;min-width:0}
.al{display:none;font-size:var(--fk);letter-spacing:.08em;text-transform:uppercase;padding:4px 14px;border:1px solid currentColor;border-radius:999px;background:rgba(var(--bg-rgb),.6)}
.al.on{display:block;animation:blink 1.2s steps(2,start) infinite}
#al-ctx.w{color:var(--wn);box-shadow:inset 0 0 12px rgba(var(--warn-rgb),.35);animation:none}
#al-ctx.x{color:var(--rd);box-shadow:inset 0 0 14px rgba(var(--crit-rgb),.45)}
#al-sig{color:var(--rd);box-shadow:inset 0 0 14px rgba(var(--crit-rgb),.45)}
.hstat{margin-left:auto;display:flex;gap:clamp(12px,1.4vw,26px);align-items:center;flex-wrap:wrap}
.hstat>div{text-align:right}
.hstat .v{color:var(--txt);font-size:var(--fv);white-space:nowrap}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--ce);box-shadow:0 0 8px var(--ce);margin-right:8px;vertical-align:1px;animation:pulse 1.6s ease-in-out infinite}
.dot.wait{background:var(--wh);box-shadow:0 0 8px var(--wh)}
.dot.off{background:var(--rd);box-shadow:0 0 8px var(--rd);animation:blink 1s steps(2,start) infinite}
/* Foco visible en cualquier control (la lista del plan y lo que se pueda enfocar): anillo de 2 px en el acento. */
:focus-visible{outline:2px solid var(--acc);outline-offset:3px;border-radius:4px}

/* Paneles de cristal: fondo translúcido con desenfoque y borde en degradado blanco-cian; se ilumina en cian suave al pasar el ratón o al cambiar de estado. */
.pnl{position:relative;min-width:0;min-height:0;container-type:inline-size;border-radius:12px;border:1px solid transparent;
  background:linear-gradient(160deg,var(--glass),var(--glass2)) padding-box,var(--bord) border-box;-webkit-backdrop-filter:var(--cristal);backdrop-filter:var(--cristal);
  box-shadow:0 18px 36px var(--shadow);transition:box-shadow .8s}
.pnl:hover,.pnl.lit{background:linear-gradient(160deg,var(--glass),var(--glass2)) padding-box,var(--bord-on) border-box;box-shadow:0 0 22px rgba(var(--acc-rgb),calc(.18*var(--glow))),0 18px 36px var(--shadow);transition:box-shadow .25s}
body.lv-w #p-ctx{background:linear-gradient(160deg,var(--glass),var(--glass2)) padding-box,var(--bord-on) border-box;box-shadow:0 0 20px rgba(var(--acc2-rgb),calc(.16*var(--glow))),0 18px 36px var(--shadow)}
body.lv-x #p-ctx{box-shadow:inset 0 0 0 1px rgba(var(--crit-rgb),.85),0 0 22px rgba(var(--crit-rgb),.2),0 18px 36px var(--shadow)}
.pnl>.in{position:relative;height:100%;padding:var(--pad);overflow:hidden;border-radius:inherit;display:flex;flex-direction:column;min-height:0}
.pnl>.in:before{content:"";position:absolute;left:14px;top:0;width:36%;height:1px;background:linear-gradient(90deg,var(--wh),var(--ce) 55%,transparent);pointer-events:none;opacity:.9}
body.lv-x .pnl>.in:before{background:linear-gradient(90deg,var(--rd),transparent)}
.pnl:before,.pnl:after{content:"";position:absolute;width:14px;height:14px;z-index:2;pointer-events:none;opacity:.8}
.pnl:before{right:-1px;top:-1px;border-top:2px solid var(--wh);border-right:2px solid var(--ce);border-top-right-radius:12px}
.pnl:after{left:-1px;bottom:-1px;border-left:2px solid var(--wh);border-bottom:2px solid var(--ce);border-bottom-left-radius:12px}
body.lv-x .pnl:before,body.lv-x .pnl:after{border-color:var(--rd)}
.ph{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--line);border-image:linear-gradient(90deg,rgba(var(--acc2-rgb),.45),rgba(var(--acc-rgb),.22) 50%,rgba(var(--acc-rgb),.06)) 1;flex:none;min-width:0}
.ph .t{font-size:var(--fk);letter-spacing:.18em;text-transform:uppercase;color:var(--txt);text-shadow:0 0 10px rgba(var(--acc-rgb),calc(.35*var(--glow)));white-space:nowrap}
.ph .t:before{content:"";display:inline-block;width:14px;height:1px;background:var(--wc);vertical-align:.3em;margin-right:10px}
.ph .r{margin-left:auto;font-size:var(--fk);color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}

/* Plan: barra de progreso a todo el ancho, encima de la rejilla */
#p-plan{grid-area:plan}
#p-plan>.in{gap:10px}
.plh{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 16px;min-width:0}
.plt{font-size:clamp(18px,calc(.6vw + .7vh + 6px),30px);color:var(--txt);letter-spacing:.08em;white-space:nowrap}
.plt b{font-weight:normal;color:var(--txt);text-shadow:0 0 10px rgba(var(--acc-rgb),calc(.5*var(--glow)))}
.plt.vacio{color:var(--sub);font-size:var(--fv)}
.plok{display:none;font-size:var(--fk);letter-spacing:.12em;text-transform:uppercase;color:var(--bg);background:var(--ok);padding:2px 10px;border-radius:4px;box-shadow:0 0 12px rgba(var(--acc-rgb),calc(.6*var(--glow)))}
.plcur{margin-left:auto;font-size:var(--fk);color:var(--sub);min-width:0;max-width:100%;overflow-wrap:anywhere}
.plcur em{font-style:normal;color:var(--ce)}
.plbar{position:relative;height:clamp(16px,2vh,24px);background:var(--track);border:1px solid var(--edge);border-radius:999px;overflow:hidden}
.plfill{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:inherit;background-color:var(--ce);box-shadow:0 0 14px rgba(var(--acc-rgb),calc(.6*var(--glow)));
  background-image:repeating-linear-gradient(90deg,transparent 0 14px,rgba(var(--bg-rgb),.35) 14px 16px),var(--wc);
  transition:width 1.1s cubic-bezier(.2,.8,.2,1),background-color .6s,box-shadow .6s}
#p-plan.done .plt b{color:var(--ok);text-shadow:0 0 12px rgba(var(--acc-rgb),calc(.6*var(--glow)))}
#p-plan.done .plok{display:inline-block}
#p-plan.done .plfill{background-color:var(--ok);box-shadow:0 0 18px rgba(var(--acc-rgb),calc(.75*var(--glow)))}
#p-plan.done .plbar{border-color:rgba(var(--acc2-rgb),.6)}
.pll summary{cursor:pointer;font-size:var(--fk);color:var(--ce);letter-spacing:.08em;text-transform:uppercase;list-style:none;display:inline-block}
.pll summary::-webkit-details-marker{display:none}
.pll summary:before{content:"+ ";color:var(--wh)}
.pll[open] summary:before{content:"- "}
.pll summary:focus-visible{outline:2px solid var(--acc);outline-offset:3px}
.pll ol{margin:8px 0 0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,max(340px,24em)),1fr));gap:4px 18px;max-height:min(18vh,9em);overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(var(--acc-rgb),.4) transparent}
.pll li{display:flex;gap:10px;align-items:baseline;min-width:0;font-size:var(--fk);color:var(--txt)}
.pll li span{min-width:0;overflow-wrap:anywhere}
.pll li i{font-style:normal;flex:none;width:7.5em;color:var(--sub);text-transform:uppercase;letter-spacing:.04em}
.pll li.c i{color:var(--ce)}.pll li.c span{color:var(--sub);text-decoration:line-through}
.pll li.e i{color:var(--wn);text-shadow:0 0 8px rgba(var(--acc-rgb),calc(.6*var(--glow)))}
.pll.off{display:none}

/* Rejilla: una sola, la de .wrap. .grid no dibuja caja (display:contents), así el plan puede ir entre los paneles
   según la prioridad. Áreas por tamaño en el bloque de breakpoints, al final del CSS. */
.grid{display:contents}
.wrap{grid-template-areas:"head" "ctx" "cost" "comp" "mod" "agt" "plan" "hist" "chart" "foot"}
html[data-densidad="compacto"] .wrap{grid-template-areas:"head" "ctx" "cost" "comp" "mod" "agt" "plan" "chart"}
#p-ctx{grid-area:ctx}#p-cost{grid-area:cost}#p-comp{grid-area:comp}#p-mod{grid-area:mod}#p-chart{grid-area:chart}#p-hist{grid-area:hist}#p-agt{grid-area:agt}
html[data-densidad="compacto"] #p-hist,html[data-densidad="compacto"] footer{display:none}

/* Contexto: globo holográfico (canvas) con un anillo blanco-cian inclinado (CSS 3D) que gira al revés, sobre un halo cian */
.ctxb{display:flex;flex-direction:column;align-items:center;gap:var(--gap);flex:1;min-height:0;justify-content:center}
.reactor{position:relative;width:100%;max-width:clamp(150px,min(78cqi,34vh),300px);aspect-ratio:1;flex:none}
/* Halo cian detrás del globo */
.reactor:before{content:"";position:absolute;inset:-18%;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(var(--acc-rgb),.16),rgba(var(--acc-rgb),.06) 42%,transparent 68%)}
body.lv-x .reactor:before{background:radial-gradient(circle,rgba(var(--crit-rgb),.14),rgba(var(--crit-rgb),.05) 42%,transparent 68%)}
#globe{position:absolute;inset:0;width:100%;height:100%;display:block}
.face{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible}
.halo{position:absolute;inset:0;perspective:700px;pointer-events:none}
.gring{position:absolute;inset:3%;transform-style:preserve-3d;transform:rotateX(72deg) rotateY(-14deg)}
.gring svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;animation:spin 16s linear infinite;filter:drop-shadow(0 0 4px rgba(var(--acc-rgb),calc(.7*var(--glow))))}
body.lv-x .gring svg{animation-duration:5s}
.tick{stroke:rgba(var(--acc-rgb),.14);stroke-width:2;transition:stroke .5s}
.tick.on{stroke:var(--ce)}
.tick.on.w{stroke:var(--wn)}
.tick.on.x{stroke:var(--rd)}
.mark{stroke-width:1.5}
#arc{transition:stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1),stroke .5s;filter:drop-shadow(0 0 4px currentColor)}
#pct,#coste{transition:color .8s,text-shadow .8s}
.rc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;z-index:1}
.rc .p{font-size:var(--fbig);color:var(--txt);line-height:1;transition:color .5s;
  text-shadow:0 0 4px var(--bg),0 0 14px rgba(var(--bg-rgb),.95),0 0 26px rgba(var(--acc-rgb),calc(.4*var(--glow)))}
.rc .p small{font-size:max(16px,.45em);color:var(--ce)}
.rc .k{margin-top:6px;color:var(--txt);text-shadow:0 0 6px var(--bg),0 0 10px var(--bg)}
body.lv-w .rc .p small{color:var(--wn)}
body.lv-x .rc .p{color:var(--crit-txt);text-shadow:0 0 4px var(--bg),0 0 16px rgba(var(--crit-rgb),.9)}
body.lv-x .rc .p small{color:var(--rd)}
.kv{display:grid;grid-template-columns:auto auto;justify-content:space-between;gap:6px 16px;width:100%;align-items:baseline}
.kv .v{text-align:right;color:var(--txt);font-size:var(--fv);white-space:nowrap}

/* Coste */
.cost{font-size:clamp(28px,16cqi,var(--fbig));color:var(--txt);text-shadow:0 0 14px rgba(var(--acc-rgb),calc(.45*var(--glow)));line-height:1.05;margin:0 0 4px;white-space:nowrap}
.cost small{font-size:var(--fk);color:var(--sub);letter-spacing:.1em;margin-left:8px}
.sub{color:var(--sub);font-size:var(--fk);margin-bottom:8px}
.mdl{color:var(--ce);font-size:var(--fv);overflow-wrap:anywhere}

/* Comparativa Haiku frente a Opus: dos barras (real en cian, todo en Opus en blanco), ahorro y reparto de tokens. Sin rojo. */
#p-comp .ph .t{white-space:normal}
.cpb{display:grid;grid-template-columns:auto minmax(40px,1fr) auto;grid-auto-flow:row dense;gap:8px 14px;align-items:center;margin-bottom:10px;min-width:0}
.cpb .k{grid-column:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.cpb .cbar{grid-column:2}
.cpb .v{grid-column:3}
.cpb .v{font-size:var(--fv);color:var(--txt);text-align:right;white-space:nowrap}
.cbar{height:12px;background:var(--track);border:1px solid var(--edge);border-radius:999px;overflow:hidden;min-width:0}
.cbar i{display:block;height:100%;width:0;border-radius:inherit;transition:width 1.1s cubic-bezier(.2,.8,.2,1)}
.cbar.real i{background:var(--wc);box-shadow:0 0 10px rgba(var(--acc-rgb),calc(.6*var(--glow)))}
.cbar.opus i{background:repeating-linear-gradient(90deg,var(--acc2) 0 12px,rgba(var(--acc2-rgb),.55) 12px 14px);box-shadow:0 0 8px rgba(var(--acc2-rgb),calc(.4*var(--glow)))}
#p-comp.nodata .cpb .opus,#p-comp.nodata #cvopus{opacity:.5}
.cah{font-size:var(--fv);color:var(--txt);margin-bottom:10px;overflow-wrap:anywhere}
.cah b{font-weight:normal;color:var(--ce);text-shadow:0 0 10px rgba(var(--acc-rgb),calc(.5*var(--glow)))}
#p-comp.nodata .cah{color:var(--sub)}
#p-comp .stack{margin:0 0 8px}
.ctk{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:var(--fk);color:var(--sub);margin-bottom:8px}
.ctk span{white-space:nowrap}
.ctk i{display:inline-block;width:11px;height:11px;border-radius:50%;background:var(--c);box-shadow:0 0 6px var(--c);margin-right:6px;vertical-align:-1px}
.ctk b{font-weight:normal;color:var(--txt)}
.cnote{font-size:var(--fk);color:var(--sub);margin-top:auto}

/* Barras segmentadas */
.seg{display:flex;gap:2px;height:10px;align-items:stretch;min-width:0}
.seg i{flex:1;background:var(--track);transition:background .5s,box-shadow .5s;transform:skewX(-20deg)}
/* Relleno: cada segmento mezcla de blanco hacia el color de la barra (cian por defecto), así la barra entera es un degradado. */
.seg i.on{background:var(--c,var(--ce));background:color-mix(in srgb,var(--c,var(--ce)) calc(var(--k,1)*100%),var(--mix));box-shadow:0 0 5px var(--c,var(--ce))}
.seg.sm{height:7px;gap:1px}
.stack{display:flex;height:8px;gap:4px;margin:0 0 14px;flex:none}
.stack div{height:100%;background:var(--c);background:linear-gradient(90deg,color-mix(in srgb,var(--c) 55%,var(--mix)),var(--c));box-shadow:0 0 8px var(--c);opacity:.9;min-width:3px;border-radius:2px}
.stack.empty{background:var(--track)}
.stack div{transition:flex-grow .6s}

/* Reparto por modelo: nombre, barra, %, turnos */
.cmp{display:grid;grid-template-columns:minmax(130px,15em) minmax(5.5em,1fr) 4.5em 5.5em;gap:10px 16px;align-items:center}
.cmp .hd{font-size:var(--fk);color:var(--sub);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
.cmp .nm{display:flex;flex-direction:column;min-width:0;border-left:2px solid var(--c);padding-left:10px}
.cmp .nm b{font-weight:normal;color:var(--c);letter-spacing:.12em;font-size:var(--fv);white-space:nowrap}
.cmp .nm b em{font-style:normal;font-size:14px;letter-spacing:.06em;color:var(--bg);background:var(--ce);border-radius:3px;padding:0 5px;margin-left:8px;vertical-align:1px}
.cmp .nm span{color:var(--sub);font-size:var(--fk);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cmp .pc{font-size:var(--fv);color:var(--txt);text-align:right;white-space:nowrap}
.cmp .tn{font-size:var(--fv);color:var(--txt);text-align:right;white-space:nowrap}
.cmp .hd.tn{font-size:var(--fk);color:var(--sub)}
.cmp .zero{opacity:.55}
.cmp .filas,.cmp .fila{display:contents}
.r-al{text-align:right}

/* Gráfica */
.chart{position:relative;flex:1;min-height:clamp(170px,28vh,340px)}
.chart svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.chart text{font:14px var(--sans);fill:var(--sub)}
.legend{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:var(--fk);color:var(--sub);margin-top:8px;flex:none}
.legend i{display:inline-block;width:11px;height:11px;border-radius:50%;background:var(--c);box-shadow:0 0 6px var(--c);margin-right:6px;vertical-align:-1px}
.legend i.ln{height:3px;border-radius:0;vertical-align:3px}
.bar{transition:height .6s,y .6s}

/* Tablas */
.tblw{overflow:auto;min-height:0;flex:1;max-height:440px;scrollbar-width:thin;scrollbar-color:rgba(var(--acc-rgb),.4) transparent}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{text-align:right;padding:6px 8px;border-bottom:1px solid rgba(var(--acc-rgb),.09);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
td{font-size:var(--fv)}
th{color:var(--sub);font-weight:normal;font-size:var(--fk);letter-spacing:.06em;text-transform:uppercase;position:sticky;top:0;background:var(--thbg);z-index:1}
th:first-child,td:first-child{padding-left:2px}
.al-l{text-align:left}
/* Nombres de agente: se parten en varias líneas en vez de cortarse. */
td.al-l{white-space:normal;overflow-wrap:anywhere}
/* La hora va en una línea; en inglés lleva AM / PM y su columna es más ancha. */
td.h-hora{white-space:nowrap}
html[lang="en"] .w-hora{width:7.8em}
th .sh{display:none}
.w-hora{width:6.2em}.w-mdl{width:6.5em}.w-tok{width:6em}.w-usd{width:5.8em}.w-trn{width:6.4em}.w-share{width:11em}
tbody tr:hover td{background:rgba(var(--acc-rgb),.05)}
td .ftag{color:var(--c);letter-spacing:.06em}
td.dimc{color:var(--sub)}
td.amc{color:var(--wh)}
tr.new td{animation:flash 1.4s ease-out}
.share{display:flex;align-items:center;gap:10px;justify-content:flex-end}
.share .seg{flex:1}
.share .sv{flex:none;min-width:3.5em;text-align:right}
.empty-row{color:var(--sub);text-align:left!important;font-size:var(--fk)!important;padding:14px 8px!important}

footer{grid-area:foot;display:flex;gap:18px;justify-content:space-between;font-size:var(--fk);color:var(--sub);border-top:1px solid var(--line);border-image:linear-gradient(90deg,rgba(var(--acc2-rgb),.4),rgba(var(--acc-rgb),.2) 50%,rgba(var(--acc-rgb),.05)) 1;padding-top:8px;flex-wrap:wrap}
footer .line{flex:1;align-self:center;height:1px;background:linear-gradient(90deg,var(--line),transparent);min-width:20px}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.75}50%{opacity:1}}
@keyframes blink{to{opacity:.6}}
@keyframes alarm{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes floor{to{transform:translateY(64px)}}
@keyframes scan{from{transform:translateY(-100px)}to{transform:translateY(100vh)}}
@keyframes shift{from{opacity:.8;transform:scale(.2)}to{opacity:0;transform:scale(2.4)}}
.shift{position:fixed;left:50%;top:50%;width:60vmin;height:60vmin;margin:-30vmin 0 0 -30vmin;border-radius:50%;pointer-events:none;z-index:7;
  border:2px solid currentColor;box-shadow:0 0 40px currentColor,inset 0 0 40px currentColor;animation:shift 1.1s ease-out forwards}
@keyframes flash{from{background:rgba(var(--acc-rgb),.16)}to{background:transparent}}
/* Movimiento reducido: nada se anima ni se desliza (anillo, globo, barras, filas nuevas, alertas). El globo lo para el script. */
@media (prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.scan,.shift{display:none}}

/* ===== Breakpoints =====
   Ventana (media queries, ancho x alto):
     base   < 560 px   una columna por prioridad: contexto, coste, comparativa, reparto, agentes, plan, últimos turnos, gráfica.
     560 px             dos columnas arriba: contexto | coste + comparativa; reparto, agentes, plan, turnos y gráfica a todo el ancho.
     900 px             dos columnas: contexto | coste + comparativa; reparto | agentes; plan, turnos y gráfica a todo el ancho.
     1200 px            tres columnas: contexto | coste + comparativa | reparto + agentes; plan, turnos y gráfica a todo el ancho.
     1600 px y 1000 px de alto   pantalla completa sin desplazar: plan arriba, las tres columnas y abajo gráfica | turnos con el alto que queda.
     Por debajo de 1000 px de alto la página se desplaza en vertical; nunca en horizontal.
   Panel (container queries, ancho del propio panel; cada .pnl es container-type:inline-size):
     < 600 px   tablas sin hora ni turnos; reparto de agentes solo con el %.
     < 460 px   reparto por modelo sin la columna de turnos; comparativa con la barra bajo su etiqueta.
     < 420 px   tablas sin la columna de modelo; reparto por modelo en dos líneas (nombre y %, barra debajo).
   Texto: nunca por debajo de 14 px (--fk); los nombres largos se parten en varias líneas en vez de cortarse. */

/* Cabecera estrecha */
@media (max-width:899px){
  .hstat{margin-left:0;width:100%;justify-content:space-between}
  .hstat>div{text-align:left}
}
@media (max-width:559px){
  .plcur{margin-left:0;flex-basis:100%}
  h1{letter-spacing:.14em}
  h1 .brand{display:none}
  .hstat .opt{display:none}
  .wrap{padding-left:16px;padding-right:16px}
}

/* 560 px: contexto a la izquierda, coste y comparativa a la derecha */
@media (min-width:560px){
  .wrap{grid-template-columns:minmax(0,1fr) minmax(0,1fr);
    grid-template-areas:"head head" "ctx cost" "ctx comp" "mod mod" "agt agt" "plan plan" "hist hist" "chart chart" "foot foot"}
  html[data-densidad="compacto"] .wrap{grid-template-areas:"head head" "ctx cost" "ctx comp" "mod mod" "agt agt" "plan plan" "chart chart"}
}
/* 900 px: reparto y agentes lado a lado; la gráfica a todo el ancho para que sus etiquetas no se junten */
@media (min-width:900px){
  .wrap{grid-template-columns:minmax(0,.85fr) minmax(0,1fr);
    grid-template-areas:"head head" "ctx cost" "ctx comp" "mod agt" "plan plan" "hist hist" "chart chart" "foot foot"}
  html[data-densidad="compacto"] .wrap{grid-template-areas:"head head" "ctx cost" "ctx comp" "mod agt" "plan plan" "chart chart"}
}
/* 1200 px: tres columnas */
@media (min-width:1200px){
  .wrap{grid-template-columns:minmax(0,.9fr) minmax(0,1fr) minmax(0,1.15fr);
    grid-template-areas:"head head head" "ctx cost mod" "ctx comp agt" "plan plan plan" "hist hist hist" "chart chart chart" "foot foot foot"}
  html[data-densidad="compacto"] .wrap{grid-template-areas:"head head head" "ctx cost mod" "ctx comp agt" "plan plan plan" "chart chart chart"}
}
/* Mientras la página se desplaza, la tabla de turnos no pasa de un alto razonable. */
.tblw{max-height:clamp(220px,50vh,440px)}

/* 1600 px y 1000 px de alto: todo en la ventana, sin desplazar. La última fila (gráfica | turnos) se queda con el alto libre. */
@media (min-width:1600px) and (min-height:1000px){
  .wrap{height:100vh;grid-template-columns:minmax(0,.8fr) minmax(0,1.1fr) minmax(0,1.1fr);
    grid-template-rows:auto min-content min-content min-content minmax(236px,1fr) auto;
    grid-template-areas:"head head head" "plan plan plan" "ctx cost mod" "ctx comp agt" "chart chart hist" "foot foot foot"}
  .tblw{max-height:none}
  .chart{min-height:120px}
  .reactor{max-width:clamp(200px,min(70cqi,23vh),440px)}
}
/* Pantalla completa con poco alto (1000-1199 px, p. ej. 1920x1080): márgenes más justos para que quepa todo. */
@media (min-width:1600px) and (min-height:1000px) and (max-height:1199px){
  :root{--gap:10px;--pad:12px}
  .plt{font-size:clamp(18px,calc(.5vw + .5vh + 6px),26px)}
  .plbar{height:16px}
  header{padding-bottom:6px}
  .ph{margin-bottom:8px;padding-bottom:5px}
  #p-plan>.in{gap:8px}
  .stack{margin-bottom:10px}
  .pll ol{margin-top:4px}
  .kv{gap:4px 16px}
  th,td{padding-top:4px;padding-bottom:4px}
  .cmp{row-gap:6px}
  .legend{margin-top:4px}
  .reactor{max-width:clamp(200px,min(70cqi,20vh),440px)}
}

/* Dentro de cada panel, según su propio ancho */
@container (max-width:599px){
  .h-hora,.a-turnos,#hist td:first-child{display:none}
  .share .seg,th .lg{display:none}
  th .sh{display:inline}
  th,td{padding-left:5px;padding-right:5px}
  .w-mdl{width:6.4em}.w-tok{width:6.2em}.w-usd{width:6.2em}.w-share{width:4em}
  .share .sv{min-width:0}
  .pll li i{width:6.8em}
}
@container (max-width:459px){
  .cmp{grid-template-columns:minmax(0,1fr) minmax(48px,1fr) 4em;gap:8px 12px}
  .cmp .tn,.cmp .hd.tn{display:none}
  .cpb{grid-template-columns:minmax(0,1fr) auto;gap:4px 14px}
  .cpb .k{grid-column:1;white-space:normal}
  .cpb .v{grid-column:2}
  .cpb .cbar{grid-column:1/-1;margin-bottom:6px}
}
@container (max-width:419px){
  /* La leyenda de la comparativa parte sus líneas: sin esto, a 320 px se sale por la derecha. */
  .ctk span{white-space:normal}
  #atab th:nth-child(2),#atab td:nth-child(2),#hist th:nth-child(3),#hist td:nth-child(3){display:none}
  .cmp{grid-template-columns:minmax(0,1fr) auto;grid-auto-flow:row dense;gap:6px 12px}
  .cmp .hd:nth-child(2){display:none}
  .cmp .nm{grid-column:1}
  .cmp .pc{grid-column:2}
  /* Las filas van en .filas y .fila con display:contents: la barra es nieta de .cmp, no hija. */
  .cmp .fila>div:has(>.seg){grid-column:1/-1;margin-bottom:6px}
  .cmp .nm b{white-space:normal}
  .kv{gap:6px 10px}
}
/* HUD cerrado con /jarvis: si window.close() no cierra la ventana, queda este aviso encima de todo. */
.hudoff{display:none;position:fixed;inset:0;z-index:50;align-items:center;justify-content:center;padding:16px;text-align:center;background:var(--bg);color:var(--txt);font:600 clamp(16px,2.4vw,22px)/1.4 system-ui,sans-serif;letter-spacing:.04em}
body.hud-off .hudoff{display:flex}
body.hud-off .wrap,body.hud-off .neb,body.hud-off .floor,body.hud-off .scan{visibility:hidden}
/* Colores del tema en el SVG y en lo que pinta el script. Los atributos de color del SVG (fill, stroke, stop-color)
   ceden ante cualquier regla CSS; los estilos en línea del script se cubren con !important. */
.face>circle:first-child{stroke:rgba(var(--acc-rgb),.18)}
.mark[stroke="#eaffff"]{stroke:var(--warn)}
.mark[stroke="#ff4d4d"]{stroke:var(--crit)}
#arc{stroke:var(--acc);color:var(--acc)!important}
body.lv-w #arc{stroke:var(--warn);color:var(--warn)!important}
body.lv-x #arc{stroke:var(--crit);color:var(--crit)!important}
#gwc stop:first-child{stop-color:var(--ring1)}
#gwc stop:last-child{stop-color:var(--ring2)}
.gring .g2{stroke:var(--ring2)}
.gring svg>circle:last-child{fill:var(--ring1)}
.gring svg{filter:drop-shadow(0 0 4px rgba(var(--ring-rgb),calc(.7*var(--glow))))}
#globe{filter:var(--globo-filtro)}
body.lv-x #globe{filter:var(--globo-filtro-x)}
.shift{color:var(--acc)!important}
body.lv-w .shift{color:var(--warn)!important}
body.lv-x .shift{color:var(--crit)!important}
.chart line{stroke:rgba(var(--acc-rgb),.12)}
.chart line:not([stroke-dasharray]){stroke:rgba(var(--acc-rgb),.45)}
.chart text[style]{fill:var(--acc2)!important}
.chart rect[fill="#e8fbff"]{fill:var(--modelo-opus);stroke:var(--modelo-opus);--bc:var(--modelo-opus)}
.chart rect[fill="#7fe7ff"]{fill:var(--modelo-haiku);stroke:var(--modelo-haiku);--bc:var(--modelo-haiku)}
.chart rect[fill="#c4b5fd"]{fill:var(--modelo-fable);stroke:var(--modelo-fable);--bc:var(--modelo-fable)}
.chart rect[fill="#dbeafe"]{fill:var(--modelo-otro);stroke:var(--modelo-otro);--bc:var(--modelo-otro)}
.chart rect[style]{filter:drop-shadow(0 0 calc(3px*var(--glow)) var(--bc,var(--acc)))!important}
.chart polyline{stroke:var(--txt);filter:drop-shadow(0 0 3px rgba(var(--acc-rgb),calc(.7*var(--glow))))!important}
.chart circle{fill:var(--bg);stroke:var(--txt)}

/* Tema claro: las sombras de legibilidad del porcentaje son claras y la tinta del número va sin halo de color. */
html[data-tema="claro"] .rc .p{text-shadow:0 0 4px var(--bg),0 0 14px rgba(var(--bg-rgb),.95)}
html[data-tema="claro"] .pnl{box-shadow:0 1px 2px rgba(20,40,80,.06),0 10px 28px var(--shadow)}
html[data-tema="claro"] .pnl:hover,html[data-tema="claro"] .pnl.lit{box-shadow:0 0 0 1px rgba(var(--acc-rgb),.25),0 10px 28px var(--shadow)}
html[data-tema="claro"] .floor i{opacity:.4}
html[data-tema="claro"] body:before{box-shadow:inset 0 0 70px rgba(var(--crit-rgb),.28)}
html[data-tema="claro"] body.lv-x:before{animation-name:alarm-claro}
@keyframes alarm-claro{0%,100%{opacity:.4}50%{opacity:.8}}
/* Mark L: reflejo de cristal en el borde superior de cada panel. */
html[data-tema="mark-l"] .pnl>.in{background:linear-gradient(180deg,rgba(255,255,255,.045),transparent 38%)}

/* Natural. Fondo liso, paneles opacos con filo de 1 px, etiquetas en minúscula, sin rejilla, escaneo, nebulosa
   ni esquinas. El 3D se queda: globo en canvas, anillo inclinado que gira (más despacio), marcas y núcleo. */
html[data-tema="natural"] body{background-image:radial-gradient(ellipse 70% 50% at 20% -10%,rgba(var(--acc2-rgb),.03),transparent 70%);background-attachment:fixed;font-weight:400}
html[data-tema="natural"] .neb,html[data-tema="natural"] .floor,html[data-tema="natural"] .scan,html[data-tema="natural"] .shift{display:none}
html[data-tema="natural"] .k{text-transform:none;letter-spacing:.005em}
html[data-tema="natural"] .num{font-feature-settings:"tnum" 1}
/* Cabecera simple: punto de color, nombre y estado a la derecha. */
html[data-tema="natural"] header{border-bottom:1px solid var(--borde);padding-bottom:14px;gap:10px 22px}
html[data-tema="natural"] header:after{display:none}
html[data-tema="natural"] .logo{width:12px;height:12px;border:none;border-radius:50%;background:var(--acc);box-shadow:none}
html[data-tema="natural"] .logo:after{display:none}
html[data-tema="natural"] h1{font-size:clamp(18px,calc(.5vw + .5vh + 6px),26px);font-weight:600;letter-spacing:-.005em;text-transform:none;text-shadow:none}
html[data-tema="natural"] h1 .brand{display:none}
html[data-tema="natural"] .al{text-transform:none;letter-spacing:0;border-radius:6px;padding:3px 12px;animation:none;box-shadow:none!important}
html[data-tema="natural"] #al-ctx.w{background:rgba(var(--warn-rgb),.1)}
html[data-tema="natural"] #al-ctx.x,html[data-tema="natural"] #al-sig{background:rgba(var(--crit-rgb),.12)}
html[data-tema="natural"] .hstat .k{font-size:14px}
html[data-tema="natural"] .dot,html[data-tema="natural"] .dot.wait,html[data-tema="natural"] .dot.off{box-shadow:none;animation:none}
/* Paneles: opacos, filo de 1 px y una luz muy leve arriba. */
html[data-tema="natural"] .pnl,html[data-tema="natural"] .pnl:hover,html[data-tema="natural"] .pnl.lit,html[data-tema="natural"] body.lv-w #p-ctx,html[data-tema="natural"] body.lv-x #p-ctx{
  background:linear-gradient(180deg,rgba(var(--acc2-rgb),.022),rgba(var(--acc2-rgb),0) 140px),var(--panel);border:1px solid var(--borde);border-radius:10px;
  -webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:0 10px 24px -14px var(--shadow);transition:border-color .4s}
html[data-tema="natural"] .pnl:hover,html[data-tema="natural"] .pnl.lit{border-color:var(--borde-2)}
html[data-tema="natural"] body.lv-w #p-ctx{border-color:rgba(var(--warn-rgb),.5)}
html[data-tema="natural"] body.lv-x #p-ctx{border-color:rgba(var(--crit-rgb),.75)}
html[data-tema="natural"] .pnl:before,html[data-tema="natural"] .pnl:after,html[data-tema="natural"] .pnl>.in:before{display:none}
html[data-tema="natural"] .ph{border:none;border-image:none;padding-bottom:0;margin-bottom:14px}
html[data-tema="natural"] .ph .t{font-size:var(--fv);font-weight:600;letter-spacing:0;text-transform:none;text-shadow:none}
html[data-tema="natural"] .ph .t:before{display:none}
/* Plan: una línea de texto y una barra fina, sin rayas. */
html[data-tema="natural"] #p-plan>.in{gap:10px;padding-top:calc(var(--pad)*.8);padding-bottom:calc(var(--pad)*.8)}
html[data-tema="natural"] .plt{font-size:var(--fv);letter-spacing:0;text-transform:none}
html[data-tema="natural"] .plt b,html[data-tema="natural"] #p-plan.done .plt b{font-weight:600;text-shadow:none}
html[data-tema="natural"] .plok{letter-spacing:0;box-shadow:none;border-radius:4px;font-weight:600}
html[data-tema="natural"] .plcur em{color:var(--acc)}
html[data-tema="natural"] .plbar{height:8px;border:none;background:var(--track)}
html[data-tema="natural"] .plfill,html[data-tema="natural"] #p-plan.done .plfill{background-image:none;background-color:var(--acc);box-shadow:none}
html[data-tema="natural"] #p-plan.done .plbar{border:none}
html[data-tema="natural"] .pll summary{text-transform:none;letter-spacing:0;color:var(--sub);border-radius:4px}
html[data-tema="natural"] .pll summary:before{color:var(--sub)}
html[data-tema="natural"] .pll li i{text-transform:none;letter-spacing:0}
html[data-tema="natural"] .pll li.e i{color:var(--acc);text-shadow:none}
/* Contexto: el globo 3D sin halo de neón, el anillo inclinado gira despacio y el núcleo lleva una cifra limpia. */
html[data-tema="natural"] .reactor:before{inset:-6%;background:radial-gradient(circle,rgba(var(--acc2-rgb),.045),rgba(var(--acc2-rgb),0) 66%)}
html[data-tema="natural"] body.lv-x .reactor:before{background:radial-gradient(circle,rgba(var(--crit-rgb),.07),rgba(var(--crit-rgb),0) 66%)}
html[data-tema="natural"] .gring svg{filter:none;animation-duration:30s}
html[data-tema="natural"] body.lv-x .gring svg{animation-duration:14s}
html[data-tema="natural"] .gring svg>circle:first-child{stroke-width:1.6}
html[data-tema="natural"] #arc{filter:none}
html[data-tema="natural"] .tick{stroke:rgba(var(--acc2-rgb),.1)}
html[data-tema="natural"] .face>circle:first-child{stroke:rgba(var(--acc2-rgb),.14)}
html[data-tema="natural"] .rc .p{font-family:var(--cifra);font-weight:300;letter-spacing:-.02em;text-shadow:0 0 6px var(--panel),0 0 16px var(--panel)}
html[data-tema="natural"] .rc .p small{color:var(--sub);font-weight:400;letter-spacing:0}
html[data-tema="natural"] body.lv-w .rc .p small{color:var(--warn)}
html[data-tema="natural"] body.lv-x .rc .p{color:var(--crit-txt);text-shadow:0 0 6px var(--panel),0 0 16px var(--panel)}
html[data-tema="natural"] .rc .k{color:var(--sub);text-shadow:0 0 6px var(--panel)}
html[data-tema="natural"] .kv{grid-template-columns:minmax(0,1fr) auto;gap:0;border-top:1px solid var(--borde)}
html[data-tema="natural"] .kv>.v{padding-left:16px}
/* Celdas a toda la altura de su fila: las líneas de separación de etiqueta y cifra quedan a la misma altura. */
html[data-tema="natural"] .kv{align-items:stretch}
html[data-tema="natural"] .kv>span{padding:9px 0;border-bottom:1px solid var(--borde)}
/* Coste y comparativa */
html[data-tema="natural"] .cost{font-family:var(--cifra);font-weight:300;letter-spacing:-.02em;text-shadow:none;margin-bottom:8px}
html[data-tema="natural"] .cost small{letter-spacing:0;font-family:var(--sans)}
html[data-tema="natural"] .mdl{color:var(--txt)}
html[data-tema="natural"] .cbar{height:8px;border:none}
html[data-tema="natural"] .cbar.real i{background:var(--acc);box-shadow:none}
html[data-tema="natural"] .cbar.opus i{background:var(--acc2);opacity:.55;box-shadow:none}
html[data-tema="natural"] .cah b{color:var(--acc);font-weight:600;text-shadow:none}
html[data-tema="natural"] .ctk i,html[data-tema="natural"] .legend i{box-shadow:none}
html[data-tema="natural"] .stack{height:6px;gap:3px}
html[data-tema="natural"] .stack div{background:var(--c);box-shadow:none;opacity:1;border-radius:3px}
/* Barras de reparto: continuas y redondeadas, sin segmentos inclinados. */
html[data-tema="natural"] .seg{gap:0;height:8px;border-radius:4px;overflow:hidden;background:var(--track)}
html[data-tema="natural"] .seg.sm{height:6px}
html[data-tema="natural"] .seg i{transform:none;background:transparent}
html[data-tema="natural"] .seg i.on{background:var(--c,var(--ce));box-shadow:none}
html[data-tema="natural"] .cmp .hd,html[data-tema="natural"] .cmp .hd.tn{text-transform:none;letter-spacing:0}
html[data-tema="natural"] .cmp .nm{border-left-width:3px}
html[data-tema="natural"] .cmp .nm b{letter-spacing:0;font-weight:600}
html[data-tema="natural"] .cmp .nm b em{letter-spacing:0;font-weight:400;color:var(--acc);background:#2a312b;border-radius:4px;padding:0 6px}
/* Tablas y gráfica */
html[data-tema="natural"] th{text-transform:none;letter-spacing:0;border-bottom:1px solid var(--borde)}
html[data-tema="natural"] td{border-bottom-color:var(--borde)}
html[data-tema="natural"] tbody tr:hover td{background:rgba(var(--acc2-rgb),.03)}
html[data-tema="natural"] td .ftag{letter-spacing:0}
html[data-tema="natural"] td.amc{color:var(--txt)}
html[data-tema="natural"] .chart line{stroke:rgba(var(--acc2-rgb),.08)}
html[data-tema="natural"] .chart line:not([stroke-dasharray]){stroke:rgba(var(--acc2-rgb),.25)}
html[data-tema="natural"] .chart rect[style]{filter:none!important}
html[data-tema="natural"] .chart polyline{stroke:var(--warn);filter:none!important}
html[data-tema="natural"] .chart circle{stroke:var(--warn)}
html[data-tema="natural"] footer{border-top:1px solid var(--borde);border-image:none}
html[data-tema="natural"] footer .line{background:none}
/* Alertas: un velo rojo quieto en los bordes, sin parpadeo. */
html[data-tema="natural"] body:before{box-shadow:inset 0 0 90px rgba(var(--crit-rgb),.2)}
html[data-tema="natural"] body.lv-x:before{animation:none;opacity:1}
html[data-tema="natural"] body.lv-w:before{opacity:0}
/* Detalle del natural definitivo. Cifras de tabla en monoespaciada; títulos y cifras grandes en sans. */
html[data-tema="natural"] td.num,html[data-tema="natural"] .kv .v,html[data-tema="natural"] .cpb .v,html[data-tema="natural"] .cmp div.pc,html[data-tema="natural"] .cmp div.tn,html[data-tema="natural"] .share .sv,html[data-tema="natural"] .ctk b{font-family:var(--mono);font-size:max(14px,.92em);letter-spacing:0}
/* Filas sin datos: en el gris de las etiquetas, no con transparencia (el contraste no baja de 4,5:1). */
html[data-tema="natural"] .cmp .zero,html[data-tema="natural"] .cmp .zero b,html[data-tema="natural"] #p-comp.nodata .cpb .opus,html[data-tema="natural"] #p-comp.nodata #cvopus{opacity:1;color:var(--sub)}
html[data-tema="natural"] .plok{text-transform:none}
/* Coste: la cifra arriba y el modelo de la sesión al pie del panel. */
html[data-tema="natural"] #p-cost .in>.k{margin-top:auto;padding-top:12px}

/* Distribución natural: franja de resumen. Arriba, en una fila, lo que se mira de un vistazo: contexto (el núcleo 3D a un lado
   de sus cifras), coste y comparativa. Debajo, el detalle. La prioridad de los paneles es la de siempre (contexto, coste,
   comparativa, reparto, agentes, plan, últimos turnos, gráfica); con paneles ocultos manda la recolocación de pn-sel.
   Menos de 560 px: una columna y el núcleo encima de sus cifras. */
@media (max-width:559px){
  html[data-tema="natural"] .reactor{max-width:min(240px,64vw)}
}
@media (min-width:560px){
  html[data-tema="natural"] .ctxb{flex-direction:row;align-items:center;justify-content:flex-start;gap:clamp(18px,2vw,40px)}
  html[data-tema="natural"] .reactor{width:clamp(150px,min(40%,24vh),300px);max-width:none}
  html[data-tema="natural"] .kv{flex:1;min-width:0}
  html[data-tema="natural"] body:not(.pn-sel) .wrap{grid-template-areas:"head head" "ctx ctx" "cost comp" "mod mod" "agt agt" "plan plan" "hist hist" "chart chart" "foot foot"}
  html[data-tema="natural"][data-densidad="compacto"] body:not(.pn-sel) .wrap{grid-template-areas:"head head" "ctx ctx" "cost comp" "mod mod" "agt agt" "plan plan" "chart chart"}
}
/* 900-1199 px: reparto y agentes lado a lado. */
@media (min-width:900px){
  html[data-tema="natural"] body:not(.pn-sel) .wrap{grid-template-columns:minmax(0,1fr) minmax(0,1fr);
    grid-template-areas:"head head" "ctx ctx" "cost comp" "mod agt" "plan plan" "hist hist" "chart chart" "foot foot"}
  html[data-tema="natural"][data-densidad="compacto"] body:not(.pn-sel) .wrap{grid-template-areas:"head head" "ctx ctx" "cost comp" "mod agt" "plan plan" "chart chart"}
}
/* 1200 px o más: la franja de tres paneles; debajo, reparto a la izquierda y agentes a su lado. */
@media (min-width:1200px){
  html[data-tema="natural"] body:not(.pn-sel) .wrap{grid-template-columns:minmax(0,1.3fr) minmax(0,.85fr) minmax(0,1fr);
    grid-template-areas:"head head head" "ctx cost comp" "mod agt agt" "plan plan plan" "hist hist hist" "chart chart chart" "foot foot foot"}
  html[data-tema="natural"][data-densidad="compacto"] body:not(.pn-sel) .wrap{grid-template-areas:"head head head" "ctx cost comp" "mod agt agt" "plan plan plan" "chart chart chart"}
}
/* 1600 px o más y alto de 1000 o más: todo cabe. El plan arriba, la franja, y debajo reparto con la gráfica y agentes con los
   últimos turnos. La fila del medio toma el alto de su contenido y la de abajo, lo que sobra. */
@media (min-width:1600px) and (min-height:1000px){
  html[data-tema="natural"] body:not(.pn-sel) .wrap{grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr) minmax(0,1fr);
    grid-template-rows:auto min-content min-content min-content minmax(150px,1fr) auto;
    grid-template-areas:"head head head" "plan plan plan" "ctx cost comp" "mod chart chart" "agt hist hist" "foot foot foot"}
  html[data-tema="natural"] .reactor{width:clamp(170px,min(40%,20vh),400px)}
}

/* Sin backdrop-filter (o con transparencia reducida): paneles opacos para que el fondo no estorbe la lectura. */
@supports not ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px))){
  .pnl{--glass:var(--panel);--glass2:var(--panel)}
}
@media (prefers-reduced-transparency:reduce){
  .pnl{--glass:var(--panel);--glass2:var(--panel);-webkit-backdrop-filter:none;backdrop-filter:none}
  .neb{display:none}
}
/* Compacto (automático, ventana pequeña): sin capas de efecto. Fuera brillos, desenfoque, nebulosa, rejilla, escaneo, onda,
   el halo del globo y su anillo interior de puntos; paneles opacos. El globo, el anillo principal y el núcleo se quedan,
   con la mitad de las partículas (lo hace el script). En 1600 x 1000 o más nunca hay compacto (el área pasa de 900 x 600). */
html[data-densidad="compacto"] body{--glow:0;--cristal:none}
html[data-densidad="compacto"] .pnl{--glass:var(--panel);--glass2:var(--panel);-webkit-backdrop-filter:none;backdrop-filter:none}
html[data-densidad="compacto"] .neb,html[data-densidad="compacto"] .floor,html[data-densidad="compacto"] .scan,html[data-densidad="compacto"] .shift,html[data-densidad="compacto"] .gring svg .g2,html[data-densidad="compacto"] .reactor:before{display:none}
/* Movimiento reducido: el globo sigue quieto (lo para el script) y la rejilla y el escaneo no se mueven. */
@media (prefers-reduced-motion:reduce){.floor i{animation:none}}
/* Opción paneles: los paneles que no se piden se ocultan y los demás se colocan en una rejilla
   que se rellena sola (sin huecos de las áreas fijas). Cabecera, plan, gráfica, turnos y pie van a todo el ancho. */
.pnl.pn-off{display:none!important}
body.pn-sel .wrap{height:auto;grid-template-rows:none;grid-template-areas:none;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}
body.pn-sel .wrap>header,body.pn-sel .wrap>footer,body.pn-sel .pnl{grid-area:auto!important}
body.pn-sel .wrap>header,body.pn-sel .wrap>footer,body.pn-sel #p-plan,body.pn-sel #p-chart,body.pn-sel #p-hist{grid-column:1/-1}
</style></head>
<body>
<div class="hudoff" id="hudoff" role="status">HUD cerrado. Escribe /jarvis para abrirlo.</div>
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
    <div><div class="k">Señal</div><div class="v" id="link"><span class="dot wait" id="ldot"></span><span id="ltxt">Esperando</span></div></div>
    <div class="opt"><div class="k">Turnos</div><div class="v num" id="hturns">0</div></div>
    <div><div class="k">Reloj</div><div class="v num" id="clock">--:--:--</div></div>
  </div>
</header>

<section class="pnl" id="p-plan"><div class="in">
  <div class="plh">
    <span class="plt vacio num" id="pltxt"><span id="plv">Plan · sin tareas activas</span><span id="pln" hidden>Plan · <b id="plnm"></b> · <b id="plpc"></b></span></span>
    <span class="plok">Completado</span>
    <span class="plcur" id="plcur" hidden><em>En curso</em> · <span id="plcurt"></span></span>
  </div>
  <div class="plbar" role="progressbar" aria-label="Progreso del plan" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="plbar"><div class="plfill" id="plfill"></div></div>
  <details class="pll off" id="pll"><summary id="plsum">Tareas</summary><ol id="plist"></ol></details>
</div></section>

<div class="grid">
  <section class="pnl" id="p-ctx"><div class="in">
    <div class="ph"><span class="t">Contexto</span><span class="r" id="ctxstate">Normal</span></div>
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
        <div class="rc"><div class="p num" id="pct"><span id="pctv">0</span><small>%</small></div><div class="k">usado</div></div>
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
    <div class="cost num" id="coste"><span id="costev">0.0000</span><small>USD</small></div>
    <div class="sub" id="clast">Sin turnos todavía</div>
    <div class="k">Modelo de la sesión</div>
    <div class="mdl" id="modelo">—</div>
  </div></section>

  <section class="pnl" id="p-comp"><div class="in">
    <div class="ph"><span class="t">Comparativa · Haiku frente a Opus</span><span class="r num" id="cpct">sin estimación</span></div>
    <div class="cpb">
      <span class="k" title="Suma del coste de los turnos contados; el panel Coste incluye además lo gastado antes de abrir el HUD">Real en turnos</span><span class="v num" id="cvreal">0.0000 USD</span><div class="cbar real"><i id="cbreal"></i></div>
      <span class="k opus">Si todo fuera Opus</span><span class="v num" id="cvopus">—</span><div class="cbar opus"><i id="cbopus"></i></div>
    </div>
    <div class="cah num" id="cah"><span id="cahm">sin datos de Opus todavía</span><span id="caho" hidden><span id="cahl">Ahorro</span> <b id="caha"></b> · <b id="cahp"></b><span id="cahs"></span></span></div>
    <div class="stack empty" id="cstack"></div>
    <div class="ctk num" id="ctk"></div>
    <div class="cnote">Estimación con tus turnos reales; varía con la caché y con la proporción de entrada y salida.</div>
  </div></section>

  <section class="pnl" id="p-mod"><div class="in">
    <div class="ph"><span class="t">Reparto por modelo</span><span class="r num" id="mtot">0 tokens</span></div>
    <div class="stack empty" id="stack"></div>
    <div class="cmp" id="cmp"><span class="hd">Modelo</span><span class="hd">Trabajo</span><span class="hd r-al">%</span><span class="hd tn r-al">Turnos</span><div class="filas" id="cmpr"></div></div>
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
var WARN=70,CRIT=85,NT=60,PKEY='consumo.plan.abierto';
var lastData=null,firstRender=true;
// Señal y lectura de datos.js: funciones de senal.ts, probadas en consumo.test.tsx.
/*LOGICA*/
` + LOGICA + `
/*FIN*/
/*DOM*/
` + DOM + `
/*FIN DOM*/
var ST=nuevoEstado(Date.now());
var VACIO={modelo:'',contexto:{tokens:0,window:0,percent:0},alerta:'normal',coste:0,modelos:[],agentes:[],historial:[],plan:null,comparativa:null,actualizado:0,latido:0};
function $id(i){return document.getElementById(i)}
// Personalización (userConfig): llega en datos.js como config, ya validada por el mod. La aplica aplicaConfig().
// Idioma: los textos de la página están en español; con idioma en se traducen con EN (pares de texto, del más
// largo al más corto). Solo se traducen etiquetas, nunca datos (nombres de agentes, modelos o tareas).
var IDIOMA='es',LOC='es-ES';
/*IDIOMA*/
` + IDIOMA_JS + `
/*FIN IDIOMA*/
function tr(s){return traducir(s,EN)}
function tx(s){return IDIOMA==='en'?tr(s):String(s)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function n(x){return Number(x||0).toLocaleString(LOC)}
function kn(x){x=Number(x||0);if(x>=1e6)return (x/1e6).toFixed(x>=1e7?1:2)+'M';if(x>=1e4)return (x/1e3).toFixed(1)+'k';return n(x)}
function fam(m){m=String(m||'').toLowerCase();for(var k in FAM){if(k!=='otro'&&m.indexOf(k)>=0)return k}return 'otro'}
function col(f){return 'var(--f-'+(FAM[f]?f:'otro')+')'}
var HEX={opus:'#e8fbff',haiku:'#7fe7ff',fable:'#c4b5fd',sonnet:'#dbeafe',otro:'#dbeafe'};
// Piezas que se crean una vez (al aparecer una fila nueva); después solo se actualizan con ponTexto, ponAttr, ponEstilo y ponSegs.
function mk(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function segsEl(c,cls,count){var d=mk('div','seg'+(cls?' '+cls:''),new Array(count+1).join('<i></i>'));ponEstilo(d,'--c',c);return d}
function ponClase(e,c,on){on=!!on;if(e.classList.contains(c)===on)return false;e.classList.toggle(c,on);return true}
function ver(e,on){on=!!on;if(e.hidden!==on)return false;e.hidden=!on;return true}
var VACIA=[{vacia:true}];
function filaVacia(){return mk('tr','','<td colspan="5" class="empty-row">'+tx('Sin turnos todavía')+'</td>')}
function pc(x){x=Number(x||0);return (x>=10||x===0?Math.round(x):x.toFixed(1))}
function hhmm(t){return t?new Date(t).toLocaleTimeString(LOC):'—'}
(function(){
  var g=$id('ticks'),h='';
  for(var i=0;i<NT;i++){var a=(i/NT)*360;h+='<line class="tick" x1="100" y1="15" x2="100" y2="22" transform="rotate('+a.toFixed(2)+' 100 100)"/>'}
  g.innerHTML=h;
})();

// Movimiento reducido: lo consultan el globo y las cifras que se deslizan (tween).
var MOV=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
function quieto(){return !!(MOV&&MOV.matches)}
// Densidad automática (densidadDe() está en <head>). Solo cambia el atributo data-densidad de <html>: el CSS hace el resto
// y no se rehace ningún panel. El globo se redibuja (mitad de partículas en compacto) y la gráfica toma su nuevo tamaño.
function ponDensidad(){
  var d=densidadDe(window.innerWidth,window.innerHeight),root=document.documentElement;
  if(root.getAttribute('data-densidad')===d)return false;
  root.setAttribute('data-densidad',d);
  if(GLOBO.dibuja)GLOBO.dibuja();
  if(lastData)renderChart(lastData);
  return true;
}
function compacto(){return document.documentElement.getAttribute('data-densidad')==='compacto'}

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
  function vacio(f){return {modelo:tx('sin turnos'),familia:f,entrada:0,salida:0,cache:0,turnos:0,reparto:0,repartoTurnos:0,zero:true}}
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

function filaModelo(r){
  var f=mk('div','fila','<div class="nm"><b><em>'+tx('principal')+'</em></b><span></span></div><div></div><div class="pc num"></div><div class="tn num"></div>');
  var b=f.children[0].firstChild;b.insertBefore(document.createTextNode(''),b.firstChild);
  f.children[1].appendChild(segsEl(col(r.x.familia),'',24));
  return f;
}
function ponFilaModelo(f,r){
  var x=r.x,c=col(x.familia),k=f.children,nm=k[0],b=nm.firstChild,sg=k[1].firstChild;
  ponAttr(nm,'title',x.modelo+tx(' · entrada ')+n(x.entrada)+tx(' · salida ')+n(x.salida)+tx(' · caché ')+n(x.cache));
  ponEstilo(nm,'--c',c);ponEstilo(k[2],'--c',c);ponEstilo(sg,'--c',c);
  ponTexto(b.firstChild,FAM[x.familia]||x.familia);
  ver(b.lastChild,!!r.rol);
  ponTexto(nm.lastChild,x.modelo);
  ponSegs(sg,x.reparto);
  ponTexto(k[2],pc(x.reparto)+'%');
  ponTexto(k[3],n(x.turnos));
  for(var i=0;i<4;i++)ponClase(k[i],'zero',!!x.zero);
}
function renderModels(d){
  var ms=modelosDe(d);
  var work=ms.reduce(function(a,x){return a+x.entrada+x.salida},0);
  var turns=ms.reduce(function(a,x){return a+x.turnos},0);
  ponTexto($id('hturns'),n(turns));
  ponTexto($id('mtot'),kn(work)+' tokens · '+n(turns)+tx(' turnos'));
  var st=$id('stack');
  ponClase(st,'empty',!work);
  lista(st,work?ms:[],function(x){return x.modelo},function(){return mk('div')},function(e,x){
    ponAttr(e,'title',x.modelo+' '+pc(x.reparto)+'%');ponEstilo(e,'--c',col(x.familia));ponEstilo(e,'flex-grow',String((x.entrada+x.salida)||0));
  });
  lista($id('cmpr'),comparativa(d,ms),function(r){return r.x.familia+'|'+r.x.modelo},filaModelo,ponFilaModelo);
}

var CHART='';
// Gráfica SVG: barras apiladas entrada/salida por turno, color del modelo; línea blanca con el coste.
function renderChart(d){
  var hs=d.historial||[],box=$id('chart');
  if(!box.offsetParent||!box.clientWidth)return;
  var W=Math.max(200,box.clientWidth),H=Math.max(140,box.clientHeight);
  // La gráfica solo se redibuja si entra un turno o cambia el tamaño; el latido no la toca.
  var key=W+'x'+H+'|'+JSON.stringify(hs);
  if(key===CHART)return;
  CHART=key;
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
    s+='<text x="'+(L+iw/2)+'" y="'+(T+ih/2)+'" text-anchor="middle">'+tx('Sin turnos todavía')+'</text>';
  }
  var slot=iw/Math.max(hs.length,20),bw=Math.max(3,Math.min(28,slot*0.62)),pts=[];
  var every=Math.max(1,Math.ceil(hs.length/(iw/48)));
  hs.forEach(function(t,j){
    var f=t.familia||fam(t.modelo),c=HEX[f]||HEX.otro;
    var x=L+slot*j+(slot-bw)/2;
    var hi=ih*t.entrada/top,ho=ih*t.salida/top;
    var y0=T+ih;
    s+='<g><title>'+esc(hhmm(t.hora)+' · '+t.agente+' · '+t.modelo+tx(' · entrada ')+n(t.entrada)+tx(' · salida ')+n(t.salida)+(t.coste!=null?' · '+Number(t.coste).toFixed(4)+' USD':''))+'</title>'+
      '<rect class="bar" x="'+x.toFixed(1)+'" y="'+(y0-hi).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,hi).toFixed(1)+'" fill="'+c+'" fill-opacity=".38" stroke="'+c+'" stroke-opacity=".7" stroke-width="1"/>'+
      '<rect class="bar" x="'+x.toFixed(1)+'" y="'+(y0-hi-ho).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(0,ho).toFixed(1)+'" fill="'+c+'" style="filter:drop-shadow(0 0 3px '+c+')"/></g>';
    if(j%every===0||j===hs.length-1)s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle">'+(j+1)+'</text>';
    if(ctop&&t.coste!=null)pts.push((x+bw/2).toFixed(1)+','+(T+ih-ih*t.coste/ctop).toFixed(1));
  });
  if(pts.length>1)s+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="#f4feff" stroke-width="1.8" style="filter:drop-shadow(0 0 3px rgba(127,231,255,.7))"/>';
  pts.forEach(function(p){var q=p.split(',');s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="2.6" fill="#070b10" stroke="#f4feff" stroke-width="1.4"/>'});
  s+='</svg>';
  box.innerHTML=s;
  ponTexto($id('cmax'),hs.length?(tx('pico')+' '+kn(mx)+' tokens'):'');
  var fams={};hs.forEach(function(t){fams[t.familia||fam(t.modelo)]=1});
  var lg=Object.keys(fams).map(function(f){return '<span><i style="--c:'+col(f)+'"></i>'+FAM[f]+'</span>'}).join('');
  lg+='<span>'+tx('tono claro: entrada; intenso: salida')+'</span>';
  if(ctop)lg+='<span><i class="ln" style="--c:var(--txt)"></i>'+tx('USD por turno')+'</span>';
  $id('clegend').innerHTML=lg;
}

function filaTurno(){return mk('tr','','<td class="al-l dimc num h-hora"></td><td class="al-l"></td><td class="al-l"><span class="ftag"></span></td><td class="num"></td><td class="num amc"></td>')}
function renderHist(d){
  var hs=(d.historial||[]).slice().reverse();
  // La tabla guarda los últimos 20: si hay más turnos, el contador lo dice ("20 de 35 turnos") y cuadra con la cabecera.
  var total=modelosDe(d).reduce(function(a,x){return a+(x.turnos||0)},0);
  ponTexto($id('hcount'),hs.length<total?hs.length+tx(' de ')+n(total)+tx(' turnos'):hs.length+tx(hs.length===1?' turno':' turnos'));
  var marcar=!firstRender;
  lista($id('hrows'),hs.length?hs:VACIA,function(t){return t.vacia?'vacia':t.hora+'|'+t.agente+'|'+t.modelo},function(t){return t.vacia?filaVacia():filaTurno()},function(tr,t,i,nuevo){
    if(t.vacia)return;
    var f=t.familia||fam(t.modelo),c=col(f),k=tr.children;
    if(nuevo&&marcar)tr.className='new';
    ponTexto(k[0],hhmm(t.hora));
    ponAttr(k[1],'title',t.agente);ponTexto(k[1],t.agente);
    ponAttr(k[2],'title',t.modelo);ponEstilo(k[2],'--c',c);ponTexto(k[2].firstChild,FAM[f]||f);
    ponTexto(k[3],kn(t.entrada+t.salida));
    ponTexto(k[4],t.coste!=null?Number(t.coste).toFixed(4):'—');
  });
  if(hs.length)firstRender=false;
  var last=d.historial&&d.historial[d.historial.length-1];
  ponTexto($id('clast'),last&&last.coste!=null?(tx('Último turno')+' ≈ '+Number(last.coste).toFixed(4)+' USD'):tx(last?'Último turno sin coste':'Sin turnos todavía'));
}

function filaAgente(){
  var tr=mk('tr','','<td class="al-l"></td><td class="al-l"><span class="ftag"></span></td><td class="num"></td><td class="num a-turnos"></td><td><div class="share"><span class="sv num"></span></div></td>');
  var sh=tr.children[4].firstChild;sh.insertBefore(segsEl('var(--ce)','sm',16),sh.firstChild);
  return tr;
}
function renderAgents(d){
  var agentes=d.agentes||[];
  var total=agentes.reduce(function(a,x){return a+x.input+x.output},0)||1;
  ponTexto($id('acount'),agentes.length+tx(agentes.length===1?' agente':' agentes'));
  lista($id('rows'),agentes.length?agentes:VACIA,function(x){return x.vacia?'vacia':x.nombre},function(x){return x.vacia?filaVacia():filaAgente()},function(tr,x){
    if(x.vacia)return;
    var s=(x.input+x.output)*100/total,f=fam(x.modelo),cc=col(f),k=tr.children,sh=k[4].firstChild,sg=sh.firstChild;
    ponAttr(k[0],'title',x.nombre);ponTexto(k[0],x.nombre);
    ponAttr(k[1],'title',x.modelo);ponEstilo(k[1],'--c',cc);ponTexto(k[1].firstChild,FAM[f]||f);
    ponAttr(k[2],'title',x.nombre+tx(' · entrada ')+n(x.input)+tx(' · salida ')+n(x.output)+tx(' · caché ')+n(x.cacheRead));ponTexto(k[2],kn(x.input+x.output));
    ponTexto(k[3],n(x.turns));
    ponEstilo(sg,'--c',cc);ponSegs(sg,s);ponTexto(sh.lastChild,pc(s)+'%');
  });
}

// Comparativa Haiku frente a Opus. Las cifras vienen hechas en datos.js; sin estimación se dice por qué y no se inventa nada.
function renderComp(d){
  var c=d.comparativa||null;
  var real=c?Number(c.costeReal||0):0,ok=!!(c&&c.disponible&&c.costeOpusEstimado!=null);
  var est=ok?Number(c.costeOpusEstimado):0,mx=Math.max(real,est);
  ponClase($id('p-comp'),'nodata',!ok);
  ponEstilo($id('cbreal'),'width',(ok?(mx>0?real*100/mx:0):(real>0?100:0)).toFixed(1)+'%');
  ponEstilo($id('cbopus'),'width',(ok&&mx>0?est*100/mx:0).toFixed(1)+'%');
  ponTexto($id('cvreal'),real.toFixed(4)+' USD');
  ponTexto($id('cvopus'),ok?est.toFixed(4)+' USD':'—');
  var ah=ok?Number(c.ahorro||0):0,ap=ok?Number(c.ahorroPct||0):0;
  ponTexto($id('cpct'),tx(ok?(ah>=0?'ahorro '+pc(ap)+' %':'sin ahorro'):'sin estimación'));
  ver($id('cahm'),!ok);ver($id('caho'),ok);
  ponTexto($id('cahm'),tx(c&&c.motivo?c.motivo:'sin datos de Opus todavía'));
  if(ok){
    ponTexto($id('cahl'),tx(ah>=0?'Ahorro':'Diferencia'));
    ponTexto($id('caha'),ah.toFixed(4)+' USD');
    ponTexto($id('cahp'),pc(ap)+' %');
    ponTexto($id('cahs'),tx(ah>=0?' menos que todo en Opus':': en tus turnos Haiku no salió más barato'));
  }
  var ts=c&&c.tokensPorModelo?c.tokensPorModelo:[];
  var tot=ts.reduce(function(a,x){return a+(Number(x.tokens)||0)},0);
  var st=$id('cstack');
  ponClase(st,'empty',!tot);
  lista(st,tot?ts:[],function(x){return x.familia},function(){return mk('div')},function(e,x){
    ponAttr(e,'title',(FAM[x.familia]||x.familia)+' '+n(x.tokens)+' tokens');ponEstilo(e,'--c',col(x.familia));ponEstilo(e,'flex-grow',String(Number(x.tokens)||0));
  });
  lista($id('ctk'),ts.length?ts:VACIA,function(x){return x.vacia?'vacia':x.familia},function(x){return x.vacia?mk('span','',tx('Sin turnos todavía')):mk('span','','<i></i><span></span> <b></b><span></span>')},function(e,x){
    if(x.vacia)return;
    var k=e.children;
    ponEstilo(k[0],'--c',col(x.familia));ponTexto(k[1],FAM[x.familia]||x.familia);ponTexto(k[2],kn(x.tokens));ponTexto(k[3],tx(' tokens con caché')+' · '+Number(x.coste||0).toFixed(4)+' USD');
  });
}

// Transiciones: los números grandes se deslizan al valor nuevo y un cambio de nivel lanza una onda.
var nivel=null,tw={};
function tween(id,to,fmt){
  var el=$id(id),t=tw[id]||(tw[id]={v:to,raf:0});
  if(t.raf){cancelAnimationFrame(t.raf);t.raf=0}
  var from=t.v,t0=performance.now(),dur=650;
  if(from===to||document.hidden||quieto()){t.v=to;ponTexto(el,fmt(to));return}
  (function step(now){var k=Math.min(1,(now-t0)/dur);k=1-Math.pow(1-k,3);t.v=from+(to-from)*k;ponTexto(el,fmt(t.v));if(k<1)t.raf=requestAnimationFrame(step);else{t.v=to;t.raf=0}})(t0);
}
function onda(lvl){
  if(quieto()||compacto())return;
  var o=document.createElement('div');o.className='shift';
  o.style.color=lvl==='x'?'#ff4d4d':lvl==='w'?'#ffffff':'#7fe7ff';
  document.body.appendChild(o);setTimeout(function(){o.remove()},1200);
}
// Borde blanco-cian que se enciende un momento cuando un panel cambia de estado.
function lit(els){for(var i=0;i<els.length;i++)(function(el){el.classList.add('lit');clearTimeout(el._lit);el._lit=setTimeout(function(){el.classList.remove('lit')},1200)})(els[i])}
var GLOBO={lvl:'',size:null,tinta:null};
function renderCtx(d){
  var c=d.contexto||{tokens:0,window:1,percent:0};
  var p=Math.max(0,Math.min(100,Number(c.percent)||0));
  var lvl=d.alerta?(d.alerta==='critica'?'x':d.alerta==='alta'?'w':''):(p>=CRIT?'x':p>=WARN?'w':'');
  if(lvl!==nivel){if(nivel!==null){onda(lvl);lit(document.querySelectorAll('.pnl'))}nivel=lvl;GLOBO.lvl=lvl}
  ponClase(document.body,'lv-w',lvl==='w');
  ponClase(document.body,'lv-x',lvl==='x');
  var on=Math.round(p*NT/100),ts=document.querySelectorAll('.tick');
  for(var i=0;i<ts.length;i++)ponAttr(ts[i],'class','tick'+(i<on?' on'+(lvl?' '+lvl:''):''));
  var arc=$id('arc'),hex=lvl==='x'?'#ff4d4d':lvl==='w'?'#ffffff':'#7fe7ff';
  ponEstilo(arc,'stroke-dashoffset',(590.6*(1-p/100)).toFixed(1));
  ponAttr(arc,'stroke',hex);ponEstilo(arc,'color',hex);
  tween('pctv',p,function(v){return String(pc(v))});
  var st=$id('ctxstate');
  ponTexto(st,tx(lvl==='x'?'Crítico':lvl==='w'?'Alto':'Normal'));
  ponEstilo(st,'color',lvl==='x'?'var(--rd)':lvl==='w'?'var(--wn)':'');
  var al=$id('al-ctx');
  ponAttr(al,'class','al'+(lvl?' on '+lvl:''));
  ponTexto(al,tx(lvl==='x'?'Contexto crítico':'Contexto alto')+' '+pc(p)+'%');
  ponTexto($id('ctxtok'),n(c.tokens));
  ponTexto($id('ctxwin'),n(c.window));
  ponTexto($id('ctxfree'),n(Math.max(0,(c.window||0)-(c.tokens||0))));
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
  ponClase(box,'done',done);
  ponClase(txt,'vacio',!ok);
  ver($id('plv'),!ok);ver($id('pln'),ok);
  if(ok){ponTexto($id('plnm'),n(hechas)+tx(' de ')+n(tot));ponTexto($id('plpc'),pct+' %')}
  ponEstilo($id('plfill'),'width',pct+'%');
  ponAttr(bar,'aria-valuenow',String(pct));
  var ts=ok&&p.tareas?p.tareas:[];
  var cur=ts.filter(function(t){return t.estado==='en curso'})[0];
  var pcur=$id('plcur');
  ver(pcur,!!cur);ponAttr(pcur,'title',cur?cur.titulo:'');
  if(cur)ponTexto($id('plcurt'),cur.titulo);
  ponClase(lst,'off',!ts.length);
  ponTexto($id('plsum'),tx('Tareas')+' ('+ts.length+')');
  lista($id('plist'),ts,function(t,i){return String(i)},function(){return mk('li','','<i></i><span></span>')},function(li,t){
    ponAttr(li,'class',t.estado==='completada'?'c':t.estado==='en curso'?'e':'p');
    ponAttr(li,'title',t.titulo);
    ponTexto(li.firstChild,tx(ESTADO[t.estado]||t.estado));
    ponTexto(li.lastChild,t.titulo);
  });
}
(function(){var v=null;try{v=localStorage.getItem(PKEY)}catch(e){}if(v==='1')$id('pll').open=true})();
$id('pll').addEventListener('toggle',function(){try{localStorage.setItem(PKEY,$id('pll').open?'1':'0')}catch(e){}});

// Personalización. Solo actúa cuando config cambia (al abrir la página y si el usuario cambia una opción).
//   tema: atributo data-tema en <html> (sin valor válido, natural). Un cambio de tema vuelve a teñir el globo.
//   acento: sustituye a --acc del tema; con el valor por defecto (#7fe7ff) cada tema usa su propio acento.
//   idioma: es o en (etiquetas, fechas y números).
//   actualizacion: segundos entre lecturas de datos.js (1 a 5).
//   paneles: los que no están se ocultan y el resto se recoloca sin huecos.
var TEMAS=['natural','hibrido','mark-ii','mark-l','stark','claro'],ACENTO_DEF='#7fe7ff';
var PANEL_ID={contexto:'p-ctx',coste:'p-cost',reparto:'p-mod',agentes:'p-agt',historial:'p-hist',grafica:'p-chart',comparativa:'p-comp',plan:'p-plan'};
var CFG='',ESTATICOS=null;
// Textos fijos del HTML (y title / aria-label) en español, guardados una vez para poder cambiar de idioma en los dos sentidos.
function estaticos(){
  if(ESTATICOS)return ESTATICOS;
  var l=[],w=document.createTreeWalker(document.body,4),nd;
  while((nd=w.nextNode())){var p=nd.parentNode&&nd.parentNode.nodeName;if(p==='SCRIPT'||p==='STYLE')continue;if(tr(nd.nodeValue)!==nd.nodeValue)l.push({n:nd,v:nd.nodeValue})}
  var es=document.querySelectorAll('[title],[aria-label]');
  for(var i=0;i<es.length;i++)['title','aria-label'].forEach(function(k){var v=es[i].getAttribute(k);if(v&&tr(v)!==v)l.push({e:es[i],k:k,v:v})});
  ESTATICOS=l;return l;
}
function rgbDe(h){
  h=String(h).slice(1);if(h.length===3)h=h.charAt(0)+h.charAt(0)+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2);
  return parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16);
}
function aplicaConfig(c){
  if(!c||typeof c!=='object')return;
  var k=JSON.stringify(c);
  if(k===CFG)return;
  CFG=k;
  var root=document.documentElement;
  ponAttr(root,'data-tema',TEMAS.indexOf(c.tema)>=0?c.tema:'natural');
  if(GLOBO.tinta)GLOBO.tinta();
  var ac=typeof c.acento==='string'&&c.acento.charAt(0)==='#'&&(c.acento.length===4||c.acento.length===7)?c.acento.toLowerCase():ACENTO_DEF;
  if(ac!==ACENTO_DEF){root.style.setProperty('--acc',ac);root.style.setProperty('--acc-rgb',rgbDe(ac))}
  else{root.style.removeProperty('--acc');root.style.removeProperty('--acc-rgb')}
  var idi=c.idioma==='en'?'en':'es';
  if(idi!==IDIOMA){
    IDIOMA=idi;LOC=idi==='en'?'en-US':'es-ES';
    ponAttr(root,'lang',idi);
    estaticos().forEach(function(x){var v=tx(x.v);if(x.n){if(x.n.nodeValue!==v)x.n.nodeValue=v}else ponAttr(x.e,x.k,v)});
    // Las filas ya creadas llevan textos del idioma anterior: se vacían y la pasada de abajo las crea de nuevo.
    ['cmpr','hrows','rows','ctk','plist'].forEach(function(id){var b=$id(id);while(b.firstChild)b.removeChild(b.firstChild)});
    CHART='';
    tick();pintaSenal();
  }
  var seg=Number(c.actualizacion);
  lecturas(seg>=1&&seg<=5?seg*1000:1000);
  var ps=c.paneles&&c.paneles.length?c.paneles:Object.keys(PANEL_ID),todos=true;
  for(var p in PANEL_ID){var on=ps.indexOf(p)>=0;if(!on)todos=false;ponClase($id(PANEL_ID[p]),'pn-off',!on)}
  ponClase(document.body,'pn-sel',!todos);
}

// Si los datos no cambian (solo el latido), no se toca nada. La firma se guarda al acabar: si algo falla
// a medias, la lectura siguiente lo vuelve a intentar.
var FIRMA='';
function render(d){
  if(!d)return;
  lastData=d;
  var f=firma(d);
  if(f===FIRMA)return;
  aplicaConfig(d.config);
  renderCtx(d);
  renderPlan(d);
  tween('costev',Number(d.coste||0),function(v){return v.toFixed(4)});
  ponTexto($id('modelo'),d.modelo||'—');
  renderComp(d);
  renderModels(d);
  renderChart(d);
  renderHist(d);
  renderAgents(d);
  ponTexto($id('ts'),tx('Último dato')+': '+hhmm(d.actualizado));
  FIRMA=f;
}

function pintaSenal(){
  var r=senal(ST,Date.now());
  ponAttr($id('ldot'),'class','dot'+(r.estado==='ok'?'':r.estado==='espera'?' wait':' off'));
  ponTexto($id('ltxt'),tx(r.texto));
  var a=$id('al-sig');
  ponAttr(a,'class','al'+(r.alerta?' on':''));
  ponTexto(a,tx(r.aviso));
  ponTexto($id('beat'),tx('Latido')+': '+(r.segundos==null?'—':IDIOMA==='en'?r.segundos+' s ago':'hace '+r.segundos+' s'));
  ponClase(document.body,'sig-off',r.alerta);
}
// Un error de sintaxis en datos.js (escritura a medias) no debe ensuciar la consola ni parar nada.
window.onerror=function(msg,src){if(src&&(String(src).indexOf('datos.js')>=0||String(src).indexOf('estado.js')>=0))return true};
// Una sola lectura a la vez: si una tarda, no se mezclan respuestas viejas con nuevas.
// Una lectura colgada más de 5 s se abandona (cuenta como fallida) y sus avisos ya no hacen nada:
// si no, su onload tardío leería el CONSUMO que la lectura nueva acaba de borrar.
var cargando=0,actual=null;
function load(){
  var now=Date.now();
  if(cargando&&now-cargando<5000)return;
  if(actual){actual.onload=actual.onerror=null;actual.remove();actual=null;alFallar(ST)}
  cargando=now;
  window.CONSUMO=undefined;
  var s=document.createElement('script');
  actual=s;
  s.src='datos.js?'+now;
  s.onload=function(){
    if(actual!==s)return;
    actual=null;s.remove();cargando=0;
    var d=window.CONSUMO;
    if(alCargar(ST,d,Date.now())){try{render(d)}catch(err){}}
    pintaSenal();
  };
  s.onerror=function(){if(actual!==s)return;actual=null;s.remove();cargando=0;alFallar(ST);pintaSenal()};
  document.head.appendChild(s);
}
// Interruptor /jarvis: el mod escribe estado.json y su copia estado.js ({"abierto": false} al cerrar).
// Desde file:// el navegador no deja leer un .json con fetch, así que se carga estado.js como script.
// Con abierto:false se intenta window.close(); si la ventana sigue ahí, se queda el aviso.
var HUD_CERRADO=false;
function aplicaEstado(e){
  if(!e||typeof e.abierto!=='boolean')return;
  if(e.abierto===false){
    if(!HUD_CERRADO){HUD_CERRADO=true;document.body.classList.add('hud-off');try{window.close()}catch(err){}}
  }else if(HUD_CERRADO){HUD_CERRADO=false;document.body.classList.remove('hud-off')}
}
var cargandoEstado=0;
function loadEstado(){
  var now=Date.now();
  if(cargandoEstado&&now-cargandoEstado<5000)return;
  cargandoEstado=now;
  window.CONSUMO_ESTADO=undefined;
  var s=document.createElement('script');
  s.src='estado.js?'+now;
  s.onload=function(){s.remove();cargandoEstado=0;try{aplicaEstado(window.CONSUMO_ESTADO)}catch(err){}};
  s.onerror=function(){s.remove();cargandoEstado=0};
  document.head.appendChild(s);
}
// Lectura de datos.js y estado.js cada PERIODO ms (opción actualizacion).
var LECTURA=0,PERIODO=0;
function lecturas(ms){if(LECTURA&&ms===PERIODO)return;PERIODO=ms;if(LECTURA)clearInterval(LECTURA);LECTURA=setInterval(function(){load();loadEstado()},ms)}
function tick(){ponTexto($id('clock'),new Date().toLocaleTimeString(LOC))}
var rz;window.addEventListener('resize',function(){ponDensidad();clearTimeout(rz);rz=setTimeout(function(){if(lastData)renderChart(lastData)},120)});
// Globo holográfico: meridianos y paralelos sobre un eje inclinado, con nodos fijos (la mitad en compacto).
// Se para con la ventana oculta y con movimiento reducido (queda dibujado, quieto).
(function(){
  var cv=$id('globe'),cx=cv.getContext&&cv.getContext('2d');if(!cx)return;
  var S=0,dpr=1,a=0,last=0;
  var seed=7,nodes=[];function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647}
  for(var k=0;k<26;k++)nodes.push([Math.asin(rnd()*2-1),rnd()*Math.PI*2]);
  function size(){var r=cv.getBoundingClientRect();dpr=window.devicePixelRatio||1;S=r.width;cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);draw()}
  GLOBO.size=size;
  var tilt=0.42,ct=Math.cos(tilt),st=Math.sin(tilt);
  function pr(lat,lon,R){var x=Math.cos(lat)*Math.sin(lon+a),y=Math.sin(lat),z=Math.cos(lat)*Math.cos(lon+a);var y2=y*ct-z*st,z2=y*st+z*ct;return [S/2+x*R,S/2-y2*R,z2]}
  // Color de las líneas: --globo-rgb, --globo-rgb-w y --globo-rgb-x del tema si las define (natural); si no, el cian de siempre.
  var tinta={n:'',w:'',x:''};
  function leeTinta(){var cs=null;try{cs=getComputedStyle(document.documentElement)}catch(e){}
    tinta.n=cs?cs.getPropertyValue('--globo-rgb').trim():'';tinta.w=cs?cs.getPropertyValue('--globo-rgb-w').trim():'';tinta.x=cs?cs.getPropertyValue('--globo-rgb-x').trim():''}
  GLOBO.tinta=function(){leeTinta();draw()};
  GLOBO.dibuja=function(){draw()};
  leeTinta();
  function rgb(){return GLOBO.lvl==='x'?(tinta.x||'255,77,77'):GLOBO.lvl==='w'?(tinta.w||'234,255,255'):(tinta.n||'127,231,255')}
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
    var mitad=compacto();
    nodes.forEach(function(nd,i){if(mitad&&i%2)return;var v=pr(nd[0],nd[1],R);if(v[2]<0)return;cx.globalAlpha=.35+.65*v[2];cx.beginPath();cx.arc(v[0],v[1],1.6,0,7);cx.fill()});
    cx.globalAlpha=1;
  }
  function frame(t){
    requestAnimationFrame(frame);
    if(document.hidden||quieto())return;
    if(t-last<33)return;
    var dt=last?Math.min(.1,(t-last)/1000):0;last=t;
    a+=dt*0.22;draw();
  }
  size();window.addEventListener('resize',size);
  if(window.ResizeObserver)new ResizeObserver(size).observe(cv);
  requestAnimationFrame(frame);
})();
tick();
ponDensidad();
// Textos fijos en español, antes de pintar nada (para poder cambiar de idioma).
try{estaticos()}catch(err){}
// Sin datos.js todavía la página no se queda en blanco: se pinta vacía y espera.
try{render(VACIO)}catch(err){}
pintaSenal();load();loadEstado();
setInterval(tick,1000);
lecturas(1000);
</script>
</body></html>`
