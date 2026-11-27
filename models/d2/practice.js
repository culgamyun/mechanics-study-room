(() => {
  'use strict';
  const study=globalThis.D2TurningStudy;
  if(!study)return;
  const api=globalThis.D2PracticeState;
  const el=id=>document.getElementById(id);

  function pinDiagram(shape){
    const xAt=x=>18+(x-study.start)/(study.end-study.start)*173;
    const edge=sign=>study.rings.map(x=>xAt(x).toFixed(2)+','+
      (49+sign*19*study.radiusAt(x,shape)/study.radius).toFixed(2));
    const outline=edge(-1).concat(edge(1).reverse()).join(' ');
    return '<svg viewBox="0 0 316 100" role="img" aria-label="'+api.shapeName(shape)+'의 옆모양과 끝면">'+
      '<text x="16" y="19">옆모양</text><text x="229" y="19">끝면</text>'+
      '<polygon points="'+outline+'" fill="#eac073" stroke="#ffdfa6"/>'+
      '<circle cx="249" cy="49" r="19" fill="#eac073" stroke="#ffdfa6"/>'+
      '<path d="M9 49h191m20 0h58" stroke="#738f91" stroke-dasharray="4 4"/>'+
      '<text x="16" y="90">'+(shape.narrow||shape.wide?'둘레에 낸 홈이 옆모양에서 보입니다.':'홈을 내기 전에는 옆선이 곧습니다.')+'</text></svg>';
  }

  function hint(state,slot){
    if(state.phase==='empty')return '소재 이송을 누르고 금색 선재의 끝과 표면의 밝은 표시를 따라가 보세요.';
    if(state.phase==='done')return '다시 소재 이송을 누르면 남은 선재가 현재 위치에서 계속 전진해 앞서 절단한 핀을 밉니다.';
    if(state.phase==='held')return '콜릿이 핀 끝을 잡았습니다. 절단을 누르거나, 더 가공하려면 콜릿을 푸세요.';
    if(state.phase==='cut')return '핀이 소재에서 떨어졌습니다. 배출을 눌러 완성된 핀을 비교함에 담으세요.';
    if(state.mount[slot]==='none')return api.labels[slot]+'에 장착된 공구가 없습니다. 넣을 공구를 고른 뒤 장착하세요.';
    if(state.shape.wide||state.shape.narrow)return '옆모양에서 홈을 찾아보세요. 다음은 콜릿으로 잡기 → 절단 → 배출입니다.';
    return '홈 가공을 눌러 선재 둘레를 깎으세요. 홈 없는 핀을 만들려면 바로 콜릿으로 잡으세요.';
  }

  function completedText(action,old,slot){
    switch(action.kind){
      case 'fit':return api.tools[action.tool]+' 장착 완료. '+api.labels[slot]+'를 확인하세요.';
      case 'remove':return api.tools[old.mount[slot]]+' 분리 완료. '+(slot==='counter'?'초록색 몸체는 그대로 남습니다.':'회전 헤드에 홀더가 남습니다.');
      case 'feed':return '선재가 가공 위치까지 나왔습니다. 홈 가공을 누르면 주황색 날이 선재 둘레를 깎습니다.';
      case 'work':return old.shape.wide&&old.mount.groove==='narrow'?'좁은 날이 기존 홈 안을 지나갔습니다. 이미 깎은 넓은 홈은 그대로입니다.':'홈 가공을 마쳤습니다. 주황색 날이 물러나도 핀에 깎인 자리가 남습니다.';
      case 'grip':return old.phase==='held'?'콜릿이 풀렸습니다. 다시 공구를 교환하거나 홈을 가공할 수 있습니다.':'콜릿이 핀 끝을 잡았습니다. 이제 보라색 절단 날을 사용할 수 있습니다.';
      case 'cut':return '절단 날이 소재와 핀 사이를 끊었습니다. 핀은 아직 콜릿이 잡고 있습니다.';
      case 'eject':return '콜릿이 열리고 남은 선재가 절단 틈을 메워 핀을 밀었습니다. 비교함에서 핀을 확인하세요. 다음 이송에서도 앞 핀이 함께 밀려 받이로 갑니다.';
    }
  }

  study.startPractice=view=>{
    document.title='D2 '+study.variant+' 공구 탈부착 실습';
    document.querySelector('h1').textContent='D2 공구 탈부착 실습';
    el('intro').textContent='회전 헤드의 날을 바꿔 핀 둘레에 홈을 내고, 배출한 두 핀의 옆모양을 비교해 보세요.';
    el('d2-variants').hidden=false;
    el(study.cnc?'cnc-link':'cam-link').setAttribute('aria-current','page');
    el('variant-note').hidden=false;
    el('variant-note').textContent=study.cnc?'제조사 표준 CNC 예시입니다. 콜릿이 축을 따라 핀 쪽으로 다가온 뒤 닫힙니다.':'캠식 FLEX SPEED의 고정형 콜릿 예시입니다. 콜릿이 같은 위치에서 여닫히는 모습을 보세요.';
    el('practice-link').href='index.html';
    el('practice-link').textContent='7단계 자동 시연 보기';
    const key=document.querySelector('.key');
    key.classList.add('turning-key');
    key.innerHTML='<span>● 선재·핀</span><span>● 홈 날</span><span>● 절단 날</span>';
    const peer=el('d5-link');
    peer.href='../d5/index.html?mode=practice'+(study.cnc?'&variant=cnc':'');
    peer.textContent='D5 정면 공구 실습 →';
    globalThis.mountPracticePanel(view,study,api,{
      initialSlot:'groove',storageKey:'esco.d2.turning-practice.v1.'+study.modelKey,
      controls:{feed:'소재 이송',work:'홈 가공',grip:'콜릿으로 잡기',cut:'절단',eject:'배출'},
      buttonLabels:state=>({grip:state.phase==='held'?'콜릿 풀기':'콜릿으로 잡기'}),
      example:'첫 핀은 기본 장착된 좁은 홈 날로 만듭니다. 소재 이송 → 홈 가공 → 콜릿으로 잡기 → 절단 → 배출을 눌러 보세요. 다음 핀은 홈 날 자리에서 넓은 홈 날로 교체한 뒤 같은 순서로 만드세요. 두 핀의 홈 폭은 어디에서 달라졌나요?',
      phaseText:state=>api.names[state.phase]+' · '+(study.cnc?'이동형 콜릿':'고정형 콜릿'),
      focusForAction:(kind,id)=>({work:'groove',grip:'counter',cut:'parting',fit:id,remove:id})[kind],
      motionLabels:{fit:'공구 장착',remove:'공구 분리',grip:'콜릿 작동',work:'홈 가공',cut:'핀 절단',eject:'핀 배출'},
      completedText,hint,pinDiagram
    });
  };
})();
