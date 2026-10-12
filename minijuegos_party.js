/* Vending Town · Minijuegos Party (estilo Mario Party) · módulo autónomo
   API:
     PartyMG.list -> [{id,name,emoji,desc}]
     PartyMG.play(id,{playerName,avatarUrl,boost,opponent}) -> Promise<{win,score,opponentScore}>   (overlay propio a pantalla completa)
     PartyMG.mount(id, container, resolve, boost, opts) -> cleanup()   (drop-in para el MG del tablero: resolve(win:boolean))
   opts.opponent: por defecto IA "New Bot". Para 1v1 en tiempo real: {name, avatarUrl, remote:true,
     send(evt), onEvent(cb)}  -> se envía {t:'tap',x,y,at} por cada toque propio y se aplican los del rival. opts.seed sincroniza el azar. */
(function(){
'use strict';
// ---------- audio ----------
let AC=null;function ac(){try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();}catch(e){}return AC}
function beep(f,d,type,vol,f2){const a=ac();if(!a)return;try{const o=a.createOscillator(),g=a.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,a.currentTime);if(f2)o.frequency.exponentialRampToValueAtTime(f2,a.currentTime+d);g.gain.setValueAtTime(vol||.12,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+d);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+d+.02)}catch(e){}}
function noise(d,vol){const a=ac();if(!a)return;try{const b=a.createBuffer(1,a.sampleRate*d,a.sampleRate),c=b.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=(Math.random()*2-1)*(1-i/c.length);const s=a.createBufferSource(),g=a.createGain();s.buffer=b;g.gain.value=vol||.3;s.connect(g);g.connect(a.destination);s.start()}catch(e){}}
const SFX={tap:()=>beep(520+Math.random()*80,.06,'square',.06),pump:()=>beep(300,.09,'triangle',.12,600),count:()=>beep(440,.15,'square',.12),go:()=>beep(880,.3,'square',.14,1320),
 pop:()=>{noise(.35,.4);beep(200,.3,'sawtooth',.1,60)},boom:()=>{noise(.7,.6);beep(120,.6,'sawtooth',.15,40)},perfect:()=>{beep(988,.08,'square',.1);setTimeout(()=>beep(1319,.12,'square',.1),70)},
 bad:()=>beep(160,.25,'sawtooth',.12,90),win:()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.18,'square',.12),i*110)),lose:()=>[392,330,262].forEach((f,i)=>setTimeout(()=>beep(f,.25,'triangle',.14),i*160)),
 swoosh:()=>beep(700,.12,'sine',.08,250),coin:()=>{beep(988,.07,'square',.1);setTimeout(()=>beep(1568,.2,'square',.1),60)}};
