import {machines,slots,phaseNames,shapeName,practiceApi} from './practice-state.js';
import {pose,profile,pin,cavity} from './motion.js';
import {createScene} from './scene.js';

const model=new URLSearchParams(location.search).get('model')==='deco'?'deco':'star';
const machine=machines[model];
const el=id=>document.getElementById(id);
const api=practiceApi(machine);
document.title=machine.name+' 공구 실습 · Machine Explorer';
el('title').textContent=machine.name+' 공구 실습';
el(model).setAttribute('aria-current','page');
el('machine-note').textContent=machine.detail;
el('scope').textContent=model==='star'
  ? 'STAR 10JC는 제조사의 SR-10J type C 표기를 기준으로 했습니다. 6자리 선삭 공구대와 별도의 4자리 배면 유닛 중 이 핀에 쓰는 세 공구를 조작합니다.'
  : 'DECO 10a의 부주축을 갖춘 구성을 기준으로 했습니다. 독립된 두 크로스 슬라이드와 부주축의 역할을 보며, 실습에서는 한 번에 한 동작씩 진행합니다.';
el('source').href=machine.url;el('source').textContent=machine.source;

function pinDiagram(shape) {
  const y=50,scale=92,at=x=>20+175*(x-pin.start)/(pin.end-pin.start);
  const edge=side=>profile(shape).map(([x,r])=>at(x).toFixed(2)+','+(y+side*scale*r).toFixed(2));
  const silhouette=edge(-1).concat(edge(1).reverse()).join(' ');
  const hole=cavity(shape);
  const bore=hole[hole.length-1][1]*scale;
  const innerEdge=side=>hole.map(([x,r])=>at(x).toFixed(2)+','+(y+side*r*scale).toFixed(2));
  const voidOutline=innerEdge(-1).concat(innerEdge(1).reverse()).join(' ');
  return '<svg viewBox="0 0 316 97" role="img" aria-label="'+shapeName(shape)+'의 길이 단면과 잘린 끝면">'+
    '<text x="18" y="20">길이 단면</text><text x="216" y="20">잘린 끝면</text>'+
    '<polygon points="'+silhouette+'" fill="#ebc17a" stroke="#ffdf9c"/>'+
    (bore?'<polygon points="'+voidOutline+'" fill="#19303b" stroke="#ffdf9c"/>':'')+
    '<circle cx="250" cy="50" r="20" fill="#ebc17a" stroke="#ffdf9c"/>'+
    (bore?'<circle cx="250" cy="50" r="'+bore+'" fill="#19303b" stroke="#ffdf9c"/>':'')+
    '<path d="M8 50h195m18 0h58" stroke="#7d969b" stroke-dasharray="4 4"/>'+
    '<text x="18" y="88">왼쪽이 절단 날이 지나간 면입니다.</text></svg>';
}
const hint=state=>({
  empty:'소재 이송을 눌러 주축대와 금색 봉재가 함께 전진하는지 보세요.',
  ready:state.shape.narrow||state.shape.wide?'홈을 냈습니다. 부주축으로 핀 끝을 잡아 보세요.':'홈 가공을 누르세요. 홈 없는 핀을 만들려면 바로 부주축으로 잡으세요.',
  held:'두 주축이 핀을 잡았습니다. 절단·인계를 누르면 부주축이 잘린 핀을 가져갑니다.',
  transferred:'이제 잘린 면이 드릴 쪽에 있습니다. 배면 드릴 가공을 누르거나 바로 배출하세요.',
  done:'홈 날이나 드릴을 바꾸고 다음 핀을 만드세요. 최근 두 결과를 비교할 수 있습니다.'
})[state.phase];
function completedText(action,old,slot) {
  switch(action.kind) {
    case 'fit': return api.tools[action.tool]+' 장착 완료. '+api.labels[slot]+'를 보세요.';
    case 'remove': return api.tools[old.mount[slot]]+' 분리 완료. 홀더는 자리에 남습니다.';
    case 'feed': return '주축대가 봉재를 밀었습니다. 가이드 부시 바로 앞이 깎을 자리입니다.';
    case 'work': return old.shape.wide&&old.mount.groove==='narrow'?'좁은 날이 기존 홈을 통과했습니다. 넓은 홈이 그대로 남습니다.':'봉재가 도는 동안 날이 들어갔다 물러나 둘레에 홈이 남았습니다.';
    case 'grip': return old.phase==='held'?'부주축이 물러났습니다. 주축이 봉재를 잡고 있습니다.':'부주축이 다가와 핀 끝을 잡았습니다. 두 주축 사이에 절단 날이 보입니다.';
    case 'cut': return '절단된 핀을 부주축이 받았습니다. 왼쪽의 잘린 면이 아래쪽 배면 드릴을 마주 봅니다.';
    case 'back': return old.shape.bore===2&&old.mount.drill==='small'?'작은 드릴이 기존 구멍 안을 지났습니다. 큰 구멍은 그대로입니다.':'부주축이 핀을 돌리며 드릴 쪽으로 전진했습니다. 잘린 끝면의 구멍을 확인하세요.';
    case 'eject': return '받이로 핀을 배출했습니다. 비교함에서 홈과 뒷면 구멍을 확인하세요.';
  }
}
const study={cnc:true,stationIds:slots,practiceMotion:{pose}};
const view=createScene(el('view'),model==='star',id=>study.onPartPicked?.(id));
globalThis.mountPracticePanel(view,study,api,{
  storageKey:'swiss.practice.v1.'+model,initialSlot:'groove',
  controls:{feed:'소재 이송',work:'홈 가공',grip:'부주축으로 잡기',cut:'절단·인계',back:'배면 드릴 가공',eject:'배출'},
  buttonLabels:state=>({grip:state.phase==='held'?'부주축 풀기':'부주축으로 잡기'}),
  previewActions:['feed','work','cut','back','eject'],durations:{cut:1700,grip:1100,back:1500},
  motionLabels:{fit:'공구 장착',remove:'공구 분리',grip:'부주축 파지·해제'},
  example:'첫 핀은 소재 이송 → 홈 가공 → 부주축으로 잡기 → 절단·인계 → 배출 순서로 만드세요. 두 번째 핀은 절단·인계 후 배면 드릴 가공을 추가하세요. 두 핀의 어느 쪽 끝이 달라졌나요?',
  focusForAction:(kind,id)=>({feed:'main',work:'groove',grip:'sub',cut:'blade',back:'drill',eject:'product',fit:id,remove:id})[kind],
  phaseText:state=>phaseNames[state.phase],hint,completedText,pinDiagram
});
