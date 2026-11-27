import * as T from '../vendor/three-r180/three.module.min.js';

function texture(w,h,paint){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  paint(c.getContext('2d'),w,h);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  return map;
}
function metal(color,roughness=.31,metalness=.87){
  return new T.MeshStandardMaterial({color,roughness,metalness});
}
function brushedSteel(){
  const mat=metal(0xcfd5d2,.34);
  const map=texture(256,128,(ctx,w,h)=>{
    ctx.fillStyle='#cccccc';ctx.fillRect(0,0,w,h);
    for(let y=0;y<h;y++){
      const tone=Math.round(188+25*Math.sin(y*57.23)+12*Math.cos(y*19.2));
      ctx.fillStyle='rgb('+[tone,tone,tone].join(',')+')';ctx.fillRect(0,y,w,1);
    }
  });
  map.colorSpace=T.NoColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(.8,.7);
  mat.roughnessMap=map;return mat;
}
const mesh=(parent,geo,mat,x=0,y=0,z=0)=>{
  const m=new T.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;
};
function plate(parent,outline,depth,mat,z,bevel=.08){
  const geo=new T.ExtrudeGeometry(outline,{depth,curveSegments:36,bevelEnabled:bevel>0,bevelSegments:3,bevelSize:bevel,bevelThickness:bevel});
  return mesh(parent,geo,mat,0,0,z);
}
function polygon(points){
  const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return shape;
}
function rect(x,y,w,h,r){
  const s=new T.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);
  s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
