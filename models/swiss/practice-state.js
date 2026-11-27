export const machines = {
  star: {
    name: 'STAR SR-10J type C', stations: ['공구대 · 홈 날', '공구대 · 절단 날', '배면 공구대 · 드릴'],
    detail: '나란히 장착한 날 중 하나를 같은 공구대가 봉재 앞으로 가져옵니다. 배면 공구대는 별도로 놓입니다.',
    source: 'STAR SR-10J type C · Tool Post / Backworking Attachment',
    url: 'https://star-m.jp/eng/products/lathe/swiss_type/SR-10J_TypeC.html/'
  },
  deco: {
    name: 'Tornos DECO 10a', stations: ['공구대 1 · 홈 날', '공구대 2 · 절단 날', '배면 공구대 · 드릴'],
    detail: '가이드 부시 주변의 공구대 두 개가 독립적으로 움직입니다. 이 예시에서는 1번에 홈 날, 2번에 절단 날을 달았습니다.',
    source: 'Tornos DECO 7/10 · 9축 구성과 기구도, 11~13쪽',
    url: 'https://www.interempresas.net/FeriaVirtual/Catalogos_y_documentos/948/tornos-deco-7-10a-uk.pdf#page=11'
  }
};

export const slots = ['groove','blade','drill'];
export const tools = {none:'빈 자리',narrow:'좁은 홈 날',wide:'넓은 홈 날',blade:'절단 날',small:'가는 드릴',large:'굵은 드릴'};
const choices = {groove:['narrow','wide'],blade:['blade'],drill:['small','large']};
export const phaseNames = {empty:'소재 이송 전',ready:'주축에서 가공',held:'두 주축이 함께 파지',transferred:'부주축에서 가공',done:'배출 완료'};
const blank = () => ({narrow:0,wide:0,bore:0});
const initial = () => ({phase:'empty',mount:{groove:'narrow',blade:'blade',drill:'small'},shape:blank(),samples:[]});

export function shapeName(shape) {
  const groove = shape.wide ? '넓은 홈' : shape.narrow ? '좁은 홈' : '민핀';
  return groove + ' · ' + (shape.bore > 1 ? '큰 뒷구멍' : shape.bore ? '작은 뒷구멍' : '구멍 없음');
}
function validShape(s) {
  return s && [0,1].includes(s.narrow) && [0,1].includes(s.wide) && [0,1,2].includes(s.bore);
}
function restore(raw) {
  try {
    const s=JSON.parse(raw);
    if (!s || !Object.hasOwn(phaseNames,s.phase) || !validShape(s.shape) ||
        !slots.every(id=>s.mount?.[id]==='none'||choices[id].includes(s.mount?.[id])) ||
        !Array.isArray(s.samples) || s.samples.length>2 ||
        !s.samples.every(item=>item && Number.isSafeInteger(item.number)&&item.number>0&&validShape(item.shape))) return initial();
    return s;
  } catch { return initial(); }
}
export function change(state,{kind,slot,tool}) {
  const next={...state};
  const fail=error=>({error});
  switch(kind) {
    case 'fit':
    case 'remove': {
      if (!slots.includes(slot)) return fail('장착할 자리를 고르세요.');
      if (state.phase==='held') return fail('부주축을 풀면 공구를 교환할 수 있습니다.');
      const value=kind==='remove'?'none':tool;
      if (kind==='fit' && !choices[slot].includes(tool)) return fail('선택한 자리에 맞는 공구를 고르세요.');
      if (value===state.mount[slot]) return fail('이미 같은 장착 상태입니다.');
      next.mount={...state.mount,[slot]:value};
      break;
    }
    case 'feed':
      if (!['empty','done'].includes(state.phase)) return fail('현재 핀을 배출하면 다음 봉재를 이송할 수 있습니다.');
      next.phase='ready'; next.shape=blank(); break;
    case 'work':
      if (state.phase!=='ready') return fail('봉재를 이송한 뒤 주축에 잡혀 있을 때 홈을 가공하세요.');
      if (state.mount.groove==='none') return fail('홈 날 자리가 비었습니다. 좁은 날 또는 넓은 날을 장착하세요.');
      next.shape={...state.shape,[state.mount.groove]:1}; break;
    case 'grip':
      if (state.phase==='held') {next.phase='ready';break;}
      if (state.phase!=='ready') return fail('먼저 봉재를 이송하세요. 인계 전 핀은 주축 쪽에 있습니다.');
      next.phase='held'; break;
    case 'cut':
      if (state.phase!=='held') return fail('먼저 부주축으로 핀 끝을 잡으세요.');
      if (state.mount.blade==='none') return fail('절단 날이 없습니다. 부주축을 풀고 절단 날을 장착하세요.');
      next.phase='transferred'; break;
    case 'back':
      if (state.phase!=='transferred') return fail('절단·인계를 마치면 잘린 뒷면이 드릴 쪽으로 이동합니다.');
      if (state.mount.drill==='none') return fail('배면 공구대에 드릴을 장착하세요.');
      next.shape={...state.shape,bore:Math.max(state.shape.bore,state.mount.drill==='large'?2:1)}; break;
    case 'eject':
      if (state.phase!=='transferred') return fail('핀을 절단해 부주축에 인계한 뒤 배출하세요.');
      next.phase='done';
      next.samples=[{number:(state.samples[0]?.number??0)+1,shape:{...state.shape}},...state.samples].slice(0,2);
      break;
    default: return fail('실습 동작을 고르세요.');
  }
  return {next};
}
export function practiceApi(machine) {
  return {tools,labels:Object.fromEntries(slots.map((id,i)=>[id,machine.stations[i]])),
    compatible:id=>choices[id],restore,shapeName,change};
}
