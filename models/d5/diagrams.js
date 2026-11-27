(() => {
  'use strict';
  const study = globalThis.EscoFrontStudy;
  const el = id => document.getElementById(id);
  const svgNS='http://www.w3.org/2000/svg';
  function element(parent,tag,attrs,text) {
    const node=document.createElementNS(svgNS,tag);
    for(const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
    if(text) node.textContent=text;
    parent.appendChild(node);
    return node;
  }
  const stations=[];
  const names={counter:['C','카운터 콜릿'],drill1:['1','정면 드릴 1'],drill2:['2','정면 드릴 2'],tap:['T','나사 가공 주축']};
  let plate;
  function initUI(getStage,startDrilling) {
    const {cnc,variant}=study;
    el('drill-demo').onclick=startDrilling;
    document.title='D5 '+variant+' · Machine Explorer';
    el('variant-note').textContent=cnc
      ? '두 축으로 움직이는 테이블 위에서 드릴, 나사 가공 주축, 콜릿의 위치를 비교하세요.'
      : '오른쪽 터릿이 돌아가면 드릴 두 자리와 콜릿 한 자리 중 하나가 선재 앞에 옵니다.';
    el('station-title').textContent=cnc?'소재 쪽에서 본 크로스 테이블':'소재 쪽에서 본 터릿';
    el('station-help').textContent=cnc?'테이블이 옆으로 이동하면 십자에 오는 공구가 달라집니다.':'터릿이 한 자리 돌아갈 때 십자 안의 공구가 어떻게 바뀌는지 보세요.';
    const active=el(cnc?'cnc-link':'cam-link'), other=el(cnc?'cam-link':'cnc-link');
    active.setAttribute('aria-current','page'); other.removeAttribute('aria-current');
    const destination=new URL(other.href);
    other.addEventListener('click',()=>{
      destination.searchParams.set('step',String(getStage()+1));other.href=destination.href;
    });
    const group=el('station-carrier');
    plate=cnc?element(group,'rect',{y:95,height:34,rx:10,fill:'#385767',stroke:'#8ba6af'}):
      element(group,'circle',{cx:97,cy:112-study.radius*55,r:53,fill:'#385767',stroke:'#8ba6af'});
    study.stationIds.forEach((id,i)=>{
      const color=study.stationColors[id], groupNode=element(group,'g',{});
      element(groupNode,'circle',{r:11,fill:color});
      element(groupNode,'text',{x:0,y:4,'text-anchor':'middle',class:'socket-mark'},names[id][0]);
      stations.push(groupNode);
      const y=40+i*30;
      element(el('station-key'),'circle',{cx:200,cy:y-4,r:8,fill:color});
      element(el('station-key'),'text',{x:217,y},names[id][0]+' · '+names[id][1]);
    });
    const step=Number(new URLSearchParams(location.search).get('step'));
    return Number.isInteger(step) && step>=1 && step<=study.cycle.stages.length ? step-1 : 0;
  }
  function drawSection(s) {
    const {cnc}=study;
    stations.forEach((node,i)=>{
      const [y,z]=study.stationCenter(i);
      const dy=y-(4+study.radius);
      const screenX=97+(cnc?(z+s.slide)*34:(-dy*s.sin+z*s.cos)*55);
      const screenY=cnc?112:112-(study.radius+dy*s.cos+z*s.sin)*55;
      node.setAttribute('transform','translate('+screenX+' '+screenY+')');
    });
    if(cnc){
      plate.setAttribute('x',97+(s.slide-1.52)*34-15);
      plate.setAttribute('width',2.28*34+30);
    }
    const x=151+s.shift*61, y=105+s.drop*61;
    const tip=x+s.advance*101.5, radius=s.radius*86;
    const profile=study.boreProfile(s),depth=profile.depth*70,boreRadius=profile.radius*86;
    const outer='M'+x+' '+(y-radius)+'H'+tip+'V'+(y+radius)+'H'+x+'Z';
    const shoulder=tip-(study.drill.face-profile.shoulder)*70;
    const hole='M'+tip+' '+(y-boreRadius)+'H'+shoulder+'L'+(tip-depth)+' '+y+'L'+shoulder+' '+(y+boreRadius)+'H'+tip+'Z';
    el('finished-pin').setAttribute('d',s.advance>0?outer+' '+hole:'');
    const neck=s.neck*86;
    el('pin-neck').setAttribute('d',s.stage>=2&&neck>0?'M145 '+(105-neck)+'H151V'+(105+neck)+'H145Z':'');
    el('next-stock').setAttribute('d',s.ejection>0?'M145 94H'+x+'V116H145Z':'');
    const edge=105-s.tool*86;
    el('turn-tip').setAttribute('d','M140 '+(edge-24)+'h22v15l-11 9-11-9Z');
    const drillAligned=s.index>.998, colletAligned=s.index<.002;
    el('side-drill').style.display=drillAligned?'':'none';
    el('side-drill').setAttribute('transform','translate('+(29.2-70*s.travel)+' 0)');
    el('side-collet').style.display=colletAligned?'':'none';
    el('side-collet').setAttribute('transform','translate('+(-70*s.travel)+' 0)');
    const gap=16-7.4*s.grip;
    el('upper-jaw').setAttribute('d','M301 '+(105-gap)+'h28l30-7h30v-13h-88Z');
    el('lower-jaw').setAttribute('d','M301 '+(105+gap)+'h28l30 7h30v13h-88Z');
    el('side-tool-label').textContent=drillAligned?'정면 드릴 1':colletAligned?'카운터 콜릿':'자리 전환 중';
    const note=s.separated?'소재에서 분리된 핀':s.stage===7?'콜릿이 잡은 상태에서 절단':s.stage===6?'드릴이 빠진 자리에 구멍이 남음':
      s.stage===5?'핀의 끝면에서 안쪽으로 구멍이 생김':s.stage===4?'선재 중심에 드릴 축을 맞춤':'선재는 축 둘레로 회전하지 않음';
    el('side-note').textContent=note;
  }
  Object.assign(study,{initUI,drawSection});
})();
