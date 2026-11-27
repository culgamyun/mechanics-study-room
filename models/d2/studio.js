import * as T from '../vendor/three-r180/three.module.min.js';
import {studioLight, surfaceGeometry} from '../studio-mesh.js';

// One scene, three cameras. Layers decide what each window shows; every window reads the same state.
const LAYER={profile:1,close:2,machine:3};
const cutawayIds=new Set(['head','tools','guide','counter','groove','parting']);
const profileCollet=/^(counter_collet_outer|collet_body_collar|collet_jaw_\d)$/;
const DRAWN=new T.Color(0xb3863f),MACHINED=new T.Color(0xf7d58c),WIRE_MARK=new T.Color(0xd1aa6b);
const palette={paint:0x7f8b7b,dark:0x262e31,steel:0xc5ced0,iron:0x6f7d80,turn:0xff8a3d,part:0xb2a2ff,jaw:0x86cfa0};

function signedVolume({vertices,faces}){
  let v=0;
  for(const f of faces)for(let k=1;k<f.length-1;k++){
    const a=vertices[f[0]],b=vertices[f[k]],c=vertices[f[k+1]];
    v+=a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);
  }
  return v;
}
function roleOf(part){
  const n=part.name;
  if(n==='turning_tool'||n==='rotating_groove_bit')return 'turn';
  if(n==='parting_blade'||n==='rotating_parting_bit')return 'part';
  if(n.startsWith('collet_jaw_'))return 'jaw';
  if(n==='work_tray')return 'iron';
  if(/collection|tray/.test(n))return 'steel';
  if(part.id==='stock'||part.id==='product'||/winding|inlet_wire/.test(n))return 'brass';
  if(/^(lower_pad|lid_pad)$/.test(n))return 'pad';
  if(['#29434e','#354d58'].includes(part.color))return 'dark';
  if(['#4b6875','#88bca7'].includes(part.color))return 'paint';
  if(part.color==='#688491')return 'iron';
  return 'steel';
}
// Screen-space hatching marks faces that exist only because the view cuts the part open.
function hatched(color){
  const m=new T.MeshBasicMaterial({color,side:T.BackSide});
  m.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );',
      'float hatch=step(.5,fract((gl_FragCoord.x+gl_FragCoord.y)/7.));vec4 diffuseColor=vec4(mix(diffuse*.62,diffuse,hatch),opacity);');
  };
  m.customProgramCacheKey=()=>'d2-hatch';
  return m;
}
function material(part,role,clip,cut){
  const base={side:clip?T.FrontSide:T.DoubleSide,clippingPlanes:clip?[cut]:null,
    flatShading:/housing|cabinet|support|tray|holder|block|insert|bit|panel|handle|foot|bed|wall|mount|tool|blade/.test(part.name)};
  switch(role){
    case 'brass':return new T.MeshStandardMaterial({...base,color:part.profile||part.wireSurface?0xffffff:DRAWN,
      vertexColors:!!(part.profile||part.wireSurface),metalness:.78,roughness:.3,envMapIntensity:.9});
    case 'turn':return new T.MeshStandardMaterial({...base,color:palette.turn,emissive:0x8a2c00,emissiveIntensity:.75,metalness:.25,roughness:.42});
    case 'part':return new T.MeshStandardMaterial({...base,color:palette.part,emissive:0x34227e,emissiveIntensity:.8,metalness:.25,roughness:.42});
    case 'jaw':return new T.MeshStandardMaterial({...base,color:palette.jaw,emissive:0x0c4a24,emissiveIntensity:0,metalness:.55,roughness:.34,envMapIntensity:.6});
    case 'pad':return new T.MeshStandardMaterial({...base,color:part.rgb,metalness:0,roughness:1});
    case 'paint':return new T.MeshStandardMaterial({...base,color:palette.paint,metalness:.12,roughness:.74,envMapIntensity:.35});
    case 'dark':return new T.MeshStandardMaterial({...base,color:palette.dark,metalness:.35,roughness:.6,envMapIntensity:.35});
    case 'iron':return new T.MeshStandardMaterial({...base,color:palette.iron,metalness:.7,roughness:.45,envMapIntensity:.55});
    default:return new T.MeshStandardMaterial({...base,color:palette.steel,metalness:.88,roughness:.3,envMapIntensity:.6});
  }
}
const muted={turn:0x6f5446,part:0x575269};
const capColor={turn:0xffb27a,part:0xd4caff,jaw:0x9ef0bb,paint:0xb7c2b2,dark:0x6c787c,iron:0x9daeb2,steel:0xdfe7e9};

