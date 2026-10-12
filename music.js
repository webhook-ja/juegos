/* Vending Town · música original generada por código (WebAudio). Sin archivos de audio. */
(function(){if(window.MUSIC)return;
let C=null,M=null,bus={},cur=null,on=localStorage.getItem('vt_mus_on')!=='0',vol=+(localStorage.getItem('vt_mus')??0.35),started=false,next=0,step=0,duckV=1;
const R=s=>{let x=s|0||1;return()=>((x=(x*1664525+1013904223)|0)>>>0)/4294967296};
const mt=n=>440*Math.pow(2,(n-69)/12);
/* temas: escala (semitonos), tónica midi, progresión por secciones, tempo */
const SC={dor:[0,2,3,5,7,9,10],hmin:[0,2,3,5,7,8,11],maj:[0,2,4,5,7,9,11],min:[0,2,3,5,7,8,10]};
const SONG={
fantasia:{calm:{sc:'dor',root:62,bpm:84,form:'AABACB',sec:{A:[0,3,4,0],B:[5,3,6,4],C:[3,0,6,0]},lead:'flute',arp:'harp'},
          tense:{sc:'min',root:62,bpm:138,form:'AABA',sec:{A:[0,0,5,6],B:[3,4,0,6]},lead:'flute',arp:'harp',drums:1}},
halloween:{calm:{sc:'hmin',root:57,bpm:66,form:'AABACB',sec:{A:[0,5,3,4],B:[0,1,4,4],C:[5,3,1,4]},lead:'ghost',arp:'celesta'},
           tense:{sc:'hmin',root:57,bpm:132,form:'AABA',sec:{A:[0,1,0,4],B:[5,1,4,4]},lead:'ghost',arp:'celesta',drums:1}},
navidad:{calm:{sc:'maj',root:67,bpm:100,form:'AABACB',sec:{A:[0,3,4,0],B:[3,0,1,4],C:[5,1,4,0]},lead:'flute',arp:'bell',sleigh:1},
         tense:{sc:'maj',root:67,bpm:150,form:'AABA',sec:{A:[0,4,5,3],B:[1,4,0,4]},lead:'flute',arp:'bell',drums:1,sleigh:1}}};
function deg(s,root,d){const sc=SC[s.sc];const o=Math.floor(d/7);return root+sc[((d%7)+7)%7]+12*o}
function env(g,t,a,v,dec){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+dec)}
function voice(dest,kind,f,t,d,v){const o=C.createOscillator(),g=C.createGain();
 if(kind==='harp'||kind==='celesta'){const fl=C.createBiquadFilter();o.type=kind==='harp'?'triangle':'sine';o.frequency.value=f;fl.type='lowpass';fl.frequency.setValueAtTime(f*5,t);fl.frequency.exponentialRampToValueAtTime(f*1.2,t+.5);env(g,t,.006,v,t+(kind==='harp'?1.4:2));o.connect(fl).connect(g)}
 else if(kind==='bell'){o.type='sine';o.frequency.value=f;const o2=C.createOscillator(),g2=C.createGain();o2.type='sine';o2.frequency.value=f*2.76;g2.gain.value=.25;o2.connect(g2).connect(g);o2.start(t);o2.stop(t+1.6);env(g,t,.004,v,t+1.5);o.connect(g)}
 else{/* flauta / fantasma: senoide con vibrato y soplo */o.type=kind==='ghost'?'triangle':'sine';o.frequency.value=f;const lf=C.createOscillator(),lg=C.createGain();lf.frequency.value=kind==='ghost'?4.2:5.4;lg.gain.value=f*(kind==='ghost'?.012:.006);lf.connect(lg).connect(o.frequency);lf.start(t);lf.stop(t+d+.3);
  if(kind==='ghost'){const fl=C.createBiquadFilter();fl.type='lowpass';fl.frequency.value=1400;o.connect(fl).connect(g)}else o.connect(g);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.07);g.gain.setValueAtTime(v*.8,t+d*.7);g.gain.linearRampToValueAtTime(0,t+d+.15)}
 g.connect(dest);o.start(t);o.stop(t+d+2)}
let NB=null;function noise(dest,t,d,f,v,type){if(!NB){NB=C.createBuffer(1,C.sampleRate*.5,C.sampleRate);const a=NB.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}
 const s=C.createBufferSource();s.buffer=NB;const fl=C.createBiquadFilter();fl.type=type||'bandpass';fl.frequency.value=f;const g=C.createGain();env(g,t,.002,v,t+d);s.connect(fl).connect(g).connect(dest);s.start(t);s.stop(t+d+.05)}
function kick(dest,t,v){const o=C.createOscillator(),g=C.createGain();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(45,t+.15);env(g,t,.002,v,t+.22);o.connect(g).connect(dest);o.start(t);o.stop(t+.25)}
/* drones persistentes por bus (bajo coste: 2 osciladores) */
function mkBus(){const g=C.createGain();g.gain.value=0;g.connect(M);const dr=C.createGain();dr.gain.value=0;const fl=C.createBiquadFilter();fl.type='lowpass';fl.frequency.value=380;dr.connect(fl).connect(g);
 const os=[0,1].map(i=>{const o=C.createOscillator();o.type='sawtooth';o.detune.value=i?6:-6;o.connect(dr);o.start();return o});return{g,dr,os}}
