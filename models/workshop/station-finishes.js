// The same depth image used for picking also clips ink behind tools, pins and lids.
const labels=new Map();
function labelTexture(lines,style){
  const id=JSON.stringify([lines,style]);
  if(labels.has(id))return labels.get(id);
  const canvas=document.createElement('canvas');
  canvas.width=320;canvas.height=lines.length===1?70:134;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const digital=style==='lcd', paper=style==='paper';
  ctx.fillStyle=digital?'#bddebb':paper?'#faf5df':'#233e49';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle=digital?'#1c3833':paper?'#243d45':'#eaf6f1';
  ctx.textBaseline='middle';ctx.textAlign=paper?'left':'center';
  lines.forEach((line,i)=>{
    ctx.font=(i===0?'bold ':'')+(lines.length===1?54:i===0?47:30)+'px '+(digital?'monospace':'"Malgun Gothic", sans-serif');
    ctx.fillText(line,paper?14:160,lines.length===1?36:26+i*45,296);
  });
  const texture=ctx.getImageData(0,0,canvas.width,canvas.height);
  if(labels.size>96)labels.clear();labels.set(id,texture);
  return texture;
}
export function applyDecal(surface,project,x,y,z,width,depth,lines,style){
  const a=project([x-width/2,y,z-depth/2]),b=project([x+width/2,y,z-depth/2]),c=project([x-width/2,y,z+depth/2]);
  const scale=surface.scale,w=surface.canvas.width,h=surface.canvas.height;
  const ux=(b[0]-a[0])*scale,uy=(b[1]-a[1])*scale,vx=(c[0]-a[0])*scale,vy=(c[1]-a[1])*scale;
  const det=ux*vy-uy*vx;
  if(det<.1)return;
  const ax=a[0]*scale,ay=a[1]*scale,texture=labelTexture(lines,style);
  const x0=Math.max(0,Math.floor(ax+Math.min(0,ux)+Math.min(0,vx))),x1=Math.min(w-1,Math.ceil(ax+Math.max(0,ux)+Math.max(0,vx)));
  const y0=Math.max(0,Math.floor(ay+Math.min(0,uy)+Math.min(0,vy))),y1=Math.min(h-1,Math.ceil(ay+Math.max(0,uy)+Math.max(0,vy)));
  for(let py=y0;py<=y1;py++)for(let px=x0;px<=x1;px++){
    const dx=px+.5-ax,dy=py+.5-ay,u=(dx*vy-dy*vx)/det,v=(ux*dy-uy*dx)/det;
    if(u<0||u>=1||v<0||v>=1)continue;
    const i=py*w+px, d=a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]);
    if(d<surface.depth[i]-.03)continue;
    const src=4*(Math.floor(v*texture.height)*texture.width+Math.floor(u*texture.width));
    const rgba=texture.data;surface.pixels[i]=(255<<24)|(rgba[src+2]<<16)|(rgba[src+1]<<8)|rgba[src];
  }
}
// Contact shading comes from nearby rendered surfaces, so it follows the moving geometry.
export function shadeContacts(surface,worldScale){
  const {depth,pixels,canvas,scale}=surface,w=canvas.width,h=canvas.height;
  const near=Math.max(2,Math.round(worldScale*scale*.075)),far=near*2;
  const probes=[-near*w,near*w,near,-near,-far*w-far,far*w+far];
  const reach=worldScale*.30;
  for(let y=far;y<h-far;y++)for(let x=far;x<w-far;x++){
    const i=y*w+x,z=depth[i];if(z===-Infinity)continue;
    let occlusion=0;
    for(const offset of probes){
      const dz=depth[i+offset]-z;
      if(dz>worldScale*.055&&dz<reach)occlusion+=(1-dz/reach);
    }
    if(!occlusion)continue;
    const light=1-occlusion*.063,rgb=pixels[i];
    pixels[i]=(255<<24)|(((rgb>>>16&255)*light)<<16)|(((rgb>>>8&255)*light)<<8)|((rgb&255)*light);
  }
}
export function studioFloor(ctx,w,h,project,scale){
  const bg=ctx.createLinearGradient(0,0,w*.3,h);
  bg.addColorStop(0,'#223b46');bg.addColorStop(.55,'#142a33');bg.addColorStop(1,'#0d2029');
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.beginPath();ctx.strokeStyle='rgba(167,208,211,.095)';ctx.lineWidth=.7;
  const line=(a,b)=>{const p=project(a),q=project(b);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);};
  for(let i=-14;i<=14;i++){line([i,-.57,-14],[i,-.57,14]);line([-14,-.57,i],[14,-.57,i]);}
  ctx.stroke();
  const p=project([.15,-.55,.15]);ctx.save();ctx.translate(p[0],p[1]);ctx.scale(scale*4.9,scale*1.65);
  const shadow=ctx.createRadialGradient(0,0,.12,0,0,1);shadow.addColorStop(0,'#071118b8');shadow.addColorStop(.72,'#07111866');shadow.addColorStop(1,'#07111800');
  ctx.fillStyle=shadow;ctx.fillRect(-1,-1,2,2);ctx.restore();
}
