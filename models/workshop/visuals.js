const txt=(x,y,s,size=12,anchor='middle')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" text-anchor="'+anchor+'">'+s+'</text>';
export function drawing(j) {
  const x=76,end=355,y=112,ry=j.id==='P-104'?(end-x)*j.diam/(2*j.length):29,back=!!j.groove;
  const gx=x+(j.offset??0)/j.length*(end-x),gw=(j.groove??0)/j.length*(end-x);
  const line=(x1,y1,x2,y2)=>'<path d="M'+x1+' '+y1+'L'+x2+' '+y2+'" class="dim"/>';
  const points=back?'H'+gx+'v9h'+gw+'v-9':'';
  const bottom=back?'H'+(gx+gw)+'v-9h-'+gw+'v9':'';
  const holeLength=(j.depth??0)/j.length*(end-x),hr=(j.hole??0)/j.diam*ry;
  const hStart=back?x:end;
  return '<svg class="blueprint" viewBox="0 0 520 222" role="img" aria-label="'+j.name+' 도면. 모든 치수와 공차는 도면 아래 표에도 있습니다.">'+
    '<defs><pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="#c2d3d4" stroke-width=".6"/></pattern></defs><rect width="520" height="222" fill="url(#grid)"/>'+
    txt(18,24,'축 방향 '+(j.hole?'단면':'옆면'),13,'start')+txt(450,24,j.hole?'구멍 쪽 끝면':j.id==='P-104'?'끝면 확대':'끝면',13)+
    '<path d="M'+x+' '+(y-ry)+points+'H'+end+'v'+(ry*2)+bottom+'H'+x+'Z" fill="#d4e5e1" stroke="#244d55" stroke-width="2"/>'+
    (j.hole?'<path d="M'+hStart+' '+(y-hr)+'h'+(back?holeLength:-holeLength)+'v'+(hr*2)+'H'+hStart+'" fill="#f5f9f7" stroke="#244d55" stroke-width="2"/>':'')+
    '<circle cx="449" cy="'+y+'" r="30" fill="#d4e5e1" stroke="#244d55" stroke-width="2"/>'+
    (j.hole?'<circle cx="449" cy="'+y+'" r="'+hr+'" fill="white" stroke="#244d55"/>':'')+
    '<path d="M45 112H379m30 0h80m-40 -40v80" fill="none" stroke="#698c91" stroke-dasharray="7 3 1 3"/>'+
    (j.hole?line(hStart+(back?1:-1)*holeLength,y-hr,225,59)+txt(225,52,'구멍 Ø'+j.hole.toFixed(2)+' ↧'+j.depth.toFixed(2)):'')+
    (back?line(gx+gw/2,138,137,155)+txt(153,153,'홈 폭 '+j.groove.toFixed(2),10):'')+
    line(x,145,x,183)+line(end,145,end,183)+line(x,174,end,174)+txt(215,168,'L '+j.length.toFixed(2)+' ±0.10')+
    line(63,y-ry,63,y+ry)+line(58,y-ry,73,y-ry)+line(58,y+ry,73,y+ry)+txt(74,65,'Ø'+j.diam.toFixed(3)+' ±'+j.tol.toFixed(3))+
    txt(18,208,j.id+'   /   REV '+j.rev,12,'start')+txt(498,208,'단위 mm · 학습용 확대도',12,'end')+'</svg>';
}
function canvas(title,body){
  return '<svg viewBox="0 0 480 188" class="instrument" role="img" aria-label="'+title+'">'+body+'</svg>';
}
export function caliper(gap,placed,len,overlay=''){
  const scale=10,origin=57,move=origin+gap*scale;
  let main='',vernier='';
  for(let i=0;i<=39;i++){
    const x=origin+i*scale;
    main+='<path d="M'+x+' 56v'+(i%5===0?17:10)+'"/>';
    if(i%5===0)main+=txt(x,49,i,11);
  }
  for(let i=0;i<=20;i++){
    const x=move+i*.95*scale;
    vernier+='<path d="M'+x+' 75v'+(i%5===0?15:8)+'"/>';
    if(i%5===0)vernier+=txt(x,103,i,10);
  }
  return canvas('버니어 캘리퍼스 눈금. 주척 1 mm, 아들자 한 칸 차이 0.05 mm.',
    '<rect x="20" y="34" width="445" height="40" rx="4" fill="#bdcdd0"/><path d="M37 57H57V158L40 147Z" fill="#849aa2"/>'+
    '<rect x="'+(move-5)+'" y="74" width="204" height="35" rx="3" fill="#e1e9e8"/><path d="M'+move+' 100h20l-3 48-17 10Z" fill="#9aaeb1"/>'+
    (placed?'<rect x="'+origin+'" y="128" width="'+len*scale+'" height="14" rx="2" fill="#e7b56c"/>':'')+
    '<g class="ticks">'+main+vernier+'</g>'+txt(250,178,'주척 1 mm     /     아들자 20칸 = 19 mm',12)+overlay);
}
export function micrometer(gap,placed,diam,overlay=''){
  const contact=138,px=27,x=contact+gap*px;
  return canvas('디지털 외측 마이크로미터. 앤빌과 스핀들 사이의 몸통 외경을 측정합니다.',
    '<path d="M64 63v45q0 48 49 48h87q37 0 37-46V84" fill="none" stroke="#639a96" stroke-width="26"/>'+
    '<rect x="49" y="60" width="89" height="20" rx="2" fill="#c8d6d7"/><rect x="'+x+'" y="60" width="'+(308-x)+'" height="20" fill="#c8d6d7"/>'+
    (placed?'<circle cx="'+(contact+diam*px/2)+'" cy="70" r="'+diam*px/2+'" fill="#e7b56c" stroke="#8c642c"/>':'')+
    '<rect x="240" y="46" width="99" height="48" rx="6" fill="#789195"/><rect x="328" y="51" width="72" height="38" rx="6" fill="#9cb0b4"/><rect x="400" y="57" width="31" height="25" rx="4" fill="#637c84"/>'+
    '<rect x="247" y="54" width="83" height="30" rx="3" fill="#d6ebd0"/>'+txt(289,75,gap.toFixed(3),18)+
    txt(280,123,'표시 단위 mm',12)+txt(417,108,'래칫 ↕',12)+overlay);
}
export function pinView(j,shape){
  const grooved=shape.narrow||shape.wide;
  const w=shape.wide?30:14;
  const drilled=j.id==='P-202'?(shape.small||shape.large):shape.bore;
  return '<g><path d="M28 15H188a6 13 0 0 1 0 26H28Z" fill="url(#pinmetal)"/>'+
    (grooved?'<path d="M66 15q8 13 0 26h'+w+'q8-13 0-26Z" fill="#a47c43"/><path d="M67 18h'+(w-2)+'v19H67Z" fill="url(#pinmetal)"/>':'')+
    '<ellipse cx="28" cy="28" rx="7" ry="13" fill="#dcbb81" stroke="#957440"/>'+
    (drilled?'<ellipse cx="28" cy="28" rx="'+(shape.large||shape.bore===2?4:2.8)+'" ry="'+(shape.large||shape.bore===2?7:5)+'" fill="#594c39"/>':'')+'</g>';
}
const finish='<defs><linearGradient id="pinmetal" x2="0" y2="1"><stop stop-color="#b48d53"/><stop offset=".30" stop-color="#f7dfaa"/><stop offset=".57" stop-color="#d6b376"/><stop offset="1" stop-color="#997943"/></linearGradient></defs>';
export function surfaceView(j,p,dirty){
  return canvas(dirty?'확대 표면에 남은 칩과 유막':'세척·건조 후 버와 흠이 없는 가상 외관',finish+
    '<g transform="translate(14 12) scale(2.1)">'+pinView(j,p.shape)+'</g>'+
    (dirty?'<path d="M115 54q12 19 15 0t12 4m50 7q9 18 17 1m49-4 8 13" fill="none" stroke="#506e72" stroke-width="3"/><ellipse cx="240" cy="82" rx="22" ry="7" fill="#a7a168"/>':'')+
    txt(240,151,dirty?'세척 전 · 몸통과 모서리':'건조 후 · 몸통과 모서리',14));
}
export function displayedWeight({container,tared,loaded,net,j}){
  const tare=j.id==='P-101'?8.214:j.id==='P-202'?9.082:10.356;
  return (container?tare:0)+(loaded?net:0)-(tared?tare:0);
}
export function balance(state){
  const {container,tared,loaded,pieces,j,sealed}=state;
  const weight=displayedWeight(state);
  return canvas('정밀 저울 표시창 '+weight.toFixed(3)+' g',
    finish+'<path d="M85 95l24-25h261l24 25v47H85Z" fill="#708990"/><rect x="102" y="65" width="274" height="13" rx="5" fill="#c5d7d8"/>'+
    (container?'<path d="M107 44l28-28h218l-29 28Z" fill="#d7e3d3" stroke="#698e80"/><path d="M107 44h217l29-28v18l-29 28H107Z" fill="#97b6a9" stroke="#577d73"/>':'')+
    (loaded?pieces.map((p,i)=>'<g transform="translate('+(116+i*69)+' 22) scale(.35)">'+pinView(j,p.shape)+'</g>').join(''):'')+
    (sealed?'<path d="M107 42l28-28h218l-29 28Z" fill="#d9ecea" fill-opacity=".67" stroke="#44776e"/><path d="M208 46l29-30h17l-29 30v14h-17Z" fill="#3b8275"/>':'')+
    '<rect x="172" y="99" width="140" height="35" rx="5" fill="#d6ebd0"/>'+txt(242,123,weight.toFixed(3)+' g',21)+txt(235,171,tared?'NET · 용기 무게 제외':'GROSS · 총중량',13));
}
