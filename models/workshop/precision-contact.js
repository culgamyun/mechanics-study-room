class PrecisionContact extends HTMLElement {
  update(piece,key,state){
    this.model={piece,key,...state};
    if(this.isConnected)this.refresh();
  }
  async connectedCallback(){
    const token=this.token=Symbol();
    const length=this.model.key==='length';
    this.view=this.getAttribute('initial-view')||'whole';
    this.front=false;this.orbit={yaw:.15,pitch:.26};
    this.innerHTML='<div class="macro-head"><strong>'+(length?'버니어 캘리퍼스':'디지털 외측 마이크로미터')+'</strong><small>'+(length?'최소 판독 0.05 mm':'표시 단위 0.001 mm')+'</small></div>'+
      '<div class="macro-stage"><canvas aria-label="'+(length?'캘리퍼스 턱과 황동 핀의 양 끝면':'마이크로미터 앤빌과 스핀들 사이의 황동 핀')+'" role="img"></canvas><svg class="macro-callouts" aria-hidden="true"></svg></div>'+
      '<div class="macro-views" role="group" aria-label="측정기 시점"><button data-view="whole">장비 전체</button><button data-view="contact">측정면 확대</button>'+
      (length?'<button data-view="scale">눈금 확대</button>':'')+'<button data-names aria-pressed="false">부품 이름</button><button data-front aria-pressed="false">정면 보기</button></div>'+
      '<div class="macro-foot"><span></span><small>황동 핀 · '+(length?'전장':'외경')+'</small></div>'+
      (this.controls?'<p class="macro-tip">'+(length?'이동 턱을':'마이크로미터 손잡이를')+' 좌우로 끌어 간격을 조절하세요. 빈 곳을 끌면 시점이 돌아갑니다.</p>':'');
    const canvas=this.querySelector('canvas'),front=this.querySelector('[data-front]');
    const fallback=()=>{
      this.dataset.renderer='diagram';
      this.querySelector('.macro-stage').textContent='아래 계측 도해에서 측정면을 조작하세요.';
      this.querySelector('.macro-views').hidden=true;
    };
    canvas.addEventListener('webglcontextlost',()=>{if(this.token===token)fallback();},{once:true});
    this.refresh();
    try{
      const {createScene}=await import('./precision-scene.js');
      if(this.token!==token)return;
      this.scene=createScene(canvas,this.model);
      const names=this.querySelector('[data-names]');
      names.onclick=()=>{this.names=!this.names;names.setAttribute('aria-pressed',String(this.names));this.refresh();};
      front.onclick=()=>{
        this.front=!this.front;
        this.refresh();
      };
      for(const b of this.querySelectorAll('[data-view]'))b.onclick=()=>{this.view=b.dataset.view;this.refresh();};
      let drag;
      canvas.onpointerdown=e=>{
        if(!e.isPrimary||e.button!==0)return;
        const hit=this.controls?this.scene.dragTarget(e):null;
        if(!hit&&this.view==='scale')return;
        canvas.setPointerCapture(e.pointerId);
        drag={x:e.clientX,y:e.clientY,...hit,gap:this.model.gap};
      };
      canvas.onpointermove=e=>{
        if(!drag)return;
        if(drag.part==='handle'){
          this.controls.setGap(drag.gap+(e.clientX-drag.x)/drag.pixelsPerMM);return;
        }
        if(drag.part==='pin')return;
        if(this.front){this.orbit={yaw:0,pitch:0};this.front=false;}
        this.orbit.yaw=Math.max(-1.1,Math.min(1.1,this.orbit.yaw-(e.clientX-drag.x)*.009));
        this.orbit.pitch=Math.max(-.85,Math.min(.85,this.orbit.pitch+(e.clientY-drag.y)*.009));
        drag={x:e.clientX,y:e.clientY};this.refresh();
      };
      canvas.onpointerup=e=>{
        if(drag?.part==='pin'&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)this.controls.place();
        drag=null;
      };
      canvas.onlostpointercapture=()=>{drag=null;};
      this.observer=new ResizeObserver(()=>this.refresh());
      this.observer.observe(canvas);
      this.refresh();
      this.dataset.renderer='webgl';
    }catch{if(this.token===token)fallback();}
  }
  refresh(){
    const {piece,key,gap,placed,zeroed}=this.model;
    const contact=placed&&gap===piece[key];
    this.querySelector('.macro-foot span').textContent=contact?'양쪽 측정면 접촉':placed?'고정면에 핀 배치':zeroed?'핀 대기 · 영점 확인 완료':'핀 대기 · 영점 확인 전';
    this.dataset.contact=String(contact);
    for(const b of this.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===this.view));
    const front=this.querySelector('[data-front]');front.disabled=this.view==='scale';
    front.setAttribute('aria-pressed',String(this.front||this.view==='scale'));
    if(this.scene&&this.dataset.renderer!=='diagram'){
      this.scene.draw(this.model,this.view,this.front,this.orbit);
      const overlay=this.querySelector('.macro-callouts'),canvas=this.querySelector('canvas');
      const marks=this.names?this.scene.landmarks(this.view,gap):[];
      overlay.innerHTML=marks.map(({name,x,y},i)=>{
        const lx=canvas.clientWidth*(i+.5)/marks.length,ly=canvas.clientHeight-16;
        return '<path d="M'+x+' '+y+' L'+lx+' '+(ly-7)+'"/><circle cx="'+x+'" cy="'+y+'" r="2.6"/><rect x="'+(lx-25)+'" y="'+(ly-11)+'" width="50" height="20" rx="4"/><text x="'+lx+'" y="'+(ly+4)+'">'+name+'</text>';
      }).join('');
    }
  }
  disconnectedCallback(){
    this.token=null;
    this.observer?.disconnect();
    this.scene?.dispose();
    this.scene=null;
  }
}
customElements.define('precision-contact',PrecisionContact);