// ---------- utils ----------
function rng(seed){let s=(seed>>>0)||((Math.random()*2**32)>>>0);return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const ease={out:t=>1-Math.pow(1-t,3),inout:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,back:t=>{const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)},elastic:t=>t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-.75)*2.0944)+1};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function lg(c,y0,y1,stops){const g=c.createLinearGradient(0,y0,0,y1);stops.forEach((s,i)=>g.addColorStop(i/(stops.length-1),s));return g}
function txt(c,s,x,y,size,fill,align,stroke){c.font='900 '+size+'px "Lilita One","Baloo 2","Arial Black",system-ui,sans-serif';c.textAlign=align||'center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=Math.max(3,size/6);c.strokeStyle=stroke||'#1b1340';c.strokeText(s,x,y);c.fillStyle=fill||'#fff';c.fillText(s,x,y)}
const COL={p:['#5ad1ff','#1f7be0','#0d3f8f'],b:['#ff7a6b','#e0313d','#7d0f1c']};
// Personaje: máquina expendedora con cara (avatar)
function machine(c,x,y,s,who,G,squash){const k=COL[who];squash=squash||0;c.save();c.translate(x,y);c.scale(1+squash*.12,1-squash*.12);const w=60*s,h=88*s;
 c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(0,h/2+4*s,w*.55,8*s,0,0,7);c.fill();
 c.fillStyle=lg(c,-h/2,h/2,[k[0],k[1],k[2]]);rr(c,-w/2,-h/2,w,h,12*s);c.fill();c.lineWidth=3*s;c.strokeStyle='#1b1340';c.stroke();
 c.fillStyle='rgba(255,255,255,.35)';rr(c,-w/2+5*s,-h/2+5*s,w*.25,h-10*s,6*s);c.fill();
 c.fillStyle=lg(c,0,h/2,['#2a2350','#120d2b']);rr(c,-w/2+8*s,8*s,w-16*s,h/2-16*s,6*s);c.fill();
 ['#ffd84a','#7cff8a','#ff6bd6'].forEach((cl,i)=>{c.fillStyle=cl;rr(c,-w/2+13*s+i*13*s,14*s,9*s,14*s,3*s);c.fill()});
 const R=22*s;c.save();c.beginPath();c.arc(0,-h/2+R+6*s,R,0,7);c.closePath();c.fillStyle='#fff6d8';c.fill();c.clip();
 const img=who==='p'?G.pImg:G.bImg;
 if(img&&img.complete&&img.naturalWidth){c.drawImage(img,-R,-h/2+6*s,R*2,R*2)}else if(who==='b'){c.fillStyle='#d9e4ff';c.fillRect(-R,-h/2,R*2,R*3);c.fillStyle='#1b1340';rr(c,-13*s,-h/2+R-2*s,9*s,12*s,3*s);c.fill();rr(c,4*s,-h/2+R-2*s,9*s,12*s,3*s);c.fill();c.fillStyle='#e0313d';rr(c,-8*s,-h/2+R+16*s,16*s,4*s,2*s);c.fill()}
 else{c.fillStyle=lg(c,-h/2,-h/2+2*R+6*s,['#ffe08a','#ffb347']);c.fillRect(-R,-h/2,R*2,R*3);txt(c,(G.pName||'T')[0].toUpperCase(),0,-h/2+R+7*s,26*s,'#fff')}
 c.restore();c.beginPath();c.arc(0,-h/2+R+6*s,R,0,7);c.lineWidth=3*s;c.strokeStyle='#1b1340';c.stroke();
 if(who==='b'){c.strokeStyle='#1b1340';c.beginPath();c.moveTo(0,-h/2-2*s);c.lineTo(0,-h/2-14*s);c.stroke();c.fillStyle='#ffd84a';c.beginPath();c.arc(0,-h/2-16*s,5*s,0,7);c.fill();c.stroke()}
 c.restore()}
function bg(c,W,H,top,bot){c.fillStyle=lg(c,0,H,[top,bot]);c.fillRect(0,0,W,H);c.globalAlpha=.08;c.fillStyle='#fff';for(let i=0;i<14;i++){const x=(i*97)%W,y=(i*53)%H;c.beginPath();c.arc(x,y,30+(i%4)*14,0,7);c.fill()}c.globalAlpha=1;
 c.fillStyle=lg(c,H*.86,H,['#5bd16a','#2f9a3e']);c.fillRect(0,H*.86,W,H*.14);c.fillStyle='#1b1340';c.fillRect(0,H*.86,W,3)}
function particles(G,x,y,n,cols,sp){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=(sp||220)*(.4+Math.random());G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-80,life:1,c:cols[i%cols.length],r:3+Math.random()*5})}}
function drawParts(G,c,dt){G.parts=G.parts.filter(p=>(p.life-=dt*1.3)>0);G.parts.forEach(p=>{p.vy+=500*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;c.globalAlpha=clamp(p.life,0,1);c.fillStyle=p.c;c.beginPath();c.arc(p.x,p.y,p.r,0,7);c.fill()});c.globalAlpha=1}
function hud(G,c,W,ps,bs,extra){const pad=10;c.fillStyle='rgba(27,19,64,.55)';rr(c,pad,pad,W-pad*2,44,14);c.fill();
 txt(c,(G.pName||'Tú').slice(0,10)+' '+ps,pad+12,pad+22,17,'#7fe0ff','left');txt(c,bs+' '+G.oName.slice(0,10),W-pad-12,pad+22,17,'#ff9a8f','right');
 if(extra)txt(c,extra,W/2,pad+22,20,'#ffd84a')}
function floatTxt(G,s,x,y,col){G.floats.push({s,x,y,t:0,col})}
function drawFloats(G,c,dt){G.floats=G.floats.filter(f=>(f.t+=dt)<.9);G.floats.forEach(f=>{c.globalAlpha=1-f.t/.9;txt(c,f.s,f.x,f.y-f.t*60,22+8*ease.back(Math.min(1,f.t*4)),f.col||'#ffd84a')});c.globalAlpha=1}

