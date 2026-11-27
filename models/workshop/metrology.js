import {mountBench} from './gauge-bench.js';
import {station} from './station-view.js';
import {balance,displayedWeight} from './visuals.js';
import {mass,massLimits} from './jobs.js';
import './precision-contact.js';
import {magnifier} from './vernier-lesson.js';

export function instrument(host,j,p,key,record,notify,onGauge){
  const length=key==='length',value=p[key],places=length?2:3;
  const macro=j.id==='P-104'?document.createElement('precision-contact'):null;
  const controls=mountBench(host,j,p,key,panel=>{
    const base=Math.floor(value),index=Math.round((value-base)*20);
    panel.insertAdjacentHTML('beforeend','<details><summary>눈금을 글로 보기</summary><p>'+(length?'주척 '+base+' mm, 일치하는 아들자 눈금은 '+index+'번째 칸입니다.':'표시창 '+value.toFixed(3)+' mm')+'</p></details><form><label class="field">측정 기록 (mm)<input id="reading" type="number" required step="'+(length?'.01':'.001')+'" inputmode="decimal"></label><button class="primary">측정값 기록</button></form>');
    if(length){
      const lens=document.createElement('div');
      lens.innerHTML='<label>일치선 확대 · 아들자 <output>0</output>번 <input aria-label="확대할 아들자 눈금 번호" type="range" min="0" max="19" value="0"></label><div class="lens"></div>';
      panel.querySelector('details').before(lens);
      const slide=lens.querySelector('input');
      function magnify(){
        const n=Number(slide.value);
        lens.querySelector('output').textContent=String(n);
        lens.querySelector('.lens').innerHTML=magnifier(value,n);
      }
      slide.oninput=magnify;magnify();
    }
    panel.querySelector('form').onsubmit=e=>{e.preventDefault();const v=panel.querySelector('#reading').valueAsNumber;
      if(Math.abs(v-value)>0.00001||!Number.isFinite(v))return notify('기입값이 눈금과 다릅니다. 표시 단위와 소수점을 다시 읽어 보세요.');
      record(key,Number(v.toFixed(places)));
    };
  },state=>{
    macro?.update(p,key,state);
    onGauge?.(state);
  });
  if(macro){
    macro.controls=controls;
    host.querySelector('.gauge-caption').before(macro);
    macro.after(host.querySelector('.controls'),host.querySelector('.gap-control'));
  }
  return controls;
}

