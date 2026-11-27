import {slenderPin, slenderSize} from './pin-spec.js';
import {station} from './workshop/station-view.js';

(() => {
  'use strict';
  globalThis.mountPracticePanel=function(view,study,api,config){
    const el=id=>document.getElementById(id);
    const ids=study.stationIds, motion=study.practiceMotion;
    const ticket=window.parent!==window && new URLSearchParams(location.search).get('workOrder');
    const embedded=typeof ticket==='string' && /^[a-z0-9-]{1,80}$/i.test(ticket);
    const pinURL=new URL(location.href);
    const slender=pinURL.searchParams.get('pin')==='slender';
    const key=config.storageKey+(slender?'.slender':'')+(embedded?'.order.'+ticket:'');
    function sendSample(sample){
      if(embedded && sample)window.parent.postMessage({type:'workshop:ejected',ticket,shape:sample.shape,mount:state.mount},location.origin);
    }
    if(embedded)document.body.classList.add('order-embed');
    let raw=null;
    try{raw=sessionStorage.getItem(key);}catch{/* Practice also works in memory. */}
    let state=api.restore(raw,study.cnc), selected=config.initialSlot, busy=false;
    if(embedded && ticket.endsWith('-batch') && !raw){
      const setup=new URLSearchParams(location.search);
      for(const id of ids){
        const tool=setup.get('tool-'+id);
        if(tool==='none'||api.compatible(id).includes(tool))state.mount[id]=tool;
      }
    }
    let pending=null;
    let program=[];
    // Use the same actions and tooling checks as a learner using the manual controls.
    function startProgram(){
      const plan=[];
      const phase=state.phase==='done'?'empty':state.phase;
      if(phase==='empty')plan.push(['feed']);
      if(['empty','ready'].includes(phase)){
        if(ids.includes('drill1')){
          if(!slender){
            const drill=ids.find(id=>state.mount[id]==='small')??'drill1';
            plan.push(['align',drill],['work',drill]);
          }
          plan.push(['align','counter'],['work','counter']);
        }
        else {
          if(!slender&&ids.includes('drill'))plan.push(['work']);
          plan.push(['grip']);
        }
      }
      if(['empty','ready','held'].includes(phase))plan.push(['cut']);
      if(!slender&&ids.includes('drill'))plan.push(['back']);
      plan.push(['eject']);
      program=plan;
      advanceProgram();
    }
    function advanceProgram(){
      while(program.length){
        const [kind,slot]=program.shift();
        if(slot)pick(slot,true);
        if(kind==='align'&&state.active===slot)continue;
        act(kind);break;
      }
    }
    document.body.classList.add("practice");
    document.querySelector('.workstation').setAttribute('aria-label','수동 실습과 가상 핀');
    document.querySelector('.camera-dock').insertAdjacentHTML('afterend',
      '<section class="lab-drive" aria-label="가공 동작"><div class="lab-buttons"></div><p id="lab-message" role="status"></p></section>');
    const bar=document.querySelector('.lab-buttons');
    const pinOptions=document.createElement('div');
    pinOptions.className='pin-options';
    bar.before(pinOptions);
    if(!embedded){
      const link=document.createElement('a');
      if(slender)pinURL.searchParams.delete('pin');
      else pinURL.searchParams.set('pin','slender');
      link.href=pinURL.href;
      link.textContent=slender?'기본 핀 실습으로':'SSD 크기 민핀 만들기 · '+slenderSize;
      pinOptions.append(link);
    }
    let cycleButton;
    if(slender){
      const note=document.createElement('p');
      note.textContent='민핀 목표 · 전장 '+slenderPin.length+' mm / 몸통 Ø'+slenderPin.diam+' mm. 홈과 드릴 가공을 건너뜁니다. 기계 화면은 공구 접촉을 확대하고, 배출한 민핀은 실제 치수 비율로 보여줍니다.';
      pinOptions.append(note);
      if(!embedded){
        cycleButton=document.createElement('button');
        cycleButton.textContent='민핀 한 개 자동 가공';cycleButton.onclick=startProgram;
        pinOptions.append(cycleButton);
      }
    }
    for(const [kind,label] of Object.entries(config.controls)){
      const button=document.createElement('button');
      button.dataset.act=kind;button.textContent=label;bar.append(button);
    }
    const panel=document.createElement('section');panel.className='lab-panel';panel.setAttribute('aria-labelledby','kit-title');
    panel.innerHTML='<h2 id="kit-title">장착된 공구</h2><div id="lab-slots" role="group" aria-label="장착 자리 선택"></div>'+
      '<div class="lab-fitting"><label for="lab-tool">넣을 공구</label><select id="lab-tool"></select><button data-act="fit">장착</button><button data-act="remove">분리</button></div>'+
      '<p id="lab-guide"></p><section class="lab-result" aria-labelledby="result-title"><h2 id="result-title">현재 핀</h2><strong id="lab-shape"></strong><div id="lab-preview"></div></section>'+
      '<section class="lab-samples" aria-labelledby="samples-title"><h2 id="samples-title">배출한 핀 비교</h2><div id="lab-history"></div></section>';
    document.querySelector('.workstation').append(panel);
    const finished=document.createElement('div');
    if(slender&&!embedded)panel.append(finished);
    let lastPreview;
    const fitting=panel.querySelector('.lab-fitting'), drive=document.querySelector('.lab-drive');
    const stationSelect=document.createElement('select');
    stationSelect.id='lab-slot-select';
    const stationLabel=document.createElement('label');stationLabel.className='compact-slot';stationLabel.append('장착 자리 ',stationSelect);
    fitting.prepend(stationLabel);
    ids.forEach(id=>stationSelect.add(new Option(api.labels[id],id)));
    stationSelect.onchange=()=>pick(stationSelect.value,true);
    const compact=matchMedia('(max-width:880px)');
    function arrangeControls(){
      if(compact.matches)drive.prepend(fitting);
      else el('lab-slots').after(fitting);
    }
    arrangeControls();compact.addEventListener('change',arrangeControls);
    const lesson=document.createElement('details');lesson.className='lab-example';
    const title=document.createElement('summary');title.textContent='처음 만드는 핀';
    const example=document.createElement('p');
    example.textContent=config.example;
    lesson.append(title,example);el('lab-guide').after(lesson);

    const buttons=new Map();
    ids.forEach(id=>{
      const b=document.createElement('button');b.type='button';b.dataset.slot=id;
      const title=document.createElement('strong'),desc=document.createElement('span');
      title.textContent=api.labels[id];b.append(title,desc);el('lab-slots').append(b);buttons.set(id,b);
      b.onclick=()=>pick(id,true);
    });
    function pick(id,focusMesh) {
      if(busy||!buttons.has(id))return;
      selected=id;
      if(focusMesh)view.selectPart(id);
      showToolOptions();refresh();
      show('선택한 자리 · '+api.labels[id]);
    }
    function showToolOptions(){
      const selector=el('lab-tool');selector.replaceChildren();
      for(const tool of api.compatible(selected))selector.add(new Option(api.tools[tool],tool));
      if(state.mount[selected]!=='none')selector.value=state.mount[selected];
    }
    study.onPartPicked=id=>pick(id,false);
    const hint=()=>config.hint(state,selected);
    function show(message){
      el('lab-message').textContent=message;
      el('lab-guide').hidden=message===el('lab-guide').textContent;
    }
    function refresh(){
      if(cycleButton)cycleButton.disabled=busy||!['empty','done'].includes(state.phase);
      for(const [id,b] of buttons){
        b.lastElementChild.textContent=api.tools[state.mount[id]]+(state.active===id?' · 중심':'');
        b.setAttribute('aria-pressed',String(selected===id));b.disabled=busy;
      }
      stationSelect.value=selected;stationSelect.disabled=busy;
      for(const option of stationSelect.options)option.textContent=api.labels[option.value]+' · '+api.tools[state.mount[option.value]]+(state.active===option.value?' (중심)':'');
      el('lab-tool').disabled=busy;
      document.querySelectorAll('[data-act]').forEach(b=>{b.disabled=busy;});
      const fitted=state.mount[selected], value=el('lab-tool').value;
      const fit=document.querySelector('[data-act="fit"]');
      fit.textContent=fitted==='none'?'장착':'교체';
      fit.disabled=busy||fitted===value;
      document.querySelector('[data-act="remove"]').disabled=busy||fitted==='none';
      for(const [kind,label] of Object.entries(config.buttonLabels(state,selected))) {
        bar.querySelector('[data-act="'+kind+'"]').textContent=label;
      }
      el('lab-guide').textContent=hint();
      el('camera-step').textContent=config.phaseText(state);
      el('lab-shape').textContent=state.phase==='empty'?'소재 이송 전':api.shapeName(state.shape);
      el('lab-preview').innerHTML=state.phase==='empty'?'':config.pinDiagram(state.shape);
      const history=el('lab-history');history.replaceChildren();
      if(!state.samples.length){history.textContent='배출 후 최근 두 핀이 여기에 남습니다.';return;}
      for(const sample of state.samples){
        const figure=document.createElement('figure'), caption=document.createElement('figcaption');
        caption.textContent=sample.number+'번째 핀 · '+api.shapeName(sample.shape)+(slender?' · '+slenderSize:'');
        figure.innerHTML=config.pinDiagram(sample.shape);figure.prepend(caption);history.append(figure);
      }
      const latest=state.samples[0];
      if(slender&&!embedded&&lastPreview!==latest.number){
        lastPreview=latest.number;
        finished.replaceChildren();
        if(Object.values(latest.shape).every(v=>v===0)){
          station(finished,{kind:'inspect',j:{...slenderPin,id:'P-104',lot:'가상 시편',machine:'민핀'},
            p:{...slenderPin,number:latest.number,shape:latest.shape},title:'배출한 민핀 · '+slenderSize,
            hint:'전장과 외경을 같은 비율로 그렸습니다. 드래그해 양 끝면을 확인하세요.'});
        }
      }
    }
    function act(kind){
      if(busy)return;
      const focus=config.focusForAction(kind,selected);
      if(focus && focus!==selected)pick(focus,true);
      const action={kind,slot:selected,tool:el('lab-tool').value};
      const result=api.change(state,action);
      if(result.error){program=[];show(result.error);return;}
      const from=state,to=result.next;
      if(focus)view.selectPart(focus);
      const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:
        (config.durations?.[kind]??{work:1550,feed:1050,eject:1100,align:950}[kind]??720);
      busy=true;refresh();show((config.motionLabels[kind]??config.controls[kind])+' 중…');
      const start=performance.now();
      const frame=now=>{
        const p=duration?Math.min(1,(now-start)/duration):1;
        const pose=motion.pose(from,to,action,p);
        view.render(pose);
        if((config.previewActions??['work','feed','cut','eject']).includes(kind)){
          el('lab-preview').innerHTML=config.pinDiagram(pose.shape);
          el('lab-shape').textContent=api.shapeName(pose.shape);
        }
        if(p<1){pending=requestAnimationFrame(frame);return;}
        pending=null;state=to;busy=false;
        try{sessionStorage.setItem(key,JSON.stringify(state));}catch{/* Keep the current run usable. */}
        view.render(motion.pose(state,state,null,1));
        refresh();show(config.completedText(action,from,selected));
        if(kind==='eject')sendSample(state.samples[0]);
        else if(program.length)advanceProgram();
      };
      pending=requestAnimationFrame(frame);
    }
    el('lab-tool').onchange=refresh;
    document.querySelectorAll('[data-act]').forEach(b=>{b.onclick=()=>act(b.dataset.act);});
    window.addEventListener('pagehide',()=>{
      if(pending!==null){cancelAnimationFrame(pending);pending=null;busy=false;view.render(motion.pose(state,state,null,1));refresh();show(hint());}
    });
    showToolOptions();refresh();view.selectPart(selected);
    if(state.phase==='done')sendSample(state.samples[0]);
    view.render(motion.pose(state,state,null,1));show(hint());
    if(embedded && state.phase!=='done' && new URLSearchParams(location.search).get('cycle')==='auto')startProgram();
  };
})();