// Preserve the same vertices and motion used by the practice instruments.
// Edge indices share the live vertex buffer with the solid, including during a cut.
function component(part,cut,front){
  const clip=cutawayIds.has(part.id)&&!/support/.test(part.name);
  const flip=clip&&signedVolume(part)<0;
  const g=surfaceGeometry(part,flip),points=g.getAttribute('position');
  const role=roleOf(part);
  let colors=null;
  if(part.profile){colors=new T.Float32BufferAttribute(new Float32Array(part.vertices.length*3),3);g.setAttribute('color',colors);}
  if(part.wireSurface){
    const tints=part.marks.flatMap(mark=>{const c=mark?WIRE_MARK:DRAWN;return [c.r,c.g,c.b];});
    g.setAttribute('color',new T.Float32BufferAttribute(tints,3));
  }
  const solid=new T.Mesh(g,material(part,role,clip,cut));
  solid.frustumCulled=false;
  const outlines=new T.EdgesGeometry(g,22);
  const key=(x,y,z)=>[x,y,z].map(n=>Math.round(n*100000)).join(',');
  const indices=new Map(part.vertices.map(([x,y,z],i)=>[key(x,y,z),i]));
  const edge=outlines.getAttribute('position'),ends=[];
  for(let i=0;i<edge.count;i+=2){
    const a=indices.get(key(edge.getX(i),edge.getY(i),edge.getZ(i)));
    const b=indices.get(key(edge.getX(i+1),edge.getY(i+1),edge.getZ(i+1)));
    if(a!==undefined&&b!==undefined)ends.push(a,b);
  }
  outlines.dispose();
  const lines=new T.BufferGeometry();lines.setAttribute('position',points);lines.setIndex(ends);
  const wire=new T.LineSegments(lines,new T.LineBasicMaterial({color:role==='brass'?0xf6b55e:0xaed5dd}));
  wire.frustumCulled=false;wire.visible=false;
  const group=new T.Group();group.add(solid,wire);
  let cap=null;
  if(clip){
    const m=hatched(capColor[role]??capColor.steel);m.clippingPlanes=[cut];
    cap=new T.Mesh(g,m);cap.frustumCulled=false;cap.layers.set(LAYER.close);group.add(cap);
  }
  let ghost=null;
  if(clip&&(['tools','groove','parting'].includes(part.id)||/tool_holder|_holder|clamp_bridge/.test(part.name))){
    // The half in front of the cut stays as a faint phantom, so a tool passing the near side never vanishes.
    ghost=new T.Mesh(g,new T.MeshBasicMaterial({color:role==='turn'?palette.turn:role==='part'?palette.part:0x9fb0b4,
      transparent:true,opacity:role==='turn'||role==='part'?.38:.14,depthWrite:false,side:T.DoubleSide,clippingPlanes:[front]}));
    ghost.frustumCulled=false;ghost.layers.set(LAYER.close);ghost.renderOrder=3;group.add(ghost);
  }
  if(profileCollet.test(part.name)||part.profile||part.wireSurface){
    solid.layers.enable(LAYER.profile);cap?.layers.enable(LAYER.profile);
  }
  if(part.name==='non_rotating_wire')solid.layers.enable(LAYER.profile);
  return {part,g,points,colors,solid,wire,cap,ghost,group,role};
}
// Triangulation weights depend on the spacing of axial rings. A straight cylinder must
// reflect light uniformly across both shells, even where the future kerf has extra rings.
function smoothWireNormals({part,g,points}){
  const n=part.radialSegments,normals=g.getAttribute('normal');
  for(let row=0;row<points.count;row+=n){
    const r=points.getZ(row+n/4),x=points.getX(row);
    if(r<1e-6)continue;
    const slopeAt=other=>other>=0&&other<points.count&&Math.abs(points.getX(other)-x)>1e-6&&Math.abs(points.getZ(other+n/4)-r)>1e-6;
    if(slopeAt(row-n)||slopeAt(row+n))continue;
    for(let i=row;i<row+n;i++){
      const v=part.vertices[i],unit=Math.hypot(v[1]-4,v[2]);
      normals.setXYZ(i,0,(v[1]-4)/unit,v[2]/unit);
    }
  }
  normals.needsUpdate=true;
}
// A flat tool silhouette at its tip radius in the axial plane. The real tool turns around the wire.
function silhouette(outline,color){
  const n=outline.length,v=[],idx=[];
  for(const z of [-.03,.03])for(const [a,q] of outline)v.push(a,q,z);
  for(let k=1;k<n-1;k++)idx.push(0,k+1,k,n,n+k,n+k+1);
  for(let i=0;i<n;i++){const k=(i+1)%n;idx.push(i,k,n+k,i,n+k,n+i);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();
  const mesh=new T.Mesh(g,new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.35,metalness:.2,roughness:.5,side:T.DoubleSide,flatShading:true}));
  mesh.layers.set(LAYER.profile);mesh.frustumCulled=false;return mesh;
}

function scope(title,label,id){
  return '<div class="d2s-scope '+id+'"><div class="d2s-label"><strong>'+title+'</strong><span>'+label+'</span></div><div class="d2s-port" data-port="'+id+'"></div></div>';
}
function setupControls(root,api){
  const {cycle,turning,seek,play}=api;
  const controls=root.querySelector('.d2s-transport');
  if(turning){
    controls.append(document.querySelector('.lab-drive'));
    return;
  }
  controls.innerHTML='<button class="d2s-play" type="button">공정 재생</button><select aria-label="관찰할 D2 공정"></select><input aria-label="다중 시점 진행 위치" type="range" min="0" max="7" step=".01" value="0"><output></output>';
  controls.querySelector('button').onclick=play;
  const list=controls.querySelector('select');
  cycle.stages.forEach(({name},i)=>list.add(new Option(name,String(i))));
  list.onchange=()=>seek(Number(list.value)+.001);
  controls.querySelector('input').oninput=e=>seek(Number(e.target.value));
}

