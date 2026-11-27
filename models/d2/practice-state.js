/* All lengths are display units. The two tools and collet have distinct jobs. */
(() => {
  'use strict';
  const slots=['groove','parting','counter'];
  const labels={groove:'홈 날 자리',parting:'절단 날 자리',counter:'콜릿 자리'};
  const tools={none:'빈 자리',narrow:'좁은 홈 날',wide:'넓은 홈 날',blade:'절단 날',collet:'카운터 콜릿'};
  const names={empty:'소재 대기',ready:'핀 가공 중',held:'콜릿 파지',cut:'절단 완료',done:'배출 완료'};
  const choices={groove:['narrow','wide'],parting:['blade'],counter:['collet']};
  const blank=()=>({narrow:0,wide:0});
  const initial=()=>({phase:'empty',mount:{groove:'narrow',parting:'blade',counter:'collet'},shape:blank(),samples:[]});
  const compatible=id=>choices[id];
  const shapeName=s=>s.wide?'넓은 홈 핀':s.narrow?'좁은 홈 핀':'민핀 · 홈 없음';
  function change(state,{kind,slot,tool}){
    const next={...state};
    const fail=error=>({error});
    if(kind==='fit'||kind==='remove'){
      if(!slots.includes(slot))return fail('교환할 자리를 고르세요.');
      if(state.phase==='held')return fail('콜릿이 핀을 잡고 있습니다. 콜릿을 풀면 다시 교환할 수 있습니다.');
      if(state.phase==='cut')return fail('절단된 핀을 배출한 뒤 공구를 교환하세요.');
      const value=kind==='remove'?'none':tool;
      if(kind==='fit'&&!compatible(slot).includes(value))return fail('이 자리에 맞는 공구를 고르세요.');
      if(value===state.mount[slot])return fail('이미 같은 장착 상태입니다.');
      next.mount={...state.mount,[slot]:value};
    }else if(kind==='feed'){
      if(!['empty','done'].includes(state.phase))return fail('현재 핀을 배출한 뒤 다음 소재를 이송하세요.');
      next.phase='ready';next.shape=blank();
    }else if(kind==='work'){
      if(state.phase!=='ready')return fail('소재를 이송한 뒤, 콜릿이 열린 상태에서 홈을 가공하세요.');
      if(state.mount.groove==='none')return fail('홈 날 자리가 비었습니다. 좁은 홈 날이나 넓은 홈 날을 장착하세요.');
      next.shape={...state.shape,[state.mount.groove]:1};
    }else if(kind==='grip'){
      if(state.phase==='held')next.phase='ready';
      else{
        if(state.phase!=='ready')return fail('소재가 가공 위치에 나온 뒤 콜릿으로 잡을 수 있습니다.');
        if(state.mount.counter!=='collet')return fail('콜릿 자리가 비었습니다. 카운터 콜릿을 장착하세요.');
        next.phase='held';
      }
    }else if(kind==='cut'){
      if(state.phase!=='held')return fail('절단 전에 콜릿으로 핀을 잡아 주세요.');
      if(state.mount.parting!=='blade')return fail('절단 날이 없습니다. 콜릿 풀기 → 절단 날 장착 → 다시 파지 순서로 진행하세요.');
      next.phase='cut';
    }else if(kind==='eject'){
      if(state.phase!=='cut')return fail('소재에서 핀을 절단한 뒤 배출할 수 있습니다.');
      next.phase='done';
      // Keep the last pin to reach the physical tray when the two comparison slots roll over.
      if(state.samples[1])next.collected={...state.samples[1].shape};
      next.samples=[{number:(state.samples[0]?.number??0)+1,shape:{...state.shape}},...state.samples].slice(0,2);
    }else return fail('실습 동작을 선택하세요.');
    return {next};
  }
  function restore(raw){
    try{
      const s=JSON.parse(raw);
      const valid=p=>p && [p.narrow,p.wide].every(v=>v===0||v===1);
      if(!s || !Object.hasOwn(names,s.phase) || !valid(s.shape) ||
        !slots.every(id=>s.mount?.[id]==='none'||compatible(id).includes(s.mount?.[id])) ||
        !Array.isArray(s.samples)||s.samples.length>2 ||
        !s.samples.every(r=>r && Number.isSafeInteger(r.number)&&r.number>0&&valid(r.shape)) ||
        (['held','cut'].includes(s.phase)&&s.mount.counter!=='collet'))return initial();
      return {phase:s.phase,mount:Object.fromEntries(slots.map(id=>[id,s.mount[id]])),shape:s.shape,samples:s.samples,
        ...(valid(s.collected)?{collected:s.collected}:{})};
    }catch{return initial();}
  }
  globalThis.D2PracticeState={slots,labels,tools,names,compatible,shapeName,blank,initial,restore,change};
})();
