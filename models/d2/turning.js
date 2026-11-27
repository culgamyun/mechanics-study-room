(() => {
  'use strict';
  const params=new URLSearchParams(location.search);
  if(params.get('mode')!=='practice')return;
  const api=globalThis.D2PracticeState;
  const cnc=params.get('variant')==='cnc';
  const start=1.32,end=2.77,center=1.72, radius=.13, grooveDepth=.058;
  const partingX=1.285, bladeWidth=.07, jawMouth=2.70, jawLength=.27;
  const stockFace=start-bladeWidth, pitch=end-stockFace, pinLength=end-start;
  // The release stroke starts the next feed. The rest is advanced by the next feed action.
  const releaseStroke=.85, inlet=-3.54, outlet=4.46, trayStart=4.66, trayDrop=.59;
  const widths={narrow:.11,wide:.30};
  const clamp=n=>Math.min(1,Math.max(0,n));
  const ease=n=>{const t=clamp(n);return t*t*(3-2*t);};
  const isBit=o=>o.name==='rotating_groove_bit'||o.name==='rotating_parting_bit';
  const isCollet=o=>o.name==='counter_collet_nose'||o.name.startsWith('collet_jaw_');
  const halfWidth=id=>widths[id]/2;
  const rings=[start,...Object.keys(widths).flatMap(id=>{
    const h=halfWidth(id);return [center-h,center-h+.012,center+h-.012,center+h];
  }).sort((a,b)=>a-b),end];
  function radiusAt(x,shape){
    const d=Math.abs(x-center);
    const narrow=shape.narrow*clamp((halfWidth('narrow')-d)/.012);
    const wide=shape.wide*clamp((halfWidth('wide')-d)/.012);
    return radius-grooveDepth*Math.max(narrow,wide);
  }
  function buildWire(mesh,color){
    const segments=32;
    function shell(name,levels,sampleIndex){
      const vertices=[],faces=[],marks=[];
      for(const [x,r] of levels)for(let i=0;i<segments;i++){
        const angle=2*Math.PI*i/segments;
        vertices.push([x,4+r*Math.cos(angle),r*Math.sin(angle)]);
        // Short surface dashes travel with material points. They add no rings or grooves.
        const distance=(end-.29-x)/(pitch/2);
        marks.push(r>0 && Math.abs(distance-Math.round(distance))<.051 &&
          (i>=5&&i<=9||i>=21&&i<=25));
      }
      for(let j=0;j<levels.length-1;j++)for(let i=0;i<segments;i++){
        const k=(i+1)%segments;faces.push([j*segments+i,j*segments+k,(j+1)*segments+k,(j+1)*segments+i]);
      }
      const part=mesh(name==='practice_stock'?'stock':'product',name,vertices,faces,color);
      part.wireSurface=true;part.radialSegments=segments;part.marks=marks;part.sampleIndex=sampleIndex;
    }
    function markedRings(xs){
      const lo=xs[0],hi=xs.at(-1), positions=new Set(xs);
      for(let x=end-.29;x>lo-.06;x-=pitch/2)for(const d of [-.06,-.032,.032,.06]){
        if(x+d>lo && x+d<hi)positions.add(x+d);
      }
      return [...positions].sort((a,b)=>a-b).map(x=>[x,radius]);
    }
    // No internal end caps. The two open shells share a ring until the blade removes the neck.
    const edge=.0001,body=markedRings(rings);
    shell('practice_stock',[...markedRings([inlet-releaseStroke,stockFace]),[stockFace+edge,radius],[partingX,radius]]);
    shell('practice_pin',[[partingX,radius],[start-edge,radius],...body,[end,0]]);
    for(let i=0;i<3;i++)shell('released_pin_'+i,[[start,0],...body,[end,0]],i);
  }
  function buildHolders(box,colors,form){
    for(const [slot,side,x] of [['groove',1,center],['parting',-1,partingX]]){
      const width=slot==='groove'?widths.narrow:bladeWidth;
      box(slot,'rotating_'+slot+'_holder',[(.8+x)/2,4+side*.65,0],[x-.8+.18,.42,.38],colors.metal);
      form(slot,'rotating_'+slot+'_bit',[x,4+side*.26,0],globalThis.MachineShapes.insert(width,.32,.18,side),slot==='groove'?colors.tool:'#b5b5e8');
    }
  }
  function pose(old,next,action,p){
    const kind=action?.kind,u=ease(p);
    const times={empty:0,ready:3,held:5,cut:6,done:7};
    let t=times[next.phase],shape=next.shape, mount=next.mount, lift=0, angle=0;
    let clampTravel=['held','cut','done'].includes(next.phase)?1:0;
    let grooveFeed=0,partingFeed=0;
    if(kind==='fit'||kind==='remove'){
      mount=p<.5?old.mount:next.mount;
      lift=p<.5?ease(p*2):1-ease((p-.5)*2);
    }
    if(kind==='feed')t=2+u;
    if(kind==='work'){
      const tool=old.mount.groove;
      const plunge=ease(p/.65);
      grooveFeed=(.26-radius+grooveDepth)*plunge*(1-ease((p-.67)/.33));
      const removed=clamp((plunge*(.26-radius+grooveDepth)-(.26-radius))/grooveDepth);
      shape={...old.shape,[tool]:Math.max(removed,old.shape[tool])};
      angle=4*Math.PI*p;
    }
    if(kind==='grip'){
      const phase=old.phase==='held'?1-p:p;
      clampTravel=ease(phase/.50);
      t=4+(cnc?ease((phase-.50)/.50):ease(phase));
    }
    let neck;
    if(kind==='cut'){
      const infeed=ease(p/.7);
      partingFeed=.26*infeed*(1-ease((p-.73)/.27));
      t=5+clamp((.26*infeed-(.26-radius))/radius);
      // The neck follows the deepest blade position, not the shared demo timeline.
      neck=Math.max(0,Math.min(radius,.26-.26*infeed));
      angle=4*Math.PI*p;
    }
    if(kind==='eject'){t=6+u;clampTravel=1;}
    // In its parked position the mobile collet is axially clear of the pin.
    if(['empty','ready','done'].includes(next.phase)&&!['grip','eject'].includes(kind))clampTravel=0;
    if(kind==='eject')clampTravel=1-ease((p-.88)/.12);
    const common=D2Cycle.at(t);
    const done=next.phase==='done', ejecting=kind==='eject';
    const count=(next.samples[0]?.number??0)-(done?1:0);
    const initialTravel=count>0?releaseStroke:0;
    const travel=kind==='feed'?initialTravel+(pitch-initialTravel)*u:next.phase==='empty'?0:pitch;
    const push=releaseStroke*common.ejection,shift=Math.max(0,push-bladeWidth);
    const stockOffset=travel-pitch+push,pinOffset=travel-pitch+shift,tip=end+pinOffset;
    // On rollover the cut pin changes roles at exactly the point where the new stock touches it.
    const previous=ejecting?old.samples.map(s=>s.shape):done?
      [...next.samples.slice(1).map(s=>s.shape),next.collected].filter(Boolean):next.samples.map(s=>s.shape);
    const pins=previous.map((shape,i)=>{
      const left=tip+i*pinLength;
      // Take the pin down only when its trailing face has cleared even the parked CNC collet.
      const drop=trayDrop*ease((left-outlet)/(trayStart-outlet));
      return {shape,offset:Math.min(left,trayStart)-start,drop};
    });
    const collected=ejecting?old.collected:!done&&next.collected;
    if(collected&&!pins.some(pin=>pin.drop===trayDrop))pins[2]={shape:collected,offset:trayStart-start,drop:trayDrop};
    return {...common,neck:neck??common.neck,separated:neck===undefined?common.separated:neck===0&&p>=.7,
      advance:travel/pitch,feedShare:(done?push:travel)/pitch,feedTravel:Math.max(0,count)*pitch+travel+push,
      stockOffset,pinOffset,pins,push,shift,drop:0,radius,shape,mount,grooveFeed,partingFeed,
      jawOffset:cnc ? .48*(1-clampTravel) : 0,lift,liftSlot:action?.slot,headAngle:angle,
      cutting:(kind==='work'&&grooveFeed>.26-radius)||(kind==='cut'&&partingFeed>.26-radius)};
  }
  function visible(o,s){
    if(!s.mount)return true;
    if(o.sampleIndex!==undefined)return !!s.pins[o.sampleIndex];
    return !(isBit(o)&&s.mount[o.id]==='none') && !(isCollet(o)&&s.mount.counter==='none');
  }
  function transform(v,o,s){
    if(!s.mount)return v;
    let [x,y,z]=v;
    if(o.wireSurface){
      const stock=o.name==='practice_stock',sample=s.pins[o.sampleIndex];
      const kerf=x>stockFace && x<start;
      const r=kerf?s.neck:stock?radius:radiusAt(x,sample?.shape??s.shape);
      if(kerf && r===0)x=stock?stockFace:start;
      const offset=stock?s.stockOffset:sample?.offset??s.pinOffset;
      return [Math.max(inlet,x+offset),4+(y-4)*r/radius-(sample?.drop??0),z*r/radius];
    }
    if(o.id==='groove'||o.id==='parting'){
      const side=o.id==='groove'?1:-1;
      y-=side*(side===1?s.grooveFeed:s.partingFeed);
      if(isBit(o)){
        if(o.id==='groove'&&s.mount.groove==='wide') x=center+(x-center)*widths.wide/widths.narrow;
        if(s.liftSlot===o.id)z+=s.lift*.69;
      }
    }
    if(o.id==='counter'&&!o.name.startsWith('counter_support')){
      x+=s.jawOffset;
      if(isCollet(o)&&s.liftSlot==='counter')z+=s.lift*.69;
    }
    return [x,y,z];
  }
  // Tool tips projected onto the axial section, for the studio's lower view.
  function profileTools(s){
    if(!s.mount)return [];
    const list=[];
    if(s.mount.groove!=='none')list.push({kind:'turn',x:center,width:widths[s.mount.groove],side:1,tip:.26-s.grooveFeed,label:s.mount.groove==='wide'?'넓은 홈 날':'좁은 홈 날'});
    if(s.mount.parting!=='none')list.push({kind:'part',x:partingX,width:bladeWidth,side:-1,tip:.26-s.partingFeed,label:'절단 날'});
    return list;
  }
  function describeParts(parts,origin) {
    const pos=parts.findIndex(p=>p[0]==='tools');
    parts.splice(pos,1,
      ['groove','홈 날과 홀더','날이 선재 둘레를 돌면서 같은 위치에 원형 홈을 만듭니다.','선택한 날의 폭과 핀의 옆모양을 비교하세요.','두 공구 자리 중 한 자리에 홈 날을 둔 학습 예시입니다.','ESCO FLEX SPEED 4쪽 · CNC 2020 1쪽'],
      ['parting','절단 날과 홀더','콜릿이 핀을 잡으면 반대편 날이 목을 끊습니다.','날을 분리해도 헤드에 남는 홀더를 찾으세요.','날의 모양과 각도는 교육용입니다.','ESCO FLEX SPEED 3~4쪽 · CNC 2020 1~2쪽']);
    origin.groove=[center,4.45,0];origin.parting=[1.285,3.58,0];
  }
  globalThis.D2TurningStudy={cnc,practice:true,variant:cnc?'제조사 표준 CNC':'캠식 FLEX SPEED',
    modelKey:cnc?'d2-cnc':'d2-flex-speed', stationIds:api.slots,practiceMotion:{pose},
    buildWire,buildHolders,visible,transform,describeParts,profileTools,radiusAt,rings,start,end,radius,
    partingX,bladeWidth,jawMouth,jawLength};
})();
