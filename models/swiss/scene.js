import {pin,rear,profile,cavity} from './motion.js';

const color={iron:0x6c8996, steel:0xafc3cb, dark:0x3e5968, gold:0xefc578,
  stripe:0xb58a4f, groove:0xf2a47e, blade:0xb5b6e7, drill:0x92d4e4, green:0x7ea99b};
export const parts={
  main:['주축대','봉재를 잡아 돌리며 가이드 부시 쪽으로 전진합니다.'],
  guide:['가이드 부시','공구가 닿는 곳 가까이에서 가는 봉재를 둘러싸고 받칩니다.'],
  stock:['봉재','주축과 함께 돕니다. 금색 표면의 진한 줄이 회전을 보여줍니다.'],
  groove:['홈 날','주황색 날이 회전하는 봉재의 둘레에 홈을 냅니다.'],
  blade:['절단 날','보라색 날이 부시 가까이에서 봉재와 핀 사이를 끊습니다.'],
  sub:['부주축','반대편에서 핀을 잡고 절단된 핀을 배면 가공 위치로 옮깁니다.'],
  drill:['배면 드릴','새로 드러난 절단면에서 핀 안쪽으로 막힌 구멍을 만듭니다.'],
  product:['가공 핀','부주축이 처음 잡았던 끝과 드릴이 가공한 절단면을 구분해 보세요.'],
  frame:['지지대·받이','모듈을 받치는 가상의 지지대와 핀 받이입니다.']
};
const ids=Object.keys(parts);
const cubeFaces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
const tau=2*Math.PI;
const S=globalThis.MachineShapes;

