import * as T from '../vendor/three-r180/three.module.min.js';
import {studioLight, surfaceGeometry} from '../studio-mesh.js';

function phaseOf(s) {
  if (s.t >= 6) return '후퇴 완료';
  if (s.t < 5) return s.index > 0 ? '축 정렬 중' : '정렬 전';
  if (s.u > .62) return '드릴 후퇴';
  if (s.bore >= .99999) return '최대 깊이';
  return s.bore > 0 ? '절삭 중' : '축 정렬 · 접근';
}

function axisGuide(scene,color,start,end,dashSize) {
  const geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(start,0,0),new T.Vector3(end,0,0)]);
  const line=new T.Line(geometry,new T.LineDashedMaterial({color,dashSize,gapSize:.027}));
  line.computeLineDistances();line.layers.enable(1);scene.add(line);
  return line;
}

// Draw a longitudinal cut through the same blind bore used by the three-dimensional pin.
function section(svg, study, s) {
  const {drill}=study, hole=study.boreProfile(s);
  const w=svg.clientWidth,h=svg.clientHeight;
  if (!w || !h) return;
  const face=w*.56, axis=h*.5, scale=Math.min(w*.67,360);
  const x=world=>face+(world-drill.face)*scale;
  const floor=x(hole.floor), shoulder=x(hole.shoulder), lip=hole.radius*scale, outer=s.radius*scale;
  const wall='M0 '+(axis-outer)+'H'+face+'V'+(axis-lip)+'H'+shoulder+'L'+floor+' '+axis+
    ' L'+shoulder+' '+(axis+lip)+'H'+face+'V'+(axis+outer)+'H0Z';
  const aligned=s.index>.9999, tip=x(drill.home-s.travel);
  const tipBase=tip+drill.point*scale, bitEnd=tip+drill.fluteLength*scale, bitRadius=drill.radius*scale;
  const label=(text,lx,ly,px,py,color)=>'<path d="M'+lx+' '+(ly<axis?ly+5:ly-15)+' L'+px+' '+py+'" stroke="'+color+'" fill="none"/>'+
    '<circle cx="'+px+'" cy="'+py+'" r="2.4" fill="'+color+'"/><text x="'+lx+'" y="'+ly+'" fill="'+color+'" text-anchor="middle">'+text+'</text>';
  let parts='<path d="'+wall+'" fill="url(#pin-metal)"/><path d="'+wall+'" fill="url(#pin-section-hatch)" stroke="#eac487" stroke-width="1.35"/>';
  if (aligned) {
    parts+='<rect x="'+bitEnd+'" y="'+(axis-bitRadius)+'" width="'+(.12*scale)+'" height="'+(2*bitRadius)+'" fill="#7796a4"/>';
    parts+='<path d="M'+tip+' '+axis+' L'+tipBase+' '+(axis-bitRadius)+'H'+bitEnd+'V'+(axis+bitRadius)+'H'+tipBase+'Z" fill="url(#drill-metal)" stroke="#a7d9e8"/>';
    for(let xx=tipBase+3;xx<bitEnd-bitRadius;xx+=bitRadius*1.12)
      parts+='<path d="M'+xx+' '+(axis-bitRadius)+'l'+bitRadius+' '+(2*bitRadius)+'" stroke="#527c94" stroke-width="2"/>';
    parts+=label('드릴 끝',Math.min(w-33,Math.max(face+46,tip+23)),23,tip,axis,'#acdbea');
  }
  parts+='<path d="M0 '+axis+'H'+w+'" stroke="#afbdba" stroke-opacity=".48" stroke-dasharray="5 5"/>';
  if(hole.depth>0){
    parts+=label('구멍 입구',face+8,h-10,face,axis+lip,'#f2cf8d');
    parts+=label('구멍 바닥',Math.max(41,Math.min(floor-10,face-78)),23,floor,axis,'#f2cf8d');
  }else{
    parts+=label('핀 끝면',face-28,h-10,face,axis+outer,'#f2cf8d');
  }
  svg.setAttribute('viewBox','0 0 '+w+' '+h);
  svg.querySelector('g').innerHTML=parts;
  svg.setAttribute('aria-label',hole.depth>0?'핀 끝면의 구멍 입구와 원뿔형 바닥. '+phaseOf(s):'구멍을 내기 전의 핀 끝면. '+phaseOf(s));
}

