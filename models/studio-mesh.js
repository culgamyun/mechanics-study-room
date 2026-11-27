import * as T from './vendor/three-r180/three.module.min.js';

export function studioLight(){
  const c=document.createElement('canvas');c.width=512;c.height=256;
  const ctx=c.getContext('2d');
  const grad=ctx.createLinearGradient(0,0,0,256);
  for(const [at,color] of [[0,'#8797a3'],[.37,'#c9d3cf'],[.48,'#47555d'],[.57,'#141b22'],[.78,'#5f6c73'],[1,'#252f34']])grad.addColorStop(at,color);
  ctx.fillStyle=grad;ctx.fillRect(0,0,512,256);
  // Soft-box reflections, dimmer than before so small contact parts stay the brightest objects.
  for(const [x,y,w,h] of [[15,66,128,35],[243,43,51,71],[351,111,115,18]]){ctx.fillStyle='#d8dde0';ctx.fillRect(x,y,w,h);}
  const env=new T.CanvasTexture(c);env.mapping=T.EquirectangularReflectionMapping;env.colorSpace=T.SRGBColorSpace;return env;
}

export function surfaceGeometry(part, flip = false) {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(part.vertices.flat(), 3));
  const triangles = [];
  for (const face of part.faces) {
    for (let k = 1; k < face.length - 1; k++) {
      triangles.push(face[0], face[flip ? k + 1 : k], face[flip ? k : k + 1]);
    }
  }
  geometry.setIndex(triangles);
  geometry.computeVertexNormals();
  return geometry;
}
