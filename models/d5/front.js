/* D5 front operations. Distances, index angles and elapsed time are illustrative. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const practice = params.get('mode') === 'practice';
  const cnc = params.get('variant') === 'cnc';
  const variant = cnc ? '제조사 표준 CNC' : '캠식 FLEX SPEED';
  const carrierName = cnc ? '2축 크로스 테이블' : '3위치 터릿';
  const source = cnc ? 'ESCO D2/D5 CNC 2020 · PDF 2쪽' : 'ESCO D2/D5 FLEX SPEED · PDF 3~4쪽';
  const radius = .74, stationAngle = 2 * Math.PI / 3;
  const stationIds = cnc ? ['counter','drill1','drill2','tap'] : ['counter','drill1','drill2'];
  const stationColors = {counter:'#85c7ab', drill1:'#7dbfea', drill2:'#a6a9e7', tap:'#dbbc79'};
  const stationOffsets = [0,.76,-.76,-1.52];
  const drill={face:2.77,home:3.28,depth:.35,radius:.062,fluteLength:.45};
  drill.point=drill.radius*.85; // Same point length as MachineShapes.drill().
  function boreProfile(state){
    const depth=drill.depth*state.bore;
    const cone=Math.min(depth,drill.point);
    return {depth,floor:drill.face-depth,shoulder:drill.face-depth+cone,radius:drill.radius*cone/drill.point};
  }
  function stationCenter(index) {
    if(cnc) return [4,stationOffsets[index]];
    const angle = index * stationAngle;
    return [4 + radius * (1-Math.cos(angle)), radius * Math.sin(angle)];
  }
  const stages = [
    {name:'소재 공급',part:'coil',text:'릴에서 풀린 선재가 교정 장치의 입구로 들어갑니다.',observe:'전체 배치에서 릴과 원통형 하우징 사이의 금색 선재를 따라가세요.'},
    {name:'교정',part:'straight',text:'선재가 교정 장치의 입구를 지나 반대쪽 출구로 나옵니다. 이 모형에서는 하우징과 양 끝의 통과 위치를 볼 수 있습니다.',observe:'출구에서 이송 롤러까지 선재를 따라가세요. 하우징 내부의 교정 방식은 이 형식에서 추가 확인이 필요합니다.'},
    {name:'길이 이송',part:'feed',text:'이송 롤러가 선재를 회전 헤드 앞으로 보냅니다.',observe:'가이드 앞에서 금색 핀의 끝면이 나오는 위치를 찾으세요.'},
    {name:'절삭',part:'tools',text:'회전 헤드의 공구가 핀의 바깥지름을 깎습니다.',observe:'헤드의 회전과 공구의 반경 방향 진입을 보세요. 이 모형은 완성될 몸통의 지름 변화를 단순화해 보여 줍니다.'},
    {name:cnc?'드릴 위치 맞춤':'터릿 위치 맞춤',part:'carrier',
      text:cnc?'테이블이 옆으로 움직여 첫 번째 드릴의 축을 핀의 중심선에 맞춥니다.':'터릿이 한 자리 돌아 첫 번째 드릴의 축을 핀의 중심선에 맞춥니다.',
      observe:'하늘색 드릴이 금색 선재와 한 직선에 놓이는 순간을 보세요.'},
    {name:'끝면에 구멍 내기',part:'drill1',
      text:'드릴이 자기 축을 돌면서 핀 끝면으로 들어갔다가 나옵니다. 드릴이 빠져도 핀 끝에는 구멍이 남습니다.',
      observe:'아래 가공부 단면에서 구멍의 입구와 바닥을 찾으세요. 이 예제는 드릴 하나만 사용합니다.'},
    {name:'콜릿 정렬·파지',part:'counter',
      text:'드릴이 물러난 뒤 콜릿이 소재 중심선에 맞춰집니다. 콜릿이 앞으로 와서 잘려 나갈 쪽을 잡습니다.',
      observe:'드릴은 재료를 깎고 콜릿은 부품을 지지합니다. 같은 위치를 서로 다른 시점에 사용합니다.'},
    {name:'절단',part:'tools',text:'정면 장치의 콜릿이 핀을 잡고 있는 동안 절단 날이 연결부를 끊습니다.',observe:'핀 끝의 구멍이 유지되고 소재와 핀 사이가 벌어지는지 보세요.'},
    {name:'부품 배출',part:'product',text:'콜릿이 풀리면 핀이 받이 쪽으로 이동합니다.',observe:'받이로 나가는 핀에서 드릴이 가공한 끝면을 찾으세요.'}
  ];
  const clamp = n => Math.max(0, Math.min(1,n));
  const ease = n => { const v=clamp(n); return v*v*(3-2*v); };
  function at(time) {
    const t=Math.min(stages.length,Math.max(0,Number.isFinite(time)?time:0));
    const stage=Math.min(stages.length-1,Math.floor(t)), u=t-stage;
    // Reuse the feed/turn/cut/eject relationships while adding the front-working interval.
    let commonTime = t;
    if(stage===4 || stage===5) commonTime=4;
    if(stage===6) commonTime=4+ease((u-.72)/.28);
    if(stage>=7) commonTime=t-2;
    const common=D2Cycle.at(commonTime);
    let index=0, travel=0, bore=0, spindleAngle=0;
    if(stage===4) index=ease(u);
    if(stage===5) {
      index=1;
      const plunge=ease(u/.60);
      const clearance=drill.home-drill.face, stroke=clearance+drill.depth;
      travel=stroke*plunge*(1-ease((u-.62)/.38));
      bore=clamp((stroke*plunge-clearance)/drill.depth);
      spindleAngle=u*6*Math.PI;
    }
    if(stage>=6) bore=1;
    if(stage===6) {
      index=1-ease(u/.48);
      travel=.82*ease((u-.49)/.23);
    }
    if(stage>=7) travel=.82;
    const angle=-stationAngle*index;
    return {...common,t,stage,u,headAngle:t*2*Math.PI, index, travel, bore, spindleAngle,
      cos:Math.cos(angle),sin:Math.sin(angle),slide:-index*stationOffsets[1]};
  }

  function describeParts(parts) {
    const entries=Object.fromEntries(parts.map(row=>[row[0],row]));
    entries.feed[4]='이송 롤러와 선재 사이의 관계를 단순화했습니다.';
    entries.tools[4]='두 날의 형상과 배치는 이해를 위한 도식입니다.';
    entries.base[4]='본체와 받이는 위치 관계를 보여주는 가상 외형입니다.';
    entries.product[2]='이 예제에서는 한쪽 끝에 막힌 구멍이 있는 핀이 나옵니다.';
    if(practice) entries.product[2]='장착한 공구와 수행한 동작에 따라 핀의 끝면과 구멍이 달라집니다.';
    for(const row of parts) if(row[0]!=='base') row[5]=source;
    parts.push(['carrier',carrierName,cnc?'드릴과 콜릿을 실은 테이블이 공구를 선택하고 앞뒤로 움직입니다.':'세 자리를 가진 회전 받침입니다. 드릴 또는 콜릿 한 자리를 선재 앞에 맞춥니다.',
      '주황색 절삭 날이 달린 왼쪽 헤드와 오른쪽 정면 장치를 구분하세요.','지지대, 이동량과 자리 간격은 기능을 보여주기 위한 배치입니다.',source]);
    for(const [id,name,description] of [
      ['drill1','정면 드릴 1','핀 끝면의 중심에 구멍을 내는 회전 공구입니다.'],
      ['drill2','정면 드릴 2',practice?'드릴을 장착해 별도 작업에 쓸 수 있는 두 번째 주축입니다.':'두 번째 정면 작업을 맡길 수 있는 별도 주축입니다. 이 예제에서는 대기합니다.'],
      ...(cnc?[['tap','나사 가공 주축',practice?'탭을 장착하고 미리 뚫은 작은 구멍에 암나사를 냅니다.':'탭 또는 나사 가공 공구를 장착하는 자리입니다. 이 핀 예제에서는 사용하지 않습니다.']]:[])
    ]) parts.push([id,name,description,'공구 끝이 소재의 길이 방향을 향하는지 보세요.','공구 형상과 굵기, 실제 용도는 장착 공구와 품번에 따라 달라집니다.',source]);
  }
  const anchors={carrier:[4.6,4.35,0]};
  stationIds.forEach((id,i)=>{const [y,z]=stationCenter(i);anchors[id]=[3.96,y,z];});

  function buildFront({box,tube,mesh,form,colors}) {
    const S=globalThis.MachineShapes;
    const ring=(id,name,c,profile,clr)=>form(id,name,c,S.turned(profile),clr);
    const pad=(name,c,w,h,d)=>form('carrier',name,c,S.housing(w,h,d,.08),'#698596');
    if(cnc){
      box('carrier','fixed_bed',[4.62,3.19,-.40],[1.8,.18,3.25],colors.dark);
      pad('cross_slide',[4.43,3.44,-.38],1.28,.24,2.85);
      for(const x of [3.97,4.91]){
        pad('fixed_transverse_way',[x,3.295,-.38],.12,.10,3.08);
        for(const z of [-1.37,.64])pad('saddle_runner',[x,3.38,z],.25,.13,.52);
      }
      for(const z of [-1.06,.61]) box('carrier','fixed_guide',[4.55,3.31,z],[1.65,.10,.16],colors.metal);
    }else{
      box('carrier','fixed_pedestal',[5.18,3.92,-1.23],[.5,1.66,.36],colors.dark);
      box('carrier','fixed_bearing_arm',[5.18,4.76,-.62],[.5,.28,1.23],colors.dark);
      tube('carrier','fixed_bearing',[4.67,4+radius,0],1.35,.245,.16,colors.metal);
      ring('carrier','fixed_bearing_lip',[4.93,4+radius,0],[[0,.25],[0,.36],[.06,.38],[.16,.36],[.16,.25],[0,.25]],colors.metal);
      tube('carrier','index_hub',[4.86,4+radius,0],.69,.39,.10,'#648ba2');
      tube('carrier','index_rim',[4.76,4+radius,0],.28,1.10,.98,'#658da6');
    }
    stationIds.forEach((id,i)=>{
      const [y,z]=stationCenter(i), color=stationColors[id];
      tube('carrier','station_socket_'+id,[4.65,y,z],.58,.33,.22,'#7594a2');
      if(!cnc) {
        const angle=i*stationAngle;
        const armVertices=[];
        for(const x of [4.49,4.77]) for(const along of [.24,.50]) for(const side of [-.115,.115]){
          armVertices.push([x,4+radius-along*Math.cos(angle)+side*Math.sin(angle),
            along*Math.sin(angle)+side*Math.cos(angle)]);
        }
        mesh('carrier','index_arm_'+i,armVertices,[[0,2,3,1],[4,5,7,6],[0,1,5,4],[2,6,7,3],[0,4,6,2],[1,3,7,5]],'#7594a2');
      }else box('carrier','saddle_'+id,[4.55,3.72,z],[.58,.48,.35],'#7594a2');
      ring('carrier','socket_lip_'+id,[4.27,y,z],[[0,.246],[0,.33],[.05,.35],[.12,.33],[.12,.246],[0,.246]],colors.metal);
      for(const side of [-1,1])form('carrier','socket_fastener_'+id,[4.25,y+side*.285,z],S.turned([[0,.047],[.035,.047],[.035,.022],[.012,.022],[.012,0]],6),colors.dark,'-x');
      tube(id,'body_'+id,[4.32,y,z],.99,.245,id==='counter'?.15:.06,color);
      const demoDrill=!practice&&id.startsWith('drill');
      const fluteLength=demoDrill?drill.fluteLength:.32;
      tube(id,'chuck_'+id,[3.77+fluteLength-.32,y,z],.27,.205,id==='counter'?.15:.07,color);
      if(id==='counter'){
        for(let k=0;k<3;k++)form(id,'collet_jaw_'+k,[3.405,y,z],S.jaw(.31,.213,practice ? .130 : .10,k*2*Math.PI/3,1.94),color);
      }else{
        const shankX=id==='tap'?3.65:drill.home+fluteLength+.06;
        tube(id,'tool_shank_'+id,[shankX,y,z],id==='tap' ? .14 : .12,demoDrill?drill.radius:.075,.001,colors.metal);
        if(id==='tap'){
          ring(id,'tool_tip_'+id,[3.28,y,z],[[0,0],[.045,.048],[.30,.048],[.30,0]],colors.tool);
          for(let k=0;k<6;k++)ring(id,'tap_ridge_'+k,[3.32+k*.032,y,z],[[0,.047],[.012,.065],[.025,.047]],colors.metal);
        }else form(id,'flute_drill',[drill.home,y,z],S.drill(fluteLength,drill.radius),colors.metal);
      }
    });
    // The tray lies beyond the collet exit with its sides clear of the product axis.
    box('product','receiving_tray',[5.34,3.18,.08],[2.08,.12,1.30],colors.metal);
    for(const z of [-.59,.75]) box('product','tray_side',[5.34,3.31,z],[2.08,.28,.08],colors.base);
    box('product','tray_stop',[6.35,3.31,.08],[.08,.28,1.37],colors.base);
    // Closed pin with an inset blind bore. The lip and floor open as the drill advances.
    const floor=drill.face-drill.depth;
    const rings=practice?globalThis.EscoFrontStudy.practiceMotion.practiceRings:[[1.32,0],[1.32,.13],[drill.face,.13],[drill.face,drill.radius],[floor+drill.point,drill.radius],[floor,0]];
    const verts=[],faces=[],n=36;
    for(const [x,r] of rings)for(let i=0;i<n;i++){
      const a=i*2*Math.PI/n;verts.push([x,4+r*Math.cos(a),r*Math.sin(a)]);
    }
    for(let j=0;j<rings.length-1;j++) for(let i=0;i<n;i++){
      const k=(i+1)%n;faces.push([j*n+i,j*n+k,(j+1)*n+k,(j+1)*n+i]);
    }
    mesh('product','illustrative_part',verts,faces,colors.gold);
  }

  function transform(v,object,state) {
    let [x,y,z]=v;
    if(object.name==='illustrative_part'){
      if(state.shape) return globalThis.EscoFrontStudy.practiceMotion.pinVertex(v,state);
      if(x<drill.face-drill.depth-1e-7 || Math.hypot(y-4,z)>.09)
        return [x,4+(y-4)*state.radius/.13,z*state.radius/.13];
      const hole=boreProfile(state);
      if(x<drill.face) x=x<drill.face-drill.depth+1e-7?hole.floor:hole.shoulder;
      return [x,4+(y-4)*hole.radius/drill.radius,z*hole.radius/drill.radius];
    }
    const onStation=stationIds.includes(object.id);
    if(!onStation && object.id!=='carrier') return v;
    if(object.name.startsWith('fixed_')) return v;
    const [cy,cz]=onStation?stationCenter(stationIds.indexOf(object.id)):[0,0];
    if(state.mount) [x,y,z]=globalThis.EscoFrontStudy.practiceMotion.toolVertex(v,object,state);
    if(object.name.startsWith('collet_jaw_')){
      const angle=Number(object.name.slice(-1))*Math.PI*2/3;
      y+=.040*(1-state.grip)*Math.cos(angle);z+=.040*(1-state.grip)*Math.sin(angle);
    }
    if(object.id===(state.spinSlot ?? 'drill1') && object.name.startsWith('flute_')){
      const dy=y-cy,dz=z-cz,a=state.spindleAngle;
      y=cy+dy*Math.cos(a)-dz*Math.sin(a);z=cz+dy*Math.sin(a)+dz*Math.cos(a);
    }
    if(cnc) return [x-state.travel,y,z+state.slide];
    const dy=y-(4+radius);
    return [x-state.travel,4+radius+dy*state.cos+z*state.sin,-dy*state.sin+z*state.cos];
  }

  globalThis.EscoFrontStudy={
    cnc,practice,variant,carrierName,stationIds,stationColors,stationCenter,radius,modelKey:cnc?'d5-cnc':'d5-flex-speed',
    describeParts,anchors,buildFront,transform,drill,boreProfile,cycle:{stages,at},height:6.0,focusDepth:4.8,focusCenter:[2.37,4.27,0]
  };
})();
