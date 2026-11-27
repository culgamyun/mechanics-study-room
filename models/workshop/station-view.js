import {drawStation} from './station-models.js';

import {applyDecal,shadeContacts,studioFloor} from './station-finishes.js';

const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(n,hi));
const buttons=[['left','↶','왼쪽 회전'],['right','↷','오른쪽 회전'],['up','↥','위에서 보기'],['in','＋','확대'],['out','−','축소'],['reset','기본 시점','기본 시점 복원']];

class WorkshopStation extends HTMLElement {
  connectedCallback(){
    this.innerHTML='<div class="station-head"><div><small></small><strong></strong></div><span></span></div><div class="station-modes" role="group" aria-label="관찰할 위치"></div><canvas role="img"></canvas><span class="station-tip" hidden aria-hidden="true"></span><div class="station-tools"></div><p class="station-caption"></p>';
    this.canvas=this.querySelector('canvas');
    this.surface=new globalThis.D2DepthSurface();
    this.yaw=-.32;this.pitch=.49;this.zoom=1;
    this.mode='전체';
    const modes=this.querySelector('.station-modes');
    for(const name of ['전체','끝면 확대','축 단면','표면 확대']){
      const b=document.createElement('button');b.type='button';b.textContent=name;
      b.onclick=()=>{this.mode=name;this.setCamera();this.update(this.model);};
      modes.append(b);
    }
    const controls=this.querySelector('.station-tools');
    for(const [key,label,title] of buttons){
      const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);
      b.onclick=()=>{
        if(key==='left')this.yaw-=.35;
        if(key==='right')this.yaw+=.35;
        if(key==='up')this.pitch=this.pitch>.95?.49:1.18;
        if(key==='in'||key==='out')this.zoom=clamp(this.zoom*(key==='in'?1.2:1/1.2),.7,2);
        if(key==='reset')this.setCamera();
        this.requestDraw();
      };
      controls.append(b);
    }
    const c=this.canvas;
    const pick=e=>{
      const r=c.getBoundingClientRect(),i=this.surface.indexAt(e.clientX-r.left,e.clientY-r.top);
      return this.keys?.[this.surface.owner?.[i]];
    };
    c.onpointerdown=e=>{
      if(e.button!==0||this.drag)return;
      this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch,target:pick(e),moved:false,gap:this.model?.gauge?.gap};
      c.setPointerCapture(e.pointerId);
    };
    c.onpointermove=e=>{
      const d=this.drag;
      if(!d){
        const id=pick(e);c.style.cursor=id?'pointer':'grab';
        const tip=this.querySelector('.station-tip');
        const p=id?.startsWith('piece-')&&this.model?.records?.find(item=>item.number===Number(id.slice(6)));
        tip.hidden=!p;
        if(p){
          const r=c.getBoundingClientRect();
          tip.textContent='핀 #'+p.number+' · '+(p.pass?'합격':'격리')+(this.model.chosen.includes(p.number)?' · 용기 안':'');
          tip.style.left=clamp(e.clientX-r.left+10,4,c.clientWidth-tip.offsetWidth-4)+'px';
          tip.style.top=(c.offsetTop+clamp(e.clientY-r.top-35,3,c.clientHeight-30))+'px';
        }
        return;
      }
      if(d.id!==e.pointerId)return;
      const dx=e.clientX-d.x,dy=e.clientY-d.y;
      if(!d.moved&&Math.hypot(dx,dy)<4)return;
      d.moved=true;
      if(d.target==='deliver'&&this.model.kind==='handoff'&&!this.model.received){
        const x=4.2*this.scale*Math.cos(this.yaw),y=-4.2*this.scale*Math.sin(this.yaw)*Math.sin(this.pitch);
        const span=x*x+y*y;
        this.model.transfer=clamp((dx*x+dy*y)/span,0,1);
        d.nearReceiver=Math.hypot(dx-x,dy-y)<this.scale*1.55;
        this.requestDraw();
      }else if(d.target==='handle'&&this.model.gauge){
        const g=this.model.gauge;
        // Measured displacement along the projected spindle axis.
        const ax=Math.cos(this.yaw),ay=-Math.sin(this.yaw)*Math.sin(this.pitch);
        const delta=g.key==='diam' ? dy*8/c.clientHeight : (dx*ax+dy*ay)/(this.scale*g.units*(ax*ax+ay*ay));
        this.action('gap',d.gap+delta);
      }else{
        this.yaw=d.yaw+dx*.012;this.pitch=clamp(d.pitch+dy*.01,.10,1.43);this.requestDraw();
      }
    };
    c.onpointerleave=()=>{this.querySelector('.station-tip').hidden=true;};
    c.onpointerup=e=>{
      const d=this.drag;if(d?.id!==e.pointerId)return;
      this.drag=null;
      if(d.moved&&d.target==='deliver'&&!this.model.received){
        const arrived=d.nearReceiver&&this.model.transfer>.70;
        this.model.transfer=0;
        if(arrived)this.action('deliver',true);else this.requestDraw();
      }else if(!d.moved&&d.target)this.action(d.target);
      else this.requestDraw();
    };
    c.onpointercancel=c.onlostpointercapture=()=>{
      if(this.drag&&this.model){this.model.transfer=0;this.requestDraw();}
      this.drag=null;
    };
    this.observer=new ResizeObserver(()=>this.requestDraw());this.observer.observe(c);
  }
  disconnectedCallback(){this.observer?.disconnect();cancelAnimationFrame(this.frame);this.frame=0;this.drag=null;}
  setCamera(){
    const end=this.mode==='끝면 확대',section=this.mode==='축 단면';
    this.yaw=end?(this.model.j.id==='P-303'?1.26:-1.26):section?-.12:-.32;
    this.pitch=end ? .18 : section ? .13 : .49;
    this.zoom=1;
  }
  update(model,action){
    const inspect=model.kind==='inspect'&&!model.gauge;
    const wash=model.kind==='wash';
    if(!inspect&&!wash&&this.mode!=='전체'){this.mode='전체';this.setCamera();}
    const modes=this.querySelector('.station-modes');modes.hidden=!inspect&&!wash;
    for(const b of modes.children){
      b.hidden=b.textContent!=='전체'&&(wash?b.textContent!=='표면 확대':b.textContent==='표면 확대');
      b.setAttribute('aria-pressed',String(this.mode===b.textContent));
    }
    this.querySelector('.station-head small').textContent=model.j.id+'  /  '+model.j.lot;
    this.querySelector('.station-head span').textContent=model.j.machine;

    this.model=model;if(action)this.action=action;
    this.querySelector('strong').textContent=model.title;
    let hint=model.hint;
    if(this.mode==='축 단면')hint='빗금은 핀의 금속입니다. '+(model.j.id==='P-303'?'절단면에서 홈까지의 위치와 배면 구멍이 끝나는 곳을 대조하세요.':model.j.id==='P-202'?'정면에서 시작한 빈 공간이 몸통 안에서 끝나는지 확인하세요.':'민핀의 단면이 속까지 차 있고 외경이 일정한지 확인하세요.');
    if(this.mode==='끝면 확대')hint='드래그해 핀을 돌리며 끝면과 몸통의 경계를 살펴보세요.';
    if(this.mode==='표면 확대')hint=model.pieces[0].cleaned?'건조 후 몸통과 모서리에 남은 칩과 유막이 있는지 살펴보세요.':'표면의 말린 칩과 짙은 유막을 찾은 뒤 세척한 핀과 비교하세요.';
    this.querySelector('.station-caption').textContent=hint;
    this.canvas.setAttribute('aria-label',model.title+' · '+hint+' · 빈 곳을 끌어 회전');
    if(model.kind==='handoff'&&!this.querySelector('.station-slip')){
      const details=document.createElement('details');details.className='station-slip';
      const summary=document.createElement('summary');summary.textContent='포장 라벨 확대';
      const article=document.createElement('article');
      const rows=[model.j.id+' / REV '+model.j.rev,'LOT '+model.j.lot,model.packed.ids.length+'개 · NET '+model.packed.net.toFixed(3)+' g','생산 번호 '+model.packed.ids.map(n=>'#'+n).join(', ')];
      rows.forEach((v,i)=>{const line=document.createElement(i?'p':'b');line.textContent=v;article.append(line);});
      details.append(summary,article);this.append(details);
    }
    this.dataset.station=model.kind;
    this.requestDraw();
  }
  animate(duration=1250){
    this.started=performance.now();this.duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:duration;this.requestDraw();
  }
  requestDraw(){
    if(this.frame||!this.isConnected)return;
    this.frame=requestAnimationFrame(now=>{
      this.frame=0;if(!this.model)return;
      const t=this.duration?clamp((now-this.started)/this.duration,0,1):1;
      if(this.model.kind==='wash'&&this.model.washingIds?.length){
        const stage=t<.35?'투입 바스켓 이동':t<.64?'노즐 분사 · 세척':t<.87?'배수 · 건조대로 이동':t<1?'건조 중':'세척·건조 완료';
        const title=this.querySelector('strong');if(title.textContent!==stage)title.textContent=stage;
      }
      this.draw(t);if(t<1)this.requestDraw();
    });
  }
  draw(t){
    const c=this.canvas,w=c.clientWidth,h=c.clientHeight;
    if(!w||!h)return;
    const surface=this.surface;
    const sample=Math.max(1,1.4/(devicePixelRatio||1));
    surface.begin(w*sample,h*sample);surface.scale*=sample;
    if(c.width!==surface.canvas.width||c.height!==surface.canvas.height){c.width=surface.canvas.width;c.height=surface.canvas.height;}
    const ctx=c.getContext('2d');ctx.setTransform(c.width/w,0,0,c.height/h,0,0);
    const cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);
    const detail=this.mode!=='전체';
    const scale=this.scale=(detail?Math.min(w/(this.mode==='끝면 확대'?3.25:5.6),h/2.65):Math.min(w/9.25,h/4.45))*this.zoom;
    const project=([x,y,z])=>{
      const back=z*cy-x*sy;
      return [w/2+(x*cy+z*sy)*scale,h*.55-((y-.62)*cp-back*sp)*scale,((y-.62)*sp+back*cp)*scale];
    };
    const keys=this.keys=[''];const tags=[],decals=[],leaders=[];
    function face(points,color,key){
      const v=points.map(project),[a,b,d]=v;
      const u=(b[0]===a[0]&&b[1]===a[1]&&b[2]===a[2]?v.at(-1):b).map((n,i)=>n-a[i]),q=d.map((n,i)=>n-a[i]);
      let nx=u[1]*q[2]-u[2]*q[1],ny=u[2]*q[0]-u[0]*q[2],nz=u[0]*q[1]-u[1]*q[0];
      if(nz<0){nx=-nx;ny=-ny;nz=-nz;}
      const norm=Math.hypot(nx,ny,nz)||1;nx/=norm;ny/=norm;nz/=norm;
      const metal=color===0xb8cacf||color===0xe6bb71||color===0x819da9;
      const light=.46+.53*Math.max(0,-.38*nx-.73*ny+.57*nz)+.13*Math.max(0,.84*nx-.26*ny+.46*nz);
      const glint=metal?67*Math.pow(Math.max(0,-.25*nx-.41*ny+.876*nz),16)+24*Math.pow(1-nz,3):6*Math.pow(Math.max(0,nz),5);
      const channel=n=>clamp(Math.round((color>>n&255)*light+glint),0,255);
      const rgb=(255<<24)|(channel(0)<<16)|(channel(8)<<8)|channel(16);
      let id=0;
      if(key){id=keys.indexOf(key);if(id<0)id=keys.push(key)-1;}
      for(let i=1;i<v.length-1;i++)surface.triangle(a,v[i],v[i+1],rgb,id);
    }
    function box(x,y,z,dx,dy,dz,color,key){
      const v=[];
      for(const k of [-1,1])for(const j of [-1,1])for(const i of [-1,1])v.push([x+i*dx/2,y+j*dy/2,z+k*dz/2]);
      for(const f of faces)face(f.map(i=>v[i]),color,key);
    }
    // Octagonal footprint with a bevel around the top and bottom edges.
    function plate(x,y,z,w,h,d,color,key,radius=.12){
      const r=Math.min(radius,w/4,d/4), bevel=Math.min(h*.22,r*.42);
      const rim=(offset,level)=>{
        const a=w/2-offset,b=d/2-offset,k=r-offset*.5;
        return [[-a+k,-b],[a-k,-b],[a,-b+k],[a,b-k],[a-k,b],[-a+k,b],[-a,b-k],[-a,-b+k]].map(([u,v])=>[x+u,y+level,z+v]);
      };
      const rings=[rim(bevel,-h/2),rim(0,-h/2+bevel),rim(0,h/2-bevel),rim(bevel,h/2)];
      face(rings[0],color,key);face(rings[3],color,key);
      for(let j=1;j<4;j++)for(let i=0;i<8;i++){const k=(i+1)%8;face([rings[j-1][i],rings[j-1][k],rings[j][k],rings[j][i]],color,key);}
    }
    function lathe(x,y,z,rings,color,key,across=false,section=false){
      const count=detail?(section?60:104):40;

      const rows=rings.map(([a,r])=>Array.from({length:count+1},(_,i)=>{
        const angle=section?Math.PI+i*Math.PI/count:i*Math.PI*2/count;
        const b=r*Math.cos(angle),c=r*Math.sin(angle);
        if(across==='up')return [x+b,y+a,z+c];
        return across?[x+c,y+b,z+a]:[x+a,y+b,z+c];
      }));
      for(let n=1;n<rows.length;n++)for(let i=0;i<count;i++){
        const k=i+1;
        face([rows[n-1][i],rows[n-1][k],rows[n][k],rows[n][i]],color,key);
      }
    }
    const tag=(x,y,z,label)=>tags.push([project([x,y,z]),label]);
    const decal=(...data)=>decals.push(data);
    const callout=(x,y,z,label,lane)=>leaders.push([project([x,y,z]),label,lane]);
    drawStation({box,plate,lathe,face,tag,decal,callout},this.model,t,this.mode);
    if(t===1&&!this.drag)shadeContacts(surface,scale);
    for(const data of decals)applyDecal(surface,project,...data);
    studioFloor(ctx,w,h,project,scale);
    surface.blit(ctx,w,h);
    ctx.font='600 12px "Malgun Gothic",sans-serif';ctx.textAlign='center';
    for(const [[x,y,z],label,lane] of leaders){
      const index=surface.indexAt(x,y);
      if(index<0||surface.depth[index]>z+scale*.09)continue;
      const tx=w*lane,ty=Math.max(27,h*.19);
      ctx.strokeStyle='#e9d9ae';ctx.lineWidth=1.25;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,ty+19);ctx.lineTo(tx,ty+8);ctx.stroke();
      ctx.fillStyle='#ffdf9c';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
      tags.push([[tx,ty],label]);
    }
    for(const [[x,y],label] of tags){
      const width=ctx.measureText(label).width+14;
      const tx=clamp(x,width/2+2,w-width/2-2),ty=clamp(y,14,h-12);
      ctx.fillStyle='#0d222ce8';ctx.beginPath();ctx.roundRect(tx-width/2,ty-10,width,20,5);ctx.fill();
      ctx.fillStyle='#fff';ctx.fillText(label,tx,ty+4);
    }
  }
}
customElements.define('workshop-station',WorkshopStation);

export function station(host,model,action=()=>{}){
  const view=document.createElement('workshop-station');host.append(view);view.update(model,action);return view;
}