// ---------- JUEGOS ----------
const GAMES={};
// 1. Globo Turbo (Balloon Burst)
GAMES.globo={name:'Globo Turbo',emoji:'🎈',desc:'Machaca el botón para inflar tu globo de refresco. ¡El primero en reventarlo gana!',
 rules:'Toca la pantalla (o ESPACIO) lo más rápido que puedas para bombear. Si paras, el globo pierde aire. ¡Primero en reventarlo gana! Máx. 20 s.',
 dur:20,
 init(G){G.inf=[0,0];G.pump=[0,0];G.botNext=.3},
 tap(G,who){const i=who==='p'?0:1;if(G.inf[i]>=100)return;G.inf[i]=Math.min(100,G.inf[i]+(i===0&&G.boost?4.6:4));G.pump[i]=1;if(i===0)SFX.pump();if(G.inf[i]>=100)this.burst(G,i)},
 burst(G,i){SFX.pop();const x=G.W*(i?.73:.27);particles(G,x,G.H*.35,40,i?['#ff7a6b','#ffd84a','#fff']:['#5ad1ff','#ffd84a','#fff'],320);G.end(i===0)},
 ai(G,dt){G.botNext-=dt;if(G.botNext<=0){G.botNext=1/(6.2+G.r()*2.4)*(G.r()<.07?3:1);this.tap(G,'b')}},
 update(G,dt){for(let i=0;i<2;i++){if(G.inf[i]<100)G.inf[i]=Math.max(0,G.inf[i]-3*dt);G.pump[i]=Math.max(0,G.pump[i]-dt*6)}},
 timeout(G){return G.inf[0]>=G.inf[1]},
 score(G){return[Math.round(G.inf[0]),Math.round(G.inf[1])]},
 draw(G,c,W,H){bg(c,W,H,'#7b5cff','#ff8ad1');
  for(let i=0;i<2;i++){const who=i?'b':'p',x=W*(i?.73:.27),gy=H*.86,f=G.inf[i]/100;
   if(f<1){const r=26+f*70,cy=H*.55-f*H*.18,wob=Math.sin(G.t*30)*f*f*3;const k=COL[who];
    c.strokeStyle='#1b1340';c.lineWidth=3;c.beginPath();c.moveTo(x,cy+r);c.quadraticCurveTo(x+10,cy+r+40,x,gy-110);c.stroke();
    const g=c.createRadialGradient(x-r*.35,cy-r*.4,r*.1,x,cy,r);g.addColorStop(0,'#fff');g.addColorStop(.25,k[0]);g.addColorStop(1,k[2]);c.fillStyle=g;c.beginPath();c.ellipse(x+wob,cy,r*(1+.04*Math.sin(G.t*9)),r*1.12,0,0,7);c.fill();c.lineWidth=4;c.stroke();
    c.fillStyle=k[1];c.beginPath();c.moveTo(x-7,cy+r*1.12+2);c.lineTo(x+7,cy+r*1.12+2);c.lineTo(x,cy+r*1.12-8);c.fill();
    if(f>.75){c.globalAlpha=(f-.75)*4*(.5+.5*Math.sin(G.t*25));txt(c,'!!',x+r,cy-r,26,'#fff36b');c.globalAlpha=1}}
   const pm=G.pump[i];c.fillStyle='#ffd84a';rr(c,x-46,gy-120+pm*16,16,40,4);c.fill();c.strokeStyle='#1b1340';c.lineWidth=3;c.stroke();
   c.fillStyle=lg(c,gy-80,gy,['#c9cfe8','#6b7398']);rr(c,x-48,gy-80,20,78,5);c.fill();c.stroke();
   machine(c,x+18,gy-46,.9,who,G,pm);
   c.fillStyle='rgba(27,19,64,.6)';rr(c,x-50,gy+14,100,14,7);c.fill();c.fillStyle=i?'#ff7a6b':'#5ad1ff';rr(c,x-48,gy+16,96*f,10,5);c.fill()}
  hud(G,c,W,Math.round(G.inf[0])+'%',Math.round(G.inf[1])+'%',Math.ceil(G.left)+'s')}};

