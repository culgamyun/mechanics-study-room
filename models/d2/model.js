/* Original educational geometry. No measured D2 dimensions or assembly tolerances. */
(() => {
'use strict';
const parts=[
['coil','코일 소재·거치대','긴 선재를 감아 두고 기계에 공급합니다.','감긴 소재와 가공부로 이어지는 선을 찾으세요.','거치대 모양·방향은 일반화했습니다. 실제 공급 동선은 호기별 확인이 필요합니다.','리슨트 PDF 14 · ESCO 브로슈어 PDF 2'],
['straight','교정 장치','코일에서 풀린 소재의 굽음을 바로잡는 기능입니다.','선재가 장치의 중심을 통과합니다.','케이싱·입출구를 구분했습니다. 교정 장치의 내부 배치와 이 호기에 적용되는 부품은 추가 대조가 필요합니다.','ESCO 공식 소개 · 브로슈어 PDF 2'],
['feed','소재 이송','가공 위치로 소재를 보내는 기능입니다.','소재를 사이에 둔 이송 롤러의 관계를 보세요.','롤러 표현은 2020 CNC 브로슈어 기준의 단순화입니다. 구형·개조형의 이송 구동은 확인 필요합니다.','ESCO 브로슈어 PDF 2'],
['guide','가이드 부시','가공부 가까이에서 가는 소재를 안내하고 지지합니다.','공구 바로 앞의 작은 관을 찾으세요.','구멍·틈새·장착 형상은 실제 치수가 아닙니다.','ESCO 브로슈어 PDF 2'],
['head','회전 공구 헤드','소재 둘레를 도는 공구를 지지합니다.','회전 보기에서 헤드와 공구가 함께 도는지 보세요.','베어링·구동부·공구 진입 기구는 생략했습니다.','ESCO 공식 소개 · 리슨트 PDF 14'],
['tools','두 절삭 공구','소재 주위를 돌면서 절삭하는 공구입니다.','서로 마주 보게 배치한 주황색 날을 찾으세요.','두 공구는 2020 D2 CNC 자료 기준입니다. 날 형상·상대 각도·진입량은 개념 표현입니다.','ESCO D2/D5 CNC 2020 PDF 1'],
['counter','카운터 콜릿','절단 시 완성될 쪽의 부품을 잡는 기능입니다.','공구 반대편에서 가공물을 받는 관을 보세요.','벌어진 조각 사이로 핀이 들어가고 조각이 모여 몸통을 잡습니다. 분할 수와 이동량은 학습용입니다.','리슨트 PDF 14 · ESCO 브로슈어 PDF 2'],
['product','가공물·배출 방향','공구와 카운터 콜릿 사이가 가공물 쪽입니다.','소재, 가공 위치, 배출 쪽을 차례대로 짚어보세요.','가상 원통 핀입니다. 회사 제품·도면·공차를 사용하지 않았습니다.','ESCO 브로슈어 PDF 2 · 기능 도식'],
['base','본체·받이','주요 모듈을 지지하는 본체와 가공부 아래 받이를 표시했습니다.','지지 구조와 소재가 지나가는 높이를 구분하세요.','일반 상자 형상입니다. D2 주물 형상·내부 구동·오일 회로·방호 구조는 미확인입니다.','교육용 배치 · 실제 외형 미확인'],
['stock','축 둘레로 돌지 않는 소재','공구 헤드가 소재 둘레를 회전하는 것이 핵심입니다.','금색 선재는 회전 시연에서도 축 둘레로 돌지 않습니다.','축 방향 이송과 파지·절단 관계를 학습용으로 나눠 보여줍니다. 실제 캠 위상은 재현하지 않습니다.','리슨트 PDF 14 · ESCO 공식 브로슈어']
];
const colors={metal:'#a6b9bc',green:'#88bca7',gold:'#d9b56a',tool:'#ed9977',base:'#4b6875',dark:'#29434e'};
const study = globalThis.EscoFrontStudy;
const turning = globalThis.D2TurningStudy;
const practice = turning ?? (study?.practice ? study : null);
const fieldInlet = !study && !practice && new URLSearchParams(location.search).get('view') === 'inlet';
// The photographed wire inlet replaces the generic straightener casing in every D2 view.
const photoInlet = !study;
// Seen from the operator side in the site photos the wire runs right → left; D2 3D views use that mirror image.
const mirror = !study ? -1 : 1;
const demo = !study && !turning;
const bar = globalThis.D2Cycle;
if (photoInlet) {
  const index = parts.findIndex(([id]) => id === 'straight');
  parts[index] = ['straight',fieldInlet?'사진 속 선재 입구':'선재 입구·교정 롤러','릴에서 온 선재가 패드 홀더를 지나 두 롤러 열 사이로 들어갑니다.',
    '첫째 열은 세운 판에 달려 선재 위아래에, 둘째 열은 눕힌 판에 달려 선재 양옆에 번갈아 놓입니다.',
    '현장 사진에서 보이는 순서·방향·롤러 수(열마다 7개)만 옮겼습니다. 패드의 정확한 용도, 각 롤러의 구동 여부, 조정 방법과 치수는 확인이 필요합니다. 입구의 선재는 롤러와 같은 비율로 가늘게, 이송부부터는 알아보기 쉽게 굵게 그렸습니다.',
    '현장 사진(릴·패드 홀더·두 롤러 열) · 외관 대조'];
}
if (demo) {
  const at = id => parts.findIndex(([key]) => key === id);
  parts[at('tools')] = ['tools','외경 바이트와 절단 날','회전 헤드에 달린 두 날입니다. 주황색 외경 바이트가 바깥지름을 깎고, 보라색 절단 날이 핀을 끊습니다.',
    '두 날은 같은 날 평면에서 반지름 방향으로만 들어가고 나옵니다. 축 방향 위치는 선재 이송이 정합니다.',
    '두 날의 역할 배정, 뾰족한 날끝·얇은 절단 날 모양과 진입량은 학습용입니다. 실제 공구 형상과 캠·CNC 진입 순서는 호기·제품마다 확인이 필요합니다.',
    'ESCO D2/D5 CNC 2020 PDF 1 · 기능 도식'];
  parts[at('counter')] = ['counter','카운터 콜릿','절단 때 완성될 핀의 머리 쪽을 잡는 기능입니다.','네 조각이 반지름 방향으로 모여 핀 머리를 잡습니다. 확대 창과 아래 단면에서는 앞쪽 절반을 잘라 조각과 핀 사이의 틈을 보여줍니다.',
    '분할 수, 조각이 움직이는 양, 잡는 길이는 학습용입니다. 캠식 고정형과 CNC 이동형의 차이는 실습 모드에서 비교하세요.','리슨트 PDF 14 · ESCO 브로슈어 PDF 2'];
  parts[at('product')] = ['product','가공물·배출 방향','날 평면과 카운터 콜릿 사이에서 핀이 만들어집니다.','머리(원래 지름) → 깎인 몸통 → 절단면 순서로 핀을 짚어 보세요.','가상 머리 달린 핀입니다. 회사 제품·도면·공차를 사용하지 않았습니다.','ESCO 브로슈어 PDF 2 · 기능 도식'];
}
if (study) study.describeParts(parts);
const cycle = study?.cycle ?? globalThis.D2Cycle;
const stageCount = cycle.stages.length;
const modelKey = practice?.modelKey ?? study?.modelKey ?? 'd2'; let storyTime=0,storyPlaying=false,storyState=cycle.at(0),storySpeed=1,lastStage=-1;
const objects=[];let current='head',mode='overview',yaw=-.55*mirror,pitch=.4,zoom=1,spread=0,spin=0,running=false,frame=0,lastTime=0,dirty=true;
const origin={coil:[-8,4,0],straight:[-4.6,4,0],feed:[-2.8,4,0],guide:[-.8,4,0],head:[.6,4,0],tools:[1.2,4,0],counter:[3.4,4,0],product:[2.2,4,0],base:[0,1.5,0],stock:[-3,4,0]};
if (study) Object.assign(origin, study.anchors);
if (turning) turning.describeParts(parts,origin);
function mesh(id,name,vertices,faces,color){const part={id,name,vertices,faces,color,rgb:parseInt(color.slice(1),16)};objects.push(part);return part;}
const shapes=globalThis.MachineShapes;
function form(id,name,center,shape,color,axis='x'){
  const vertices=shape.vertices.map(v=>shapes.orient(v,axis).map((n,i)=>n+center[i]));
  mesh(id,name,vertices,shape.faces,color);
}
function box(id,name,c,s,color){const v=[];for(const z of [-1,1])for(const y of [-1,1])for(const x of [-1,1])v.push([c[0]+x*s[0]/2,c[1]+y*s[1]/2,c[2]+z*s[2]/2]);mesh(id,name,v,[[0,2,3,1],[4,5,7,6],[0,1,5,4],[2,6,7,3],[0,4,6,2],[1,3,7,5]],color);}
function tube(id,name,c,length,outer,inner,color,axis='x',segments=32){const v=[];for(const x of [-length/2,length/2])for(const radius of [outer,inner])for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,p=[x,radius*Math.cos(a),radius*Math.sin(a)];v.push(axis==='x'?[c[0]+p[0],c[1]+p[1],c[2]+p[2]]:[c[0]+p[1],c[1]+p[2],c[2]+p[0]]);}const f=[];for(let i=0;i<segments;i++){const n=(i+1)%segments;f.push([i,n,2*segments+n,2*segments+i],[segments+n,segments+i,3*segments+i,3*segments+n],[n,i,segments+i,segments+n],[2*segments+i,2*segments+n,3*segments+n,3*segments+i]);}mesh(id,name,v,f,color);}
// Display units are arbitrary; functional ordering is intentional, distances are not machine measurements.
form('base','abstract_cabinet',[0,1.45,0],shapes.housing(11,2.9,3.6,.22),colors.base);
box('base','work_tray',[0,3,0],[11.5,.22,4.2],colors.metal);
box('base','tray_back_lip',[0,3.28,-2],[11.5,.4,.14],colors.base);
box('base','tray_front_lip',[0,3.28,2],[11.5,.4,.14],colors.base);
for(const x of [-4.8,4.8])for(const z of [-1.3,1.3])box('base','foot',[x,.12,z],[.65,.24,.65],colors.dark);
box('coil','reel_stand',[-8,1.8,0],[.4,3.6,.55],colors.base);box('coil','reel_foot',[-8,.15,0],[2.3,.3,2.5],colors.base);
tube('coil','reel_hub',[-8,3.05,0],1.2,.28,.12,colors.metal,'z');
for(const y of [2,4.1])box('coil','reel_support',[-8,y,-.55],[2.7,.12,.12],colors.metal);
if (photoInlet) {
  // Site photos: reel → hinged two-pocket pad holder on the body's end wall → upright roller bank → flat roller bank.
  // In the photos the pad holder is about 1.4 times as long as one roller bank. Pocket contents are drawn as seen, not as a function.
  box('straight','inlet_bed',[-4.32,3.39,0],[1.8,.5,.9],colors.base);
  box('straight','inlet_back_wall',[-4.32,3.83,-.4],[1.8,.4,.1],colors.base);
  box('straight','inlet_end_wall',[-5.18,3.86,0],[.08,.44,.9],colors.base);
  box('straight','inlet_base',[-4.33,3.69,0],[1.7,.10,.64],colors.base);
  box('straight','pad_holder_bracket',[-5.45,3.6,0],[.42,.26,.3],colors.base);
  box('straight','pad_holder',[-5.61,3.85,0],[.8,.22,.46],colors.green);
  box('straight','open_pad_lid',[-5.61,4.10,-.22],[.8,.49,.06],colors.green);
  box('straight','wire_guide_post',[-6.06,4.02,0],[.05,.34,.07],colors.dark);
  for (const [x,color] of [[-5.81,'#b87b4d'],[-5.41,'#cabb90']]) {
    box('straight','lower_pad',[x,3.97,0],[.34,.06,.35],color);
    box('straight','lid_pad',[x,4.13,-.17],[.34,.35,.05],color);
  }
  const roller = shapes.turned([[-.09,.027],[-.09,.085],[-.06,.098],[.06,.098],[.09,.085],[.09,.027],[-.09,.027]],20);
  box('straight','upright_roller_mount',[-4.77,3.95,-.115],[.70,.43,.05],colors.dark);
  box('straight','flat_roller_mount',[-3.97,3.85,0],[.70,.12,.43],colors.dark);
  for(let i=0;i<7;i++){
    const offset = i%2===0 ? -.123 : .123;
    form('straight','upright_bank_roller',[-5.07+i*.10,4+offset,0],roller,colors.metal,'z');
    form('straight','flat_bank_roller',[-4.27+i*.10,4,offset],roller,colors.metal,'y');
  }
  tube('stock','inlet_wire',[-4.81,4,0],2.54,.025,.001,colors.gold);
} else {
  form('straight','straightener_support',[-4.6,3.24,0],shapes.housing(1.64,.32,1.60),colors.base);
  tube('straight','straightener_outer_body',[-4.6,4,0],1.6,.75,.2,colors.green);
  for(const x of [-5.42,-3.78])tube('straight','straightener_end', [x,4,0],.12,.83,.2,colors.metal);
  for(const x of [-4.95,-4.25])tube('straight','casing_band',[x,4,0],.10,.79,.75,colors.metal);
  for(const x of [-5.5,-3.7])tube('straight','wire_entry_exit',[x,4,0],.20,.31,.17,colors.metal);
}
box('feed','feed_support',[-2.8,3.6,-.48],[1.05,1.4,.2],colors.base);
for(const y of [3.56,4.44])form('feed','feed_roller',[-2.8,y,0],shapes.turned([
  [-.30,.10],[-.30,.39],[-.27,.40],[-.15,.40],[0,.30],[.15,.40],[.27,.40],[.30,.39],[.30,.10],[-.30,.10]
]),colors.metal,'z');
form('guide','guide_support',[-.8,3.53,0],shapes.housing(.56,.48,.86),colors.base);
tube('guide','guide_bush',[-.8,4,0],.7,.3,.17,colors.metal);
box('head','head_stationary_support',[.3,3.5,-.7],[1.1,.9,.3],colors.base);
tube('head','rotating_carrier',[.6,4,0],.55,1.05,.43,colors.green);
if(turning) turning.buildHolders(box,colors,form);
else for(const sign of [-1,1]){
box('head','rotating_tool_holder',[1.10,4+sign*.69,0],[.55,.55,.52],colors.metal);
// Turning tool on top, parting blade below. Outlines are in (axial, radial-from-tip) and share one plane.
const outline=sign>0?bar.geo.turningTool:bar.geo.partingBlade,n=outline.length,v=[];
for(const z of [-.06,.06])for(const [a,q] of outline)v.push([bar.geo.plane+a,4+sign*(.135+q),z]);
const f=[outline.map((_,i)=>n-1-i),outline.map((_,i)=>n+i)];
for(let i=0;i<n;i++){const k=(i+1)%n;f.push([i,k,n+k,n+i]);}
mesh('tools',sign>0?'turning_tool':'parting_blade',v,f,sign>0?colors.tool:'#a99cf0');
}
if (study) {
  study.buildFront({box,tube,mesh,form,colors});
} else {
  box('counter','counter_support',[3.8,3.37,0],[1.45,.34,1.35],colors.base);
  tube('counter','counter_collet_outer',[3.4,4,0],1.15,.5,.15,colors.green);
  if(turning) turning.buildWire(mesh,colors.gold);
}
// Demo bar: rings sit at fixed material coordinates; radius and x follow the shared cycle state.
function lathe(id,name,mus,first,last){
  const n=24,v=[],f=[],rows=[[mus[0],first],...mus.map(mu=>[mu,1]),[mus.at(-1),last]];
  for(const [mu,unit] of rows)for(let i=0;i<n;i++){const a=2*Math.PI*i/n;v.push([mu,4+unit*Math.cos(a),unit*Math.sin(a)]);}
  for(let j=1;j<rows.length;j++)for(let i=0;i<n;i++){const k=(i+1)%n;f.push([(j-1)*n+i,(j-1)*n+k,j*n+k,j*n+i]);}
  mesh(id,name,v,f,colors.gold);objects.at(-1).bar=name==='work_pin';objects.at(-1).profile=true;
}
if(demo){const {pin,stock}=bar.rings();lathe('stock','work_stock',stock,0,1);lathe('product','work_pin',pin,1,0);}
else if(study){
tube('product','cut_neck',[1.285,4,0],.07,.13,.001,colors.gold);
tube('stock','following_stock',[2.92,4,0],3.2,.13,.001,colors.gold);
}
if (!study) box('product','abstract_collection_tray',[turning?5.25:4.9,3.22,.5],[turning?1.82:.9,.12,1.7],colors.gold);
const wireStart = photoInlet ? -3.54 : -5.62;
const wireEnd = demo ? -1 : 1.25;
if(!turning)tube('stock','non_rotating_wire',[(wireStart+wireEnd)/2,4,0],wireEnd-wireStart,.13,.001,colors.gold, 'x',20);
// Recognizable external features only; no invented internal drive train.
for(let i=0;i<6;i++){const a=i*Math.PI/3;box('head','rotating_face_fastener_'+i,[.9,4+.87*Math.cos(a),.87*Math.sin(a)],[.07,.09,.09],colors.dark);}
for(const x of [-4,0,4]){box('base','cabinet_panel',[x,1.5,1.81],[3.4,2.1,.035],colors.dark);box('base','panel_handle',[x+1.05,1.5,1.86],[.09,.45,.12],colors.metal);}
if (!study) for(const x of (turning?[4.37,6.13]:[4.48,5.32]))box('product','collection_side',[x,3.38,.5],[.08,.32,1.7],colors.metal);
if (!study) box('product','collection_end',[turning?5.25:4.9,3.38,1.31],[turning?1.82:.9,.32,.08],colors.metal);
globalThis.EscoDetail.build({mesh,form,box,tube,colors,turning,study,fieldInlet:photoInlet});
const canvas=document.getElementById('view'),ctx=canvas.getContext('2d');const byId=id=>document.getElementById(id);let width=800,height=510,labels=[];
function transformed(v,o,fullAssembly=false){
const state=storyState;
let [x,y,z] = (turning ?? study)?.transform(v,o,state) ?? v;
if(o.name==='illustrative_part'){
  x=1.32+(x-1.32)*state.advance+state.shift;
  const scale=study&&!state.shape?1:state.radius/.13;
  y=4+(y-4)*scale-state.drop;z*=scale;
}
if(o.name==='cut_neck'){y=4+(y-4)*state.neck/.13;z=z*state.neck/.13;}
if(!fullAssembly && (study||turning) && mode==='process' && !isolated && (o.name==='non_rotating_wire'||o.name==='practice_stock')) x=Math.max(-1.4,x);
if(o.name==='following_stock')x=1.32+(x-1.32)*state.ejection;
if(o.profile){
  const r=bar.radius(v[0],state);
  x=Math.max(-1,bar.place(v[0],state,o.bar));
  y=4+(v[1]-4)*r-(o.bar?state.drop:0);z=v[2]*r;
}
if(!study&&o.name.startsWith('collet_jaw_')){
  const angle=Number(o.name.slice(-1))*Math.PI/2,opening=(1-state.grip)*.075;
  y+=opening*Math.cos(angle);z+=opening*Math.sin(angle);
}
if(o.id==='tools'){const sign=Math.sign(y-4);y+=sign*((demo?(o.name==='turning_tool'?state.turnTip:state.partTip):state.tool)-.135);}
const rotates=o.name.startsWith('rotating_')||o.id==='tools';if(rotates){const a=y-4,b=z;y=4+a*Math.cos(spin)-b*Math.sin(spin);z=a*Math.sin(spin)+b*Math.cos(spin);}
if(o.name==='feed_roller'||o.name==='roller_witness'){const cy=v[1]>4?4.44:3.56;const a=x+2.8,b=y-cy,angle=state.feedTravel/.4*(cy>4?1:-1)*(turning?1:-1);x=-2.8+a*Math.cos(angle)-b*Math.sin(angle);y=cy+a*Math.sin(angle)+b*Math.cos(angle);}
if(!fullAssembly&&spread&&!o.wireSurface&&o.id!=='base'&&o.id!=='stock'){x+=origin[o.id][0]*spread*.45;y+=spread*.7;}
return [x,y,z];}
const surface = new globalThis.D2DepthSurface();
const numberOf = new Map(parts.map(([id],i)=>[id,i+1]));
let isolated = false, detail='',boreView=false;
function showDetail(key){detail=key;for(const b of document.querySelectorAll('[data-detail]'))b.setAttribute('aria-pressed',String(b.dataset.detail===key));}
const outsideFocus = (study||turning) ? ['coil','base','feed','straight'] : ['coil','base'];
let center = [-1.9,2.55,0], viewScale = 1;
let cosYaw, sinYaw, cosPitch, sinPitch;

function frameCamera() {
  cosYaw=Math.cos(yaw); sinYaw=Math.sin(yaw);
  cosPitch=Math.cos(pitch); sinPitch=Math.sin(pitch);
  center=mode==='overview'?[-2,2.55,0]:(study?.focusCenter ?? (turning?[2.3,4,0]:[.5,4,0]));
  let span=mode==='overview'?17.7+spread*6:11+spread*3;
  if(detail&&!isolated){
    center=detail==='cut'?[1.13,4,0]:study?[3.88,4.14,-.08]:[3.10+(storyState.jawOffset??0),4,0];
    const span=detail==='cut'?3.35:study?4.45:2.8;
    viewScale=Math.min(width/span,height/(span*.70))*zoom;
    return;
  }
  if(isolated) {
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(const o of objects) {
      if(!visible(o)) continue;
      for(const vertex of o.vertices) {
        const p=transformed(vertex,o);
        for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}
      }
    }
    if(Number.isFinite(min[0])){
      center=min.map((v,k)=>(v+max[k])/2);
      span=Math.max(1.5,Math.hypot(...max.map((v,k)=>v-min[k]))*1.12);
    }
  }
  if(isolated){
    viewScale=Math.min(width/span,height/span)*zoom;
    return;
  }
  // Project the enclosing box onto both screen axes, including the depth term.
  // At normal zoom the machine fits after any orbit, even when its long axis is vertical.
  const overview=mode==='overview';
  const sx=overview?(study?17.4:16.4)+spread*6.8:(turning?8.4:study?8.6:10.5)+spread*3;
  const sy=(overview?(study?.height ?? 5.3):3.2)+spread;
  const sz=overview?4.5:(study?.focusDepth ?? 3.5);
  const projectedWidth=Math.abs(sx*cosYaw)+Math.abs(sz*sinYaw);
  const projectedHeight=Math.abs(sy*cosPitch)+Math.abs(sx*sinYaw*sinPitch)+Math.abs(sz*cosYaw*sinPitch);
  viewScale=.92*Math.min(width/projectedWidth,height/projectedHeight)*zoom;
}

