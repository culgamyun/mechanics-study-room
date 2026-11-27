import {slenderPin} from '../pin-spec.js';
const common={qty:3, lenTol:.10};
export const jobs=[
  {...common,id:'P-101',name:'위치 결정 핀',rev:'B',machine:'D2 캠식',url:'../d2/index.html?mode=practice',stock:'황동 코일',lot:'BR-17',density:8.50,length:8,diam:2,tol:.005,feature:'민핀 · 홈 없음',recipe:'홈 가공을 건너뜁니다. 소재 이송 → 콜릿으로 잡기 → 절단 → 배출.',container:'칸막이 트레이'},
  {...common,id:'P-202',name:'정면 소켓 핀',rev:'C',machine:'D5 CNC',url:'../d5/index.html?mode=practice&variant=cnc',stock:'쾌삭강 코일',lot:'ST-24',density:7.85,length:10,diam:2.5,tol:.008,hole:.8,depth:2,feature:'정면의 작은 막힌 구멍',recipe:'소재 이송 → 드릴 주축 1 선택 → 중심 맞추기 → 가는 구멍 가공. 콜릿 자리를 선택해 중심 맞추기 → 콜릿으로 잡기 → 절단 → 배출.',container:'뚜껑형 트레이'},
  {...common,id:'P-303',name:'홈붙이 배면 핀',rev:'A',machine:'STAR SR-10J type C',url:'../swiss/index.html?model=star',stock:'황동 봉재',lot:'BA-32',density:8.50,length:12,diam:3,tol:.006,hole:1,depth:2.5,groove:.8,root:2.6,offset:2.4,feature:'좁은 홈과 절단면의 작은 막힌 구멍',recipe:'소재 이송 → 홈 가공 → 부주축으로 잡기 → 절단·인계 → 배면 드릴 가공 → 배출. 기본 좁은 홈 날과 가는 드릴을 사용합니다.',container:'개별 칸 트레이'},
  {...common,...slenderPin,id:'P-104',name:'SSD 크기 연습용 민핀',rev:'A',machine:'D2 CNC',url:'../d2/index.html?mode=practice&variant=cnc&pin=slender',stock:'황동 코일',lot:'BR-04',density:8.50,tol:.005,feature:'민핀 · 홈과 구멍 없음',recipe:'소재를 이송한 뒤 홈 가공을 건너뛰고 콜릿으로 잡아 절단·배출하세요.',container:'개별 칸 트레이'}
];
export function matches(j,shape){
  if(!j.hole)return !shape.narrow&&!shape.wide;
  if(j.id==='P-202')return !!shape.small&&!shape.large&&!shape.tap;
  return !!shape.narrow&&!shape.wide&&shape.bore===1;
}
export function describe(j,s){
  if(j.id==='P-202')return s.large?'큰 정면 구멍':s.tap?'암나사':s.small?'작은 정면 구멍':'구멍 없음';
  const groove=s.wide?'넓은 홈':s.narrow?'좁은 홈':'홈 없음';
  return !j.hole?groove:groove+' · '+(['배면 구멍 없음','작은 배면 구멍','큰 배면 구멍'][s.bore]);
}
export function start(){return {phase:'prep',run:crypto.randomUUID(),records:[],piece:null,shape:null,packed:null};}
export function makePiece(j,s,shape) {
  const pending=s.queue??[];
  const number=s.records.length+pending.length+1;
  const accepted=s.records.filter(p=>p.pass).length;
  const drift=accepted===1&&!s.records.some(p=>p.drift)&&!pending.some(p=>p.drift);
  const dOff=drift?j.tol+.004:[.001,-.002,.002][(number-1)%3];
  const nominalFirst=j.id==='P-104'&&number===1;
  return {number,shape,drift,length:+(j.length+(nominalFirst?0:[.05,0,-.05][(number-1)%3])).toFixed(2),
    diam:+(j.diam+(nominalFirst?0:dOff)).toFixed(3),readings:{},optical:false,cleaned:false};
}
export const inRange=(v,n,t)=>Math.abs(v-n)<=t+1e-8;
export const good=(j,p)=>matches(j,p.shape)&&inRange(p.length,j.length,j.lenTol)&&inRange(p.diam,j.diam,j.tol);
export function mass(j,p){
  // Nominal blind-hole depth refers to the cylindrical length in this exercise.
  const body=p.length*p.diam**2, hole=(j.hole??0)**2*(j.depth??0);
  const relief=j.groove?j.groove*(p.diam**2-j.root**2):0;
  return (body-hole-relief)*Math.PI/4*j.density/1000;
}
export function massLimits(j){
  const n=mass(j,{length:j.length,diam:j.diam})*j.qty;
  return [Math.floor(n*.97*1000)/1000,Math.ceil(n*1.03*1000)/1000];
}