// Close-view shots for the automatic demo: [time, target, view direction, width, height].
// Wide on the path, tighter just before contact, still while a tool or collet touches the work.
const shots=[
  [0,[-6.7,3.75,0],[.42,.5,1],4.9,3.6],[.8,[-6.2,3.9,0],[.32,.55,1],3.9,2.7],
  [1.12,[-4.78,3.95,0],[.2,.95,1],2.95,1.3],[1.88,[-4.78,3.95,0],[.2,.95,1],2.95,1.3],
  [2.12,[-1.15,4,0],[.3,.42,1],5.4,2.2],[2.8,[.25,4,0],[.18,.34,1],3.7,1.7],
  [3.02,[1.45,4,0],[.12,.3,1],2.7,1.5],[3.12,[1.78,4,0],[.1,.27,1],2.35,1.25],[3.9,[1.78,4,0],[.1,.27,1],2.35,1.25],
  [4.1,[2.02,4,0],[.08,.25,1],2.3,1.25],[5.02,[2.02,4,0],[.08,.25,1],2.3,1.25],
  [5.15,[1.92,4,0],[.08,.25,1],2.05,1.15],[5.97,[1.92,4,0],[.08,.25,1],2.05,1.15],
];
const smooth=n=>n*n*(3-2*n);
function demoShot(state,out){
  const t=state.t;
  if(state.stage===6){
    const k=smooth(Math.min(1,state.u/.2)),last=shots.at(-1);
    const follow=[2.08+state.shift,4-state.drop*.9,0];
    for(let i=0;i<3;i++)out.target[i]=last[1][i]+(follow[i]-last[1][i])*k;
    out.dir.set(...last[2]);out.w=last[3]+(2.6-last[3])*k;out.h=last[4]+(1.6-last[4])*k;return out;
  }
  let i=0;while(i<shots.length-2&&t>=shots[i+1][0])i++;
  const a=shots[i],b=shots[i+1],k=smooth(Math.min(1,Math.max(0,(t-a[0])/(b[0]-a[0]))));
  for(let j=0;j<3;j++)out.target[j]=a[1][j]+(b[1][j]-a[1][j])*k;
  out.dir.set(...a[2].map((v,j)=>v+(b[2][j]-v)*k));out.w=a[3]+(b[3]-a[3])*k;out.h=a[4]+(b[4]-a[4])*k;
  return out;
}

