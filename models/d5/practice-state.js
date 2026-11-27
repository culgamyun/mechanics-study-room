/* Dimensionless classroom model. All changes are committed at the end of one action. */
(() => {
  'use strict';
  const tools = {
    none:'빈 자리', small:'가는 드릴', large:'굵은 드릴', tap:'암나사 탭', collet:'카운터 콜릿'
  };
  const labels = {counter:'콜릿 자리',drill1:'드릴 주축 1',drill2:'드릴 주축 2',tap:'나사 가공 주축'};
  const names = {empty:'소재 대기',ready:'가공 중',held:'콜릿 파지',cut:'절단 완료',done:'배출 완료'};
  const blank = () => ({small:0,large:0,tap:0});
  const compatible = id => id==='counter'?['collet']:id==='tap'?['tap']:['small','large'];
  const slots = cnc => cnc?['counter','drill1','drill2','tap']:['counter','drill1','drill2'];
  const initial = cnc => ({
    phase:'empty',active:'counter',shape:blank(),samples:[],
    mount:Object.fromEntries(slots(cnc).map(id=>[id,id==='counter'?'collet':id==='drill1'?'small':'none']))
  });
  function shapeName(shape) {
    if(shape.large) return '굵은 막힌 구멍';
    if(shape.tap) return '암나사가 있는 구멍';
    return shape.small?'가는 막힌 구멍':'구멍 없는 핀';
  }
  function change(state,action) {
    const {kind,slot,tool}=action;
    const reject = message => ({error:message});
    const next={...state};
    if(kind==='fit' || kind==='remove'){
      if(!Object.hasOwn(state.mount,slot)) return reject('먼저 장착할 자리를 고르세요.');
      if(state.phase==='held'||state.phase==='cut') return reject('콜릿이 핀을 잡고 있습니다. 절단과 배출을 마친 뒤 교환하세요.');
      const value=kind==='remove'?'none':tool;
      if(kind==='fit' && !compatible(slot).includes(value)) return reject('이 자리에 맞는 공구를 고르세요.');
      if(state.mount[slot]===value) return reject(value==='none'?'이미 빈 자리입니다.':'이미 같은 공구가 장착되어 있습니다.');
      next.mount={...state.mount,[slot]:value};
    }else if(kind==='feed'){
      if(!['empty','done'].includes(state.phase)) return reject('현재 핀을 배출한 뒤 새 소재를 넣을 수 있습니다.');
      next.phase='ready';next.shape=blank();
    }else if(kind==='align'){
      if(state.phase!=='ready') return reject('소재를 이송하고 파지하기 전에 자리를 맞추세요.');
      if(!Object.hasOwn(state.mount,slot)) return reject('맞출 자리를 고르세요.');
      if(slot===state.active) return reject('이 자리는 이미 소재 중심에 맞아 있습니다.');
      next.active=slot;
    }else if(kind==='work'){
      if(state.phase!=='ready') return reject('먼저 소재를 이송하세요. 파지한 핀은 절단과 배출로 이어집니다.');
      if(slot!==state.active) return reject('선택한 자리와 소재 중심이 어긋나 있습니다. 먼저 ‘중심 맞추기’를 누르세요.');
      const fitted=state.mount[slot];
      if(fitted==='none') return reject(labels[slot]+'가 비어 있습니다. 맞는 공구를 장착하세요.');
      if(fitted==='collet') next.phase='held';
      else {
        if(fitted==='tap' && (!state.shape.small || state.shape.large))
          return reject(state.shape.large?'이 예제의 탭에는 현재 구멍이 너무 큽니다. 새 핀에 가는 구멍을 먼저 만들어 보세요.':'탭이 들어갈 구멍이 없습니다. 가는 드릴로 먼저 구멍을 내세요.');
        next.shape={...state.shape,[fitted]:1};
        if(fitted==='large') next.shape.tap=0;
      }
    }else if(kind==='cut'){
      if(state.phase!=='held') return reject('절단할 핀을 지지해야 합니다. 콜릿 자리를 중심에 맞추고 핀을 잡으세요.');
      next.phase='cut';
    }else if(kind==='eject'){
      if(state.phase!=='cut') return reject('먼저 핀을 잡고 절단하세요.');
      next.phase='done';
      next.samples=[{number:(state.samples[0]?.number??0)+1,shape:{...state.shape}},...state.samples].slice(0,2);
    }else return reject('수행할 동작을 고르세요.');
    return {next};
  }

  function restore(raw,cnc) {
    const fresh=initial(cnc);
    try {
      const saved=JSON.parse(raw);
      const validShape=s=>s && ['small','large','tap'].every(k=>s[k]===0||s[k]===1) && (!s.tap || (s.small && !s.large));
      if(!saved || !Object.hasOwn(names,saved.phase) || !Object.hasOwn(fresh.mount,saved.active)
        || !validShape(saved.shape) || !Array.isArray(saved.samples) || saved.samples.length>2) return fresh;
      if(!slots(cnc).every(id=>saved.mount?.[id]==='none'||compatible(id).includes(saved.mount?.[id]))) return fresh;
      if(!saved.samples.every(item=>item && Number.isSafeInteger(item.number)&&item.number>0&&validShape(item.shape))) return fresh;
      if(['held','cut'].includes(saved.phase) && (saved.active!=='counter'||saved.mount.counter!=='collet')) return fresh;
      return {...fresh,phase:saved.phase,active:saved.active,mount:Object.fromEntries(slots(cnc).map(k=>[k,saved.mount[k]])),
        shape:saved.shape,samples:saved.samples};
    }catch {return fresh;}
  }
  globalThis.D5PracticeState={tools,labels,names,initial,change,restore,compatible,shapeName,blank};
})();