// 2. Lata Caliente (Hot Bob-omb)
GAMES.lata={name:'Lata Caliente',emoji:'💣',desc:'Una lata de refresco agitada pasa de mano en mano. ¡Que no te explote a ti!',
 rules:'Cuando tengas la lata, toca 3 veces rápido para lanzarla al rival. Si explota en tus manos pierdes la ronda. Al mejor de 3.',
 dur:30,
 init(G){G.sc=[0,0];G.round=0;this.newRound(G)},
 newRound(G){G.hold=G.round%2;G.shake=0;G.fuse=4.5+G.r()*4;G.fuse0=G.fuse;G.fly=0;G.react=.35+G.r()*.3;G.boom=0;G.pause=0},
 tap(G,who){const i=who==='p'?0:1;if(G.hold!==i||G.fly>0||G.pause>0)return;G.shake+=(i===0&&G.boost)?1.5:1;SFX.tap();if(G.shake>=3){G.shake=0;G.fly=1;G.hold=1-i;SFX.swoosh();G.react=.25+G.r()*.45}},
 ai(G,dt){if(G.hold===1&&G.fly<=0&&G.pause<=0){G.react-=dt;if(G.react<=0){G.react=.12+G.r()*.1;this.tap(G,'b')}}},
 update(G,dt){if(G.pause>0){G.pause-=dt;if(G.pause<=0){if(G.sc[0]>=2||G.sc[1]>=2)G.end(G.sc[0]>G.sc[1]);else{G.round++;this.newRound(G)}}return}
  if(G.fly>0)G.fly=Math.max(0,G.fly-dt*3.2);G.fuse-=dt;
  if(G.fuse<=0){const loser=G.hold;G.sc[1-loser]++;SFX.boom();particles(G,G.W*(loser?.75:.25),G.H*.6,60,['#ffd84a','#ff7a1a','#e0313d','#fff'],380);G.boom=1;G.pause=1.6;floatTxt(G,loser?'¡BOOM! Punto tuyo':'¡BOOM!',G.W/2,G.H*.4,loser?'#7cff8a':'#ff7a6b')}},
 timeout(G){return G.sc[0]>=G.sc[1]},
 score(G){return G.sc.slice()},
 draw(G,c,W,H){bg(c,W,H,'#ff9a3c','#ffd66b');const gy=H*.86;
  machine(c,W*.22,gy-46,1,'p',G,G.hold===0?Math.abs(Math.sin(G.t*20))*.3:0);machine(c,W*.78,gy-46,1,'b',G,G.hold===1?Math.abs(Math.sin(G.t*20))*.3:0);
  if(G.pause<=0||G.boom<1){const from=1-G.hold,t=1-G.fly,x0=W*(from?.78:.22),x1=W*(G.hold?.78:.22);const x=G.fly>0?x0+(x1-x0)*ease.inout(t):x1;const y=G.fly>0?H*.5-Math.sin(t*Math.PI)*H*.22:H*.5;
   const heat=1-G.fuse/G.fuse0,sc=1+heat*.5,sh=heat*6;c.save();c.translate(x+(Math.random()-.5)*sh,y+(Math.random()-.5)*sh);c.rotate(G.fly>0?t*9:Math.sin(G.t*30)*heat*.3);c.scale(sc,sc);
   c.fillStyle=lg(c,-34,34,[heat>.7&&Math.sin(G.t*30)>0?'#ff5a5a':'#ff4d6d','#b3123a']);rr(c,-20,-32,40,64,9);c.fill();c.lineWidth=3;c.strokeStyle='#1b1340';c.stroke();
   c.fillStyle='#d6dbe9';rr(c,-20,-36,40,9,4);c.fill();c.stroke();c.fillStyle='#fff';rr(c,-14,-10,28,18,4);c.fill();txt(c,'COLA',0,-1,10,'#e0313d');c.restore();
   if(G.fly<=0&&Math.random()<.6)G.parts.push({x:x+(Math.random()-.5)*10,y:y-40*sc,vx:(Math.random()-.5)*120,vy:-160,life:.6,c:Math.random()<.5?'#fff':'#ffd84a',r:2+Math.random()*3});
   if(G.hold===0&&G.fly<=0&&G.pause<=0){txt(c,'¡TOCA! '+'●'.repeat(Math.floor(G.shake))+'○'.repeat(3-Math.floor(G.shake)),W/2,H*.25,24,'#fff')}}
  hud(G,c,W,G.sc[0],G.sc[1],'Ronda '+(G.round+1))}};

