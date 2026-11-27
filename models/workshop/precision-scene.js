import * as T from '../vendor/three-r180/three.module.min.js';
import {caliperModel,micrometerModel} from './gauge-models.js';

// A studio reflection map gives polished faces visible edges at both scales.
function studio(){
  const sheet=document.createElement('canvas');
  sheet.width=512;sheet.height=256;
  const ctx=sheet.getContext('2d');
  ctx.fillStyle='#394650';ctx.fillRect(0,0,512,256);
  for(const [x,y,w,h,color] of [[0,34,512,50,'#dfe9ef'],[26,94,112,46,'#ffffff'],
    [201,87,38,84,'#17202b'],[306,105,134,25,'#fff3da'],[0,172,512,84,'#52646d']]){
    ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
  }
  const map=new T.CanvasTexture(sheet);
  map.mapping=T.EquirectangularReflectionMapping;map.colorSpace=T.SRGBColorSpace;
  return map;
}
function pinGeometry(p){
  const h=p.length/2,r=p.diam/2,b=.09*r;
  const rings=[[0,-h],[r-b,-h],[r,-h+b]];
  if(p.shape.narrow||p.shape.wide){
    const a=-h+p.length*.27,end=a+(p.shape.wide?1.6:.8);
    rings.push([r,a],[r*.77,a],[r*.77,end],[r,end]);
  }
  rings.push([r,h-b],[r-b,h],[0,h]);
  return new T.LatheGeometry(rings.map(([x,y])=>new T.Vector2(x,y)),80).rotateZ(-Math.PI/2);
}
export function createScene(canvas,{piece,key}){
  const length=key==='length',renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.toneMapping=T.ACESFilmicToneMapping;
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,300);
  const env=studio();scene.environment=env;
  const tool=length?caliperModel(scene):micrometerModel(scene);
  const ray=new T.Raycaster();
  const pin=new T.Mesh(pinGeometry(piece),new T.MeshStandardMaterial({color:0xe7b25a,metalness:.86,roughness:.24}));
  if(!length){pin.rotation.z=Math.PI/2;pin.rotation.x=.37;}
  scene.add(pin);
  const keyLight=new T.DirectionalLight(0xfff6e4,2.35);
  keyLight.position.set(-12,24,36);
  const rim=new T.DirectionalLight(0xc0dfef,1.15);rim.position.set(18,9,-27);
  scene.add(keyLight,rim,new T.HemisphereLight(0xeaf3ff,0x466473,1.3));
  let lastW=0,lastH=0;
  return {
    landmarks(view,gap){
      let marks;
      if(view==='scale')marks=[['주척',gap+5,13,1.1],['아들자',gap+12,8.1,1.6]];
      else if(length)marks=[['고정 턱',-.42,1,1.3],['이동 턱',gap+.48,1,1.3]];
      else{
        marks=[['앤빌',-.5,.5,1.9],['스핀들',gap+.6,.5,1.9]];
        if(view==='whole')marks.push(['래칫',gap+49,1.6,2.5]);
      }
      return marks.map(([name,x,y,z])=>{
        const p=new T.Vector3(x,y,z).project(camera);
        return {name,x:(p.x+1)*lastW/2,y:(1-p.y)*lastH/2};
      });
    },
    dragTarget(event){
      const r=canvas.getBoundingClientRect();
      ray.setFromCamera(new T.Vector2(2*(event.clientX-r.left)/r.width-1,1-2*(event.clientY-r.top)/r.height),camera);
      const hit=ray.intersectObjects(scene.children,true)[0];
      if(hit?.object===pin)return {part:'pin'};
      for(let obj=hit?.object;obj;obj=obj.parent)if(obj===tool.moving){
        const a=new T.Vector3().project(camera),b=new T.Vector3(1,0,0).project(camera);
        return {part:'handle',pixelsPerMM:(b.x-a.x)*r.width/2};
      }
      return null;
    },
    draw({gap,placed,guided,piece:specimen},view,front,orbit){
      const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
      if(w!==lastW||h!==lastH){renderer.setSize(w,h,false);lastW=w;lastH=h;}
      tool.update(gap,guided);
      if(length){
        pin.scale.x=specimen.length/piece.length;
        pin.position.set(specimen.length/2,placed?0:-5.4,placed?0:3.2);
      }
      else pin.position.set(placed?piece.diam/2:5,placed?0:-6,placed?0:8);
      let target,wide,tall;
      if(view==='scale'){
        target=[gap+9.5,10.8,1.5];wide=25;tall=9;
      }else if(view==='contact'){
        target=length?[gap/2,.6,0]:[gap/2,0,0];
        wide=length?Math.max(12,gap+7):10;tall=length?9:7;
      }else{
        target=length?[28.5,7.5,0]:[20,-8,0];
        wide=length?76:81;tall=length?32:39;
      }
      const aspect=w/h,span=Math.max(tall,wide/aspect);
      camera.left=-span*aspect/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-span/2;
      const straight=front||view==='scale';
      const yaw=straight?0:orbit.yaw,pitch=straight?0:orbit.pitch;
      camera.position.set(target[0]+95*Math.sin(yaw)*Math.cos(pitch),target[1]+95*Math.sin(pitch),target[2]+95*Math.cos(yaw)*Math.cos(pitch));
      camera.lookAt(...target);camera.updateProjectionMatrix();renderer.render(scene,camera);
    },
    dispose(){
      const materials=new Set(),textures=new Set([env]);
      scene.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});
      for(const mat of materials){for(const t of [mat.map,mat.bumpMap,mat.roughnessMap])if(t)textures.add(t);mat.dispose();}
      for(const tex of textures)tex.dispose();renderer.dispose();renderer.forceContextLoss();
    }
  };
}
