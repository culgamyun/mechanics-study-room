// Integer twentieths of a millimetre keep exact coincidences stable when stepping.
function ruler(ticks,guided){
  const value=ticks/20,whole=Math.floor(value),match=ticks%20;
  const x=v=>36+(v-19)*22;
  let lines='',labels='';
  for(let mm=19;mm<=41;mm++){
    const major=mm%5===0,integer=guided&&mm===whole,aligned=guided&&mm===whole+match;
    const color=integer?'#007163':aligned?'#a34e16':'#334e55';
    lines+='<path d="M'+x(mm)+' 44v-'+(major||integer||aligned?20:12)+'" stroke="'+color+'" stroke-width="'+(integer||aligned?2.4:1.3)+'"/>';
    if(major||integer||aligned)labels+='<text x="'+x(mm)+'" y="18" fill="'+color+'">'+mm+'</text>';
  }
  for(let i=0;i<=20;i++){
    const pos=x(value+.95*i),active=guided&&i===match;
    const color=guided&&i===0?'#007163':active?'#a34e16':'#334e55';
    lines+='<path d="M'+pos+' 47v'+(i%5===0||active?20:12)+'" stroke="'+color+'" stroke-width="'+(active||i===0?2.4:1.3)+'"/>';
    if(i%5===0||active)labels+='<text x="'+pos+'" y="86" fill="'+color+'">'+i+'</text>';
  }
  return '<svg viewBox="0 0 548 96" role="img" aria-label="주척과 움직이는 아들자"><rect width="548" height="45" rx="3" fill="#e5eeeb"/><rect x="'+(x(value)-8)+'" y="46" width="434" height="48" rx="4" fill="#f7ebd5"/>'+lines+'<g text-anchor="middle" font-size="13" font-weight="650">'+labels+'</g></svg>';
}
export function magnifier(value,n){
  const position=value+.95*n,nearest=Math.round(position),offset=(position-nearest)*151;
  return '<svg viewBox="0 0 320 70" width="320" style="max-width:100%" role="img" aria-label="선택한 두 눈금선의 정렬"><rect width="320" height="70" rx="5" fill="#e9efea"/><path d="M210 5v28" stroke="#234b50" stroke-width="2.6"/><path d="M'+(210+offset)+' 36v28" stroke="#a34e16" stroke-width="2.6"/><g fill="#213e43" font-size="14"><text x="9" y="24">비교할 주척선 '+nearest+' mm</text><text x="9" y="56">선택한 아들자 '+n+'번</text></g></svg>';
}
export function vernierLesson(host){
  host.innerHTML='<section class="gauge-bench vernier-lesson"><h3>아들자의 0부터 읽기</h3><p>아래쪽 자는 이동 턱과 함께 움직입니다. 턱을 한 칸씩 옮겨 어느 선이 겹치는지 확인하세요.</p>'+
    '<div class="lesson-model"></div>'+
    '<div class="vernier-ruler"></div><div class="vernier-notes"></div>'+
    '<div class="vernier-examples" role="group" aria-label="눈금 읽기 예시"></div>'+
    '<label class="lesson-slide">턱 위치 <input type="range" min="400" max="419" value="400" step="1" aria-label="예시 턱 위치"></label>'+
    '<button type="button" data-quiz>도움 없이 읽기</button><div class="lesson-quiz"></div></section>';
  const q=s=>host.querySelector(s),macro=document.createElement('precision-contact');
  macro.setAttribute('initial-view','scale');
  let ticks=400,quiz=false;
  function show(){
    const value=ticks/20,integer=Math.floor(value),n=ticks%20;
    // Each preset is a separate teaching specimen; no lot record is involved.
    macro.update({length:value,diam:.975,shape:{}},'length',{gap:value,placed:true,zeroed:true,guided:!quiz});
    q('.vernier-ruler').innerHTML=ruler(ticks,!quiz);
    q('.vernier-notes').innerHTML=quiz?'<p>아들자 0의 위치를 먼저 읽고, 위아래 선이 일치하는 칸을 찾으세요.</p>':
      '<p><b>① 정수 부분</b>　아들자 0에서 위를 보면 '+integer+' mm'+(n?'를 지났습니다.':'에 맞습니다.')+'</p>'+
      '<p><b>② 일치선</b>　아들자 '+n+'번과 주척 '+(integer+n)+' mm 선이 겹칩니다. 소수 부분은 '+n+' × 0.05 = '+(n*.05).toFixed(2)+' mm입니다.</p>'+
      '<p><b>측정값</b>　'+integer+' + '+(n*.05).toFixed(2)+' = <strong>'+value.toFixed(2)+' mm</strong></p>';
    for(const b of host.querySelectorAll('[data-ticks]'))b.setAttribute('aria-pressed',String(+b.dataset.ticks===ticks&&!quiz));
    q('.lesson-slide').hidden=quiz;q('.vernier-examples').hidden=quiz;
    q('.lesson-slide input').value=String(ticks);
    q('[data-quiz]').textContent=quiz?'예시로 돌아가기':'도움 없이 읽기';
  }
  for(const t of [400,401,410]){
    const b=document.createElement('button');b.type='button';b.dataset.ticks=String(t);b.textContent=(t/20).toFixed(2)+' mm';
    b.onclick=()=>{ticks=t;show();};q('.vernier-examples').append(b);
  }
  q('.lesson-slide input').oninput=e=>{ticks=Number(e.target.value);show();};
  q('[data-quiz]').onclick=()=>{
    quiz=!quiz;ticks=quiz?407:400;
    const box=q('.lesson-quiz');
    box.innerHTML=quiz?'<label>비교할 아들자 눈금 <output>0</output>번 <input type="range" min="0" max="19" value="0" aria-label="비교할 아들자 눈금"></label><div class="lesson-lens"></div><form><label>읽은 길이 (mm) <input type="number" step=".01" required inputmode="decimal"></label> <button>답 확인</button></form><p role="status"></p>':'';
    if(quiz){
      const compare=box.querySelector('[type=range]');
      const zoom=()=>{box.querySelector('output').textContent=compare.value;box.querySelector('.lesson-lens').innerHTML=magnifier(ticks/20,Number(compare.value));};
      compare.oninput=zoom;zoom();
      box.querySelector('form').onsubmit=e=>{e.preventDefault();box.querySelector('[role=status]').textContent=
        box.querySelector('[type=number]').valueAsNumber===ticks/20?'맞았습니다. 20 mm에 아들자 7칸 × 0.05 mm를 더하면 20.35 mm입니다.':'다시 읽어보세요. 두 선이 겹치는 아들자 번호에 0.05 mm를 곱합니다.';};
    }
    show();
  };
  show();q('.lesson-model').append(macro);
}