export function mountStudio(api){
  const {objects,cycle,turning,transformed}=api,M=api.mirror??1;
  const demo=!turning&&typeof cycle.radius==='function';
  const geo=cycle.geo;
  const canvas=document.createElement('canvas');
  const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.setScissorTest(true);renderer.autoClear=false;renderer.localClippingEnabled=true;
  const root=document.createElement('section');root.className='d2-studio';root.setAttribute('aria-label','D2 다중 시점 시뮬레이션');
  const query=new URLSearchParams(location.search);
  const pin=query.get('pin')==='slender'?'&amp;pin=slender':'';
  root.innerHTML='<div class="d2s-title"><div><span class="d2s-meta">ESCOMATIC / D2</span><h2>가공 관찰실</h2></div>'+
    '<nav aria-label="관찰실 모드"><a href="?view=studio">공정 시연</a><a href="?view=studio&amp;mode=practice'+pin+'">캠식 실습</a><a href="?view=studio&amp;mode=practice&amp;variant=cnc'+pin+'">CNC 실습</a></nav></div>'+
    '<div class="d2s-grid">'+scope('전체 설비','금색 틀 = 확대 창 범위','machine')+scope('공정 확대','앞쪽 절반을 잘라 봄','close')+
    scope('핀 단면','깎인 곳 · 남은 연결부','profile')+'<div class="d2s-chart"><div class="d2s-label"><strong>동작 상태</strong><span>모델 내 상대량</span></div><div class="d2s-readings"></div></div></div>'+
    '<div class="d2s-toolbar"><div class="d2s-transport"></div><div class="d2s-camera"><button data-wire aria-pressed="false">윤곽선</button><button data-orbit aria-pressed="false">자동 회전</button><button data-reset>시점 복원</button></div></div>'+
    '<p class="d2s-note"><span data-phase></span> · 기능 학습용 모형 · 현장 사진처럼 조작반 쪽에서 본 방향(선재 오른쪽 → 왼쪽) · 빗금 면은 잘라 본 면, 반투명 날은 잘라 낸 앞쪽 절반을 지나는 날이고, 아래 창의 날은 회전하는 날이 지나는 위치를 단면에 겹친 것입니다.</p>';
  root.querySelectorAll('nav a')[turning?(turning.cnc?2:1):0].setAttribute('aria-current','page');
  const grid=root.querySelector('.d2s-grid');canvas.setAttribute('aria-hidden','true');grid.prepend(canvas);
  document.querySelector('main').prepend(root);
  document.body.classList.add('studio-open');
  setupControls(root,api);
  const readings=root.querySelector('.d2s-readings');
  const bars=['소재 이송','콜릿 닫힘','절단 진행'].map(name=>{
    const row=document.createElement('div');row.innerHTML='<span>'+name+'</span><i><b></b></i><output>0%</output>';readings.append(row);return row;
  });
  // Plot the same normalized collet closure used to draw the jaws.
  let cursor;
  if(!turning){
    const path=Array.from({length:141},(_,i)=>{
      const grip=cycle.at(i/20).grip;
      return (i?'L':'M')+(i*2)+' '+(36-grip*26);
    }).join(' ');
    readings.insertAdjacentHTML('afterend','<svg class="d2s-plot" viewBox="0 0 280 42" preserveAspectRatio="none" role="img" aria-label="전체 공정의 콜릿 닫힘 곡선과 현재 위치"><path d="M0 36H280" stroke="#546469"/><path d="'+path+'" fill="none" stroke="#95d0c6" stroke-width="2"/><path data-cursor d="M0 3V39" stroke="#efbc76" stroke-width="2"/></svg>');
    cursor=root.querySelector('[data-cursor]');
  }
  const scene=new T.Scene();scene.environment=studioLight();
  const cut=new T.Plane(new T.Vector3(0,0,-1),1e4),front=new T.Plane(new T.Vector3(0,0,1),0);
  const light=new T.DirectionalLight(0xfff6ea,2.2);light.position.set(-5,12,10);
  const rim=new T.DirectionalLight(0xbfdcff,.7);rim.position.set(6,5,-8);
  const hemi=new T.HemisphereLight(0xe5f3ff,0x3d4a4e,1.25);
  for(const l of [light,rim,hemi]){l.layers.enableAll();scene.add(l);}
  const world=new T.Group();world.scale.x=M;scene.add(world);
  const parts=objects.map(part=>component(part,cut,front));
  for(const item of parts)world.add(item.group);
  // Lower window: tool silhouettes at their current tip radius.
  const profileTools=demo?[
    {mesh:silhouette(geo.turningTool,palette.turn),side:1,label:'외경 바이트',kind:'turn'},
    {mesh:silhouette(geo.partingBlade,palette.part),side:-1,label:'절단 날',kind:'part'},
  ]:[
    {mesh:silhouette([[-.5,.32],[.5,.32],[.5,0],[-.5,0]],palette.turn),side:1,kind:'turn'},
    {mesh:silhouette([[-.5,.32],[.5,.32],[.5,0],[-.5,0]],palette.part),side:-1,kind:'part'},
  ];
  for(const {mesh,side} of profileTools){if(side<0)mesh.rotation.x=Math.PI;world.add(mesh);}
  // Close window: the circle swept by the active tool tip.
  const tipRing=new T.Mesh(new T.TorusGeometry(.2,.007,8,72),new T.MeshBasicMaterial({color:palette.turn,transparent:true,opacity:.85,depthTest:false}));
  tipRing.rotation.y=Math.PI/2;tipRing.layers.set(LAYER.close);tipRing.renderOrder=5;tipRing.visible=false;world.add(tipRing);
  // Machine window: outline of the region shown in the close window.
  const frameGeometry=new T.BufferGeometry();
  frameGeometry.setAttribute('position',new T.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,-.5,0,.5,.5,0,.5,.5,0,-.5,.5,0,-.5,.5,0,-.5,-.5,0],3));
  const focusFrame=new T.LineSegments(frameGeometry,new T.LineBasicMaterial({color:0xf4c27a,depthTest:false,transparent:true,opacity:.95}));
  focusFrame.layers.set(LAYER.machine);focusFrame.renderOrder=6;scene.add(focusFrame);
  const focusDot=new T.Mesh(new T.SphereGeometry(.09,16,12),new T.MeshBasicMaterial({color:0xffd28f,depthTest:false,transparent:true,opacity:.9}));
  focusDot.layers.set(LAYER.machine);focusDot.renderOrder=6;scene.add(focusDot);

  const views=[...grid.querySelectorAll('[data-port]')].map(port=>({port,camera:new T.OrthographicCamera(-1,1,1,-1,.01,100)}));
  views[0].camera.layers.set(0);views[0].camera.layers.enable(LAYER.machine);
  views[1].camera.layers.set(0);views[1].camera.layers.enable(LAYER.close);
  views[2].camera.layers.set(LAYER.profile);
  const overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
  overlay.setAttribute('class','d2s-overlay');overlay.setAttribute('aria-hidden','true');views[2].port.append(overlay);
  const floor=new T.GridHelper(23,23,0x22363c,0x17262b);floor.position.set(-1,-.04,0);scene.add(floor);
  let redraw=true,wireframe=false,orbit=false,yaw=.67*M,pitch=.37,scale=1,lastState,lastSpin,lastPlaying;
  const refresh=()=>{redraw=true;};
  const ro=new ResizeObserver(refresh);ro.observe(grid);views.forEach(({port})=>ro.observe(port));
  const primary=views[0].port;
  primary.tabIndex=0;primary.setAttribute('role','group');primary.setAttribute('aria-label','설비 시야. 방향키로 회전, 더하기와 빼기로 확대·축소');
  let drag;
  primary.onpointerdown=e=>{primary.setPointerCapture(e.pointerId);drag=[e.clientX,e.clientY];};
  primary.onpointermove=e=>{
    if(!drag)return;
    yaw-=(e.clientX-drag[0])*.009;pitch=Math.max(-.12,Math.min(1.4,pitch+(e.clientY-drag[1])*.007));
    drag=[e.clientX,e.clientY];refresh();
  };
  primary.onlostpointercapture=()=>{drag=null;};
  primary.onkeydown=e=>{
    if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','+','=','-'].includes(e.key))return;
    e.preventDefault();
    if(e.key==='ArrowLeft'||e.key==='ArrowRight')yaw+=e.key==='ArrowLeft'?-.16:.16;
    else if(e.key.startsWith('Arrow'))pitch=Math.max(-.12,Math.min(1.4,pitch+(e.key==='ArrowUp'?.1:-.1)));
    else scale=Math.min(2,Math.max(.65,scale*(e.key==='-'?.9:1.1)));
    refresh();
  };
  const wireButton=root.querySelector('[data-wire]'),orbitButton=root.querySelector('[data-orbit]');
  wireButton.onclick=()=>{wireframe=!wireframe;wireButton.setAttribute('aria-pressed',String(wireframe));refresh();};
  orbitButton.onclick=()=>{orbit=!orbit;orbitButton.setAttribute('aria-pressed',String(orbit));};
  root.querySelector('[data-reset]').onclick=()=>{yaw=.67*M;pitch=.37;scale=1;orbit=false;orbitButton.setAttribute('aria-pressed','false');refresh();};
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();root.hidden=true;document.body.classList.remove('studio-open');
    const drive=root.querySelector('.lab-drive');if(drive)document.querySelector('.camera-dock').after(drive);
    document.getElementById('studio-link').textContent='3D 기본 탐색기에서 계속하세요.';
  });
  const eye=new T.Vector3(),target=new T.Vector3();
  const shot={target:[0,4,0],dir:new T.Vector3(),w:2,h:1};
  function closeShot(state){
    if(demo)return demoShot(state,shot);
    shot.target=[2.05,4,0];shot.dir.set(.08,.25,1);shot.w=2.9;shot.h=1.4;return shot;
  }
  // Keep the tool plane in the left quarter and the collet mouth inside the window.
  function profileCenter(state,width){
    if(demo)return [Math.max(2.9-width/2,Math.min(2.05,geo.plane+width*.25))+state.shift,4-state.drop];
    return [2.05,4];
  }
  function updateParts(state){
    for(const item of parts){
      const {part,group,points,g,colors,role}=item;
      group.visible=!turning||turning.visible(part,state);
      const dynamic=part.name.startsWith('rotating_')||['tools','product','stock','counter','parting','groove'].includes(part.id)||['feed_roller','roller_witness'].includes(part.name);
      if(!group.visible||!dynamic)continue;
      part.vertices.forEach((v,i)=>points.setXYZ(i,...transformed(v,part,true)));
      points.needsUpdate=true;g.computeVertexNormals();
      if(part.wireSurface)smoothWireNormals(item);
      if(colors){
        // Freshly cut faces read brighter than the drawn wire surface.
        part.vertices.forEach((v,i)=>{
          const unit=Math.hypot(v[1]-4,v[2]),c=unit<.5||cycle.radius(v[0],state)<geo.r0-1e-4?MACHINED:DRAWN;
          colors.setXYZ(i,c.r,c.g,c.b);
        });
        colors.needsUpdate=true;
      }
      if(role==='jaw')item.solid.material.emissiveIntensity=state.grip>.98?.9:0;
      if(role==='turn'||role==='part'){
        // Only the tool doing the current job keeps its full colour.
        const busy=demo?(role==='turn'?state.stage===3:state.stage===5):true;
        item.solid.material.color.setHex(busy?palette[role]:muted[role]);
        item.solid.material.emissiveIntensity=busy?.75:0;
        item.cap?.material.color.setHex(busy?capColor[role]:muted[role]);
        if(item.ghost)item.ghost.material.opacity=busy?.42:.12;
      }
    }
    // Lower-window tool silhouettes follow the same tip radii as the rotating tools.
    const list=demo?[{x:geo.plane,tip:state.turnTip,width:1,show:true},{x:geo.plane,tip:state.partTip,width:1,show:true}]
      :(turning.profileTools(state));
    profileTools.forEach((tool,i)=>{
      const spec=demo?list[i]:list.find(t=>t.kind===tool.kind);
      tool.mesh.visible=!!spec;
      if(!spec)return;
      tool.mesh.position.set(spec.x,4+tool.side*spec.tip,0);
      // A retracted tool stays visible but quiet; the one near the work is full strength.
      const near=spec.tip<geo.r0+.06;tool.mesh.material.transparent=!near;tool.mesh.material.opacity=near?1:.28;
      if(!demo)tool.mesh.scale.x=spec.width;
      tool.spec=spec;
    });
    // The swept circle appears while a tool is close to or inside the work.
    const active=demo?(state.stage===3?['turn',state.turnTip]:state.stage===5?['part',state.partTip]:null)
      :(state.cutting?(state.partingFeed>0?['part',.26-state.partingFeed]:['turn',.26-state.grooveFeed]):null);
    tipRing.visible=!!active&&active[1]<geo.r0+.09;
    if(tipRing.visible){
      const r=Math.max(.004,active[1]);
      tipRing.position.set(demo?geo.plane:(active[0]==='part'?1.285:1.72),4,0);
      tipRing.material.color.setHex(active[0]==='turn'?palette.turn:palette.part);
      if(Math.abs((tipRing.userData.r??-1)-r)>.001){tipRing.geometry.dispose();tipRing.geometry=new T.TorusGeometry(r,.007,8,72);tipRing.userData.r=r;}
    }
  }
  // Labels and the removed-material band for the lower window, from the same state and camera.
  let portWidth=0;
  function label(x,y,text,color,anchor='middle'){
    const w=text.length*12.5+12;
    let left=anchor==='start'?x:anchor==='end'?x-w:x-w/2;
    left=Math.max(4,Math.min(portWidth-w-4,left));
    return '<g><rect x="'+left.toFixed(1)+'" y="'+(y-11).toFixed(1)+'" width="'+w.toFixed(1)+'" height="20" rx="4" fill="rgba(8,16,19,.86)" stroke="'+color+'" stroke-opacity=".55"/>'+
      '<text x="'+(left+w/2).toFixed(1)+'" y="'+(y+4).toFixed(1)+'" fill="'+color+'" text-anchor="middle">'+text+'</text></g>';
  }
  function drawProfileOverlay(state,cam,w,h,cx,cy){
    const sx=x=>(x*M-cx-cam.left)/(cam.right-cam.left)*w, sy=y=>(cam.top-(y-cy))/(cam.top-cam.bottom)*h;
    // S: +1 when the wire runs left → right on screen, -1 when mirrored to match the site photos.
    const S=M,toStock=S>0?'end':'start',toPin=S>0?'start':'end';
    const f=n=>n.toFixed(1),out=[];
    portWidth=w;overlay.setAttribute('viewBox','0 0 '+f(w)+' '+f(h));overlay.setAttribute('width',f(w));overlay.setAttribute('height',f(h));
    if(turning){
      const {partingX,bladeWidth,start,end,radius,jawMouth,jawLength}=turning;
      const pinLeft=start+state.pinOffset, pinRight=end+state.pinOffset;
      const stockFace=start-bladeWidth+state.stockOffset;
      const mouth=jawMouth+state.jawOffset;
      const gripFrom=Math.max(mouth,pinLeft), gripTo=Math.min(mouth+jawLength,pinRight);
      const held=state.mount.counter!=='none' && state.grip>.98 && gripTo>gripFrom;
      const axis=sy(4), top=sy(4+radius), bottom=sy(4-radius);
      const inside=x=>x>=0&&x<=w;
      const px=sx(partingX);
      if(held){
        for(const y of [top,bottom])out.push('<line x1="'+sx(gripFrom)+'" x2="'+sx(gripTo)+'" y1="'+y+'" y2="'+y+'" stroke="#9ef0bb" stroke-width="3"/>');
        out.push(label(sx((gripFrom+gripTo)/2),17,'파지면','#9ef0bb'));
      }
      if(inside(px)&&state.advance===1&&state.mount.parting!=='none'&&!state.ejection){
        out.push('<path d="M'+px+' 27V'+(h-19)+'" fill="none" stroke="#d4caff" stroke-dasharray="3 4"/>');
        out.push(label(px,17,'절단 위치','#d4caff'));
        if(state.partingFeed>0)out.push(label(px,h-15,'절단 날','#d4caff'));
        if(state.neck>0&&state.neck<radius)
          out.push(label(px-S*10,axis-23,'남은 목','#ffe2a3',toStock));
        if(state.separated&&state.push===0){
          out.push('<path d="M'+sx(stockFace)+' '+(axis-5)+'H'+sx(pinLeft)+'" stroke="#9ef0bb" stroke-width="3"/>');
          out.push(label(px-S*10,axis-23,'분리된 틈','#9ef0bb',toStock));
        }
      }
      if(state.stage<=2||state.t===3&&!state.grooveFeed&&!state.shape.narrow&&!state.shape.wide){
        const x=sx(pinRight);
        if(inside(x)){
          out.push('<path d="M'+f(x)+' '+f(top-15)+'V'+f(top)+'" stroke="#ffe2a3" stroke-width="2"/>');
          out.push('<circle cx="'+f(x)+'" cy="'+f(top)+'" r="3" fill="#ffe2a3"/>');
          out.push(label(x,top-25,'선재 끝','#ffe2a3'));
        }
      }else{
        const mid=sx((pinLeft+pinRight)/2);
        if(inside(mid))out.push(label(mid,Math.min(h-17,sy(4-state.drop-radius)+26),state.ejection?'핀 배출':state.separated?'분리된 핀':'완성품 쪽','#ffe2a3'));
      }
      if(state.stage>2&&inside(sx(stockFace)))out.push(label(sx(stockFace)-S*9,bottom+26,'소재 쪽','#d9b46c',toStock));
      overlay.innerHTML=out.join('');
      overlay.removeAttribute('aria-hidden');overlay.setAttribute('role','img');
      overlay.setAttribute('aria-label',out.length?overlay.textContent:'핀 단면');
      return;
    }
    const {pin,stock}=cycle.rings(),r0=geo.r0,plane=geo.plane;
    // Bands between the original surface and the current surface: material the tools removed.
    for(const [mus,onPin] of [[stock,false],[pin,true]]){
      let run=[];
      const flush=()=>{
        if(run.length>1){
          const d=onPin?state.drop:0;
          for(const sign of [1,-1]){
            const outer=run.map(([x])=>f(sx(x))+','+f(sy(4+sign*r0-d))),inner=run.map(([x,r])=>f(sx(x))+','+f(sy(4+sign*r-d))).reverse();
            out.push('<polygon points="'+outer.concat(inner).join(' ')+'" fill="rgba(255,150,70,.30)"/>');
            out.push('<polyline points="'+outer.join(' ')+'" fill="none" stroke="#ffbf7a" stroke-width="1.3" stroke-dasharray="5 3"/>');
          }
        }
        run=[];
      };
      for(const mu of mus){
        const r=cycle.radius(mu,state),x=Math.max(-1,cycle.place(mu,state,onPin));
        if(r<r0-1e-4&&r>1e-4&&!(Math.abs(mu-cycle.cutMu)<=geo.halfBlade&&!state.turn))run.push([x,r]);else flush();
      }
      flush();
    }
    const px=sx(plane),axis=sy(4),top=sy(4+r0),bottom=sy(4-r0);
    const stage=state.stage;
    // Tool plane: tools only move radially here; the wire moves past it.
    if(stage<6){
      out.push('<line x1="'+f(px)+'" y1="4" x2="'+f(px)+'" y2="'+f(h-4)+'" stroke="#dfe9ea" stroke-opacity=".35" stroke-dasharray="3 4"/>');
      const clear=Math.abs(sx(plane+.2)-px);
      out.push(label(px-S*clear,13,stage===5&&!state.separated?'절단 위치':'날 평면','#dfe9ea',toStock));
    }
    const pinStart=cycle.place(cycle.cutMu+geo.halfBlade,state,true),pinEnd=cycle.place(cycle.frontMu,state,true);
    // Rows: tool names at the top and bottom edges, part names just below the bar.
    const low=Math.min(h-40,bottom+24),half=Math.abs(sx(plane+.2)-px);
    if(stage>=2){
      const text=stage===6?(state.ejection>0?(S>0?'다음 소재가 밂 →':'← 다음 소재가 밂'):'소재 쪽 · 남음'):stage===5?'소재 쪽 · 남음':'소재';
      out.push(label(px-S*(half+8),low,text,'#d9b46c',toStock));
    }
    if(stage>=3&&pinEnd>pinStart+.2){
      const mid=sx((Math.max(pinStart,plane)+pinEnd)/2);
      const text=stage===6?(state.ejection>0?'핀 배출':'콜릿이 풀림'):state.separated?'핀 · 콜릿에 남음':stage===5?'핀 쪽 · 분리될 부분':'완성품 쪽';
      out.push(label(mid,stage===6?sy(4-state.drop)+30:low,text,'#ffe2a3'));
    }
    if(stage===3&&state.turn){
      const run=pin.map(mu=>[cycle.place(mu,state,true),cycle.radius(mu,state)]).filter(([,r])=>r<r0-1e-3);
      if(run.length){const m=sx((run[0][0]+run.at(-1)[0])/2),edge=px+S*(half+56);out.push(label(S>0?Math.max(m,edge):Math.min(m,edge),top-24,'깎인 부분','#ffbf7a'));}
    }
    if(stage===2||stage===3&&state.u<.9)out.push(label(px-S*(half+8),top-24,S>0?'이송 →':'← 이송','#ffe2a3',toStock));
    if(stage===3)out.push(label(px+S*(half+6),13,'외경 바이트','#ffb27a',toPin));
    if(stage===5&&state.partTip<r0+.12){
      out.push(label(px+S*(half+6),h-14,'절단 날','#d4caff',toPin));
      if(!state.separated){
        out.push('<path d="M'+f(px-6)+' '+f(axis-16)+'l6 10 6-10" fill="none" stroke="#ffe2a3" stroke-width="1.6"/>');
        out.push(label(px-S*14,axis-28,'남은 목','#ffe2a3',toStock));
      }else{
        const gap=Math.abs(sx(plane+geo.halfBlade)-sx(plane-geo.halfBlade));
        out.push('<path d="M'+f(px-gap/2)+' '+f(axis-20)+'h'+f(gap)+'" stroke="#9ef0bb" stroke-width="2"/>');
        out.push(label(px-S*14,axis-32,'틈 = 날 두께','#9ef0bb',toStock));
      }
    }
    if(stage===4||stage===5||stage===6&&state.u<.15){
      const ja=sx(geo.jawMouth),jb=sx(geo.jawMouth+geo.jawLength),jx0=Math.min(ja,jb),jx1=Math.max(ja,jb),open=(1-state.grip)*geo.jawOpen;
      if(state.grip>.98){
        for(const yy of [top,bottom])out.push('<line x1="'+f(jx0)+'" y1="'+f(yy)+'" x2="'+f(jx1)+'" y2="'+f(yy)+'" stroke="#9ef0bb" stroke-width="3"/>');
        out.push(label((jx0+jx1)/2,Math.max(13,sy(4+r0+.36)-12),'파지면','#9ef0bb'));
      }else{
        const gx=(jx0+jx1)/2,y1=top,y2=sy(4+r0+open);
        out.push('<path d="M'+f(gx-5)+' '+f(y1)+'h10M'+f(gx)+' '+f(y1)+'V'+f(y2)+'M'+f(gx-5)+' '+f(y2)+'h10" stroke="#9ef0bb" stroke-width="1.6"/>');
        out.push(label(gx,Math.max(13,sy(4+r0+.36)-12),open>.01?'조각과 핀 사이 틈':'닿기 직전','#9ef0bb'));
      }
    }
    overlay.innerHTML=out.join('');
  }
  function frame(state,spin,dt,playing){
    if(root.hidden||document.hidden)return;
    if(orbit&&!drag){yaw+=dt*.29;redraw=true;}
    const changed=state!==lastState||spin!==lastSpin;
    if(!changed&&!redraw&&playing===lastPlaying)return;
    if(changed){
      updateParts(state);
      const feedShare=demo?Math.min(1,state.feed/cycle.fed):state.feedShare;
      const amounts=[feedShare,state.grip,1-Math.min(1,state.neck/.13)];
      bars.forEach((bar,i)=>{const value=Math.round(amounts[i]*100)+'%';bar.querySelector('b').style.width=value;bar.querySelector('output').value=value;});
      root.querySelector('[data-phase]').textContent=turning?document.getElementById('camera-step').textContent:cycle.stages[state.stage].name;
    }
    if(!turning){
      cursor.setAttribute('transform','translate('+state.t*40+' 0)');
      const transport=root.querySelector('.d2s-transport');transport.querySelector('select').value=String(state.stage);
      transport.querySelector('input').value=String(state.t);transport.querySelector('output').value=Math.round(state.t/7*100)+'%';
      transport.querySelector('button').textContent=playing?'일시정지':'공정 재생';
    }
    const bounds=grid.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    const w=grid.clientWidth,h=grid.clientHeight;
    if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
    renderer.setScissor(0,0,w,h);renderer.setClearColor(0,0);renderer.clear();
    const close=closeShot(state);
    for(let i=views.length-1;i>=0;i--){
      // Close and lower windows first: the machine window draws the close window's frame.
      const {port,camera}=views[i],r=port.getBoundingClientRect(),aspect=r.width/r.height;
      if(!r.width||!r.height)continue;
      let span;
      if(i===0){
        target.set(-1.9*M,2.45,0);eye.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
        span=Math.max(7.9,18.6/aspect)/scale;
      }else if(i===1){
        target.set(close.target[0]*M,close.target[1],close.target[2]);eye.copy(close.dir);eye.x*=M;
        span=Math.max(close.h,close.w/aspect);
      }else{
        span=Math.max(.95,(demo?2.15:2.3)/aspect);
        const [cx,cy]=profileCenter(state,span*aspect);target.set(cx*M,cy,0);eye.set(0,0,1);
      }
      for(const {part,solid,wire} of parts){wire.visible=wireframe&&i===0&&!part.wireSurface;solid.visible=!wire.visible;}
      floor.visible=i===0;
      cut.constant=i===0?1e4:0;
      camera.left=-span*aspect/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-span/2;
      camera.position.copy(target).add(eye.normalize().multiplyScalar(27));camera.lookAt(target);camera.updateProjectionMatrix();
      if(i===1){
        focusFrame.position.copy(target);focusFrame.quaternion.copy(camera.quaternion);focusFrame.scale.set(span*aspect,span,1);
        focusDot.position.set(demo&&state.stage>=3&&state.stage<6?geo.plane*M:target.x,4,0);
        focusDot.visible=demo?state.stage>=3&&state.stage<6:false;
      }
      if(i===2)drawProfileOverlay(state,camera,r.width,r.height,target.x,target.y);
      renderer.setViewport(r.left-bounds.left,bounds.bottom-r.bottom,r.width,r.height);
      renderer.setScissor(r.left-bounds.left,bounds.bottom-r.bottom,r.width,r.height);
      renderer.setClearColor(i===0?0x0d171c:i===1?0x16232a:0x0f1b1f);renderer.clear();renderer.render(scene,camera);
    }
    redraw=false;lastState=state;lastSpin=spin;lastPlaying=playing;
  }
  return {frame};
}
