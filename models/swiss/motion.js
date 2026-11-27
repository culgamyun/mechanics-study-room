const bound = v => Math.max(0,Math.min(1,v));
const ramp = (p,start=0,end=1) => {const t=bound((p-start)/(end-start)); return t*t*(3-2*t);};
const stroke = (p,a,b,c,d) => ramp(p,a,b)*(1-ramp(p,c,d));
export const pin = {start:.22, end:2.32, radius:.21, center:.62, narrow:.16, wide:.44, depth:.086};
export const rear = {offset:1.7, y:-1.15, z:.72, stroke:.9, gap:.36, tipLength:.055};
const phases = {
  empty:[0,0,0],ready:[1,0,0],held:[1,1,0],transferred:[1,1,1],done:[1,0,0]
};

export function pose(old,next,action,p) {
  const kind=action?.kind;
  const [length,closure,transfer]=phases[next.phase];
  const s={feed:length,grip:closure,approach:closure,transfer,cut:transfer||next.phase==='done'?1:0,
    grooveIn:0,bladeIn:0,backIn:0,index:0,spin:0,rearSpin:0,drop:next.phase==='done'?1:0,
    pinTransfer:next.phase==='done'?1:transfer,mount:next.mount,shape:next.shape,lift:0,liftSlot:action?.slot};
  if (kind==='fit'||kind==='remove') {
    s.lift=1-Math.abs(2*ramp(p)-1);s.mount=p<.5?old.mount:next.mount;
  } else if(kind==='feed') {
    s.feed=ramp(p); s.spin=Math.PI*4*p;
  } else if(kind==='work') {
    const approach=ramp(p,0,.64);
    s.grooveIn=approach*(1-ramp(p,.70,1));
    const id=old.mount.groove;
    s.shape={...old.shape,[id]:Math.max(old.shape[id],bound((approach*.426-.34)/pin.depth))};
    s.spin=Math.PI*6*p;
  } else if(kind==='grip') {
    const t=old.phase==='held'?1-p:p;
    s.approach=ramp(t,0,.68);s.grip=ramp(t,.68,1);
    s.spin=s.rearSpin=4*Math.PI*p;
  } else if(kind==='cut') {
    s.index=stroke(p,0,.16,.68,.83);
    s.bladeIn=stroke(p,.17,.55,.56,.73);
    s.cut=bound((ramp(p,.17,.55)*.55-.34)/pin.radius);
    s.transfer=s.pinTransfer=ramp(p,.72,1);s.spin=s.rearSpin=4*Math.PI*ramp(p,0,.56);
  } else if(kind==='back') {
    s.backIn=stroke(p,0,.65,.7,1);
    const depth=Math.max(0,ramp(p,0,.65)*rear.stroke-rear.gap);
    if(depth>0 && next.shape.bore>old.shape.bore)
      s.shape={...next.shape,drillDepth:depth,priorBore:old.shape.bore};
    else s.shape=depth>0?next.shape:old.shape;
    s.rearSpin=6*Math.PI*p;
  } else if(kind==='eject') {
    s.grip=1-ramp(p,0,.19);s.drop=ramp(p,.2,.76);s.pinTransfer=1;
    s.transfer=1-ramp(p,.77,1);s.approach=1-ramp(p,.77,1);
  }
  return s;
}
export function profile(shape) {
  const {start,end,radius,center,narrow,wide,depth}=pin;
  const flank=.015;
  const rings=[start,...[wide,narrow].flatMap(w=>[center-w/2,center-w/2+flank,center+w/2-flank,center+w/2]).sort((a,b)=>a-b),end];
  return rings.map(x=>{
    const at=width=>bound((width/2-Math.abs(x-center))/flank);
    return [x,radius-depth*Math.max(shape.narrow*at(narrow),shape.wide*at(wide))];
  });
}
export function cavity(shape) {
  if(!shape.bore)return [[pin.start,0]];
  const full=rear.stroke-rear.gap,depth=shape.drillDepth??full;
  const radius=.060*shape.bore,oldRadius=.060*(shape.priorBore??0);
  const at=(x,limit,r)=>r*bound((limit-x)/rear.tipLength);
  const edges=[0,depth,depth-rear.tipLength];
  if(oldRadius) {
    // A wider drill first opens the mouth of the existing narrow hole.
    edges.push(full,full-rear.tipLength,depth-rear.tipLength*oldRadius/radius,
      (radius*depth-oldRadius*full)/(radius-oldRadius));
  }
  return [...new Set(edges.filter(x=>x>=0))].sort((a,b)=>b-a)
    .map(x=>[pin.start+x,Math.max(at(x,depth,radius),at(x,full,oldRadius))]);
}