export function packing(host,j,s,complete,notify){
  const accepted=s.records.filter(p=>p.pass);
  let container=false,tared=false,loaded=false,sealed=false,chosen=[];
  const limits=massLimits(j);
  host.innerHTML='<p>지시 용기 <b>'+j.container+'</b> · 합격품 '+j.qty+'개 · 순중량 대조 범위 <b>'+limits.map(n=>n.toFixed(3)).join(' ~ ')+' g</b></p>'+
    '<div id="packing-view"></div><div id="scale"></div><label class="field">준비할 용기<select name="box"><option>용기 선택</option><option>칸막이 트레이</option><option>뚜껑형 트레이</option><option>개별 칸 트레이</option></select></label><div class="controls"><button id="pan">빈 용기와 덮개 올리기</button><button id="tare">용기 영점(TARE)</button></div>'+
    '<fieldset><legend>용기에 담을 생산 번호</legend><div class="tray">'+s.records.map(p=>'<label><input type="checkbox" value="'+p.number+'"> #'+p.number+' '+(p.pass?'합격':'격리')+'</label>').join('')+'</div></fieldset>'+
    '<div class="controls"><button id="load">선택한 핀 담아 계량</button><button id="seal">수량 확인 · 덮개 봉함</button></div><form id="label"><h3>포장 라벨 대조</h3>'+
    '<label class="field">품번 / 개정<input name="label" required placeholder="예: P-000 / A"></label>'+
    '<label class="field">소재 로트<input name="lot" required></label>'+
    '<label class="field">포장 수량 (개)<input type="number" min="1" step="1" name="qty" required></label>'+
    '<label class="field">실측 순중량 (g)<input type="number" step=".001" name="net" required></label>'+
    '<button class="primary">라벨 부착 · 인계 준비</button></form>';
  const find=q=>host.querySelector(q);
  const checks=()=>Array.from(host.querySelectorAll('input[type=checkbox]:checked'),e=>Number(e.value));
  const weigh=()=>Number(chosen.reduce((sum,n)=>sum+mass(j,s.records.find(p=>p.number===n)),0).toFixed(3));
  const view=station(find('#packing-view'),{kind:'pack',j,records:s.records,chosen,selected:[],title:'포장 작업대',hint:''},key=>{
    if(key.startsWith('piece-')){
      const input=find('.tray input[value="'+Number(key.slice(6))+'"]');
      if(input&&!sealed)input.click();
    }else if(['pan','tare','seal'].includes(key))find('#'+key).click();
  });
  function read(loading=false,closing=false){
    const state=sealed?'봉함 완료':loaded?'핀 '+chosen.map(n=>'#'+n).join(', ')+' 계량 중':tared?'용기 영점 확인':container?'빈 용기와 덮개 계량 중':'빈 저울';
    const scaleState={container,tared,loaded,sealed,j,pieces:chosen.map(n=>s.records.find(p=>p.number===n)),net:loaded?weigh():0};
    const selected=checks();
    const selection=selected.length?'선택 '+selected.map(n=>'#'+n+(accepted.some(p=>p.number===n)?'':'(격리)')).join(', ')+' · ':'';
    view.update({weight:displayedWeight(scaleState),kind:'pack',j,records:s.records,container,tared,chosen,selected,sealed,loading,closing,title:'포장 작업대 · '+state,
      hint:sealed?'라벨에 품번·로트·수량·순중량을 기입하세요.':selection+'3D 트레이의 핀을 눌러 선택하세요. 계량하면 포장 용기로 옮겨집니다.'});
    find('#scale').innerHTML=balance(scaleState);}
  read();
  find('#pan').onclick=()=>{
    if(find('[name=box]').value!==j.container)return notify('지시서의 포장 용기를 골라 주세요.');
    container=true;read();notify('빈 용기와 덮개의 총중량이 표시됩니다. 용기 영점을 확인하세요.');
    find('#pan').disabled=true;find('[name=box]').disabled=true;
  };
  find('#tare').onclick=()=>{if(!container||loaded)return notify('빈 용기만 올려놓고 영점을 맞추세요.');tared=true;read();notify('표시창 0.000 g을 확인하세요.');};
  host.querySelector('fieldset').onchange=()=>{loaded=false;chosen=[];read();notify('선택이 바뀌었습니다. 다시 계량하세요.');};
  find('#load').onclick=()=>{
    if(!tared)return notify('빈 용기를 올리고 용기 무게를 먼저 빼세요.');
    const ids=checks();if(!ids.length)return notify('담을 핀을 선택하세요.');
    if(ids.some(n=>!accepted.some(p=>p.number===n)))return notify('격리품이 섞였습니다. 검사 기록을 대조해 합격품만 선택하세요.');
    chosen=ids;loaded=true;read(true);view.animate(750);notify('표시창에서 순중량을 읽고, 생산 번호로 수량도 대조하세요.');
  };
  find('#seal').onclick=()=>{
    if(!loaded||chosen.length!==j.qty)return notify('합격품 세 개를 담아 계량한 뒤 봉함하세요.');
    sealed=true;find('fieldset').disabled=true;find('#load').disabled=true;find('#seal').disabled=true;
    read(false,true);view.animate(680);notify('봉함했습니다. 라벨에 실측 순중량과 로트를 기입하세요.');
  };
  find('#label').onsubmit=e=>{
    e.preventDefault();const data=new FormData(e.currentTarget);
    if(!loaded||chosen.length!==j.qty||Number(data.get('qty'))!==chosen.length)return notify('합격품의 실물 수량, 작업지시 수량, 라벨 수량을 대조하세요.');
    if(!sealed)return notify('덮개를 봉함한 뒤 인계하세요.');
    if(String(data.get('label')).replace(/\s/g,'').toUpperCase()!==j.id+'/'+j.rev||String(data.get('lot')).trim().toUpperCase()!==j.lot)return notify('품번·개정·로트를 작업지시서와 다시 대조하세요.');
    const net=weigh();if(Math.abs(Number(data.get('net'))-net)>.00001||net<limits[0]||net>limits[1])return notify('용기 무게를 제외한 표시값과 순중량 범위를 확인하세요.');
    complete({net,ids:chosen});
  };
}