function project(v) {
  const x=mirror*(v[0]-center[0]),y=v[1]-center[1],z=v[2]-center[2];
  const lateral=x*cosYaw+z*sinYaw, back=-x*sinYaw+z*cosYaw;
  return [width/2+lateral*viewScale,height*.51-(y*cosPitch-back*sinPitch)*viewScale,
          y*sinPitch+back*cosPitch];
}

// Light follows the camera. Derive a face normal in camera space from the projected edges.
function faceColor(points, rgb, selected) {
  const [a,b,c]=points;
  const u=[(b[0]-a[0])/viewScale,(a[1]-b[1])/viewScale,b[2]-a[2]];
  const v=[(c[0]-a[0])/viewScale,(a[1]-c[1])/viewScale,c[2]-a[2]];
  const nx=u[1]*v[2]-u[2]*v[1], ny=u[2]*v[0]-u[0]*v[2], nz=u[0]*v[1]-u[1]*v[0];
  return shapes.shade(rgb,nx,ny,nz,selected);
}
function partOwner(o){return o.name==='practice_pin'&&!storyState.separated?'stock':o.id;}
function visible(o){if(turning && !turning.visible(o,storyState))return false;if(storyState.mount && study?.practiceMotion.removable(o) && storyState.mount[o.id]==='none')return false;if(o.name==='illustrative_part'&&storyState.advance===0)return false;if(o.name==='cut_neck'&&(storyState.stage<2||storyState.neck<=.001))return false;if(o.name==='following_stock'&&storyState.ejection===0)return false;if(isolated)return partOwner(o)===current||(current==='straight'&&o.name==='inlet_wire');return mode==='overview'||!outsideFocus.includes(o.id);}

