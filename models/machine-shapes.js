// Local X is the shaft axis. All dimensions describe the teaching model.
(() => {
  const tau=Math.PI*2;
  function loft(rows,capEnds=false){
    const n=rows[0].length,faces=[];
    for(let j=1;j<rows.length;j++)for(let i=0;i<n;i++){
      const k=(i+1)%n;
      faces.push([(j-1)*n+i,(j-1)*n+k,j*n+k,j*n+i]);
    }
    if(capEnds){
      faces.push(rows[0].map((_,i)=>n-1-i),rows[0].map((_,i)=>(rows.length-1)*n+i));
    }
    return {vertices:rows.flat(),faces};
  }
  function turned(profile,sides=32){
    return loft(profile.map(([x,r])=>Array.from({length:sides},(_,i)=>[x,r*Math.cos(tau*i/sides),r*Math.sin(tau*i/sides)])));
  }
  function jaw(length,outer,inner,angle,arc){
    // A closed annular sector with a tapered mouth and open space for the stock.
    const profile=[[0,inner],[0,outer*.85],[length*.46,outer],[length,outer],[length,inner]];
    const rows=Array.from({length:9},(_,i)=>{
      const a=angle+arc*(i/8-.5);
      return profile.map(([x,r])=>[x,r*Math.cos(a),r*Math.sin(a)]);
    });
    const result=loft(rows,true);
    // Loft wraps the profile, not the angular sweep.
    return result;
  }
  function housing(w,h,d,r=.08){
    const b=Math.min(r,w*.18,h*.18,d*.18);
    function rim(y,shrink){
      const a=w/2-shrink,c=d/2-shrink,k=b-shrink*.55;
      return [[-a+k,-c],[a-k,-c],[a,-c+k],[a,c-k],[a-k,c],[-a+k,c],[-a,c-k],[-a,-c+k]].map(([x,z])=>[x,y,z]);
    }
    return loft([rim(-h/2,b*.4),rim(-h/2+b*.4,0),rim(h/2-b*.4,0),rim(h/2,b*.4)],true);
  }
  function drill(length,r){
    const n=22,rows=[];
    for(let j=0;j<=19;j++){
      const t=j/19,x=t*length;
      rows.push(Array.from({length:n},(_,i)=>{
        const a=tau*i/n,flute=Math.max(0,Math.cos(2*(a-t*4.6)));
        const cut=(1-Math.min(1,Math.max(0,(t-.73)/.2)))*.42*flute;
        const radius=r*Math.min(1,t*length/(r*.85))*(1-cut);
        return [x,radius*Math.cos(a),radius*Math.sin(a)];
      }));
    }
    return loft(rows,true);
  }
  function insert(w,h,d,side){
    const cross=[[-w*.48,0],[w*.48,0],[w*.50,h*.67],[w*.38,h],[-w*.5,h]];
    return loft([-.48,.48].map(z=>cross.map(([x,y])=>[x,side*y,d*z*(.68+.32*y/h)])),true);
  }
  function orient(v,axis='x',angle=0){
    const [x,a,b]=v, y=a*Math.cos(angle)-b*Math.sin(angle),z=a*Math.sin(angle)+b*Math.cos(angle);
    if(axis==='z')return [y,z,x];
    if(axis==='y')return [z,x,y];
    if(axis==='-x')return [-x,y,-z];
    return [x,y,z];
  }
  function shade(rgb,nx,ny,nz,selected){
    const inv=(nz<0?-1:1)/(Math.hypot(nx,ny,nz)||1);nx*=inv;ny*=inv;nz*=inv;
    const light=.48+.54*Math.max(0,-.39*nx+.74*ny+.54*nz)+.12*Math.max(0,.82*nx+.28*ny+.44*nz);
    const shine=44*Math.pow(Math.max(0,-.27*nx+.42*ny+.86*nz),14);
    const ch=shift=>Math.min(255,((rgb>>shift&255)*light+shine+(selected?9:0)))|0;
    return (255<<24)|(ch(0)<<16)|(ch(8)<<8)|ch(16);
  }
  // Clip the solid at its axial plane. Fill only material intervals, leaving bores open.
  function section(shape,plane=0){
    const z=plane+.000003,vertices=[],faces=[],edges=[];
    const add=pts=>{const n=vertices.length;vertices.push(...pts);faces.push(pts.map((_,i)=>n+i));};
    for(const indices of shape.faces){
      const pts=[],cuts=[];
      for(let i=0;i<indices.length;i++){
        const a=shape.vertices[indices[i]],b=shape.vertices[indices[(i+1)%indices.length]];
        if(a[2]<=z)pts.push(a);
        if((a[2]<=z)===(b[2]<=z))continue;
        const t=(z-a[2])/(b[2]-a[2]);
        const p=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),z];
        pts.push(p);cuts.push(p);
      }
      if(pts.length>=3)add(pts);
      if(cuts.length===2&&Math.abs(cuts[0][0]-cuts[1][0])>1e-7)edges.push(cuts);
    }
    const capStart=faces.length;
    const xs=[...new Set(edges.flatMap(e=>e.map(v=>v[0])))].sort((a,b)=>a-b);
    const at=([a,b],x)=>a[1]+(x-a[0])*(b[1]-a[1])/(b[0]-a[0]);
    for(let i=1;i<xs.length;i++){
      const l=xs[i-1],r=xs[i],m=(l+r)/2;
      if(r-l<1e-7)continue;
      const spans=edges.filter(([a,b])=>(a[0]<m)!==(b[0]<m)).sort((a,b)=>at(a,m)-at(b,m));
      for(let k=1;k<spans.length;k+=2){
        const low=spans[k-1],high=spans[k];
        add([[l,at(low,l),z],[r,at(low,r),z],[r,at(high,r),z],[l,at(high,l),z]]);
      }
    }
    return {vertices,faces,capStart};
  }
  function backdrop(ctx,w,h,project,y){
    const bg=ctx.createLinearGradient(0,0,w*.28,h);bg.addColorStop(0,'#233c48');bg.addColorStop(1,'#0c1e28');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.beginPath();
    for(let i=-13;i<=13;i++){
      for(const [a,b] of [[[i,y,-13],[i,y,13]],[[-13,y,i],[13,y,i]]]){
        const p=project(a),q=project(b);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);
      }
    }
    ctx.strokeStyle='rgba(164,206,212,.10)';ctx.lineWidth=.7;ctx.stroke();
  }
  globalThis.MachineShapes={turned,jaw,housing,drill,insert,orient,shade,backdrop,section};
})();
