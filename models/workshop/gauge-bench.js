import {caliper,micrometer} from './visuals.js';

// All geometry is in the instrument drawing's viewBox, including touch input.
export function mountBench(host,j,p,key,showReading,onGauge){
  const length=key==='length', size=p[key];
  const step=length ? 0.05 : 0.001;
  const maximum=Number((j[key]+(length ? 3 : 0.7)).toFixed(3));
  const scale=length?10:27, origin=length?57:138;
  const seat={x:origin+size*scale/2,y:length?135:70};
  const tray={x:382,y:length?135:146};
  let gap=0, zeroed=false, placed=false, gesture=null, floating=null, note='';
  const motion=length?'이동 턱을 좌우로 밀어 간격을 조절하세요.':'래칫을 아래로 쓸어 열고 위로 쓸어 닫으세요.';
  host.innerHTML='<section class="gauge-bench"><h3>'+ (length?'전장 측정 · 버니어 캘리퍼스':'몸통 외경 측정 · 디지털 마이크로미터')+'</h3>'+
    '<p class="gauge-caption">'+motion+'</p><div class="gauge-scene"></div>'+
    '<p class="gauge-status" role="status"></p><div class="controls"><button type="button" data-zero>닫힌 면에서 영점 확인</button>'+
    '<button type="button" data-place>핀 놓기</button></div><label class="gap-control">'+
    (length?'이동 턱 위치':'스핀들 열림')+'<input type="range" min="0" value="0" step="'+step+'" max="'+maximum+'" aria-label="측정면 간격">'+
    '</label><div class="reading-panel" hidden></div></section>';
  const find=q=>host.querySelector(q);
  const scene=find('.gauge-scene'), slider=find('.gap-control input'), panel=find('.reading-panel');
  const zero=find('[data-zero]'), place=find('[data-place]'), status=find('.gauge-status');
  function pin(center){
    const w=size*scale, r=w/2;
    const shape=length
      ? '<rect x="'+(-r)+'" y="-7" width="'+w+'" height="14" rx="2"/>'+
        (p.shape.narrow||p.shape.wide?'<path d="M'+(-r+w*.3)+' -7v14" stroke-width="4"/>':'')
      : '<circle r="'+r+'"/>'+((p.shape.small||p.shape.large||p.shape.bore)?'<circle r="'+(r*.32)+'" fill="#80613f"/>':'');
    return '<g data-part="pin" transform="translate('+center.x+' '+center.y+')" fill="#efb969" stroke="#805828">'+shape+
      '<rect x="'+(-r-3)+'" y="'+(length?-17:-r-3)+'" width="'+(w+6)+'" height="'+(length?34:w+6)+'" fill="transparent" stroke="none"/></g>';
  }
  function render(){
    onGauge?.({gap,placed:placed&&!floating,zeroed});
    const open=gap>size;
    const contact=placed&&gap===size&&!floating;
    let overlay='<rect x="306" y="'+(length?114:97)+'" width="151" height="'+(length?43:90)+'" rx="7" fill="none" stroke="#97aaa6" stroke-dasharray="4 3"/>';
    if(length){
      const x=origin+gap*scale;
      overlay+='<g data-part="handle"><rect x="'+(x+24)+'" y="76" width="177" height="29" fill="transparent"/><rect x="'+x+'" y="103" width="24" height="54" fill="transparent"/>'+
        '<path d="M'+(x+3)+' 114h14m-11 4h8" stroke="#285a5b" stroke-width="2"/></g>';
    }else{
      let ribs='';
      for(let i=0;i<4;i++){
        const y=58+(i*6+(gap*52)%6);
        ribs+='<path d="M402 '+y+'h25"/>';
      }
      overlay+='<g data-part="handle"><rect x="330" y="45" width="111" height="50" fill="transparent"/><g stroke="#cde1db">'+ribs+'</g></g>';
    }
    if(!placed||floating){
      overlay+='<rect data-seat x="'+origin+'" y="'+(seat.y-(length?10:size*scale/2))+'" width="'+size*scale+'" height="'+(length?20:size*scale)+'" rx="'+(length?3:size*scale/2)+'" class="pin-seat"/>';
    }
    overlay+=pin(floating??(placed?seat:tray));
    scene.innerHTML=length?caliper(gap,false,size,overlay):micrometer(gap,false,size,overlay);
    slider.value=String(gap);
    zero.disabled=zeroed||gap!==0;
    zero.textContent=zeroed?'영점 확인 완료':'닫힌 면에서 영점 확인';
    place.disabled=!zeroed||!open;
    place.textContent=placed?'핀을 트레이로':'측정면 사이에 핀 놓기';
    const hint=!zeroed?(gap?'측정면을 끝까지 닫고 영점을 확인하세요.':'빈 측정면이 닫혀 있습니다. 영점을 확인하세요.')
      :contact?(length?'양 끝면이 닿았습니다. 주척의 정수 mm와 일치하는 아들자 칸 × 0.05 mm를 더하세요.':'몸통 양쪽에 측정면이 닿았습니다. 표시창을 소수 셋째 자리까지 읽으세요.')
      :placed?'핀이 놓였습니다. '+(length?'이동 턱을 왼쪽으로 밀어 끝면에 닿게 하세요.':'래칫을 위로 쓸어 스핀들을 몸통에 접촉시키세요.')
      :open?'트레이의 핀을 점선 측정 위치로 끌어 놓으세요.':'핀이 들어갈 만큼 측정면을 벌리세요.';
    if(status.textContent!==(note||hint))status.textContent=note||hint;
    if(contact&&panel.hidden){panel.hidden=false;showReading(panel);}
    if(!contact&&!panel.hidden){panel.hidden=true;panel.replaceChildren();}
  }
  function setGap(v){
    note='';
    const rounded=Number((Math.round(v/step)*step).toFixed(3));
    gap=Math.min(maximum,Math.max(placed?size:0,rounded));
    render();
  }
  zero.onclick=()=>{zeroed=true;note='';render();};
  slider.oninput=()=>setGap(Number(slider.value));
  place.onclick=()=>{placed=!placed;note='';render();};
  function point(e){
    return new DOMPoint(e.clientX,e.clientY).matrixTransform(scene.firstElementChild.getScreenCTM().inverse());
  }
  scene.onpointerdown=e=>{
    const part=e.target.closest('[data-part]')?.dataset.part;
    if(!part||gesture||e.button!==0)return;
    if(part==='pin'&&(!zeroed||gap<=size)){
      note=placed?'먼저 측정면을 벌려 핀을 풀어 주세요.':'영점을 확인하고 핀이 들어갈 만큼 측정면을 벌리세요.';render();return;
    }
    const start=point(e), center=placed?seat:tray;
    gesture={id:e.pointerId,part,start,gap,dx:center.x-start.x,dy:center.y-start.y};
    scene.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  function trackPin(pt){
    floating={x:pt.x+gesture.dx,y:pt.y+gesture.dy};
  }
  scene.onpointermove=e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const pt=point(e);
    if(gesture.part==='handle'){
      setGap(gesture.gap+(length?(pt.x-gesture.start.x)/scale:(pt.y-gesture.start.y)*.055));
    }else{trackPin(pt);note='점선 위치에 놓으면 고정 측정면에 맞춰집니다.';render();}
  };
  function end(e){
    if(!gesture||gesture.id!==e.pointerId)return;
    note='';
    if(gesture.part==='pin'&&e.type==='pointerup'){
      trackPin(point(e));
      if(Math.abs(floating.x-seat.x)<=size*scale/2+6&&Math.abs(floating.y-seat.y)<(length?24:size*scale/2+5))placed=true;
      else if(Math.abs(floating.x-tray.x)<78&&Math.abs(floating.y-tray.y)<48)placed=false;
      else note='핀을 점선 측정 위치 또는 오른쪽 트레이에 놓으세요.';
    }
    floating=null;gesture=null;render();
  }
  scene.onpointerup=end;scene.onpointercancel=end;scene.onlostpointercapture=end;
  render();
  return {setGap,place:()=>{
    if(place.disabled){note=zeroed?'핀이 움직이려면 측정면을 조금 더 벌리세요.':'먼저 닫힌 면에서 영점을 확인하세요.';render();}
    else place.click();
  }};
}