function drawLabels(){
  const targets=new Map();
  parts.forEach(([id],i)=>{
    if(!byId('numbers').checked && id!==current) return;
    targets.set(i+1,project(transformed(origin[id],{id,name:'label'})));
  });
  const anchors=surface.anchors(targets);
  const hint=byId('pick-hint');
  const guidance=anchors.has(numberOf.get(current))
    ? '드래그로 돌리고, 보이는 부품을 눌러 이름을 확인하세요.'
    : '선택한 부품이 이 시야에 보이지 않습니다. ‘이 부품만 보기’를 누르면 가운데에서 볼 수 있습니다.';
  if(hint.textContent!==guidance) hint.textContent=guidance;
  labels=[];
  const indices=[...anchors.keys()].sort((a,b)=>Number(b===numberOf.get(current))-Number(a===numberOf.get(current)));
  for(const index of indices){
    const anchor=anchors.get(index);
    const selected=index===numberOf.get(current);
    for(const [dx,dy] of [[0,-31],[0,30],[-30,-22],[30,22],[-46,0],[46,0],[0,-60],[0,60]]){
      const x=Math.max(16,Math.min(width-16,anchor.x+dx));
      const y=Math.max(22,Math.min(height-17,anchor.y+dy));
      if(labels.some(p=>Math.hypot(p.x-x,p.y-y)<30))continue;
      ctx.strokeStyle='#afc9c4';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(anchor.x,anchor.y);ctx.lineTo(x,y);ctx.stroke();
      ctx.beginPath();ctx.arc(x,y,13,0,2*Math.PI);ctx.fillStyle=selected?'#cbecac':'#163038';ctx.fill();ctx.stroke();
      ctx.fillStyle=selected?'#142b21':'#fff';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(index),x,y);
      labels.push({x,y,id:parts[index-1][0]});break;
    }
  }
}

