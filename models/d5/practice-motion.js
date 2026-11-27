(() => {
  'use strict';
  const study=globalThis.EscoFrontStudy, model=globalThis.D5PracticeState;
  const clamp=n=>Math.max(0,Math.min(1,n));
  const ease=n=>{const u=clamp(n);return u*u*(3-2*u);};
  const practiceRings=[[1.32,.001],[1.32,.13],[2.77,.13]];
  for(let i=0;i<=36;i++) practiceRings.push([2.77-.35*i/36,.061]);
  practiceRings.push([2.42,.001]);

  function pose(previous,next,action,progress) {
    const p=clamp(progress), u=ease(p), kind=action?.kind;
    const active=previous.active, oldIndex=study.stationIds.indexOf(active), newIndex=study.stationIds.indexOf(next.active);
    const commonTime={empty:0,ready:4,held:5,cut:6,done:7};
    let t=commonTime[next.phase], travel=['held','cut','done'].includes(next.phase)?.82:0;
    let shape=next.shape, lift=0, mount=next.mount, spin=0, cutting=false;
    let camDelta=newIndex-oldIndex;
    if(!study.cnc && Math.abs(camDelta)>1) camDelta-=Math.sign(camDelta)*3;
    const angle=-(oldIndex+camDelta*u)*Math.PI*2/3;
    const oldZ=study.stationCenter(oldIndex)[1], newZ=study.stationCenter(newIndex)[1];
    if(kind==='feed') t=2+2*u;
    if(kind==='cut'){ t=5+u;cutting=p<1; }
    if(kind==='eject') t=6+u;
    if(kind==='work') {
      const tool=previous.mount[active];
      if(tool==='collet'){t=4+ease((p-.55)/.45);travel=.82*ease(p/.55);}
      else {
        const infeed=ease(p/.55), withdrawal=ease((p-.57)/.43);
        travel=.86*infeed*(1-withdrawal);
        const contact=clamp((infeed*.86-.51)/.35);
        shape={...previous.shape,[tool]:Math.max(previous.shape[tool],contact)};
        if(tool==='large' && contact>0) shape.tap=previous.shape.tap*(1-contact);
        spin=tool==='tap'?Math.PI*8*(infeed-withdrawal):p*Math.PI*8;
      }
    }
    if(kind==='fit'||kind==='remove'){
      mount=p<.5?previous.mount:next.mount;
      lift=p<.5?ease(p*2):1-ease((p-.5)*2);
    }
    const common=D2Cycle.at(t);
    return {...common,cutting:cutting || (kind==='feed' && common.cutting),shape,mount,
      bore:Math.max(shape.small,shape.large),travel,spindleAngle:spin,spinSlot:active,
      cos:Math.cos(angle),sin:Math.sin(angle),slide:-(oldZ+(newZ-oldZ)*u),lift,liftSlot:action?.slot};
  }

  function removable(object){
    return /^(tool_shank_|tool_tip_|flute_|tap_ridge_|collet_mouth|collet_jaw_)/.test(object.name);
  }
  function toolVertex(v,o,s) {
    if(!removable(o))return v;
    let [x,y,z]=v;
    const slot=study.stationIds.indexOf(o.id),[cy,cz]=study.stationCenter(slot);
    if(s.mount[o.id]==='large'){
      y=cy+(y-cy)*1.48;z=cz+(z-cz)*1.48;
    }
    if(o.id===s.liftSlot){y+=s.lift*.55;z+=s.lift*.68;}
    return [x,y,z];
  }
  function pinVertex(v,s) {
    const [x,y,z]=v, radius=Math.hypot(y-4,z);
    if(x<2.419 || radius>.09) return v;
    const depth=s.bore, fraction=clamp((2.77-x)/.35), atDepth=fraction*depth;
    const opening=clamp(depth*15);
    let inner=s.shape.large>0 && atDepth<=s.shape.large+.000001 ? .091 : .061;
    if(s.shape.tap>0 && atDepth<=s.shape.tap+.000001){
      const turns=atDepth*5-Math.atan2(z,y-4)/(2*Math.PI);
      inner+=.010*(.5-.5*Math.cos(2*Math.PI*turns));
    }
    const scale=radius<.004?0:opening*inner/.061;
    return [2.77-.35*atDepth,4+(y-4)*scale,z*scale];
  }
  study.practiceMotion={pose,practiceRings,pinVertex,toolVertex,removable,blank:model.blank};
})();