export function mountStudio({objects,study,transformed,seek,play}) {
  const root=document.querySelector('.d5-drill'), grid=root.querySelector('.d2s-grid');
  const canvas=grid.querySelector('canvas'), svg=root.querySelector('.drill-section');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.autoClear=false;
  const scene=new T.Scene();scene.environment=studioLight();
  const key=new T.DirectionalLight(0xfff3df,2.6),rim=new T.DirectionalLight(0xc4e4fa,1.4);
  key.position.set(1,9,8);rim.position.set(5,4,-7);
  const fill=new T.HemisphereLight(0xe9f3fa,0x46545b,1.25);
  for(const light of [key,rim,fill]){light.layers.enableAll();scene.add(light);}
  const materials=new Map(), pieces=[];
  for(const part of objects){
    if(['base','coil','straight','feed'].includes(part.id)||/tray|following_stock|cut_neck/.test(part.name))continue;
    const brass=part.id==='product'||part.id==='stock', bit=part.name==='flute_drill'&&part.id==='drill1';
    const color=brass?'#d4a14e':bit?'#96c8dc':part.color;
    let material=materials.get(color);
    if(!material){
      material=new T.MeshStandardMaterial({color,side:T.DoubleSide,metalness:(brass||bit) ? .83 : .56,roughness:bit ? .25 : .36});
      materials.set(color,material);
    }
    const mesh=new T.Mesh(surfaceGeometry(part),material);
    mesh.frustumCulled=false;
    // The close camera isolates the selected drill and the pin from idle stations.
    if(part.name==='illustrative_part'||part.id==='drill1')mesh.layers.enable(1);
    scene.add(mesh);
    if(study.stationIds.includes(part.id)||['carrier','product','tools','head'].includes(part.id))pieces.push({part,mesh});
  }
  const {drill}=study;
  const pinAxis=axisGuide(scene,0xe2b567,0,.56,.06);
  pinAxis.position.set(drill.face,4,0);
  const drillAxis=axisGuide(scene,0x94dcf4,-.38,0,.025);
  const [dy,dz]=study.stationCenter(1);
  const drillTip=[drill.home,dy,dz];
  const views=[...grid.querySelectorAll('.d2s-port')].map(port=>({port,camera:new T.OrthographicCamera(-1,1,1,-1,.01,100)}));
  views[1].camera.layers.set(1);
  const first=views[0].port,target=new T.Vector3();
  let last,wasPlaying,refresh=true,active=true,yaw=.42,pitch=.34,drag;
  const observer=new ResizeObserver(()=>{refresh=true;});observer.observe(grid);observer.observe(svg);
  first.onpointerdown=e=>{if(e.isPrimary&&e.button===0){first.setPointerCapture(e.pointerId);drag=[e.clientX,e.clientY];}};
  first.onpointermove=e=>{
    if(!drag)return;
    yaw-=(e.clientX-drag[0])*.01;pitch=Math.max(-.8,Math.min(1.35,pitch+(e.clientY-drag[1])*.008));
    drag=[e.clientX,e.clientY];refresh=true;
  };
  first.onlostpointercapture=()=>{drag=null;};
  first.onkeydown=e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();
    if(e.key==='ArrowLeft'||e.key==='ArrowRight')yaw+=e.key==='ArrowLeft'?-.16:.16;
    else pitch=Math.max(-.8,Math.min(1.35,pitch+(e.key==='ArrowUp'?.12:-.12)));
    refresh=true;
  };
  root.querySelector('[data-reset]').onclick=()=>{yaw=.42;pitch=.34;refresh=true;};
  const range=root.querySelector('input[type=range]'), moment=root.querySelector('select');
  const button=root.querySelector('[data-play]'),phaseText=root.querySelector('[data-phase]'),caption=root.querySelector('[data-caption]');
  range.oninput=()=>seek(Number(range.value));moment.onchange=()=>seek(Number(moment.value));
  button.onclick=()=>{if(last?.t>=6)seek(4);play();};
  root.querySelector('[data-variant]').textContent='ESCOMATIC / D5 · '+study.variant;
  root.querySelector('[data-exit]').href=study.cnc?'?variant=cnc':'index.html';
  root.querySelectorAll('nav a')[study.cnc?1:0].setAttribute('aria-current','page');
  const otherVariant=root.querySelectorAll('nav a')[study.cnc?0:1];
  otherVariant.addEventListener('click',()=>{
    const url=new URL(otherVariant.href);url.searchParams.set('t',(last?.t??4).toFixed(2));otherVariant.href=url.href;
  });
  svg.innerHTML='<defs><linearGradient id="pin-metal" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#c79d57"/><stop offset=".5" stop-color="#e1ba75"/><stop offset="1" stop-color="#a97838"/></linearGradient>'+
    '<linearGradient id="drill-metal" x2="0" y2="1"><stop stop-color="#d3e9f0"/><stop offset=".48" stop-color="#6993aa"/><stop offset="1" stop-color="#acccd7"/></linearGradient>'+
    '<pattern id="pin-section-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-1 1l2-2M0 8l8-8M7 9l2-2" stroke="#4f381d" stroke-opacity=".28"/></pattern></defs><g font-family="system-ui,sans-serif" font-size="13" font-weight="600"></g>';
  const initial=Number(new URLSearchParams(location.search).get('t'));
  root.hidden=false;document.body.classList.add('drill-studio-open');seek(Number.isFinite(initial)?Math.min(6,Math.max(4,initial)):4);
  const captions={'정렬 전':'금색 점선은 핀 중심선, 파란 점선은 첫 번째 드릴의 축입니다. 두 선이 만나는 과정을 보세요.',
    '축 정렬 중':study.carrierName+'가 움직여 드릴의 중심을 핀의 중심선에 맞춥니다.',
    '축 정렬 · 접근':'드릴 끝이 핀 끝면에 닿을 때부터 구멍이 생깁니다.',
    '절삭 중':'드릴 끝이 전진하면서 구멍 바닥이 핀 안쪽으로 이동합니다.',
    '최대 깊이':'드릴 끝과 막힌 구멍의 바닥이 같은 위치에 있습니다.',
    '드릴 후퇴':'드릴은 뒤로 빠지고, 구멍의 바닥은 최대 깊이에 남습니다.',
    '후퇴 완료':'드릴 끝과 핀 끝면이 떨어졌습니다. 단면에서 구멍의 입구와 가장 깊은 점을 짚어 보세요.'};
  canvas.addEventListener('webglcontextlost',()=>{
    active=false;observer.disconnect();root.hidden=true;document.body.classList.remove('drill-studio-open');
    document.getElementById('studio-link').textContent='기본 탐색기의 정면 단면으로 계속 보기';
    document.getElementById('studio-link').href='#cut-title';
    seek(5);
  },{once:true});
  return {
    get endTime(){return active?6:null;},
    frame(s,spin,dt,playing){
      if(!active||document.hidden||s===last&&playing===wasPlaying&&!refresh)return;
      if(s!==last){
        drillAxis.position.set(...study.transform(drillTip,{id:'drill1',name:'axis'},s));
        // When the drill enters, keep the material and tip unobstructed.
        pinAxis.visible=drillAxis.visible=!s.bore;
        for(const {part,mesh} of pieces){
          const pos=mesh.geometry.getAttribute('position');
          part.vertices.forEach((v,i)=>pos.setXYZ(i,...transformed(v,part,true)));
          pos.needsUpdate=true;mesh.geometry.computeVertexNormals();
        }
      }
      const phase=phaseOf(s);
      phaseText.textContent=phase;caption.textContent=captions[phase];
      range.value=s.t;
      moment.value=[...moment.options].find(o=>Math.abs(Number(o.value)-s.t)<.00001)?.value??'';
      button.textContent=playing?'일시정지':s.t>=6?'다시 재생':'장면 재생';
      section(svg,study,s);
      const width=grid.clientWidth,height=grid.clientHeight,bounds=grid.getBoundingClientRect(),ratio=renderer.getPixelRatio();
      if(width&&height){
        if(canvas.width!==Math.floor(width*ratio)||canvas.height!==Math.floor(height*ratio))renderer.setSize(width,height,false);
        renderer.setScissorTest(true);
        views.forEach(({port,camera},i)=>{
          const r=port.getBoundingClientRect(),aspect=r.width/r.height;
          const span=i?Math.max(1.05,1.62/aspect):Math.max(2.65,5.35/aspect);
          camera.left=-span*aspect/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-span/2;
          if(i){
            // Look slightly into the open end; the axial section below remains square to the axis.
            target.set(2.86,4,0);camera.position.set(3.65,.95,9).add(target);
          }else{
            target.set(3.05,4.27,0);camera.position.set(9*Math.sin(yaw)*Math.cos(pitch),9*Math.sin(pitch),9*Math.cos(yaw)*Math.cos(pitch)).add(target);
          }
          camera.lookAt(target);camera.updateProjectionMatrix();
          renderer.setViewport(r.left-bounds.left,bounds.bottom-r.bottom,r.width,r.height);
          renderer.setScissor(r.left-bounds.left,bounds.bottom-r.bottom,r.width,r.height);
          renderer.setClearColor(i?0x182c34:0x101e25);renderer.clear();renderer.render(scene,camera);
        });
      }
      last=s;wasPlaying=playing;refresh=false;
    }
  };
}
