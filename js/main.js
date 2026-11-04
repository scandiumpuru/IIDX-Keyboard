(()=>{
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const keys=['shift','z','s','x','d','c','f','v'];
const laneNames=['皿','1','2','3','4','5','6','7'];
const laneWidths=[150,105,75,105,75,105,75,105];
const laneGap=3, top=48, hitY=755, travel=690, approach=1900;
let hiSpeed=1.0;
const speedInput=$('speed'),speedValue=$('speedValue');
function setSpeed(v){hiSpeed=Number(v);speedValue.textContent=hiSpeed.toFixed(1)+'x';}
speedInput.addEventListener('input',()=>setSpeed(speedInput.value));
setSpeed(speedInput.value);
const laneTotal=laneWidths.reduce((a,b)=>a+b,0)+laneGap*7;
const laneLeft=(canvas.width-laneTotal)/2;
const laneX=i=>laneLeft+laneWidths.slice(0,i).reduce((a,b)=>a+b+laneGap,0);
let chart=[],state='ready',startAt=0,pausedAt=0,elapsed=0,raf=0;
let score=0,combo=0,maxCombo=0,bp=0,fast=0,slow=0,gauge=22;
let counts={PGREAT:0,GREAT:0,GOOD:0,BAD:0,POOR:0};
let held=new Set(),lastJudge='',judgeUntil=0,judgeDelta=0;
const timings={PGREAT:16.67,GREAT:33.33,GOOD:116.67,BAD:250};
function makeChart(){
 const a=[]; let t=2200;
 const pattern=[
 [1],[2],[3],[4],[5],[6],[7],[0],[1,5],[2,6],[3,7],[0,2],[1,3,5],[4,6],[0],[7],
 [1,2],[3,4],[5,6],[0,7],[2,4,6],[1,3,5],[0],[6],[5],[4],[3],[2],[1],[0],
 [1,4],[2,5],[3,6],[4,7],[0,3],[1,5,7],[2,4,6],[0],[0,1],[0,7],[2],[3],[4],[5],[6],[7]
 ];
 pattern.forEach((lanes,i)=>{lanes.forEach(l=>a.push({t,l,judged:false}));t+=i%8===7?650:360;});
 return a.sort((x,y)=>x.t-y.t);
}
function reset(){
 chart=makeChart();score=combo=maxCombo=bp=fast=slow=0;gauge=22;
 counts={PGREAT:0,GREAT:0,GOOD:0,BAD:0,POOR:0};held.clear();lastJudge='';
 elapsed=0;startAt=performance.now()+1200;state='playing';$('status').textContent='GET READY';
 $('maxScore').textContent='MAX '+String(chart.length*2).padStart(6,'0');updateHud();
 if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
}
function updateHud(){
 $('score').textContent=String(score).padStart(6,'0');$('gaugeText').textContent=gauge.toFixed(1)+'%';
 $('gaugeFill').style.width=Math.max(0,Math.min(100,gauge))+'%';
 $('combo').textContent=combo;$('maxCombo').textContent=maxCombo;$('bp').textContent='BP '+bp;
 $('fastslow').textContent=`FAST ${fast}　SLOW ${slow}`;
}
function setJudge(name,delta=0){
 lastJudge=name;judgeDelta=delta;judgeUntil=elapsed+650;
 if(name==='PGREAT'||name==='GREAT'||name==='GOOD')combo++;
 else{combo=0;bp++;}
 maxCombo=Math.max(maxCombo,combo);counts[name]=(counts[name]||0)+1;
 if(name==='PGREAT')score+=2;else if(name==='GREAT')score+=1;
 const n=Math.max(1,chart.length),gain=78/n;
 if(name==='PGREAT'||name==='GREAT')gauge+=gain;
 else if(name==='GOOD')gauge+=gain*.5;
 else if(name==='BAD')gauge-=2;
 else gauge-=6;
 gauge=Math.max(0,Math.min(100,gauge));
 if(Math.abs(delta)>1){if(delta<0)fast++;else slow++;}
 updateHud();
 if(gauge<=0){state='failed';$('status').textContent='FAILED';}
}
function input(lane){
 if(state!=='playing')return;
 const candidates=chart.filter(n=>!n.judged&&n.l===lane&&elapsed-n.t>=-timings.BAD&&elapsed-n.t<=timings.BAD);
 if(!candidates.length)return;
 const note=candidates.sort((a,b)=>Math.abs(elapsed-a.t)-Math.abs(elapsed-b.t))[0];
 const d=elapsed-note.t,ad=Math.abs(d);note.judged=true;
 const j=ad<=timings.PGREAT?'PGREAT':ad<=timings.GREAT?'GREAT':ad<=timings.GOOD?'GOOD':'BAD';
 setJudge(j,d);
}
function keydown(e){
 const k=e.key.toLowerCase()==='shift'?'shift':e.key.toLowerCase();
 if(!keys.includes(k)||e.repeat)return;
 if(k==='shift'&&e.location===2)return;
 e.preventDefault();held.add(k);
 document.querySelector(`[data-key="${k==='shift'?'Shift':k}"]`)?.classList.add('active');
 input(keys.indexOf(k));
}
function keyup(e){
 const k=e.key.toLowerCase()==='shift'?'shift':e.key.toLowerCase();
 held.delete(k);document.querySelector(`[data-key="${k==='shift'?'Shift':k}"]`)?.classList.remove('active');
}
window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);
window.addEventListener('blur',()=>{held.clear();document.querySelectorAll('.key').forEach(x=>x.classList.remove('active'));});
function pause(){
 if(state==='playing'){state='paused';pausedAt=performance.now();$('status').textContent='PAUSED';}
 else if(state==='paused'){startAt+=performance.now()-pausedAt;state='playing';$('status').textContent='PLAYING';raf=requestAnimationFrame(loop);}
}
$('startBtn').onclick=reset;$('pauseBtn').onclick=pause;
window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();pause();}});
function draw(){
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 ctx.fillStyle='#050b14';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#0a1422';ctx.fillRect(laneLeft-8,top,laneTotal+16,hitY-top+75);
 for(let i=0;i<8;i++){
  const x=laneX(i),lw=laneWidths[i];
  ctx.fillStyle=i===0?'#302819':(i%2===1?'#10141c':'#10263c');ctx.fillRect(x,top,lw,hitY-top+75);
  ctx.fillStyle=i===0?'#e0b84d':(i%2===1?'#59616b':'#258bd0');ctx.fillRect(x,hitY,lw,7);
  ctx.fillStyle='#9dbbd0';ctx.font='bold 17px Arial';ctx.textAlign='center';ctx.fillText(laneNames[i],x+lw/2,hitY+34);
  if(held.has(keys[i])){ctx.save();ctx.shadowColor=i===0?'#ffd34d':(i%2===1?'#f4f7ff':'#28aaff');ctx.shadowBlur=24;ctx.fillStyle=i===0?'#f4d77a':(i%2===1?'#dce5ef':'#4ce8ff');ctx.globalAlpha=.34;ctx.fillRect(x,top,lw,hitY-top+75);ctx.restore();}
 }
 for(let y=top+45;y<h;y+=90){ctx.strokeStyle='#20364b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(laneLeft,y);ctx.lineTo(laneLeft+laneTotal,y);ctx.stroke();}
 chart.forEach(n=>{
  if(n.judged)return;
  const dt=n.t-elapsed;if(dt>approach/hiSpeed||dt< -timings.BAD-30)return;
  const y=hitY-(dt/approach)*travel*hiSpeed,lw=laneWidths[n.l],x=laneX(n.l)+5,nw=lw-10;
  const grad=ctx.createLinearGradient(x,y-18,x+nw,y+5);
  if(n.l===0){grad.addColorStop(0,'#fff1a0');grad.addColorStop(1,'#c48b24');}
  else if(n.l<=4){grad.addColorStop(0,'#3c424b');grad.addColorStop(1,'#05070b');}
  else{grad.addColorStop(0,'#8be8ff');grad.addColorStop(1,'#07559e');}
  ctx.save();ctx.shadowColor=n.l===0?'#ffd34d':(n.l%2===1?'#aeb8c8':'#24aaff');ctx.shadowBlur=10;
  ctx.fillStyle=grad;ctx.fillRect(x,y-18,nw,20);ctx.restore();
  ctx.fillStyle=n.l%2===1?'#cbd3dd':'#dff8ff';ctx.fillRect(x,y-18,nw,2);
 });
 ctx.fillStyle='#e6faff';ctx.shadowColor='#4bdcff';ctx.shadowBlur=12;ctx.fillRect(laneLeft,hitY-2,laneTotal,3);ctx.shadowBlur=0;
 ctx.fillStyle='#b8d8eb';ctx.font='12px Arial';ctx.textAlign='left';ctx.fillText('JUDGE LINE',laneLeft,hitY+58);
 if(lastJudge&&elapsed<judgeUntil){
  const colors={PGREAT:'#fff',GREAT:'#ffe15b',GOOD:'#6fdcff',BAD:'#ff8d55',POOR:'#ff4242'};
  ctx.textAlign='center';ctx.font='bold 42px Arial';ctx.fillStyle=colors[lastJudge];ctx.shadowColor=colors[lastJudge];ctx.shadowBlur=15;
  ctx.fillText(lastJudge,w/2,120);ctx.shadowBlur=0;
  ctx.font='bold 14px Arial';ctx.fillStyle='#d8efff';ctx.fillText((judgeDelta<0?'FAST ':'SLOW ')+Math.abs(judgeDelta).toFixed(1)+' ms',w/2,145);
 }
 ctx.textAlign='left';ctx.font='bold 14px Arial';let yy=190;
 for(const name of ['PGREAT','GREAT','GOOD','BAD','POOR']){
  ctx.fillStyle=({PGREAT:'#fff',GREAT:'#ffe15b',GOOD:'#6fdcff',BAD:'#ff8d55',POOR:'#ff4242'})[name];
  ctx.fillText(name+'  '+counts[name],18,yy);yy+=25;
 }
 if(state==='ready'||state==='paused'||state==='failed'||state==='clear'){
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(laneLeft,top,laneTotal,hitY-top);
  ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='bold 30px Arial';
  ctx.fillText(state==='ready'?'PRESS START':state==='paused'?'PAUSED':state==='failed'?'STAGE FAILED':'STAGE CLEAR',laneLeft+laneTotal/2,300);
  ctx.font='15px Arial';ctx.fillStyle='#9dc9e4';ctx.fillText('LEFT SHIFT  /  Z S X D C F V',laneLeft+laneTotal/2,332);
 }
}
function loop(ts){
 if(state!=='playing'){draw();return;}
 elapsed=Math.max(0,ts-startAt);
 $('status').textContent=ts<startAt?'GET READY':'PLAYING';
 for(const n of chart){if(!n.judged&&elapsed>n.t+timings.BAD){n.judged=true;setJudge('POOR',timings.BAD+1);}}
 if(gauge<=0){draw();return;}
 if(chart.every(n=>n.judged)){state='clear';$('status').textContent=gauge>=80?'CLEAR':'FAILED';draw();return;}
 draw();raf=requestAnimationFrame(loop);
}
draw();updateHud();
})();