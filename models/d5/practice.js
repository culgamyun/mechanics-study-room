(() => {
  'use strict';
  const study=globalThis.EscoFrontStudy;
  const api=globalThis.D5PracticeState;
  const el=id=>document.getElementById(id);
  const link=el('practice-link');
  const demoURL='index.html'+(study.cnc?'?variant=cnc':'');
  link.href=study.practice?demoURL:('index.html?mode=practice'+(study.cnc?'&variant=cnc':''));
  if(!study.practice) return;

  // A section and an end view share the two drilling depths and the threaded length.
  function pinDiagram(shape) {
    const face=184, cy=49, wideDepth=shape.large*57, deep=Math.max(shape.small,shape.large)*57;
    const lip=shape.large?11:shape.small?7:0;
    let teeth='';
    for(let i=0;i<6;i++){
      const offset=5+i*8;
      if(offset>shape.tap*51 || offset<wideDepth) continue;
      const x=face-offset;
      teeth+='M'+x+' 42l-3 -3 -3 3 M'+x+' 56l-3 3 -3 -3 ';
    }
    const voidPath='M'+face+' '+(cy-lip)+'h-'+wideDepth+'V42H'+(face-deep)+'V56H'+(face-wideDepth)+'V'+(cy+lip)+'H'+face+'Z';
    return '<svg viewBox="0 0 316 103" role="img" aria-label="'+api.shapeName(shape)+'의 길이 단면과 끝면">'+
      '<text x="14" y="19">길이 단면</text><text x="231" y="19">끝면</text>'+
      '<path d="M16 32H178l6 4v26l-6 4H16Z" fill="#eac073" stroke="#ffdfa6"/>'+
      (deep?'<path d="'+voidPath+'" fill="#1b303a" stroke="#ffe0a8" stroke-width="1.1"/>':'')+
      '<path d="'+teeth+'" fill="none" stroke="#eff4fa" stroke-width="1.8"/>'+
      '<circle cx="251" cy="49" r="20" fill="#eac073" stroke="#ffdfa6"/>'+
      (lip?'<circle cx="251" cy="49" r="'+lip+'" fill="#1b303a" stroke="#ffdfa6"/>':'')+
      (shape.tap?'<circle cx="251" cy="49" r="9" fill="none" stroke="#415565" stroke-dasharray="3 2"/>':'')+
      '<path d="M10 49h185m31 0h50" stroke="#84a6ab" stroke-dasharray="4 4" opacity=".65"/>'+
      '<text x="14" y="91">'+(shape.tap?'구멍 안쪽의 빗금은 암나사 표시':deep?'어두운 부분이 깎여 나간 공간':'끝면까지 이어진 금속')+'</text></svg>';
  }

    function hint(state,selected){
      const mounted=state.mount[selected], aligned=state.active===selected;
      if(state.phase==='empty'||state.phase==='done')return '소재 이송을 누르면 새 핀의 바깥지름까지 준비됩니다.';
      if(state.phase==='held')return '콜릿이 핀을 잡았습니다. 절단을 누르세요.';
      if(state.phase==='cut')return '소재에서 분리됐습니다. 배출을 누르면 결과가 비교함에 담깁니다.';
      if(mounted==='none')return api.labels[selected]+'에 원하는 공구를 장착하세요.';
      if(!aligned)return '중심 맞추기를 눌러 '+api.labels[selected]+'를 선재 앞으로 가져오세요.';
      if(mounted==='collet')return '콜릿으로 잡은 뒤 절단할 수 있습니다. 끝면을 더 가공하려면 먼저 다른 자리를 선택하세요.';
      return '선택한 공구를 사용해 단면을 보세요. 가공을 마치면 콜릿 자리를 선택하세요.';
    }
    const completedText=(action,old,selected)=>{
      const tool=old.mount[selected];
      switch(action.kind){
        case 'fit':return api.labels[selected]+'에 '+api.tools[action.tool]+' 장착 완료.';
        case 'remove':return api.tools[tool]+' 분리 완료. 주축의 공구 자리가 비었습니다.';
        case 'feed':return '새 핀이 준비됐습니다. 가공할 자리를 고르세요.';
        case 'align':return api.labels[selected]+'가 소재 중심에 맞았습니다.';
        case 'work':return tool==='collet'?'콜릿이 잘려 나갈 쪽을 잡았습니다.':tool==='small'&&old.shape.large?'가는 드릴이 기존의 굵은 구멍을 지나갔습니다. 구멍 크기는 그대로입니다.':api.tools[tool]+'가 빠졌습니다. 현재 핀의 단면을 확인하세요.';
        case 'cut':return '절단이 끝났습니다. 배출하면 핀을 비교할 수 있습니다.';
        case 'eject':return '핀을 비교함에 담았습니다. 공구를 바꿔 다음 핀을 만들어 보세요.';
      }
    };
    const actions={fit:'공구 장착',remove:'공구 분리',feed:'소재 이송·외경 가공',align:'자리 맞춤',work:'선택 공구 사용',cut:'핀 절단',eject:'부품 배출'};
  study.startPractice=view=>{
    document.title=study.variant+' 공구 탈부착 실습 · D5';
    document.querySelector('h1').textContent='D5 공구 탈부착 실습';
    el('intro').textContent='공구를 골라 핀 끝면을 가공하고, 배출한 핀 두 개의 단면을 비교해 보세요.';
    el('variant-note').textContent=study.cnc?'CNC 테이블이 옆으로 움직여 선택한 주축을 소재 중심에 맞춥니다.':'캠식 터릿이 돌아 선택한 자리를 소재 중심에 맞춥니다. 캠의 동작을 나누어 관찰하는 학습 모형입니다.';
    link.textContent='9단계 자동 시연 보기';
    el('d2-practice-link').hidden=false;
    el('d2-practice-link').href='../d2/index.html?mode=practice'+(study.cnc?'&variant=cnc':'');
    for(const [id,cnc] of [['cam-link',false],['cnc-link',true]]){
      const a=el(id);a.href='index.html?mode=practice'+(cnc?'&variant=cnc':'');
      if(cnc===study.cnc) a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    }
    globalThis.mountPracticePanel(view,study,api,{
      storageKey:'esco.d5.front-practice.v1.'+study.modelKey,initialSlot:'drill1',
      controls:{feed:'소재 이송',align:'중심 맞추기',work:'선택 공구 사용',cut:'절단',eject:'배출'},
      buttonLabels:(state,selected)=>({work:({collet:'콜릿으로 잡기',tap:'암나사 가공',small:'가는 구멍 가공',large:'굵은 구멍 가공',none:'선택 공구 사용'})[state.mount[selected]]}),
      example:'소재 이송 → 드릴 주축 1 선택 → 중심 맞추기 → 가는 구멍 가공. 다음은 콜릿 자리 선택 → 중심 맞추기 → 콜릿으로 잡기 → 절단 → 배출 순서입니다. '+(study.cnc?'다음 핀은 가는 구멍을 낸 뒤 탭을 장착해 암나사를 가공해 보세요.':'다음 핀에는 굵은 드릴을 장착해 두 핀의 끝면을 비교해 보세요.'),
      phaseText:state=>api.names[state.phase]+' · 중심에 있는 자리: '+api.labels[state.active],
      focusForAction:(kind,id)=>['fit','remove','align','work'].includes(kind)?id:null,
      motionLabels:actions,completedText,hint,pinDiagram
    });
  };
})();
