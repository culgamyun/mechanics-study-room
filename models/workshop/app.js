import {jobs,start,makePiece,matches,describe,good,inRange} from './jobs.js';
import {drawing,surfaceView} from './visuals.js';
import {instrument,packing} from './metrology.js';
import {vernierLesson} from './vernier-lesson.js';

import {station} from './station-view.js';

const el=id=>document.getElementById(id);
const work=el('work');
const stages={prep:'지시 확인',machine:'초품 가공',clean:'세척·외관',inspect:'측정·판정',approval:'초품 승인',run:'반복 생산',hold:'격리·보고',pack:'포장',handoff:'인계 대기',done:'인계 완료'};
let j,s,storageOK=true;
let measureOnly=false;
let cycling=false,stopAfter=false;
const storeKey=()=> 'workshop.lot.v1.'+j.id;
function persist(){
  if(measureOnly)return;
  try{sessionStorage.setItem(storeKey(),JSON.stringify(s));}
  catch{storageOK=false;}
}
function notify(text){el('message').textContent=text;}
function validShape(shape){
  const keys=!j.hole?['narrow','wide']:j.id==='P-202'?['large','small','tap']:['narrow','wide','bore'];
  return shape && keys.every(k=>Number.isInteger(shape[k])&&shape[k]>=0&&shape[k]<=(k==='bore'?2:1));
}
function validPiece(p,i){
  return p&&p.number===i+1&&validShape(p.shape)&&Number.isFinite(p.length)&&Number.isFinite(p.diam)&&p.readings&&
    ['length','diam'].every(k=>p.readings[k]===undefined||p.readings[k]===p[k]);
}
function restore(){
  try{
    const v=JSON.parse(sessionStorage.getItem(storeKey()));
    if(!v||!Object.hasOwn(stages,v.phase)||typeof v.run!=='string'||!/^[a-z0-9-]{36}$/.test(v.run)||
       !Array.isArray(v.records)||!v.records.every((p,i)=>validPiece(p,i)&&p.pass===good(j,p)))return start();
    if(v.shape && !validShape(v.shape))return start();
    if(['run','hold','approval','pack','done'].includes(v.phase)&&!v.records.length)return start();
    if(['clean','inspect'].includes(v.phase)&&!validPiece(v.piece,v.records.length))return start();
    v.queue??=[];
    if(!Array.isArray(v.queue)||v.queue.length>j.qty||!v.queue.every((p,i)=>validPiece(p,v.records.length+(v.piece?1:0)+i)))return start();
    if(['handoff','done'].includes(v.phase)&&(!Number.isFinite(v.packed?.net)||!Array.isArray(v.packed.ids)||!v.packed.ids.every(Number.isInteger)))return start();
    return v;
  }catch{return start();}
}
function select(id,practice=false){
  cycling=false;stopAfter=false;
  j=jobs.find(item=>item.id===id)??jobs[0];
  measureOnly=practice&&j.id==='P-104';
  s=measureOnly?start():restore();
  if(measureOnly){
    s.phase='inspect';
    s.piece=makePiece(j,s,{narrow:0,wide:0});
    s.piece.cleaned=true;
  }
  document.body.classList.toggle('measure-only',measureOnly);
  for(const b of el('jobs').children)b.setAttribute('aria-pressed',String(b.dataset.id===j.id));
  history.replaceState(null,'','?job='+j.id+(measureOnly?'&practice=measure':''));
  paint();
}
for(const item of jobs){
  const b=document.createElement('button');b.className='job';b.dataset.id=item.id;b.innerHTML='<small>'+item.id+' · '+item.machine+'</small>'+item.name;
  b.onclick=()=>select(item.id);el('jobs').append(b);
}
function commit(phase){s.phase=phase;persist();paint();work.querySelector('h2')?.focus({preventScroll:true});}
const passed=()=>s.records.filter(p=>p.pass);
const nextNo=()=>s.records.length+1;
const ticket=()=>s.run+'-'+(nextNo()+(s.queue?.length??0))+(s.phase==='run'?'-batch':'');
const heading=t=>'<h2 tabindex="-1">'+t+'</h2>';
function btn(id,text,fn,primary=true){
  const b=document.createElement('button');b.id=id;b.textContent=text;if(primary)b.className='primary';b.onclick=fn;work.append(b);return b;
}
function specRows(){
  const rows=[['전장 L',j.length.toFixed(2)+' ±0.10 mm'],['몸통 외경 Ø',j.diam.toFixed(3)+' ±'+j.tol.toFixed(3)+' mm']];
  if(j.hole)rows.push(['막힌 구멍','Ø'+j.hole.toFixed(2)+' ±0.05 / 깊이 '+j.depth.toFixed(2)+' ±0.10 mm']);
  if(j.groove)rows.push(['홈 폭 / 골지름',j.groove+' ±0.05 / Ø'+j.root+' ±0.05 mm'],['홈 시작 위치','절단면에서 '+j.offset+' ±0.10 mm']);
  return rows.map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('');
}
function order(){
  el('order').innerHTML='<div class="meta">작업지시서 · '+j.machine+'</div><h2>'+j.id+' '+j.name+'</h2>'+
    '<dl><dt>유효 개정</dt><dd>Rev '+j.rev+'</dd><dt>소재 / 로트</dt><dd>'+j.stock+' / '+j.lot+'</dd><dt>납품</dt><dd>합격 '+j.qty+'개 · '+j.container+'</dd></dl>'+
    '<details class="sheet" '+(s.phase==='prep'||innerWidth>850?'open':'')+'><summary>제품 도면 · 치수와 공차</summary>'+drawing(j)+'<p>'+j.feature+'</p><dl>'+specRows()+'</dl><small>'+(j.hole?'구멍 깊이는 원통부 기준입니다. ':'')+'버·흠·이물 없이 세척·건조한 상태로 인계합니다.</small></details>';
  if(j.id==='P-104')el('order').insertAdjacentHTML('afterbegin',measureOnly?
    '<a class="practice-link" href="?job=P-104">← 로트 실습으로 돌아가기</a>':
    '<a class="practice-link" href="?job=P-104&amp;practice=measure">P-104 계측 바로 연습 →</a>');
}
function records(){
  const rows=s.records.map(p=>'<tr><td>#'+p.number+'</td><td>'+p.length.toFixed(2)+'</td><td>'+p.diam.toFixed(3)+'</td><td>'+describe(j,p.shape)+'</td><td>'+(p.pass?'합격':'격리 · '+fault(p))+'</td></tr>').join('');
  el('ledger').innerHTML='<h2>로트 검사 기록</h2><p>'+j.id+' / '+j.rev+' · '+j.lot+' · 합격 '+passed().length+' / '+j.qty+'개 · 격리 '+(s.records.length-passed().length)+'개</p>'+
    (rows?'<div class="scroll" tabindex="0" role="region" aria-label="생산 번호별 검사값과 판정, 좌우로 스크롤"><table><thead><tr><th>생산 번호</th><th>전장 mm</th><th>외경 mm</th><th>형상</th><th>판정</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<p class="note">검사 판정을 마친 핀이 생산 순서대로 남습니다.</p>');
}
function fault(p){return !matches(j,p.shape)?'형상 불일치':!inRange(p.diam,j.diam,j.tol)?'몸통 외경 이탈':'전장 이탈';}
function field(label,id,options){
  return '<label class="field">'+label+'<select id="'+id+'"><option value="">선택하세요</option>'+options.map(v=>'<option>'+v+'</option>').join('')+'</select></label>';
}
function prep(){
  work.innerHTML=heading('작업지시와 자재 대조')+'<p>작업지시서에 맞는 유효 도면과 자재표를 골라 첫 제품을 준비하세요.</p>'+
    field('배포 도면','revision',[j.id+' / '+(j.rev==='A'?'초안':'A'),j.id+' / '+j.rev])+
    field('자재표','stock',[...jobs.map(b=>b.stock+' / '+b.lot),j.stock+' / 보류 로트']);
  btn('prepare','작업 준비 완료',()=>{
    if(el('revision').value!==j.id+' / '+j.rev||el('stock').value!==j.stock+' / '+j.lot)return notify('작업지시서의 품번·개정과 소재·로트를 각각 확인하세요.');
    commit('machine');
  });
}
function machine(){
  work.innerHTML=heading('초품 #'+nextNo()+' 가공')+'<p>'+j.recipe+'</p><p>아래에서 한 동작씩 조작하거나, 품번의 자동 사이클로 초품 한 개를 가공하세요. 배출 후 첫 제품을 검사합니다.</p>';
  btn('first-auto',cycling?'수동 조작으로 돌아가기':'초품 자동 1사이클',()=>{cycling=!cycling;machine();});
  mountMachine();
}
function mountMachine(){
  const frame=document.createElement('iframe');frame.id='machine';frame.title=j.machine+' 가공 실습';
  const url=new URL(j.url,location.href);
  url.searchParams.set('workOrder',ticket());
  if(cycling)url.searchParams.set('cycle','auto');
  if(s.phase==='run')for(const [id,tool] of Object.entries(s.setup??{}))url.searchParams.set('tool-'+id,tool);
  frame.src=url.href;work.append(frame);
}
function inspectNext(){
  s.piece=s.queue.shift();commit('clean');
}
function washView(pieces,washingIds,onAction){
  const host=document.createElement('div');work.append(host);
  const cleanCount=pieces.filter(p=>p.cleaned).length;
  const view=station(host,{kind:'wash',j,pieces,washingIds,title:'세척 · 건조 작업대',
    hint:'핀 '+pieces.map(p=>'#'+p.number).join(', ')+' · 세척 완료 '+cleanCount+'/'+pieces.length+'개. 세척조를 눌러 세척하고 건조 트레이에서 꺼내세요.'},onAction);
  if(washingIds.length)view.animate(2600);
}
function sortView(){
  const p=s.records.at(-1);
  if(!p)return;
  const view=station(work,{kind:'sort',j,records:s.records,title:'핀 #'+p.number+' · '+(p.pass?'합격 트레이':'격리 트레이'),
    hint:(p.pass?'검사를 통과해 포장 대상에 포함됩니다.':fault(p)+' · 격리품은 포장 수량에서 제외됩니다.')+' 각 트레이에는 최근 핀 세 개까지 표시합니다.'});
  view.animate(650);
}
function production(washingIds=[]){
  s.queue??=[];
  const remaining=j.qty-passed().length-s.queue.length;
  work.innerHTML=heading('같은 세팅으로 반복 생산')+'<p>합격 '+passed().length+'개 / 지시 '+j.qty+'개 · 검사 대기 '+s.queue.length+'개</p>';
  if(s.queue.length)work.insertAdjacentHTML('beforeend','<p>대기 트레이 · '+s.queue.map(p=>'#'+p.number).join(', ')+'</p>');
  if(cycling){
    work.insertAdjacentHTML('beforeend','<p role="status">자동 생산 중 · 핀 #'+(nextNo()+s.queue.length)+' 가공. 현재 사이클을 마치고 정지할 수 있습니다.</p>');
    btn('cycle-stop','현재 핀 배출 후 정지',()=>{stopAfter=true;el('cycle-stop').disabled=true;notify('정지 예약 · 현재 핀이 배출되면 멈춥니다.');});
    mountMachine();return;
  }
  if(s.queue.length)washView(s.queue,washingIds,key=>{
    if(key==='wash')el('wash-tray')?.click();
    if(key==='next')el('next-inspection')?.click();
  });
  if(!s.queue.length)sortView();
  const unwashed=s.queue.filter(p=>!p.cleaned);
  if(unwashed.length){
    btn('wash-tray','트레이 일괄 세척·건조 ('+unwashed.length+'개)',()=>{
      unwashed.forEach(p=>{p.cleaned=true;});persist();production(unwashed.map(p=>p.number));
      notify(j.lot+' · '+unwashed.map(p=>'#'+p.number).join(', ')+' 세척 완료. 외관과 치수는 각 핀에서 확인하세요.');
    },false);
  }
  if(s.queue.length)btn('next-inspection','대기 핀 #'+s.queue[0].number+' 검사',inspectNext);
  if(remaining<=0)return;
  work.insertAdjacentHTML('beforeend','<p>자동 생산은 남은 수량만큼 가상 사이클을 반복합니다. 각 핀은 검사 대기 트레이로 이동합니다. 화면을 떠나면 생산이 멈추고 배출된 핀은 보존됩니다.</p>');
  btn('batch-auto','연속 자동 생산 · '+remaining+'개',()=>{cycling=true;stopAfter=false;production();});
  if(!s.queue.length)btn('produce','다음 핀 #'+nextNo()+' 한 개만 생산',()=>{s.piece=makePiece(j,s,s.shape);commit('clean');},false);
}
window.addEventListener('message',e=>{
  if(!['machine','run'].includes(s.phase)||e.origin!==location.origin||e.source!==el('machine')?.contentWindow||e.data?.type!=='workshop:ejected'||e.data.ticket!==ticket()||!validShape(e.data.shape))return;
  if(s.phase==='run'){
    const piece=makePiece(j,s,e.data.shape);
    s.queue.push(piece);persist();
    cycling=!stopAfter&&passed().length+s.queue.length<j.qty;stopAfter=false;
    production();notify(cycling?'다음 사이클을 시작했습니다.':'자동 생산 정지 · 대기 트레이에서 검사할 핀을 선택하세요.');return;
  }
  cycling=false;
  s.shape=e.data.shape;s.setup=e.data.mount;s.piece=makePiece(j,s,s.shape);commit('clean');
});
function clean(washingIds=[]){
  work.innerHTML=heading('핀 #'+s.piece.number+' 세척과 외관 확인')+'<p>가공 후 남은 칩과 절삭유를 제거한 뒤 확대 관찰 창에서 표면을 확인하세요.</p><details><summary>외관 확대 관찰</summary><div id="surface"></div></details>';
  washView([s.piece,...(s.queue??[])],washingIds,key=>{
    if(key==='wash')el('clean')?.click();
    if(key==='next')el('visual')?.click();
  });
  function surface(dirty){
    el('surface').innerHTML=surfaceView(j,s.piece,dirty);
  }
  surface(!s.piece.cleaned);
  if(!s.piece.cleaned){
    btn('clean','이 핀 세척 · 건조',()=>{s.piece.cleaned=true;persist();clean([s.piece.number]);});
    const others=(s.queue??[]).filter(p=>!p.cleaned);
    if(others.length)btn('wash-with-tray','대기 핀과 함께 세척 ('+(1+others.length)+'개)',()=>{
      [s.piece,...others].forEach(p=>{p.cleaned=true;});persist();clean([s.piece,...others].map(p=>p.number));
    },false);
  }
  else {
    work.insertAdjacentHTML('beforeend','<p>세척·건조 완료 · 이 핀의 확대 표면을 확인하세요.</p>');
    btn('visual','외관 확인 · 치수 검사로',()=>commit('inspect'));
  }
}
function opticalReport(p){
  let parts=[describe(j,p.shape)];
  if(j.hole){
    const size=j.id==='P-202'?(p.shape.large?2:p.shape.small?1:0):p.shape.bore;
    parts.push(size?'구멍 Ø'+(size===2?j.hole*1.5:j.hole).toFixed(2)+' mm · 원통부 깊이 '+j.depth.toFixed(2)+' mm':'구멍 미검출');
  }
  if(j.groove&&(p.shape.narrow||p.shape.wide))parts.push('홈 폭 '+(p.shape.wide?j.groove*2:j.groove).toFixed(2)+' · 골지름 Ø'+j.root.toFixed(2)+' · 시작 위치 '+j.offset.toFixed(2)+' mm');
  return parts.join(' / ');
}
function inspect(){
  const p=s.piece;
  if(measureOnly){
    work.innerHTML=heading('P-104 계측 연습')+'<p>핀 한 개의 전장과 몸통 외경을 재세요. 두 값을 기록하면 연습이 끝납니다.</p><div id="gauges" class="controls"></div><div id="instrument"></div>';
    for(const [key,name] of [['length','전장 · 캘리퍼스'],['diam','외경 · 마이크로미터']]){
      const button=document.createElement('button');
      button.dataset.gauge=key;
      button.textContent=name+(p.readings[key]===undefined?'':' · '+p.readings[key].toFixed(key==='length'?2:3)+' mm');
      el('gauges').append(button);
      button.onclick=()=>{
        for(const b of el('gauges').children)b.setAttribute('aria-pressed',String(b===button));
        instrument(el('instrument'),j,p,key,(k,v)=>{
          p.readings[k]=v;
          inspect();
          notify(name+' 측정값을 기록했습니다.');
        },notify);
      };
    }
    const lesson=document.createElement('button');lesson.textContent='눈금 읽기 수업';el('gauges').append(lesson);
    lesson.onclick=()=>{
      for(const b of el('gauges').children)b.setAttribute('aria-pressed',String(b===lesson));
      notify('');vernierLesson(el('instrument'));
    };
    const next=['length','diam'].find(k=>p.readings[k]===undefined);
    if(next)el('gauges').querySelector('[data-gauge="'+next+'"]').click();
    else{
      el('instrument').innerHTML='<h3>계측 완료</h3><p>전장 '+p.readings.length.toFixed(2)+' mm · 몸통 외경 Ø'+p.readings.diam.toFixed(3)+' mm</p>';
      btn('repeat-measure','다시 측정하기',()=>select(j.id,true));
    }
    return;
  }
  work.innerHTML=heading('핀 #'+p.number+' 측정 · 판정')+'<p>캘리퍼스는 양 끝면 사이의 전장을, 마이크로미터는 홈을 피해 몸통 외경을 잽니다. 도면의 허용 범위와 대조하세요.</p><div id="inspection-view"></div><div class="controls" id="gauges"></div><div id="instrument"></div>';
  const g=el('gauges'),host=el('instrument');
  const overview={kind:'inspect',j,p,title:'핀 #'+p.number+' · 형상 검사대',hint:describe(j,p.shape)+' · 돌려서 몸통과 양 끝면을 살펴보세요. 핀을 누르면 형상 성적서를 엽니다.'};
  let controls;
  const view=station(el('inspection-view'),overview,(action,value)=>{
    if(action==='optical')el('optical')?.click();
    if(action==='gap')controls?.setGap(value);
    if(action==='pin')controls?.place();
  });
  const quick=document.createElement('div');quick.className='controls';view.after(quick);
  const zero=document.createElement('button'),read=document.createElement('button');
  zero.textContent='영점 확인';zero.onclick=()=>host.querySelector('[data-zero]')?.click();
  read.textContent='눈금 판독 · 기록';read.onclick=()=>{const panel=host.querySelector('.reading-panel');panel?.scrollIntoView({block:'center'});panel?.querySelector('input')?.focus({preventScroll:true});};
  for(const [key,name] of [['length','버니어 캘리퍼스'],['diam','마이크로미터']]){
    const b=document.createElement('button');b.dataset.gauge=key;b.textContent=name+(p.readings[key]!==undefined?' · '+p.readings[key].toFixed(key==='diam'?3:2)+' mm':'');g.append(b);
    b.onclick=()=>{notify('');controls=instrument(host,j,p,key,(k,v)=>{p.readings[k]=v;persist();inspect();notify(name+' 측정값을 기록했습니다.');},notify,gauge=>{
      if(!quick.children.length)quick.append(zero,read);
      zero.disabled=gauge.zeroed||gauge.gap!==0;zero.textContent=gauge.zeroed?'영점 확인 완료':'영점 확인';
      read.disabled=!(gauge.placed&&gauge.gap===p[key]);
      view.update({...overview,gauge:{...gauge,key,units:key==='length' ? Math.min(.36,5.3/(j.length+3)) : .35},title:'핀 #'+p.number+' · '+name,
        hint:(!gauge.zeroed?'닫힌 측정면에서 영점을 확인하세요.':!read.disabled?'양쪽 측정면이 닿았습니다. 눈금을 읽고 기록하세요.':(gauge.placed?'핀이 놓였습니다. ':'간격을 벌리고 3D 핀을 눌러 놓으세요. ')+(key==='length'?'이동 턱을 좌우로':'래칫을 아래로 열고 위로 닫도록')+' 끌어 조절하세요.')});
    });};
  }
  const report=btn('optical','형상 검사 성적서 열기',()=>{p.optical=true;persist();inspect();},false);
  if(p.optical){report.textContent='형상 검사 성적서 확인 완료';report.disabled=true;report.after(Object.assign(document.createElement('p'),{textContent:'요구 형상: '+j.feature+' / 검사 결과: '+opticalReport(p)+(matches(j,p.shape)?' · 형상 일치':' · 형상 불일치')}));}
  const verdict=val=>{
    if(p.readings.length===undefined||p.readings.diam===undefined||!p.optical)return notify('두 측정값을 기록하고 형상 검사 성적서를 대조하세요.');
    if(val && !matches(j,p.shape))return notify('요구 형상은 '+j.feature+'이고 이 핀은 '+describe(j,p.shape)+'입니다. 부적합 격리를 선택하고 형상 불일치로 보고하세요.');
    if(good(j,p)!==val)return notify('판정을 다시 검토하세요. 몸통 외경·전장 허용 범위와 요구 형상 세 가지를 대조합니다.');
    p.pass=val;s.records.push(p);s.piece=null;
    if(!val)commit('hold');else if(passed().length===1)commit('approval');else commit(passed().length===j.qty?'pack':'run');
  };
  const row=document.createElement('div');row.className='controls';work.append(row);
  row.append(btn('pass','합격품으로 분류',()=>verdict(true)),btn('reject','부적합 격리',()=>verdict(false),false));
}
function handoffModel(received){
  return {kind:'handoff',j,packed:s.packed,received,title:received?'수령대 · 인계 완료':'인계 대기대 → 수령대',
    hint:[j.id+' / '+j.rev,j.lot,s.packed.ids.map(n=>'#'+n).join(', '),s.packed.net.toFixed(3)+' g',received?'수령 완료':'봉함품을 수령대로 끌어 놓거나 눌러 인계하세요.'].join(' · ')};
}
function paint(){
  notify('');order();records();
  const names=['지시 확인','가공','세척','검사','포장','인계'];
  const ix={prep:0,machine:1,run:1,clean:2,inspect:3,approval:3,hold:3,pack:4,handoff:5,done:5}[s.phase];
  el('steps').innerHTML=names.map((v,i)=>'<li '+(ix===i?'aria-current="step"':'')+'>'+v+'</li>').join('');
  switch(s.phase){
    case 'prep':prep();break;
    case 'machine':machine();break;
    case 'clean':clean();break;
    case 'inspect':inspect();break;
    case 'approval':
      work.innerHTML=heading('초품 검사 기록 인계')+'<p>품번과 실측값을 아래 기록에서 확인하세요. 이 과제에서는 가상 담당자가 초품 기록을 검토한 뒤 같은 세팅의 반복 생산을 승인합니다.</p>';
      sortView();
      btn('approve','초품 기록 제출 · 가상 승인 받기',()=>commit('run'));break;
    case 'run':production();break;
    case 'hold':{
      const p=s.records.at(-1);
      work.innerHTML=heading('격리품 #'+p.number+' 보고')+'<p>이 과제는 전수 검사합니다. 격리품은 포장 수량에서 제외됩니다. 관측한 이탈 항목을 보고하세요.</p>'+field('관측 결과','reason',['형상 불일치','몸통 외경 이탈','전장 이탈']);
      sortView();
      btn('report','격리 기록 인계 · 재개 확인',()=>{
        if(el('reason').value!==fault(p))return notify('검사 기록에서 규격을 벗어난 항목을 대조하세요.');
        commit(passed().length?'run':'machine');
        notify('가상 담당자가 격리와 재개 조건을 확인했습니다.');});break;}
    case 'pack':
      work.innerHTML=heading('합격품 포장 · 정밀 저울')+'<div id="packing"></div>';
      packing(el('packing'),j,s,packed=>{s.packed=packed;commit('handoff');},notify);break;
    case 'handoff':{
      work.innerHTML=heading('봉함품과 검사 기록 인계')+'<div id="handoff-view"></div>';
      const ship=(alreadyMoved=false)=>{commit('done');if(!alreadyMoved)work.querySelector('workshop-station').animate(1200);};
      station(el('handoff-view'),handoffModel(false),(key,moved)=>{if(key==='deliver')ship(moved);});
      btn('deliver','봉함품과 기록을 수령대로 옮기기',()=>ship());break;}
    case 'done':
      work.innerHTML=heading('포장 인계 완료')+'<div class="packlabel"><h3>'+j.id+' / '+j.rev+' · '+j.name+'</h3><p>LOT '+j.lot+' · '+j.container+'</p><p>'+s.packed.ids.length+'개 · NET '+s.packed.net.toFixed(3)+' g</p><p>합격 생산 번호 '+s.packed.ids.map(n=>'#'+n).join(', ')+'</p></div><p>이 로트의 검사 기록과 포장 라벨을 대조할 수 있습니다.</p>';
      station(work,handoffModel(true));
      btn('again','같은 품번 새 연습',()=>{if(confirm('이 품번의 연습 기록을 새 로트 연습으로 교체할까요?')){s=start();commit('prep');}},false);break;
  }
  if(!storageOK)notify('이 탭에서 기록 저장을 사용할 수 없어 현재 화면에서만 진행됩니다.');
}
const query=new URLSearchParams(location.search);
select(query.get('job'),query.get('practice')==='measure');
window.addEventListener('pageshow',event=>{
  if(event.persisted&&!measureOnly)select(j.id);
});
