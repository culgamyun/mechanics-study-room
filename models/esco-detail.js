(() => {
  const S=globalThis.MachineShapes;
  const steel='#b5cbd0',iron='#688491',dark='#354d58';
  function wire(mesh,id,name,points,r,color){
    const vertices=[],faces=[],n=8;
    points.forEach((p,i)=>{
      const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
      const tangent=b.map((v,k)=>v-a[k]),length=Math.hypot(...tangent);
      const [tx,ty,tz]=tangent.map(v=>v/length),xy=Math.hypot(tx,ty);
      for(let k=0;k<n;k++){
        const angle=2*Math.PI*k/n,c=r*Math.cos(angle),s=r*Math.sin(angle);
        vertices.push([p[0]-c*ty/xy-s*tz*tx/xy,p[1]+c*tx/xy-s*tz*ty/xy,p[2]+s*xy]);
        if(i){const j=(k+1)%n;faces.push([(i-1)*n+k,(i-1)*n+j,i*n+j,i*n+k]);}
      }
    });mesh(id,name,vertices,faces,color);
  }
  function build({mesh,form,box,colors,turning,study,fieldInlet}){
    const turn=(id,name,c,rings,color,axis='x',sides=32)=>form(id,name,c,S.turned(rings,sides),color,axis);
    const block=(id,name,c,size,color)=>form(id,name,c,S.housing(...size),color);
    const socket=(id,name,c,axis,r=.065)=>turn(id,name,c,[[0,r],[.028,r],[.047,r*.84],[.047,r*.46],[.022,r*.46],[.022,0]],steel,axis,8);
    const points=[];
    for(let i=0;i<=224;i++){
      const f=i/224,a=1.19+(1-f)*Math.PI*14;
      points.push([-8+1.77*Math.cos(a),3.05+1.77*Math.sin(a),-.49+.98*f]);
    }
    const start=points.at(-1);
    // With the photographed inlet the wire meets the guide post in front of the longer pad holder.
    const end=fieldInlet?-6.08:-5.62;
    for(let i=1;i<=18;i++){
      const t=i/18,u=1-t;
      points.push([u*u*u*start[0]+3*u*u*t*(end-1.06)+3*u*t*t*(end-.68)+t*t*t*end,
        u*u*u*start[1]+3*u*u*t*(start[1]-.27)+3*u*t*t*4+t*t*t*4,start[2]*u*u*(1+2*t)]);
    }
    wire(mesh,'coil','continuous_wire_winding',points,.067,colors.gold);
    for(const z of [-.65,.65]){
      turn('coil','reel_cheek',[-8,3.05,z],[[-.04,1.9],[-.04,1.985],[.04,1.985],[.04,1.9],[-.04,1.9]],iron,'z',48);
      for(let i=0;i<5;i++){
        const a=i*Math.PI*2/5;
        const bar=S.housing(.13,1.83,.085,.025);
        const verts=bar.vertices.map(([u,v,w])=>[-8+u*Math.cos(a)-(v+1)*Math.sin(a),3.05+u*Math.sin(a)+(v+1)*Math.cos(a),z+w]);
        mesh('coil','reel_spoke',verts,bar.faces,iron);
      }
    }
    if(!fieldInlet)for(const x of [-4.95,-4.25])for(const sy of [-1,1])socket('straight','casing_screw',[x,4+sy*.54,.56],'z');
    for(const y of [3.56,4.44]){
      turn('feed','roller_bearing_cap',[-2.8,y,.30],[[0,.10],[0,.21],[.055,.18],[.055,.09],[0,.10]],steel,'z');
      socket('feed','roller_axle',[-2.8,y,.355],'z',.085);
      box('feed','roller_witness',[-2.61,y,.306],[.15,.034,.024],dark);
    }
    turn('guide','guide_retainer',[-.46,4,0],[[0,.17],[0,.36],[.09,.36],[.17,.25],[.17,.17],[0,.17]],steel);
    turn('head','rear_head_flange',[.11,4,0],[[0,.45],[0,.88],[.06,1],[.16,1],[.16,.45],[0,.45]],iron);
    turn('head','rotating_face_register',[.865,4,0],[[0,.44],[0,.63],[.055,.61],[.08,.48],[.08,.44],[0,.44]],steel);
    form('head','rotating_witness',[.887,4+.91,.25],S.housing(.045,.11,.20,.016),'#d1d9bd');
    for(const side of [-1,1]){
      const slot=turning?(side===1?'groove':'parting'):'head';
      const x=turning?(side===1?1.72:1.285):1.28;
      block(slot,'rotating_clamp_bridge',[x-.13,4+side*.72,.17],[.34,.17,.12],dark);
      socket(slot,'rotating_clamp_screw',[x-.13,4+side*.72,.23],'z');
    }
    for(const x of [-4,0,4]){
      block('base','cabinet_door_skin',[x,1.5,1.832],[3.31,2.02,.043],colors.base);
      for(const y of [.84,2.14])block('base','hinge',[x-1.56,y,1.88],[.10,.26,.09],steel);
      for(let k=0;k<4;k++)box('base','panel_louvre',[x-.52,1.02+.12*k,1.867],[1,.035,.03],dark);
    }
    if(!study){
      block('counter','counter_support_bed',[3.86,3.25,0],[1.68,.16,1.48],iron);
      if(turning?.cnc)for(const z of [-.47,.47])block('counter','counter_support_rail',[3.89,3.50,z],[1.70,.12,.14],steel);
      turn('counter','collet_body_collar',[3.03,4,0],[[0,.19],[0,.48],[.07,.54],[.22,.54],[.25,.48],[.25,.19],[0,.19]],iron);
      // Four teaching segments: the axial section plane cuts the top and bottom jaws through their middle.
      const g=globalThis.D2Cycle?.geo;
      const {jawMouth:mouth,jawLength:length}=turning??g??{jawMouth:2.70,jawLength:.27};
      for(let i=0;i<4;i++)form('counter','collet_jaw_'+i,[mouth,4,0],S.jaw(length,.356,.13,i*Math.PI/2,1.4),steel);
    }
  }
  globalThis.EscoDetail={build};
})();