function draw(){
  if(!width||!height)return;
  frameCamera();
  const sample=Math.max(1,1.35/(devicePixelRatio||1));surface.begin(width*sample,height*sample);surface.scale*=sample;
  for(const object of objects){
    if(!visible(object))continue;
    let geometry=object;
    if(boreView&&((object.id==='guide'&&object.name!=='guide_support')||
       (object.id==='counter'&&!object.name.includes('support')))){
      object.section??=shapes.section(object,0);
      geometry=object.section;
    }
    const vertices=geometry.vertices.map(p=>project(transformed(p,object)));
    const id=partOwner(object),owner=numberOf.get(id);
    for(let f=0;f<geometry.faces.length;f++){
      const points=geometry.faces[f].map(i=>vertices[i]);
      const marked=object.marks&&geometry.faces[f].every(i=>object.marks[i]);
      const color=faceColor(points,f>=geometry.capStart?0xe0a477:marked?0xffe4ad:object.rgb,id===current);
      for(let k=1;k+1<points.length;k++)surface.triangle(points[0],points[k],points[k+1],color,owner);
    }
  }
  shapes.backdrop(ctx,width,height,v=>project(v),mode==='overview'&&!isolated?-.06:center[1]-1.55);
  surface.blit(ctx,width,height);
  if(!isolated)drawFlowMarkers();
  drawLabels();
}
function select(id){current=id;byId('part-picker').value=id;const p=parts.find(p=>p[0]===id),i=parts.indexOf(p);byId('name').textContent=`${i+1}. ${p[1]}`;byId('description').textContent=p[2];byId('look').textContent=p[3];byId('uncertain').textContent=p[4];byId('source').textContent='근거: '+p[5];byId('evidence').textContent=id==='base'?'외형 미확인 · 도식화':'기능 근거 있음 · 형상 단순화';dirty=true;}
function isolate(enabled){
  isolated=enabled;if(enabled)showDetail('');
  byId('isolate').setAttribute('aria-pressed',String(enabled));
  byId('isolate').textContent=enabled?'함께 보기':'이 부품만 보기';
  zoom=1;dirty=true;
}
function choosePart(id){
  pauseStory();stopHead();
  if(mode==='process'&&outsideFocus.includes(id))setMode('overview');
  select(id);
  practice?.onPartPicked?.(id);
}
for(const [i,part] of parts.entries()){
  byId('part-picker').add(new Option((i+1)+'. '+part[1],part[0]));
}
byId('part-picker').onchange=e=>choosePart(e.target.value);
byId('isolate').onclick=()=>{pauseStory();isolate(!isolated);};
byId('numbers').onchange=()=>dirty=true;
function setMode(m){showDetail('');isolate(false);mode=m;zoom=1;byId('overview').setAttribute('aria-pressed',String(m==='overview'));byId('process').setAttribute('aria-pressed',String(m==='process'));if(m==='process'&&outsideFocus.includes(current))select('head');dirty=true;}
byId('overview').onclick=()=>setMode('overview');function focusProcess(){
  setMode('process');
  if(study){yaw=.57;pitch=.32;}
  if(turning){yaw=-.35*mirror;pitch=.24;}
}
for(const b of document.querySelectorAll('[data-detail]'))b.onclick=()=>{
  const key=b.dataset.detail,wasActive=detail===key;
  focusProcess();if(wasActive)return;
  showDetail(key);yaw=(key==='cut'?-.54:.64)*mirror;pitch=.28;
  select(key==='cut'?'head':study?'carrier':'counter');
};
function setBore(enabled){
  boreView=enabled;document.querySelector('[data-bore]').setAttribute('aria-pressed',String(enabled));
  document.querySelector('.bore-note').hidden=!enabled;dirty=true;
}
document.querySelector('[data-bore]').onclick=()=>{
  if(!boreView&&!detail&&!isolated)document.querySelector('[data-detail="pickup"]').click();
  setBore(!boreView);
};
byId('process').onclick=focusProcess;byId('reset').onclick=()=>{setBore(false);setMode('overview');yaw=-.55*mirror;pitch=.4;zoom=1;spread=0;byId('explode').value='0';dirty=true;};byId('front').onclick=()=>{yaw=0;pitch=0;dirty=true;};byId('top').onclick=()=>{yaw=0;pitch=1.45;dirty=true;};byId('left').onclick=()=>{yaw-=.2;dirty=true;};byId('right').onclick=()=>{yaw+=.2;dirty=true;};function zoomBy(n){zoom=Math.max(.5,Math.min(3,zoom*n));dirty=true;}byId('zoomin').onclick=()=>zoomBy(1.15);byId('zoomout').onclick=()=>zoomBy(1/1.15);byId('explode').oninput=e=>{spread=Number(e.target.value);dirty=true;};byId('next').onclick=()=>choosePart(parts[(parts.findIndex(p=>p[0]===current)+1)%parts.length][0]);
byId('rotate').onclick=()=>{pauseStory();running=!running;byId('rotate').setAttribute('aria-pressed',String(running));byId('rotate').textContent=running?'회전 멈추기':'헤드 회전 보기';byId('motion-note').textContent=running?'헤드와 공구의 회전만 느리게 시연합니다. 실제 회전수·가공 주기·절단 동작을 재현하지 않습니다.':'회전 시연을 멈췄습니다. 소재의 축 방향 이송은 별도 운동입니다.';dirty=true;};
let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-drag.x)*.007;pitch=Math.max(-1.45,Math.min(1.45,pitch+(e.clientY-drag.y)*.007));drag.x=e.clientX;drag.y=e.clientY;dirty=true;});canvas.addEventListener('pointerup',e=>{if(drag&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<7){const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const hit=labels.find(p=>Math.hypot(x-p.x,y-p.y)<20);const owner=surface.owner[surface.indexAt(x,y)];if(hit)choosePart(hit.id);else if(owner)choosePart(parts[owner-1][0]);}drag=null;});canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('wheel',e=>{e.preventDefault();zoomBy(e.deltaY>0?.92:1.08);},{passive:false});canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')yaw-=.15;if(e.key==='ArrowRight')yaw+=.15;if(e.key==='ArrowUp')pitch=Math.min(1.45,pitch+.12);if(e.key==='ArrowDown')pitch=Math.max(-1.45,pitch-.12);if(['+','='].includes(e.key))zoomBy(1.1);if(e.key==='-')zoomBy(.9);dirty=true;});
byId('export').onclick=()=>{let offset=1,text='# '+modelKey.toUpperCase()+' functional study model. Arbitrary units. Not measured CAD.\n# Unexploded static geometry. Import with Y forward/up conversion as appropriate.\n';for(const o of objects){if(o.name==='following_stock'||(o.wireSurface&&!turning.visible(o,storyState)))continue;text+=`o ${o.id}_${o.name}\n`;for(const p of o.vertices){const v=o.profile||o.wireSurface?transformed(p,o,true):p;text+=`v ${v[0]} ${-v[2]} ${v[1]}\n`;}for(const f of o.faces)text+='f '+f.map(i=>i+offset).join(' ')+'\n';offset+=o.vertices.length;}const url=URL.createObjectURL(new Blob([text],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download=modelKey+'-functional-study.obj';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);byId('status').textContent='OBJ를 저장했습니다. Blender에서 Wavefront OBJ로 가져오세요. Z축이 위이며 단위는 임의입니다.';};
new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(Math.max(1.35,devicePixelRatio||1),2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);dirty=true;}).observe(canvas);
document.addEventListener('visibilitychange',()=>lastTime=0);
function pauseStory(){storyPlaying=false;byId('play').textContent='전체 흐름 재생';byId('play').setAttribute('aria-pressed','false');}
function stopHead(){running=false;byId('rotate').textContent='헤드 회전 보기';byId('rotate').setAttribute('aria-pressed','false');}
function seek(t){if(isolated)isolate(false);lastStage=-1;pauseStory();stopHead();spread=0;byId('explode').value='0';storyTime=t;updateStory();}
function updateStory(){
storyState=cycle.at(storyTime);spin=storyState.headAngle;const state=storyState,step=cycle.stages[state.stage];
byId('timeline').value=String(storyTime);byId('progress-text').textContent=`${Math.round(storyTime/stageCount*100)}%`;
if(lastStage!==state.stage){lastStage=state.stage;
byId('camera-step').textContent=`공정 ${state.stage+1} / ${stageCount} · ${step.name}`;
byId('previous-stage').disabled=state.stage===0;
byId('next-stage').disabled=state.stage===stageCount-1;
byId('stage-title').textContent=`${state.stage+1} / ${stageCount} · ${step.name}`;byId('stage-text').textContent=step.text;byId('stage-observe').textContent=step.observe;document.querySelectorAll('#stage-buttons button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===state.stage)));if(mode==='process' && outsideFocus.includes(step.part))setMode('overview');select(step.part);}
byId('feed-state').textContent=state.stage===2||state.ejection>0?'소재: 직선 이송':'소재: 회전 없음';
byId('grip-state').textContent=state.grip>.98?'콜릿: 파지':state.grip>.01?'콜릿: 개폐 중':'콜릿: 열림';
byId('part-state').textContent=state.separated?'부품: 소재에서 분리됨':'부품: 소재와 연결됨';
byId('motion-note').textContent='학습용 흐름 · 금색 소재는 축 둘레로 돌지 않습니다. 밝은 점은 경로를 따라가는 흐름 표식입니다.';
if(study) study.drawSection(state); else if(demo) drawBarSection(state); else drawSection(state);
dirty=true;
}
cycle.stages.forEach((step,i)=>{const b=document.createElement('button');b.textContent=`${i+1}. ${step.name}`;b.onclick=()=>seek(i+.001);byId('stage-buttons').append(b);});
byId('play').onclick=()=>{if(storyPlaying){pauseStory();return;}if(isolated)isolate(false);if(mode==='process'&&storyTime<1)setMode('overview');lastStage=-1;stopHead();spread=0;byId('explode').value='0';if(storyTime>=stageCount)storyTime=0;storyPlaying=true;byId('play').textContent='흐름 일시정지';byId('play').setAttribute('aria-pressed','true');};
byId('previous-stage').onclick=()=>seek(Math.max(0,storyState.stage-1)+.001);
byId('next-stage').onclick=()=>seek(Math.min(stageCount-1,storyState.stage+1)+.001);
byId('restart').onclick=()=>seek(0);
byId('timeline').oninput=e=>seek(Number(e.target.value));
byId('speed').onchange=e=>storySpeed=Number(e.target.value);
const oldExplode=byId('explode').oninput;byId('explode').oninput=e=>{pauseStory();oldExplode(e);};
function drawSection(s){
const x=242+s.shift*80,y=130+s.drop*80,len=s.advance*116,r=s.radius*100;
const noseGap=22-s.grip*12;const tipY=130-s.tool*100;
const neck=s.neck*100;const chip=s.cutting?Array.from({length:7},(_,i)=>{const a=(s.u*3+i*.17)%1;return `<rect x="${252+60*a}" y="${145+60*a}" width="5" height="3" fill="#b9cbcd" transform="rotate(${i*30} ${252+60*a} ${145+60*a})"/>`;}).join(''):'';
byId('cut-scene').innerHTML=`
<line x1="24" y1="130" x2="680" y2="130" stroke="#5a737e" stroke-dasharray="6 5"/>
<rect x="30" y="117" width="207" height="26" fill="#d9b56a"/>
<rect x="145" y="96" width="62" height="19" fill="#91a9ae"/><rect x="145" y="145" width="62" height="19" fill="#91a9ae"/>
${neck>.05&&s.stage>=2?`<rect x="237" y="${130-neck}" width="7" height="${neck*2}" fill="#d9b56a"/>`:''}
${len>0?`<rect x="${x}" y="${y-r}" width="${len}" height="${r*2}" rx="2" fill="#e4c47f" stroke="#ffdf98"/>`:''}
${s.ejection>0?`<rect x="237" y="117" width="${5+s.shift*80}" height="26" fill="#be9a52"/>`:''}
<rect x="350" y="78" width="123" height="27" rx="5" fill="#4f7b68"/>
<rect x="350" y="155" width="123" height="27" rx="5" fill="#4f7b68"/>
<rect x="350" y="${130-noseGap-15}" width="22" height="15" fill="${s.grip>.98?'#c7e8a0':'#88bca7'}"/>
<rect x="350" y="${130+noseGap}" width="22" height="15" fill="${s.grip>.98?'#c7e8a0':'#88bca7'}"/>
<path d="M 231 ${tipY-28} H 253 V ${tipY-8} L 242 ${tipY} L 231 ${tipY-8} Z" fill="#ed9977"/>
<path d="M 231 180 H 253 V 166 L 242 158 L 231 166 Z" fill="#ed9977" opacity=".5"/>
<path d="M 495 190 V 214 H 671 V 190" fill="#334d58" stroke="#a6b9bc" stroke-width="4"/>
${chip}<text x="30" y="35" class="legend-name">소재</text>
<text x="145" y="66" class="legend-name">가이드</text><text x="220" y="35" class="legend-name">공구</text><text x="355" y="50" class="legend-name">카운터 콜릿</text><text x="540" y="240" class="legend-name">부품 받이</text>
<text x="30" y="236" class="legend-name">${s.separated?'절단 완료 → 다음 소재가 밀어냄':'소재는 회전하지 않음 →'}</text>`;
// All inserted values are local deterministic numbers and fixed Korean strings.

}
// Axial section of the same demo state: bar outline, the two tool tips and the collet segments.
function drawBarSection(s){
const g=bar.geo,X=x=>30+(x+.6)*155,R=170,Y=r=>130-r*R,f=n=>n.toFixed(1);
const {pin,stock}=bar.rings();
const outline=(mus,onPin)=>{
  const top=mus.map(mu=>[X(Math.max(-1,bar.place(mu,s,onPin))),bar.radius(mu,s),onPin?s.drop*R:0]);
  return top.map(([x,r,d])=>f(x)+','+f(130-r*R+d)).concat(top.reverse().map(([x,r,d])=>f(x)+','+f(130+r*R+d))).join(' ');
};
const removed=[];
if(s.turn){for(const mu of pin){const r=bar.radius(mu,s);if(r<g.r0-1e-4)removed.push([X(bar.place(mu,s,true)),r]);}}
const ghost=removed.length?`<path d="M${f(removed[0][0])} ${f(Y(g.r0))}H${f(removed.at(-1)[0])}M${f(removed[0][0])} ${f(260-Y(g.r0))}H${f(removed.at(-1)[0])}" stroke="#ffcf8a" stroke-dasharray="4 3"/>`:'';
const tool=(outline,sign,tip,color)=>'<polygon fill="'+color+'" points="'+outline.map(([a,q])=>f(X(g.plane+a))+','+f(130-sign*(tip+q)*R)).join(' ')+'"/>';
const open=(1-s.grip)*g.jawOpen*R,jx=X(g.jawMouth),jw=g.jawLength*155;
const jaw=sign=>`<rect x="${f(jx)}" y="${f(sign>0?Y(g.r0)-open-34:130+g.r0*R+open)}" width="${f(jw)}" height="34" fill="${s.grip>.98?'#9ee0b4':'#88bca7'}"/>`;
byId('cut-scene').innerHTML=`
<line x1="24" y1="130" x2="696" y2="130" stroke="#5a737e" stroke-dasharray="6 5"/>
<rect x="${f(X(-1.15))}" y="${f(Y(.3))}" width="${f(.7*155)}" height="${f((.3-.17)*R)}" fill="#91a9ae"/><rect x="${f(X(-1.15))}" y="${f(130+.17*R)}" width="${f(.7*155)}" height="${f((.3-.17)*R)}" fill="#91a9ae"/>
<polygon points="${outline(stock,false)}" fill="#c99b4f"/><polygon points="${outline(pin,true)}" fill="#ecc57a" stroke="#ffdf98" stroke-width=".8"/>${ghost}
<rect x="${f(jx+jw)}" y="${f(Y(.5))}" width="${f(1.15*155)}" height="${f((.5-.15)*R)}" fill="#4f7b68"/><rect x="${f(jx+jw)}" y="${f(130+.15*R)}" width="${f(1.15*155)}" height="${f((.5-.15)*R)}" fill="#4f7b68"/>
${jaw(1)}${jaw(-1)}
${tool(g.turningTool,1,s.turnTip,'#ed9977')}${tool(g.partingBlade,-1,s.partTip,'#a99cf0')}
<path d="M 495 236 V 252 H 671 V 236" fill="none" stroke="#a6b9bc" stroke-width="4"/>
<text x="30" y="35" class="legend-name">소재</text><text x="${f(X(-1.1))}" y="66" class="legend-name">가이드</text>
<text x="${f(X(g.plane)-40)}" y="28" class="legend-name">외경 바이트</text><text x="${f(X(g.plane)-30)}" y="250" class="legend-name">절단 날</text>
<text x="${f(jx)}" y="${f(Y(.5)-10)}" class="legend-name">카운터 콜릿</text><text x="560" y="226" class="legend-name">부품 받이</text>
<text x="30" y="236" class="legend-name">${s.separated?'절단 완료 · 핀은 콜릿 쪽':'소재는 회전하지 않음 →'}</text>`;
// All inserted values are local deterministic numbers and fixed Korean strings.
}
function drawFlowMarkers(){
if(!turning&&(storyState.stage<=2||storyState.ejection>0)){const travel=storyState.stage<2?storyTime*1.7:storyState.feedTravel;for(let i=0;i<8;i++){const x=-7.8+((i*1.08+travel)%8.6),p=project([x,4,.15]);if(surface.depth[surface.indexAt(p[0],p[1])]>p[2]+.03)continue;ctx.beginPath();ctx.arc(p[0],p[1],3.2,0,Math.PI*2);ctx.fillStyle='#fff0bd';ctx.fill();}}
if(storyState.cutting){for(let i=0;i<6;i++){const a=(storyState.u*2+i*.16)%1,p=project([1.4+a*.6,3.8-a*.6,.35+a*.8]);if(surface.depth[surface.indexAt(p[0],p[1])]>p[2]+.03)continue;ctx.fillStyle='#d8e3dc';ctx.fillRect(p[0],p[1],4,2);}}
}
if(byId('cam-angle')) byId('cam-angle').oninput=e=>{const deg=Number(e.target.value),a=deg*Math.PI/180,cy=120-18*Math.cos(a);byId('cam-disc').setAttribute('cx',String(90+18*Math.sin(a)));byId('cam-disc').setAttribute('cy',String(cy));byId('cam-follower').setAttribute('transform',`translate(0 ${cy-40-65})`);byId('cam-value').textContent=`${deg}°`;};
byId('cam-angle')?.dispatchEvent(new Event('input'));
let studio;
function tick(t){const dt=lastTime?Math.min((t-lastTime)/1000,.1):0;lastTime=t;
if(storyPlaying&&!document.hidden){const end=studio?.endTime??stageCount;storyTime=Math.min(end,storyTime+dt*storySpeed/5);updateStory();if(storyTime>=end){if(!studio?.endTime&&byId('repeat').checked){storyTime=0;updateStory();}else pauseStory();}}
if(running&&!document.hidden){spin+=dt*.7;dirty=true;}if(dirty){draw();dirty=false;}studio?.frame(storyState,spin,dt,storyPlaying);frame=requestAnimationFrame(tick);}
byId('timeline').max=String(stageCount);
if(practice){
  focusProcess();
  practice.startPractice({
    render(pose){storyState=pose;spin=pose.headAngle;dirty=true;},
    selectPart(id){if(isolated)isolate(false);select(id);},
  });
}else if(study){
  const initial=study.initUI(()=>storyState.stage,()=>{focusProcess();seek(4);byId('play').click();});
  storyTime=initial;
}
if(!practice){select(current);updateStory();}
if(fieldInlet){
  byId('intro').textContent='현장 사진에서 보이는 선재 입구를 확대한 모형입니다. 전체 배치에서 입구 다음에 이어지는 이송·가공부는 기존 학습 모형으로 표시합니다.';
  byId('inlet-link').textContent='D2 공통 구조 보기 →';
  byId('inlet-link').href='index.html';
  seek(1);
  isolate(true);
  yaw=-.12*mirror; pitch=.61;
}
const studioLink=byId('studio-link');
if(studioLink){
  const url=new URL(location.href);
  if(study){url.searchParams.delete('mode');url.searchParams.delete('step');url.searchParams.delete('pin');}
  url.searchParams.set('view','studio');studioLink.href=url.href;
  if(new URLSearchParams(location.search).get('view')==='studio'&&!(study&&practice)){
    const loadStudio=study?import('../d5/drill-studio.js'):import('./studio.js');
    loadStudio.then(async module=>{
      studio=await module.mountStudio({objects,cycle,turning,study,transformed,mirror,seek,play:()=>byId('play').click()});
    }).catch(()=>{
      studioLink.textContent='3D 다중 화면을 열 수 없어 기본 탐색기를 표시합니다.';
      if(study){studioLink.href='#cut-title';seek(5.61);}
    });
  }
}
frame=requestAnimationFrame(tick);window.addEventListener('pagehide',()=>cancelAnimationFrame(frame));
window.addEventListener('pageshow',event=>{if(event.persisted){lastTime=0;dirty=true;frame=requestAnimationFrame(tick);}});
})();