function key(){const th=(window.THEME&&THEME.cur&&THEME.cur())||window.MUSIC_THEME||'fantasia';return SONG[th]?th:'fantasia'}
function mode(){if(window.MUSIC_MODE)return window.MUSIC_MODE;const mg=document.getElementById('mg');if(mg&&getComputedStyle(mg).display!=='none')return 'tense';const p=document.querySelector('.pmg');if(p&&p.offsetParent)return 'tense';return 'calm'}
function switchTo(id){if(id===cur)return;const t=C.currentTime;if(cur&&bus[cur]){const g=bus[cur].g.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(0,t+1.8)}
 if(!bus[id])bus[id]=mkBus();const b=bus[id];b.g.gain.cancelScheduledValues(t);b.g.gain.setValueAtTime(b.g.gain.value,t);b.g.gain.linearRampToValueAtTime(1,t+1.8);cur=id;step=0;next=t+.15;
 /* apaga drones de buses inactivos tras el fundido para ahorrar CPU */
 Object.keys(bus).forEach(k=>{if(k!==id)setTimeout(()=>{if(cur!==k&&bus[k]){try{bus[k].os.forEach(o=>o.stop())}catch(e){}bus[k].g.disconnect();delete bus[k]}},2200)})}
function tick(){if(!C||C.state!=='running')return;const want=key()+':'+mode();if(want!==cur)switchTo(want);const [th,md]=cur.split(':');const s=SONG[th][md],b=bus[cur],e8=60/s.bpm/2;
 while(next<C.currentTime+.5){const bar=Math.floor(step/8),pos=step%8,secI=Math.floor(bar/4)%s.form.length,sec=s.form[secI],ch=s.sec[sec][bar%4],t=next;
  if(pos===0){const f=mt(deg(s,s.root-24,ch));b.os.forEach((o,i)=>o.frequency.setTargetAtTime(f*(i?1.5:1),t,.08));b.dr.gain.setTargetAtTime(th==='halloween'?.05:.035,t,.3)}
  /* arpegio */const ar=[0,2,4,7,4,2,4,2][pos];if(md==='tense'||pos%(sec==='C'?2:1)===0)voice(b.g,s.arp,mt(deg(s,s.root-12,ch+ar)),t,e8,md==='tense'?.05:.06);
  /* melodía: frase sembrada por (sección, compás) -> se repite al volver la sección */
  const rnd=R((sec.charCodeAt(0)*977+(bar%4)*131+pos*17+th.length*7));const play=pos===0||rnd()<(md==='tense'?.55:.38);
  if(play&&!(sec==='C'&&md==='calm'&&bar%2)){const d=[0,2,4,2,4,5,7,4][Math.floor(rnd()*8)]+ch;const len=pos===0?e8*(md==='tense'?2:3):e8*(rnd()<.5?1:2);voice(b.g,s.lead,mt(deg(s,s.root,d)),t,len,th==='halloween'?.05:.055)}
  if(s.drums){if(pos%4===0)kick(b.g,t,.22);if(pos%4===2)noise(b.g,t,.08,1800,.07);noise(b.g,t,.03,8000,.025,'highpass')}
  else if(pos===0&&bar%2===0)noise(b.g,t,.25,180,.05,'lowpass');
  if(s.sleigh&&pos%2===0)for(let k=0;k<2;k++)noise(b.g,t+k*.025,.05,7000,.03,'highpass');
  next+=e8;step++}}
function level(){if(!M)return;M.gain.setTargetAtTime(on?vol*duckV:0,C.currentTime,.15)}
function start(){if(started)return;started=true;try{const AC=window.AudioContext||window.webkitAudioContext;C=new AC();
 /* destino real: la música tiene su propio volumen, independiente de los efectos (SFX) */
 let dst=C.destination;try{const D=Object.getOwnPropertyDescriptor(BaseAudioContext.prototype,'destination');if(D)dst=D.get.call(C)}catch(e){}
 M=C.createGain();M.gain.value=0;M.connect(dst);level();setInterval(tick,150);tick()}catch(e){}}
['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,start,{once:true,capture:true,passive:true}));
document.addEventListener('visibilitychange',()=>{if(!C)return;document.hidden?C.suspend():C.resume()});
window.MUSIC={get:()=>({on,vol}),set:v=>{vol=Math.max(0,Math.min(1,v));localStorage.setItem('vt_mus',vol);level()},toggle:x=>{on=x==null?!on:!!x;localStorage.setItem('vt_mus_on',on?'1':'0');level();return on},
 duck:x=>{duckV=x?.25:1;level()},mode:m=>{window.MUSIC_MODE=m||null}};
/* UI: en el menú 🔊 si existe; si no, botón flotante */
function ui(){const p=document.getElementById('vtvolp');if(p){if(document.getElementById('musel'))return;const d=document.createElement('div');d.id='musel';d.style.cssText='grid-column:1/-1;display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center';
 d.innerHTML='<span>🎼 Música</span><input id="musr" type="range" min="0" max="100" style="accent-color:#b9781a"><button id="must" type="button"></button>';p.insertBefore(d,p.firstChild);
 const r=d.querySelector('#musr'),b=d.querySelector('#must'),u=()=>{r.value=Math.round(vol*100);b.textContent=on?'Apagar':'Encender'};u();r.oninput=()=>{MUSIC.set(r.value/100);if(!on)MUSIC.toggle(true);u()};b.onclick=()=>{MUSIC.toggle();u()}}
 else if(!document.getElementById('musfab')){const b=document.createElement('button');b.id='musfab';b.type='button';b.style.cssText='position:fixed;right:8px;bottom:8px;z-index:99999;width:40px;height:40px;border-radius:50%;border:3px solid #222;background:#ffd76a;font-size:18px;cursor:pointer';const u=()=>b.textContent=on?'🎵':'🔇';u();b.onclick=e=>{e.stopPropagation();MUSIC.toggle();u()};document.body.appendChild(b)}}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',ui):ui();})();