function shaft(parent,steps,mat,x,y=0,z=0){
  // End caps are part of the revolved profile and lie at the indicated axial coordinate.
  const points=[[steps[0][0],0],...steps,[steps.at(-1)[0],0]].map(([a,r])=>new T.Vector2(r,a));
  return mesh(parent,new T.LatheGeometry(points,72).rotateZ(-Math.PI/2),mat,x,y,z);
}
function face(parent,w,h,x,y,z,map){
  return mesh(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,toneMapped:false}),x,y,z);
}
function screw(parent,x,y,z,r,finish){
  mesh(parent,new T.CylinderGeometry(r*.9,r,.14,24).rotateX(Math.PI/2),finish,x,y,z);
  const slot=mesh(parent,new T.BoxGeometry(r*1.23,r*.2,.032),metal(0x39454a),x,y,z+.079);
  slot.rotation.z=-.47;
}
function knurl(){
  const pattern=texture(128,128,(ctx,w,h)=>{
    ctx.fillStyle='#858585';ctx.fillRect(0,0,w,h);
    for(const sign of [-1,1])for(let i=-h*2;i<w+h*2;i+=16){
      for(const [off,color] of [[0,'#373737'],[2,'#cccccc']]){
        ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(i+off,0);ctx.lineTo(i+off+sign*h,h);ctx.stroke();
      }
    }
  });
  pattern.wrapS=pattern.wrapT=T.RepeatWrapping;pattern.repeat.set(6,1.5);pattern.colorSpace=T.NoColorSpace;
  const grip=metal(0x879393,.43);grip.bumpMap=pattern;grip.bumpScale=.13;return grip;
}
// Raised diamond lands on the grip catch specular highlights as the ratchet turns.
function gripBand(parent,x1,x2,r,rows,around){
  const vertices=[];
  const point=(u,v,lift=0)=>[x1+(x2-x1)*u/rows,(r+lift)*Math.cos(2*Math.PI*v/around),(r+lift)*Math.sin(2*Math.PI*v/around)];
  for(let i=0;i<rows;i++)for(let j=0;j<around;j++){
    const v=j+(i%2)*.5,peak=point(i+.5,v+.5,.11);
    const rim=[point(i+.04,v+.5),point(i+.5,v+.95),point(i+.96,v+.5),point(i+.5,v+.05)];
    for(let k=0;k<4;k++)vertices.push(...rim[k],...peak,...rim[(k+1)%4]);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
  const mat=metal(0xb8c3c0,.35);mat.side=T.DoubleSide;mesh(parent,g,mat);
}
// Both scales use mm in local space, so sliding the vernier 0.05 mm moves its
// zero by 0.05 mm and brings the next 0.95 mm graduation into alignment.
function scalePlate(width,height,offset,vernier){
  return texture(vernier?1536:3072,208,(ctx,w,h)=>{
    const px=w/width,step=vernier?.95:1,count=vernier?20:60;
    const grad=ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,'#c3ccca');grad.addColorStop(.48,'#f1f1e9');grad.addColorStop(1,'#bcc7c5');
    ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
    ctx.textAlign='center';ctx.font='600 '+Math.round(h*.32)+'px Arial';
    for(let i=0;i<=count;i++){
      const x=(offset+i*step)*px,major=i%5===0;
      ctx.fillStyle='#192b2f';
      const len=h*(major?.43:.23);
      ctx.fillRect(x-px*.036,vernier?0:h-len,px*.072,len);
      if(major)ctx.fillText(String(i),x,vernier?h*.85:h*.43);
    }
  });
}
export function caliperModel(scene){
  const steel=brushedSteel(),edge=metal(0xf3f2e8,.19),dark=metal(0x52656a,.43);
  const fixed=new T.Group(),moving=new T.Group();scene.add(fixed,moving);
  plate(fixed,rect(-4.1,10.15,67,5.1,.42),2,steel,-1);
  // Outer measuring faces remain exactly at x=0 and x=gap.
  plate(fixed,polygon([[0,10.3],[0,-2.1],[-.48,-2.1],[-2.6,1.5],[-4.3,8.5],[-4.3,14.3],[-2,14.3],[-2,10.3]]),2.55,steel,-1.28,0);
  plate(moving,polygon([[0,9.55],[0,-2.1],[.48,-2.1],[2.6,1.5],[4.1,6.8],[4.1,9.55]]),2.55,steel,-1.28,0);
  // Ground lands at the jaw tips, on the visible front face.
  for(const [g,sign] of [[fixed,-1],[moving,1]]){
    plate(g,polygon([[0,-2.06],[sign*.45,-2.06],[sign*1.3,-.55],[sign*.52,3.4],[0,3.4]]),.024,edge,1.275,0);
    plate(g,polygon([[sign*.04,14.7],[sign*.04,21.1],[sign*.42,20.7],[sign*2.15,17.9],[sign*2.65,14.7]]),1.25,steel,-.67,0);
  }
  plate(moving,rect(-1.45,6.9,23.7,3.35,.48),2.95,steel,-1.48);
  plate(moving,rect(-1.45,15.35,23.7,1.23,.34),2.75,steel,-1.43);
  plate(moving,rect(20.95,7.3,1.3,8.95,.26),2.8,dark,-1.43);
  face(fixed,62,4.55,30,12.65,1.095,scalePlate(62,4.55,1,false));
  face(moving,20.8,3.18,9.65,8.63,1.57,scalePlate(20.8,3.18,.75,true));
  const wheel=shaft(moving,[[-1.6,.78],[-1.48,1],[1.48,1],[1.6,.78]],knurl(),15.9,6.38);
  gripBand(wheel,-1.45,1.45,1,7,24);
  const lock=shaft(moving,[[0,.58],[.8,.58],[.85,1.42],[2,1.42],[2.1,1.25]],knurl(),16,16.58);
  lock.rotation.z=Math.PI/2;
  for(const x of [.25,19.6])screw(moving,x,15.98,1.45,.35,edge);
  const ink=color=>new T.MeshBasicMaterial({color,toneMapped:false});
  const zeroGuide=mesh(fixed,new T.PlaneGeometry(.14,1.8),ink(0x047765),0,11.30,1.12);
  const matchGuide=mesh(fixed,new T.PlaneGeometry(.14,1.8),ink(0xb44e15),0,11.30,1.12);
  const subGuide=mesh(moving,new T.PlaneGeometry(.14,1.55),ink(0xb44e15),0,9.42,1.59);
  return {moving,update(gap,guided){
    moving.position.x=gap;wheel.rotation.x=gap;
    const whole=Math.floor(gap),match=Math.round((gap-whole)*20);
    zeroGuide.visible=!!guided;matchGuide.visible=!!guided&&match!==0;subGuide.visible=!!guided;
    zeroGuide.position.x=whole;matchGuide.position.x=whole+match;subGuide.position.x=.95*match;
  }};
}
export function micrometerModel(scene){
  const frame=new T.Group(),moving=new T.Group(),rotor=new T.Group();
  scene.add(frame,moving);moving.add(rotor);
  const enamel=metal(0x24565b,.3,.50),steel=brushedSteel(),chrome=metal(0xe2e5db,.18),
    carbide=metal(0x78827e,.22),grip=metal(0x293941,.65,.18);
  const c=new T.Shape();
  c.moveTo(-12,1.9);c.lineTo(-6.6,1.9);c.lineTo(-6.6,-7.6);
  c.bezierCurveTo(-6,-17.2,13.4,-18.4,15.6,-7.4);c.lineTo(16.4,.9);c.lineTo(24,1);
  c.lineTo(23,-8.2);c.bezierCurveTo(21,-26,-9.8,-28.3,-12.5,-9.2);c.closePath();
  plate(frame,c,4.4,enamel,-2.2,.58);
  const pad=new T.Shape();pad.moveTo(-5.6,-15);pad.bezierCurveTo(-1,-19.1,9.5,-20.1,15.1,-15.1);
  pad.lineTo(15.9,-18.1);pad.bezierCurveTo(10.8,-23.1,.1,-23.8,-6.4,-18.2);pad.closePath();
  plate(frame,pad,.58,grip,2.3,.2);
  for(const x of [-4,13.7])screw(frame,x,-17.9,3.16,.65,steel);
  shaft(frame,[[-13.6,2.6],[-13.4,3],[-7.3,3],[-7,2.2],[-.65,2.2]],steel,0);
  shaft(frame,[[-.65,2.2],[0,2.2]],carbide,0);
  shaft(moving,[[0,2.2],[.65,2.2]],carbide,0);
  shaft(moving,[[.65,2.2],[27,2.2]],chrome,0);
  shaft(frame,[[15.5,3.1],[15.9,3.75],[26,3.75],[26.4,3.2],[34,3.2]],steel,0);
  plate(frame,rect(14.7,-6.3,15,11.6,1.55),6.7,enamel,-3.35,.38);
  plate(frame,rect(15.65,-1.6,12.9,5.97,.55),.38,grip,3.65);
  const screen=texture(640,220,()=>{}),ctx=screen.image.getContext('2d');
  face(frame,11.96,4.72,22.08,1.35,4.14,screen);
  for(const [x,color] of [[18,0x99b8ae],[21.3,0xbb8d57]]){
    mesh(frame,new T.CylinderGeometry(.81,.92,.48,24).rotateX(Math.PI/2),metal(color,.5,.25),x,-3.9,3.73);
  }
  shaft(rotor,[[30,3.9],[31,4.24],[33,4.38],[43.3,4.38],[44.4,3.85],[45,3]],steel,0);
  shaft(rotor,[[32.6,4.4],[33,4.49],[42.7,4.49],[43,4.38]],knurl(),0);
  shaft(rotor,[[44.8,2.5],[46,2.5],[46.3,3.08],[52.2,3.08],[52.6,2.82]],knurl(),0);
  gripBand(rotor,33.2,42.6,4.49,10,56);gripBand(rotor,46.5,52,3.08,7,40);
  let lastGap;
  return {moving,update(gap){
    if(gap===lastGap)return;lastGap=gap;moving.position.x=gap;
    rotor.rotation.x=gap*Math.PI*4;
    ctx.fillStyle='#c8d5ba';ctx.fillRect(0,0,640,220);
    ctx.fillStyle='#213329';ctx.font='bold 110px monospace';ctx.textAlign='right';ctx.fillText(gap.toFixed(3),513,158);
    ctx.font='45px Arial';ctx.fillText('mm',618,158);screen.needsUpdate=true;
  }};
}