export function createScene(canvas,isStar,onPart) {
  const surface=new globalThis.D2DepthSurface();
  const ctx=canvas.getContext('2d');
  let yaw=-.26,pitch=.20,zoom=1,selected='groove',state,drag=null;
  let w,h,scale,cy,sy,cp,sp,detail='',boreView=false,center=[.30,0,.20];
  const owner=id=>ids.indexOf(id)+1;
  function project(x,y,z){
    const dx=x-center[0],dz=z-center[2];y-=center[1];
    const back=dz*cy-dx*sy;
    return [w/2+(dx*cy+dz*sy)*scale,h*.48-(y*cp-back*sp)*scale,y*sp+back*cp];
  }
  function face(vertices,indices,clr,id) {
    const [a,b,c]=indices.map(i=>vertices[i]);
    const u=[(b[0]-a[0])/scale,(a[1]-b[1])/scale,b[2]-a[2]];
    const v=[(c[0]-a[0])/scale,(a[1]-c[1])/scale,c[2]-a[2]];
    let nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0];
    if(nz<0){nx=-nx;ny=-ny;nz=-nz;}
    const packed=S.shade(clr,nx,ny,nz,id===selected);
    for(let j=1;j<indices.length-1;j++) surface.triangle(a,vertices[indices[j]],vertices[indices[j+1]],packed,owner(id));
  }
  function box(id,x,y,z,dx,dy,dz,clr) {
    const v=[];
    for(const k of [-1,1])for(const j of [-1,1])for(const i of [-1,1])v.push(project(x+i*dx/2,y+j*dy/2,z+k*dz/2));
    for(const f of cubeFaces)face(v,f,clr,id);
  }
  // Revolve one lengthwise profile. Interior rings form a real cavity in the pin.
  function lathe(id,rings,y,z,clr,angle=0,stripe=false) {
    if(boreView&&(id==='guide'||id==='sub')){
      const cut=S.section(S.turned(rings));
      const vertices=cut.vertices.map(([x,a,b])=>project(x,y+a,z+b));
      for(let i=0;i<cut.faces.length;i++)face(vertices,cut.faces[i],i>=cut.capStart?0xe0a477:clr,id);
      return;
    }
    const n=32;
    const rows=rings.map(([x,r])=>Array.from({length:n},(_,i)=>{
      const a=angle+tau*i/n;return project(x,y+r*Math.cos(a),z+r*Math.sin(a));
    }));
    for(let j=1;j<rows.length;j++)for(let i=0;i<n;i++){
      const k=(i+1)%n,vertices=[rows[j-1][i],rows[j-1][k],rows[j][k],rows[j][i]];
      face(vertices,[0,1,2,3],stripe&&i%12===2?color.stripe:clr,id);
    }
  }
  function sleeve(id,x,length,outer,inner,y,z,clr,angle=0,striped=false) {
    lathe(id,[[x,inner],[x,outer],[x+length,outer],[x+length,inner],[x,inner]],y,z,clr,angle,striped);
  }
  // Reuse local meshes while the headstocks and tool racks move.
  const cache=new Map();
  function form(id,kind,args,x,y,z,clr,axis='x',angle=0){
    const key=kind+JSON.stringify(args);
    if(!cache.has(key))cache.set(key,S[kind](...args));
    let shape=cache.get(key);
    let local=shape.vertices.map(p=>S.orient(p,axis,angle));
    if(boreView&&kind==='jaw'){
      shape=S.section({vertices:local,faces:shape.faces},state.transfer*rear.z-z);
      local=shape.vertices;
    }
    const v=local.map(([u,a,b])=>project(x+u,y+a,z+b));
    for(let i=0;i<shape.faces.length;i++)face(v,shape.faces[i],i>=shape.capStart?0xe0a477:clr,id);
  }
  function pad(id,x,y,z,w,h,d,clr){form(id,'housing',[w,h,d],x,y,z,clr);}
  function socket(id,x,y,z,axis){
    form(id,'turned',[[[0,.065],[.035,.065],[.045,.051],[.045,.024],[.021,.024],[.021,0]],8],x,y,z,color.steel,axis);
  }
  function draw() {
    if(!state || !canvas.clientWidth)return;
    const s=state;
    w=canvas.clientWidth;h=canvas.clientHeight;
    const dpr=Math.min(Math.max(1.35,devicePixelRatio||1),1.65);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    }
    ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);
    cy=Math.cos(yaw);sy=Math.sin(yaw);cp=Math.cos(pitch);sp=Math.sin(pitch);
    const sx=pin.end-.10+(1-s.approach)*.96+s.transfer*rear.offset-s.backIn*rear.stroke;
    const ry=s.transfer*rear.y, rz=s.transfer*rear.z;
    center=detail==='cut'?[.39,.12,.03]:detail==='pickup'?[sx-.69,ry,rz]:[.70,-.17,-.30];
    scale=detail?zoom*Math.min(w/(detail==='cut'?3.15:4.15),h/2.82):zoom*Math.min(w/(12.0*Math.abs(cy)+4.25*Math.abs(sy)+.8),h/(4.8+4*Math.abs(sp)));
    const sample=Math.max(1,1.35/(devicePixelRatio||1));surface.begin(w*sample,h*sample);surface.scale*=sample;
    if(!detail){
      pad('frame',.72,-2.38,.10,11.70,.31,3.36,color.dark);
      for(const z of [-1.47,1.67])box('frame',.72,-2.16,z,11.70,.23,.095,color.iron);
      for(const x of [-4.18,-1.64]){
        pad('frame',x,-1.62,-.16,.57,1.19,1.12,color.iron);
        pad('frame',x,-2.19,-.16,.82,.12,1.34,color.steel);
      }
      // Open teaching supports leave the transfer path visible.
      pad('frame',4.20,-1.97,.03,4.65,.46,1.90,color.iron);
      for(const z of [-.59,.66])pad('frame',4.20,-1.70,z,4.62,.12,.16,color.steel);
      pad('frame',.10,-.20,-1.52,.68,3.80,.42,color.iron);
      if(isStar){
        pad('frame',.26,1.70,-1.12,.90,.24,1.35,color.iron);
        pad('frame',.26,1.75,-.73,.23,.18,2.23,color.steel);
      }else{
        for(const side of [-1,1])pad('frame',.38,side*1.32,-1.26,1.10,.23,.75,color.iron);
      }
      const carriageX=sx+1.15;
      pad('sub',carriageX,-1.59,.03,1.28,.18,1.62,color.green);
      pad('sub',carriageX,(-1.49+ry-.51)/2,rz-.36,.42,Math.max(.12,ry+.98),.28,color.iron);
      pad('sub',carriageX,ry-.52,rz,1.15,.16,1.04,color.dark);
      pad('frame',pin.start+rear.offset-rear.gap-.91,-1.70,rear.z,.65,.90,.68,color.dark);
    }
    const head=-4.55+s.feed*(pin.end-pin.start);
    pad('frame',-2.55,-.94,-.13,5.4,.18,1.46,color.dark);
    for(const z of [-.64,.38]){
      box('frame',-2.55,-.82,z,5.05,.11,.14,color.steel);
      pad('main',head,-.76,z,1.22,.15,.24,color.iron);
    }
    pad('main',head,-.17,0,1.4,1.13,1.05,color.iron);
    pad('main',head-.06,-.10,.54,.93,.66,.055,color.dark);
    for(let j=0;j<4;j++)box('main',head-.04,-.29+j*.11,.58,.63,.033,.043,color.iron);
    lathe('main',[[head+.60,.24],[head+.60,.52],[head+.67,.55],[head+.75,.48],[head+.75,.24]],0,0,color.steel);
    sleeve('main',head+.64,.095,.55,.24,0,0,color.dark);
    for(const dy of [-.40,.40])for(const dz of [-.38,.38])socket('main',head+.71,dy,dz,'x');
    sleeve('main',head+.65,.38,.48,.22,0,0,color.steel,s.spin,true);
    sleeve('stock',-5.05,5.19,pin.radius,.001,0,0,color.gold,s.spin,true);
    box('guide',-.38,-.44,-.22,.56,.75,.64,color.dark);
    sleeve('guide',-.70,.72,.49,.226,0,0,color.green);
    sleeve('guide',-.09,.13,.53,.225,0,0,color.steel);
    lathe('guide',[[.04,.225],[.04,.40],[.095,.38],[.14,.27],[.14,.225]],0,0,color.steel);
    for(let i=0;i<4;i++){const a=(i+.5)*tau/4;socket('guide',.044,.435*Math.cos(a),.435*Math.sin(a),'x');}
    const grooveY=.55-.426*s.grooveIn;
    const cutY=.55-.55*s.bladeIn;
    const lift=id=>s.liftSlot===id?s.lift*.81:0;
    const grooveZ=isStar?-.58*s.index:0;
    const bladeZ=isStar?grooveZ+.58:0;
    const sign=isStar?1:-1;
    if(isStar) {
      const gangY=1.40-.426*s.grooveIn-.55*s.bladeIn;
      pad('groove',.40,gangY,grooveZ-.54,.85,.48,2.9,color.iron);
      pad('groove',.36,gangY+.19,grooveZ-1.48,.69,.21,.75,color.dark);
      for(const [j,offset] of [.58,0,-.46,-.92,-1.38,-1.84].entries()){
        const id=j===0?'blade':'groove',z=grooveZ+offset;
        pad(id,.42,gangY-.27,z,.49,.18,.27,color.steel);
        socket(id,.59,gangY+.24,z,'y');
      }
    } else {
      for(const side of [-1,1]){
        const id=side===1?'groove':'blade',x=side===1?.64:.17;
        const y=side*(side===1?grooveY+.84:cutY+.84);
        pad(id,x,y,-.40,.89,.48,1.49,side===1?color.iron:color.green);
        for(const dx of [-.31,.31]){
          box('frame',x+dx,side*1.24,-1.17,.11,1.10,.10,color.steel);
          socket(id,x+dx,y,.355,'z');
        }
      }
    }
    const gy=isStar?grooveY-.55*s.bladeIn:grooveY;
    const by=isStar?cutY-.426*s.grooveIn:cutY;
    box('groove',pin.center,gy+.51,grooveZ,.30,.55,.26,color.dark);
    box('blade',.18,sign*(by+.51),bladeZ,.25,.55,.24,color.dark);
    if(s.mount.groove!=='none')form('groove','insert',[pin[s.mount.groove],.28,.20,1],pin.center,gy,grooveZ+lift('groove'),color.groove);
    if(s.mount.blade!=='none')form('blade','insert',[.08,.28,.16,sign],.18,sign*by,bladeZ+lift('blade'),color.blade);
    socket('groove',pin.center,gy+.47,grooveZ+.132,'z');
    socket('blade',.18,sign*(by+.47),bladeZ+.122,'z');
    // The pickup nose and the part move together after separation.
    pad('sub',sx+1.13,ry-.03,rz,1.05,1.04,1.06,color.green);
    lathe('sub',[[sx+.38,.248],[sx+.38,.43],[sx+.50,.50],[sx+.65,.50],[sx+.67,.25]],ry,rz,color.steel);
    pad('sub',sx+1.14,ry+.02,rz+.54,.69,.61,.07,color.iron);
    for(const dx of [-.25,.25])socket('sub',sx+1.14+dx,ry+.22,rz+.58,'z');
    for(const dz of [-.39,.39])socket('sub',sx+.60,ry+.36,rz+dz,'-x');
    sleeve('sub',sx+.30,.41,.46,.25,ry,rz,color.iron,s.rearSpin);
    for(let j=0;j<3;j++){
      const a=s.rearSpin+j*tau/3,opening=.075*(1-s.grip);
      form('sub','jaw',[.35,.33,.21,0,1.96],sx,ry+opening*Math.cos(a),rz+opening*Math.sin(a),color.steel,'x',a);
    }
    const tip=pin.start+rear.offset-rear.gap;
    pad('drill',tip-.90,rear.y-.10,rear.z,.54,.61,isStar?1.76:.76,color.iron);
    if(isStar)for(const dz of [-.64,-.33,.34])sleeve('drill',tip-.66,.11,.145,.08,rear.y,rear.z+dz,color.steel);
    else for(const dz of [-.27,.27])socket('drill',tip-.90,rear.y+.21,rear.z+dz,'y');
    sleeve('drill',tip-.70,.30,.22,.09,rear.y,rear.z,color.steel);
    if(s.mount.drill!=='none'){
      const r=s.mount.drill==='large' ? .12 : .06;
      form('drill','drill',[.48,r],tip,rear.y,rear.z+lift('drill'),color.drill,'-x');
    }
    if(s.feed>.001){
      if(s.cut<1)sleeve('stock',.14,.08,pin.radius*(1-s.cut),0,0,0,color.gold,s.spin,true);
      const px=s.pinTransfer*rear.offset-s.backIn*rear.stroke-.78*s.drop;
      const py=s.pinTransfer*rear.y-.76*s.drop, pz=s.pinTransfer*rear.z;
      const at=x=>pin.start+(x-pin.start)*s.feed+px;
      const outline=[...cavity(s.shape),...profile(s.shape),[pin.end,0]];
      lathe('product',outline.map(([x,r])=>[at(x),r]),py,pz,color.gold,s.pinTransfer?s.rearSpin:s.spin,true);
    }
    box('frame',2.31,rear.y-.76-pin.radius-.06,rear.z,2.67,.12,1.22,color.iron);
    box('frame',2.31,-2.10,rear.z-.58,2.67,.21,.07,color.dark);
    S.backdrop(ctx,w,h,v=>project(...v),detail?center[1]-1.5:-2.56);surface.blit(ctx,w,h);
    const labelParts=[...new Set(['main','guide','sub',selected])];
    const positions={main:[head,0,0],guide:[-.28,.3,0],sub:[sx+.42,ry,rz],
      groove:[pin.center,gy+.12,grooveZ],blade:[.18,sign*(by+.12),bladeZ],drill:[tip-.1,rear.y,rear.z]};
    const targets=new Map(labelParts.map(id=>[owner(id),project(...(positions[id]??[.6,0,0]))]));
    const anchors=surface.anchors(targets),used=[];
    ctx.font='600 12px system-ui, sans-serif';ctx.textBaseline='middle';ctx.textAlign='center';
    for(const id of [selected,...labelParts.filter(id=>id!==selected)]){
      const a=anchors.get(owner(id));if(!a)continue;
      const label=parts[id][0],lw=ctx.measureText(label).width+12;
      const lx=Math.min(w-lw/2-3,Math.max(lw/2+3,a.x));
      const offsets=['guide','drill'].includes(id)?[32,-34,56,-58]:[-36,31,-60,55];
      for(const dy of offsets){
        const ly=Math.min(h-13,Math.max(13,a.y+dy));
        if(used.some(b=>Math.abs(b.x-lx)<(lw+b.w)/2+3 && Math.abs(b.y-ly)<24))continue;
        used.push({x:lx,y:ly,w:lw});
        ctx.strokeStyle=id===selected?'#d4eca9':'#8ca9ab';
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(lx,ly);ctx.stroke();
        ctx.fillStyle='#172a33';ctx.fillRect(lx-lw/2,ly-10,lw,20);
        ctx.fillStyle=id===selected?'#d4eca9':'#e8f3ee';ctx.fillText(label,lx,ly);
        ctx.beginPath();ctx.arc(a.x,a.y,2.2,0,tau);ctx.fill();break;
      }
    }
  }
  function selectPart(id) {
    if(!parts[id])return; selected=id;
    document.getElementById('part').value=id;
    document.getElementById('part-note').textContent=parts[id][1];
    draw();
  }
  const choose=id=>{selectPart(id);onPart(id);};
  const picker=document.getElementById('part');
  ids.forEach(id=>picker.add(new Option(parts[id][0],id)));
  picker.onchange=()=>choose(picker.value);
  function setBore(value){
    boreView=value;document.querySelector('[data-bore]').setAttribute('aria-pressed',String(value));
    document.querySelector('.bore-note').hidden=!value;
  }
  document.querySelector('[data-bore]').onclick=()=>{
    if(!boreView&&!detail)document.querySelector('[data-detail="cut"]').click();
    setBore(!boreView);draw();
  };
  function camera(op) {
    if(op==='left')yaw-=.23;
    if(op==='right')yaw+=.23;
    if(op==='in'||op==='out')zoom=Math.max(.65,Math.min(2.8,zoom*(op==='in'?1.22:1/1.22)));
    if(op==='home'){setBore(false);detail='';yaw=-.26;pitch=.20;zoom=1;}
    for(const b of document.querySelectorAll('[data-detail]'))b.setAttribute('aria-pressed',String(b.dataset.detail===detail));
    draw();
  }
  for(const b of document.querySelectorAll('[data-detail]'))b.onclick=()=>{
    if(detail===b.dataset.detail){camera('home');return;}
    detail=b.dataset.detail;zoom=1;yaw=detail==='cut'?-.44:.47;pitch=.29;
    camera('detail');
  };
  document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>camera(b.dataset.camera));
  canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,moved:0};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{
    if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    yaw+=dx*.008;pitch=Math.max(-1.3,Math.min(1.3,pitch+dy*.007));
    drag={x:e.clientX,y:e.clientY,moved:drag.moved+Math.hypot(dx,dy)};draw();
  };
  canvas.onpointerup=e=>{
    if(drag && drag.moved<6){const rect=canvas.getBoundingClientRect();const hit=surface.owner[surface.indexAt(e.clientX-rect.left,e.clientY-rect.top)];if(hit)choose(ids[hit-1]);}
    drag=null;
  };
  canvas.onpointercancel=()=>{drag=null;};
  canvas.onkeydown=e=>{
    const op={ArrowLeft:'left',ArrowRight:'right','+':'in','=':'in','-':'out',Home:'home'}[e.key];
    if(op){e.preventDefault();camera(op);}
  };
  canvas.addEventListener('wheel',e=>{e.preventDefault();camera(e.deltaY<0?'in':'out');},{passive:false});
  new ResizeObserver(draw).observe(canvas);
  return {selectPart,render(pose){state=pose;draw();}};
}
