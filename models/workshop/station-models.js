const steel=0xb8cacf, dark=0x34545d, teal=0x478e82, pale=0xe3e9dc, orange=0xc97c4d, brass=0xe6bb71;
const mix=(a,b,t)=>a+(b-a)*t;
function screw(g,x,y,z,key){
  g.lathe(x,y,z,[[0,.054],[.016,.072],[.033,.055]],steel,key,'up');
  g.box(x,y+.034,z,.074,.008,.014,dark,key);
}
function bench(g,w,d){
  for(const x of [-w*.41,w*.41])for(const z of [-d*.39,d*.39])g.plate(x,-.44,z,.49,.20,.43,0x233940,null,.10);
  g.plate(0,-.24,0,w,.30,d,0x475f69,null,.22);
  g.plate(0,-.075,0,w-.06,.08,d-.06,0x819da9,null,.21);
  for(const x of [-w/2+.18,w/2-.18])for(const z of [-d/2+.18,d/2-.18])screw(g,x,-.035,z);
}
function extrusion(g,profile,z,thickness,color,key){
  // Convex sections in the XY plane. The sides give the tool its thickness.
  const a=profile.map(([x,y])=>[x,y,z-thickness/2]),b=profile.map(([x,y])=>[x,y,z+thickness/2]);
  g.face(a,color,key);g.face(b,color,key);
  for(let i=0;i<a.length;i++){const k=(i+1)%a.length;g.face([a[i],a[k],b[k],b[i]],color,key);}
}
function tray(g,x,y,z,w,d,color,key,wall=.2){
  const edge=.09;
  g.plate(x,y,z,w,.10,d,color,key,.13);
  for(const side of [-1,1]){
    g.box(x+side*(w-edge)/2,y+wall/2,z,edge,wall,d,color,key);
    g.box(x,y+wall/2,z+side*(d-edge)/2,w,wall,edge,color,key);
  }
}
function pin(g,j,p,x,y,z,units,key,across=false,section=false){
  const L=p.length,r=p.diam/2,shape=p.shape,half=L/2;
  const boreSize=shape.large||shape.bore===2?1.5:shape.small||shape.tap||shape.bore?1:0;
  const bore=(j.hole??0)*boreSize/2,depth=j.depth??0,fromLeft=j.id==='P-303';
  const grooved=shape.narrow||shape.wide,grooveAt=j.offset??L*.27,grooveEnd=grooveAt+(j.groove??.8)*(shape.wide?2:1);
  const bevel=.09*r;
  const cuts=[0,bevel,L-bevel,L];
  if(grooved)cuts.push(grooveAt,grooveEnd);
  if(bore)cuts.push(fromLeft?depth:L-depth);
  cuts.sort((a,b)=>a-b);
  const metal=j.id==='P-202'?steel:brass;
  const axial=n=>(n-half)*units;
  const rings=(a,ra,b,rb,clr)=>g.lathe(x,y,z,[[axial(a),ra*units],[axial(b),rb*units]],clr,key,across,section);
  let previousOuter=0,previousInner=0;
  for(let i=1;i<cuts.length;i++){
    const a=cuts[i-1],b=cuts[i],mid=(a+b)/2;
    if(b<=a)continue;
    const inGroove=grooved&&mid>grooveAt&&mid<grooveEnd;
    const outer=inGroove?(j.root??p.diam*.77)/2:r;
    const left=a===0?r-bevel:outer,right=b===L?r-bevel:outer;
    const inner=bore&&(fromLeft?mid<depth:mid>L-depth)?bore:0;
    if(a===0)rings(a,inner,a,left,metal);
    else{
      if(left!==previousOuter)rings(a,previousOuter,a,left,metal);
      if(inner!==previousInner)rings(a,previousInner,a,inner,0x6b6356);
    }
    rings(a,left,b,right,metal);
    if(inner)rings(a,inner,b,inner,0x655e50);
    if(b===L)rings(b,right,b,inner,metal);
    if(section)for(const side of [-1,1]){
      const v=(n,radius)=>[x+axial(n),y+side*radius*units,z];
      g.face([v(a,left),v(b,right),v(b,inner),v(a,inner)],0xe39d67,key);
      // Hatch marks stay on the cut metal and stop at the bore wall.
      for(let n=Math.ceil((a+.19)/.49)*.49;n<b-.23;n+=.49){
        const radius=left+(right-left)*(n-a)/(b-a),shift=side*.18;
        g.face([v(n+shift,radius),v(n+shift+.035,radius),v(n+.035,inner),v(n,inner)].map(([u,v,w])=>[u,v,w+.002]),0x9c704d,key);
      }
    }
    previousOuter=right;previousInner=inner;
  }
}
function residue(g,x,y,z,r,span,key){
  // Thin curled ribbons sit on the curved surface; the oil follows its curvature.
  for(const [fraction,angle] of [[-.27,.68],[.22,1.03]]){
    const center=x+fraction*span;
    for(let i=0;i<16;i++){
      const vertex=a=>{
        const phi=angle+.29*Math.sin(a),radius=r+.004;
        return [center+.075*span*Math.cos(a),y+radius*Math.cos(phi),z+radius*Math.sin(phi)];
      };
      g.face([[center,y+(r+.008)*Math.cos(angle),z+(r+.008)*Math.sin(angle)],vertex(i*Math.PI/8),vertex((i+1)*Math.PI/8)],0x8b743f,key);
    }
  }
  for(const f of [-.22,.08,.29]){
    const curl=(n,edge)=>{
      const a=n*Math.PI*3.3+f*6;
      return [x+span*f+(n-.5)*span*.082+edge*r*.05,y+r*1.06+r*.18*Math.cos(a),z+r*.16+r*.29*Math.sin(a)];
    };
    for(let i=0;i<19;i++)g.face([curl(i/19,-1),curl(i/19,1),curl((i+1)/19,1),curl((i+1)/19,-1)],0x819da9,key);
  }
}
function washing(g,m,t,mode){
  const {j,pieces,washingIds=[]}=m;
  if(mode==='표면 확대'){
    const p=pieces[0],u=4.35/p.length;
    pin(g,j,p,0,.62,0,u,p.cleaned?'next':'wash');
    if(!p.cleaned)residue(g,0,.62,0,p.diam*u/2,p.length*u,'wash');
    g.tag(0,-.24,0,'핀 #'+p.number+(p.cleaned?' · 건조 후':' · 세척 전'));
    return;
  }
  bench(g,8.55,3.65);
  tray(g,-2.7,.02,0,2.4,2.7,steel,'wash');
  tray(g,0,.12,0,2.45,2.7,teal,'wash',.45);
  g.plate(0,.30,0,2.20,.08,2.45,0x69aab2,'wash');
  // Header and downward-facing nozzles sit directly over the basket.
  for(const x of [-.75,0,.75]){
    g.lathe(x,1.48,0,[[0,.055],[.12,.17],[.19,.105],[.26,.10]],steel,'wash','up');
    g.box(x,1.77,-.51,.16,.16,1.17,0x819da9,'wash');
  }
  for(const x of [-1.12,1.12])g.plate(x,.55,0,.12,.09,2.65,steel,'wash');
  g.plate(2.7,.56,-1.20,2.09,.87,.34,dark,'next');
  for(let i=0;i<8;i++)g.box(1.92+i*.22,.58,-1.014,.09,.43,.045,0x879da3,'next');
  tray(g,2.7,.04,0,2.45,2.7,0xa7c6b3,'next');
  for(let i=0;i<7;i++)g.box(2.7,.12,(i-3)*.33,2.18,.06,.07,steel,'next');
  // Raised strainer and drain slots on the inlet side.
  for(let i=0;i<9;i++)g.plate(-2.7,.105,(i-4)*.24,1.95,.045,.085,0x819da9,'wash',.03);
  for(const side of [-1,1]){
    g.plate(side*.85,.62,-1.17,.26,.13,.37,steel,'wash');
    g.plate(side*1.13,.17,1.37,.19,.23,.09,dark,'wash',.025);
  }
  for(const x of [-.94,.94])g.box(x,.95,-1.1,.1,1.7,.12,dark,'wash');
  g.box(0,1.78,-1.08,2.05,.17,.23,steel,'wash');
  const moving=pieces.filter(p=>washingIds.includes(p.number));
  const lane=(list,i)=>(i-(list.length-1)/2)*.60;
  const x=t<.35?mix(-2.7,0,t/.35):t<.64?0:mix(0,2.7,(t-.64)/.36);
  const lift=t<.35?Math.sin(Math.PI*t/.35)*.65:t<.64?0:Math.sin(Math.PI*(t-.64)/.36)*.65;
  if(moving.length&&t<1){
    for(let i=-3;i<=3;i++)g.box(x+i*.30,.41+lift,0,.038,.04,2.18,steel,'wash');
    for(let i=-4;i<=4;i++)g.box(x,.44+lift,i*.255,2.02,.035,.033,steel,'wash');
    for(const side of [-1,1]){
      g.box(x+side*.99,.51+lift,0,.065,.22,2.23,steel,'wash');
      g.box(x,.51+lift,side*1.10,2.02,.22,.065,steel,'wash');
    }
    if(t>.34&&t<.65)for(const outlet of [-.75,0,.75])for(let k=0;k<8;k++){
      const drop=(t*9+k/8)%1,angle=k*2.40,spread=.24*drop;
      g.box(outlet+spread*Math.cos(angle),1.45-drop*.96,spread*Math.sin(angle),.032,.09,.032,0x9ce2e4);
    }
  }
  const dry=pieces.filter(p=>p.cleaned),dirty=pieces.filter(p=>!p.cleaned);
  for(const p of pieces){
    const active=t<1&&washingIds.includes(p.number);
    const laneList=active?moving:p.cleaned?dry:dirty;
    const z=lane(laneList,laneList.indexOf(p));
    const px=active?x:p.cleaned?2.7:-2.7;
    const py=active?.49+lift:p.cleaned?.21:.132;
    const u=1.65/j.length;
    pin(g,j,p,px,py+p.diam*u/2,z,u,p.cleaned?'next':'wash');
    if(!p.cleaned||(active&&t<.48))residue(g,px,py+p.diam*u/2,z,p.diam*u/2,p.length*u,p.cleaned?'next':'wash');
  }
  if(moving.length&&t<1)g.tag(x,1.20+lift,.30,t<.35?'바스켓 이송':t<.64?'분사 세척':t<.87?'배수 · 이동':'건조');
  g.tag(-2.7,.18,1.66,'투입');g.tag(0,.18,1.66,'세척조');g.tag(2.7,.18,1.66,'건조 트레이');
}
function inspection(g,m,mode){
  const {j,p,gauge}=m;
  if(mode!=='전체'&&!gauge){
    pin(g,j,p,0,.62,0,4.35/p.length,'optical',false,mode==='축 단면');
    if(mode==='축 단면'){
      const u=4.35/p.length,half=2.175,side=j.id==='P-303'?-1:1;
      if(p.shape.bore||p.shape.small||p.shape.large||p.shape.tap)g.callout(side*(half-(j.depth??0)*u),.62,0,'막힌 구멍 바닥',side<0?.19:.76);
      if(p.shape.narrow||p.shape.wide)g.callout(-half+((j.offset??p.length*.27)+(j.groove??.8)/2)*u,.62+(j.root??p.diam*.76)*u/2,0,'홈 바닥',j.id==='P-303'?.48:.26);
      if(!j.hole&&!p.shape.narrow&&!p.shape.wide)g.callout(0,.62+p.diam*u/2,0,'연속된 몸통 외경',.50);
      g.tag(0,-.27,.05,'핀 #'+p.number+' · 축 방향 단면');
    }
    return;
  }
  bench(g,8.25,3.8);
  if(!gauge){
    tray(g,0,.02,0,5.65,2.45,0xa5bab7,'optical');
    const u=4.35/p.length,r=p.diam*u/2;
    for(const x of [-1.4,1.4]){
      g.box(x,.22,.32,.35,.34,.26,teal,'optical');
      g.box(x,.22,-.32,.35,.34,.26,teal,'optical');
    }
    pin(g,j,p,0,.32+r,0,u,'optical');
    g.box(-2.9,.78,-1.2,.16,1.64,.2,steel,'optical');
    g.plate(-2.25,1.58,-1.2,1.45,.20,.42,teal,'optical');
    g.lathe(-1.65,1.25,-1.16,[[0,.25],[.09,.25],[.14,.18],[.28,.18]],dark,'optical','up');
    g.lathe(-1.65,1.25,-1.16,[[0,.16],[.02,.16]],0x92d4cf,'optical','up');
    g.tag(0,.16,1.65,'핀 #'+p.number+' · 형상 관찰');
    return;
  }
  const {key,units,gap,placed}=gauge;
  const start=-2.05, end=start+gap*units;
  if(key==='length'){
    g.box(.45,1.23,-.23,6,.27,.22,steel,'handle');
    extrusion(g,[[start-.34,1.32],[start,1.32],[start,.17],[start-.10,.20],[start-.32,.54]],0,.31,steel);
    extrusion(g,[[end,1.32],[end+.35,1.32],[end+.31,.55],[end+.10,.20],[end,.17]],0,.31,steel,'handle');
    g.plate(end+.52,1.22,-.05,1.13,.4,.48,teal,'handle');
    g.lathe(end+.67,.94,-.04,[[0,0],[0,.14],[.25,.14],[.25,0]],steel,'handle');
    g.lathe(end+.32,1.43,-.05,[[0,.09],[.09,.115],[.14,.10]],steel,'handle','up');
    for(let i=0;start+i*units<3.4;i++)g.box(start+i*units,1.34,-.10,.018,i%5===0?.15:.09,.055,dark);
    pin(g,j,p,placed?start+p.length*units/2:.2,placed?.52:.06+p.diam*units/2,placed?0:1.12,units,'pin');
  }else{
    const arc=(angle,outer)=>[-.84+(outer?1.98:1.55)*Math.cos(angle),1.10+(outer?1.15:.77)*Math.sin(angle)];
    for(let i=0;i<20;i++){
      const a=Math.PI+i*Math.PI/20,b=a+Math.PI/20;
      extrusion(g,[arc(a,true),arc(b,true),arc(b,false),arc(a,false)],0,.52,i>6&&i<14?dark:teal);
    }
    const rod=(a,b,r,col,id)=>g.lathe(0,1.12,0,[[a,0],[a,r],[b,r],[b,0]],col,id);
    rod(-2.95,start,.15,steel);rod(end,1.30,.15,steel,'handle');
    rod(1.13,2.22,.34,dark,'handle');rod(2.22,3.08,.40,steel,'handle');rod(3.08,3.65,.24,teal,'handle');
    g.decal(1.66,1.469,0,.84,.31,[gap.toFixed(3)],'lcd');
    for(let i=0;i<7;i++)rod(3.13+i*.069,3.15+i*.069,.252,dark,'handle');
    pin(g,j,p,placed?start+p.diam*units/2:-.8,placed?1.12:.08+p.diam*units/2,placed?0:1.25,units,'pin',placed);
  }
  if(placed&&gap===p[key]){
    const y=key==='length'?.52:1.12;
    for(const px of [start,end])g.box(px,y,.19,.039,.25,.07,0x9bf6b0);
    g.tag((start+end)/2,y+.58,0,'양쪽 접촉');
  }
  g.tag(0,.02,1.92,key==='length'?'양 끝면 · 전장':'몸통 외경 · '+gap.toFixed(3)+' mm');
}
function carton(g,j,x,y,z,sealed,label,key,closing=1){
  tray(g,x,y,z,2.65,1.92,0x9ab69d,key,.32);
  if(j.id!=='P-202')for(const k of [-1,1])g.box(x,y+.13,z+k*.31,2.48,.24,.065,0xd1debf,key);
  // Lid rests upright on the same weighing platform until the count is confirmed.
  const angle=(1-(sealed?closing:0))*1.40;
  const lid=(u,v,h)=>[x+u,y+.39+v*Math.sin(angle)+h*Math.cos(angle),z-.98+v*Math.cos(angle)-h*Math.sin(angle)];
  const shell=[[-1.34,0],[1.34,0],[1.34,1.98],[-1.34,1.98]];
  const lower=shell.map(([u,v])=>lid(u,v,0)),upper=shell.map(([u,v])=>lid(u,v,.08));
  g.face(lower,0xb7c9ba,key);g.face(upper,pale,key);
  for(let i=0;i<4;i++){const k=(i+1)%4;g.face([lower[i],lower[k],upper[k],upper[i]],steel,key);}
  if(!sealed)return;
  g.face([lid(-.92,0,.086),lid(-.70,0,.086),lid(-.70,1.98,.086),lid(-.92,1.98,.086)],teal,key);
  if(closing===1){
    for(const side of [-1,1])g.plate(x+side*.81,y+.26,z+1.01,.25,.24,.09,dark,key,.04);
  }
  if(label){
    g.plate(x+.27,y+.49,z-.07,1.5,.045,1.00,0xfbf3dc,key,.06);
    g.decal(x+.27,y+.514,z-.07,1.39,.91,[j.id+' / '+j.rev,j.lot,label],'paper');
  }
}
function packing(g,m,t){
  const {j,records,chosen,selected,container,sealed,tared}=m;
  bench(g,8.55,3.85);
  tray(g,-2.06,.04,-.49,3.45,1.93,teal);
  tray(g,-2.06,.04,1.12,3.45,1.04,orange);
  const pass=records.filter(p=>p.pass&&!chosen.includes(p.number));
  const reject=records.filter(p=>!p.pass).slice(-2);
  for(const [group,z] of [[pass,-.49],[reject,1.12]]){
    group.forEach((p,i)=>{
      const front=z+(i-(group.length-1)/2)*(p.pass?.50:.32),key='piece-'+p.number;
      g.plate(-3.24,.154,front,.63,.084,.29,dark,key,.045);
      g.decal(-3.24,.199,front,.56,.26,['#'+p.number],'id');
      if(selected.includes(p.number))g.box(-2.06,.145,front,2.1,.065,.38,0xefd56a,key);
      pin(g,j,p,-2.06,.18+p.diam*.75/j.length,front,1.5/j.length,key);
    });
  }
  g.plate(1.90,.08,0,3.32,.40,3.06,steel,'pan',.26);
  g.plate(1.90,.32,-.20,2.98,.12,2.4,dark,'pan');
  g.box(1.90,.313,1.28,1.32,.08,.36,tared?0xa7d7aa:0x687c7c,'tare');
  g.decal(1.90,.356,1.28,1.26,.30,[(m.weight??0).toFixed(3)+' g'],'lcd');
  if(container){
    carton(g,j,1.90,.46,-.20,sealed,false,'seal',m.closing?t:1);
    if(!sealed||(m.closing&&t<1))chosen.forEach((n,i)=>{
      const p=records.find(v=>v.number===n);
      const travel=m.loading?t:1;
      g.decal(2.95,.515,-.20+(i-1)*.59,.43,.25,['#'+n],'id');
      pin(g,j,p,mix(-2.06,1.9,travel),mix(.18,.56,travel)+p.diam*.75/j.length+Math.sin(travel*Math.PI)*.75,-.20+(i-1)*.59,1.5/j.length,'piece-'+n);
    });
  }
  g.tag(-2.06,.35,-1.75,'합격 트레이');g.tag(-2.06,.12,1.87,'격리');g.tag(1.90,.30,1.75,(tared?'NET ':'GROSS ')+(m.weight??0).toFixed(3)+' g');
}
function handover(g,m,t){
  bench(g,8.55,3.65);
  for(const x of [-2.1,2.1])tray(g,x,0,0,3.65,2.85,x<0?steel:teal,x<0?'origin':'receive');
  const progress=m.received?t:(m.transfer??0),x=mix(-2.10,2.10,progress),y=.15+Math.sin(progress*Math.PI)*.72;
  carton(g,m.j,x,y,0,true,m.packed.ids.length+' PCS  '+m.packed.net.toFixed(3)+' g','deliver');
  g.box(x+.95,y+.51,.41,.65,.055,.87,0xf3e8c8,'deliver');
  g.decal(x+.95,y+.54,.41,.60,.79,['검사표',m.packed.ids.map(n=>'#'+n).join(' ')],'paper');
  g.tag(-2.1,.10,1.7,'인계 대기');g.tag(2.1,.10,1.7,'수령대');
}
function sorting(g,m,t){
  const {j,records}=m;
  bench(g,8.3,3.45);
  tray(g,-2.0,.02,0,3.55,2.55,teal);
  tray(g,2.0,.02,0,3.55,2.55,orange);
  for(const pass of [true,false]){
    const shown=records.filter(p=>p.pass===pass).slice(-3);
    shown.forEach((p,i)=>{
      const arriving=p===records.at(-1),progress=arriving?t:1;
      const x=mix(0,pass?-2:2,progress),z=(i-(shown.length-1)/2)*.68;
      pin(g,j,p,x,.14+p.diam/j.length+.85*(1-progress),z,2/j.length);
      if(progress===1)g.decal(x-1.42,.077,z,.51,.28,['#'+p.number],'id');
    });
  }
  g.tag(-2,.12,1.65,'합격 '+records.filter(p=>p.pass).length+'개');
  g.tag(2,.12,1.65,'격리 '+records.filter(p=>!p.pass).length+'개');
}
export function drawStation(g,m,t,mode){
  if(m.kind==='wash')washing(g,m,t,mode);
  if(m.kind==='inspect')inspection(g,m,mode);
  if(m.kind==='sort')sorting(g,m,t);
  if(m.kind==='pack')packing(g,m,t);
  if(m.kind==='handoff')handover(g,m,t);
}