// 3. Burbuja Rítmica (variante con ritmo de Balloon Burst)
GAMES.burbuja={name:'Burbuja Rítmica',emoji:'🫧',desc:'Haz subir tu burbuja de soda tocando al ritmo. ¡Toques perfectos = súper impulso!',
 rules:'Toca cuando el anillo dorado coincida con tu burbuja: PERFECTO sube mucho, toque normal sube poco. La burbuja se hunde sola. ¡Primero arriba gana! Máx. 25 s.',
 dur:25,
 init(G){G.y=[0,0];G.ph=[0,.5];G.botNext=.5;G.sq=[0,0]},
 ring(G,i){return Math.abs(Math.sin((G.t*1.6+G.ph[i])*Math.PI))},// 0 = alineado
 tap(G,who){const i=who==='p'?0:1;if(i===0){if(G.t-(G.lt==null?-9:G.lt)<.18)return;G.lt=G.t}const q=this.ring(G,i);let d,lab;if(q<.3){d=.1;lab='¡PERFECTO!';if(i===0)SFX.perfect()}else if(q<.6){d=.045;lab='Bien';if(i===0)SFX.tap()}else{d=-.02;lab='¡Fuera de ritmo!';if(i===0)SFX.tap()}
  if(i===0&&G.boost)d*=1.15;G.y[i]=Math.max(0,Math.min(1,G.y[i]+d));G.sq[i]=1;const x=G.W*(i?.73:.27);floatTxt(G,lab,x,G.H*(.78-G.y[i]*.6),i?'#ff9a8f':'#fff36b');if(G.y[i]>=1){SFX.win();particles(G,x,G.H*.16,40,['#bff4ff','#fff','#ffd84a'],260);G.end(i===0)}},
 ai(G,dt){G.botNext-=dt;const q=this.ring(G,1);if(G.botNext<=0&&(q<.28||G.r()<.01)){G.botNext=.3+G.r()*.15;this.tap(G,'b')}},
 update(G,dt){for(let i=0;i<2;i++){G.y[i]=Math.max(0,G.y[i]-.035*dt);G.sq[i]=Math.max(0,G.sq[i]-dt*5)}},
 timeout(G){return G.y[0]>=G.y[1]},score(G){return[Math.round(G.y[0]*100),Math.round(G.y[1]*100)]},
 draw(G,c,W,H){c.fillStyle=lg(c,0,H,['#25c6ff','#0a4fb3','#062a6b']);c.fillRect(0,0,W,H);
  for(let i=0;i<2;i++){const x=W*(i?.73:.27),top=H*.16,bot=H*.84,who=i?'b':'p',k=COL[who];
   c.fillStyle='rgba(255,255,255,.12)';rr(c,x-52,top-20,104,bot-top+40,40);c.fill();c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=3;c.stroke();
   txt(c,'🏁',x,top-36,24,'#fff');
   for(let j=0;j<6;j++){const yy=bot-((G.t*60+j*70+i*30)%(bot-top));c.fillStyle='rgba(255,255,255,.25)';c.beginPath();c.arc(x-30+((j*37)%60),yy,3+j%3,0,7);c.fill()}
   const by=bot-G.y[i]*(bot-top),s=1+G.sq[i]*.15;
   const q=this.ring(G,i),rr2=30+q*40;c.strokeStyle=q<.3?'#7cff8a':'#ffd84a';c.lineWidth=4;c.beginPath();c.arc(x,by,rr2,0,7);c.stroke();
   const g=c.createRadialGradient(x-10,by-12,3,x,by,32*s);g.addColorStop(0,'#fff');g.addColorStop(.4,k[0]+'cc');g.addColorStop(1,k[1]+'88');c.fillStyle=g;c.beginPath();c.ellipse(x,by,32*s,32/s,0,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=3;c.stroke();
   c.save();c.beginPath();c.arc(x,by,20,0,7);c.clip();const img=i?null:G.pImg;if(img&&img.complete&&img.naturalWidth)c.drawImage(img,x-20,by-20,40,40);else txt(c,i?'🤖':(G.pName||'T')[0].toUpperCase(),x,by+1,22,'#fff');c.restore()}
  hud(G,c,W,Math.round(G.y[0]*100)+'%',Math.round(G.y[1]*100)+'%',Math.ceil(G.left)+'s')}};

// 4. Trile de Latas (Shell Game)
GAMES.trile={name:'Trile de Latas',emoji:'🥫',desc:'Una moneda bajo 3 vasos de máquina que se mezclan. ¡Adivina dónde está mejor que New Bot!',
 rules:'Mira la moneda, sigue el vaso mientras se mezclan y toca el vaso correcto. 3 rondas, cada una más rápida. Gana quien acierte más.',
 dur:60,
 init(G){G.sc=[0,0];G.round=0;this.newRound(G)},
 newRound(G){G.pos=[0,1,2];G.coin=Math.floor(G.r()*3);G.phase='show';G.pt=0;G.swaps=4+G.round*3;G.sw=null;G.pick=-1;G.bpick=-1;G.speed=.42-G.round*.09;if(G.boost)G.speed+=.08},
 tap(G,who,x,y){if(G.phase!=='pick'||who!=='p')return;let best=-1,bd=1e9;for(let k=0;k<3;k++){const cx=this.cx(G,G.pos[k]),d=Math.abs(cx-x);if(d<bd){bd=d;best=k}}if(bd>G.W*.17)return;
  G.pick=best;G.bpick=G.r()<(.45+G.round*.07)?G.coin:Math.floor(G.r()*3);G.phase='reveal';G.pt=0;const ok=best===G.coin,bok=G.bpick===G.coin;if(ok){G.sc[0]++;SFX.coin();particles(G,this.cx(G,G.pos[G.coin]),G.H*.55,30,['#ffd84a','#fff'],250)}else SFX.bad();if(bok)G.sc[1]++;
  floatTxt(G,(ok?'¡Acierto!':'¡Fallo!')+' · Bot '+(bok?'✔':'✘'),G.W/2,G.H*.3,ok?'#7cff8a':'#ff7a6b')},
 cx(G,slot){return G.W*(.2+slot*.3)},
 update(G,dt){G.pt+=dt;
  if(G.phase==='show'&&G.pt>1.6){G.phase='swap';G.pt=0}
  else if(G.phase==='swap'){if(!G.sw){if(G.swaps<=0){G.phase='pick';G.pt=0;return}const a=Math.floor(G.r()*3);let b=(a+1+Math.floor(G.r()*2))%3;G.sw={a,b,t:0};SFX.swoosh()}
   G.sw.t+=dt/G.speed;if(G.sw.t>=1){const ia=G.pos.indexOf(G.sw.a),ib=G.pos.indexOf(G.sw.b);G.pos[ia]=G.sw.b;G.pos[ib]=G.sw.a;G.sw=null;G.swaps--}}
  else if(G.phase==='reveal'&&G.pt>2){G.round++;if(G.round>=3&&G.sc[0]!==G.sc[1])G.end(G.sc[0]>G.sc[1]);else if(G.round>=6)G.end(G.sc[0]>=G.sc[1]);else this.newRound(G)}},
 timeout(G){return G.sc[0]>=G.sc[1]},score(G){return G.sc.slice()},
 draw(G,c,W,H){bg(c,W,H,'#2b1a5c','#7a3fbf');const ty=H*.62;
  c.fillStyle=lg(c,ty,ty+60,['#a8643a','#6b3a1c']);rr(c,W*.04,ty+30,W*.92,40,12);c.fill();c.strokeStyle='#1b1340';c.lineWidth=3;c.stroke();
  machine(c,W*.5,H*.24,.7,'b',G);
  for(let k=0;k<3;k++){let x=this.cx(G,G.pos[k]),y=ty;
   if(G.sw&&(k===G.sw.a||k===G.sw.b)){const from=this.cx(G,G.pos[k]),other=k===G.sw.a?G.sw.b:G.sw.a,to=this.cx(G,G.pos[other]),e=ease.inout(clamp(G.sw.t,0,1));x=from+(to-from)*e;y=ty+(k===G.sw.a?-1:1)*Math.sin(e*Math.PI)*30}
   const lift=(G.phase==='show'&&G.pt>.2&&G.pt<1.4)||(G.phase==='reveal'&&(k===G.coin||k===G.pick))?50:0;
   if(k===G.coin&&lift){c.fillStyle=lg(c,y+10,y+40,['#fff36b','#f2a900']);c.beginPath();c.ellipse(x,y+28,20,20,0,0,7);c.fill();c.strokeStyle='#1b1340';c.stroke();txt(c,'€',x,y+29,18,'#fff')}
   const yy=y-lift;c.fillStyle=lg(c,yy-40,yy+40,['#ffffff','#e7ecff','#b9c3ee']);c.beginPath();c.moveTo(x-30,yy-40);c.lineTo(x+30,yy-40);c.lineTo(x+38,yy+44);c.lineTo(x-38,yy+44);c.closePath();c.fill();c.strokeStyle='#1b1340';c.lineWidth=3;c.stroke();
   c.fillStyle='#e0313d';c.fillRect(x-33,yy-6,66,14);c.strokeRect(x-33,yy-6,66,14);
   if(G.phase==='reveal'&&k===G.bpick)txt(c,'🤖',x+30,yy-50,20,'#fff');if(G.phase==='reveal'&&k===G.pick)txt(c,'👆',x-30,yy-50,20,'#fff')}
  if(G.phase==='pick')txt(c,'¿Dónde está la moneda? ¡Toca un vaso!',W/2,H*.42,18,'#fff36b');
  hud(G,c,W,G.sc[0],G.sc[1],'Ronda '+Math.min(G.round+1,6))}};

// 5. Duelo Refresco (reflejos / Shy Guy Says)
GAMES.reflejo={name:'Duelo Refresco',emoji:'⚡',desc:'Duelo del oeste: espera la señal y toca antes que New Bot. ¡Si te adelantas, falta!',
 rules:'Espera a que aparezca «¡YA!» y toca lo antes posible. Si tocas antes de tiempo, punto para el rival. Primero a 3 puntos.',
 dur:40,
 init(G){G.sc=[0,0];this.newRound(G)},
 newRound(G){G.st='wait';G.go=1.5+G.r()*2.5;G.wt=0;G.rt=null;G.bt=.24+G.r()*.2;G.msg='';G.flash=0},
 tap(G,who){if(who==='b'){if(G.st==='go'){this.win(G,1,'New Bot '+Math.round(G.wt*1000)+' ms')}return}
  if(G.st==='wait'){SFX.bad();this.win(G,1,'¡Falta! Muy pronto');return}if(G.st==='go'){this.win(G,0,'¡Tú! '+Math.round(G.wt*1000)+' ms')}},
 win(G,i,m){G.sc[i]++;G.st='res';G.msg=m;G.wt=0;G.winner=i;if(i===0){SFX.coin();particles(G,G.W*.25,G.H*.55,30,['#5ad1ff','#ffd84a','#fff'])}else if(G.msg[0]!=='¡')SFX.bad()},
 ai(G,dt){if(G.st==='go'&&G.wt>=G.bt+(G.boost?.04:0))this.tap(G,'b')},
 update(G,dt){G.wt+=dt;G.flash=Math.max(0,G.flash-dt*3);if(G.st==='wait'&&G.wt>=G.go){G.st='go';G.wt=0;G.flash=1;SFX.go()}else if(G.st==='res'&&G.wt>1.5){if(G.sc[0]>=3||G.sc[1]>=3)G.end(G.sc[0]>G.sc[1]);else this.newRound(G)}},
 timeout(G){return G.sc[0]>G.sc[1]},score(G){return G.sc.slice()},
 draw(G,c,W,H){bg(c,W,H,G.st==='go'?'#ff5a3c':'#f7b267','#ffe3a3');const gy=H*.86;
  c.fillStyle='#e8913e';c.beginPath();c.arc(W/2,H*.5,90,Math.PI,0);c.fill();
  const lean=G.st==='res'?(G.winner===0?1:-1):0;machine(c,W*.22,gy-46,1,'p',G,lean>0?.25:0);machine(c,W*.78,gy-46,1,'b',G,lean<0?.25:0);
  if(G.st==='wait')txt(c,'Prepárate…',W/2,H*.33,30,'#fff');
  if(G.st==='go')txt(c,'¡YA!',W/2,H*.33,70+Math.sin(G.t*20)*6,'#fff36b');
  if(G.st==='res')txt(c,G.msg,W/2,H*.33,24,G.winner===0?'#7cff8a':'#ff7a6b');
  if(G.flash>0){c.fillStyle='rgba(255,255,255,'+G.flash*.6+')';c.fillRect(0,0,W,H)}
  hud(G,c,W,G.sc[0],G.sc[1],'a 3')}};

const IDS=['globo','lata','burbuja','trile','reflejo'];

// ---------- runner ----------
const CSS='.pmg{position:relative;width:100%;max-width:440px;margin:0 auto;height:min(560px,70vh);border-radius:18px;overflow:hidden;border:3px solid #1b1340;box-shadow:0 6px 0 #1b1340,0 12px 30px rgba(0,0,0,.4);touch-action:manipulation;user-select:none;-webkit-user-select:none;font-family:"Lilita One","Arial Black",system-ui,sans-serif}'+
'.pmg canvas{width:100%;height:100%;display:block}.pmg .ov{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;text-align:center;color:#fff;background:radial-gradient(circle at 50% 30%,rgba(123,92,255,.92),rgba(27,19,64,.96))}'+
'.pmg .ic{font-size:64px;filter:drop-shadow(0 4px 0 #1b1340);animation:pmgb 1.2s ease-in-out infinite}.pmg h2{margin:0;font-size:30px;text-shadow:0 3px 0 #1b1340,0 0 12px #ff8ad1}.pmg p{margin:0;font-size:16px;line-height:1.35;max-width:330px;font-family:system-ui,sans-serif;font-weight:700}'+
'.pmg button{font:inherit;font-size:22px;color:#1b1340;background:linear-gradient(#ffe36b,#f2a900);border:3px solid #1b1340;border-radius:16px;padding:12px 28px;box-shadow:0 5px 0 #1b1340;cursor:pointer}.pmg button:active{transform:translateY(4px);box-shadow:0 1px 0 #1b1340}'+
'.pmg .vs{display:flex;gap:14px;align-items:center;font-size:20px}.pmg .cd{font-size:120px;color:#fff36b;text-shadow:0 6px 0 #1b1340;animation:pmgz .9s ease-out}'+
'@keyframes pmgb{50%{transform:translateY(-8px) rotate(-4deg)}}@keyframes pmgz{0%{transform:scale(2.4);opacity:0}40%{transform:scale(1);opacity:1}100%{transform:scale(.8);opacity:.2}}';
function injectCSS(){if(document.getElementById('pmg-css'))return;const s=document.createElement('style');s.id='pmg-css';s.textContent=CSS;document.head.appendChild(s)}
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

function run(id,container,opts){opts=opts||{};injectCSS();const def=GAMES[id];if(!def)throw new Error('PartyMG: juego desconocido '+id);
 const root=document.createElement('div');root.className='pmg';const cv=document.createElement('canvas');const ov=document.createElement('div');ov.className='ov';root.append(cv,ov);container.appendChild(root);
 const c=cv.getContext('2d');let raf=0,dead=false,last=0,resolveFn;const done=new Promise(r=>resolveFn=r);
 const opp=opts.opponent||{name:'New Bot'};
 const G={W:0,H:0,t:0,parts:[],floats:[],boost:!!opts.boost,pName:opts.playerName||'Tú',oName:opp.name||'New Bot',r:rng(opts.seed),over:false,left:def.dur,remote:!!opp.remote};
 if(opts.avatarUrl){G.pImg=new Image();G.pImg.crossOrigin='anonymous';G.pImg.src=opts.avatarUrl}if(opp.avatarUrl){G.bImg=new Image();G.bImg.crossOrigin='anonymous';G.bImg.src=opp.avatarUrl}
 function size(){const r=root.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);G.W=r.width||360;G.H=r.height||520;cv.width=G.W*d;cv.height=G.H*d;c.setTransform(d,0,0,d,0,0)}
 size();window.addEventListener('resize',size);
 let playing=false;
 G.end=win=>{if(G.over)return;G.over=true;setTimeout(()=>finish(win),900)};
 function finish(win){playing=false;const [s,o]=def.score(G);win?SFX.win():SFX.lose();
  ov.style.display='flex';ov.innerHTML='<div class="ic">'+(win?'🏆':'😵')+'</div><h2>'+(win?'¡GANASTE!':'¡PERDISTE!')+'</h2><div class="vs"><b style="color:#7fe0ff">'+esc(G.pName)+' '+s+'</b> – <b style="color:#ff9a8f">'+o+' '+esc(G.oName)+'</b></div>'+(opts.noResultButton?'':'<button>CONTINUAR</button>');
  const out={win:!!win,score:s,opponentScore:o};const b=ov.querySelector('button');if(b)b.onclick=()=>resolveFn(out);else setTimeout(()=>resolveFn(out),1400)}
 function tapAt(x,y){if(!playing||G.over)return;def.tap(G,'p',x,y);if(opp.remote&&opp.send)opp.send({t:'tap',x:x/G.W,y:y/G.H,at:G.t})}
 const onDown=e=>{e.preventDefault();ac();const r=cv.getBoundingClientRect();const p=e.touches?e.touches[0]:e;tapAt(p.clientX-r.left,p.clientY-r.top)};
 const onKey=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(playing)tapAt(G.W/2,G.H/2)}else if(playing&&id==='trile'&&/Digit[123]|Numpad[123]/.test(e.code)){const n=+e.code.slice(-1)-1;tapAt(def.cx(G,n),G.H*.6)}};
 cv.addEventListener('pointerdown',onDown);window.addEventListener('keydown',onKey);
 if(opp.remote&&opp.onEvent)opp.onEvent(ev=>{if(ev&&ev.t==='tap'&&playing)def.tap(G,'b',ev.x*G.W,ev.y*G.H)});
 def.init(G);
 function frame(ts){if(dead)return;const dt=Math.min(.05,last?(ts-last)/1000:0);last=ts;G.t+=dt;
  if(playing&&!G.over){def.update(G,dt);if(!G.remote&&def.ai)def.ai(G,dt);G.left-=dt;if(G.left<=0){G.left=0;G.end(def.timeout(G))}}
  c.clearRect(0,0,G.W,G.H);def.draw(G,c,G.W,G.H);drawParts(G,c,dt);drawFloats(G,c,dt);raf=requestAnimationFrame(frame)}
 raf=requestAnimationFrame(frame);
 function countdown(){ov.style.display='flex';let n=3;const step=()=>{if(dead)return;if(n>0){ov.innerHTML='<div class="cd">'+n+'</div>';SFX.count();n--;setTimeout(step,800)}else{ov.innerHTML='<div class="cd">¡YA!</div>';SFX.go();setTimeout(()=>{ov.style.display='none';playing=true},500)}};ov.style.background='rgba(27,19,64,.45)';step()}
 if(opts.skipIntro)countdown();else{ov.innerHTML='<div class="ic">'+def.emoji+'</div><h2>'+esc(def.name)+'</h2><p>'+esc(def.rules)+'</p>'+(G.boost?'<p style="color:#ffd84a">🎟 Boost activo: ventaja extra</p>':'')+'<div class="vs"><span>'+esc(G.pName)+'</span><b style="color:#ffd84a">VS</b><span>'+esc(G.oName)+'</span></div><button>▶ ¡JUGAR!</button>';ov.querySelector('button').onclick=()=>{ac();countdown()}}
 function cleanup(){dead=true;cancelAnimationFrame(raf);window.removeEventListener('resize',size);window.removeEventListener('keydown',onKey);root.remove()}
 return{done,cleanup}}

function play(id,o){o=o||{};injectCSS();const wrap=document.createElement('div');wrap.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(10,6,30,.85);display:flex;align-items:center;justify-content:center;padding:10px';document.body.appendChild(wrap);
 const g=run(id,wrap,o);return g.done.then(r=>{g.cleanup();wrap.remove();return r})}
// Drop-in para el tablero: firma igual que games[name](ar,resolve,boost) -> cleanup
function mount(id,container,resolve,boost,opts){opts=Object.assign({boost,skipIntro:true,noResultButton:true},opts||{});const g=run(id,container,opts);let alive=true;g.done.then(r=>{if(alive)resolve(r.win)});return()=>{alive=false;g.cleanup()}}

window.PartyMG={list:IDS.map(id=>({id,name:GAMES[id].name,emoji:GAMES[id].emoji,desc:GAMES[id].desc})),rules:id=>GAMES[id]&&GAMES[id].rules,play,mount,run,sfx:SFX};
})();
