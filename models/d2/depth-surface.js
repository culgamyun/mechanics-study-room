/* Orthographic mesh rasterizer. Geometry, picking and callout visibility share one depth buffer. */
class D2DepthSurface {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
  }

  begin(width, height) {
    this.scale = Math.min(window.devicePixelRatio || 1, 1.5, 1350 / width);
    const w = Math.max(1, Math.round(width * this.scale));
    const h = Math.max(1, Math.round(height * this.scale));
    if (!this.image || w !== this.canvas.width || h !== this.canvas.height) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.image = this.context.createImageData(w, h);
      this.depth = new Float32Array(w * h);
      this.owner = new Uint8Array(w * h);
      this.pixels = new Uint32Array(this.image.data.buffer);
    }
    this.depth.fill(-Infinity);
    this.owner.fill(0);
    this.pixels.fill(0);
  }

  triangle(a, b, c, color, owner) {
    const scale = this.scale, w = this.canvas.width, h = this.canvas.height;
    const ax = a[0] * scale, ay = a[1] * scale;
    const ux = (b[0]-a[0])*scale, uy = (b[1]-a[1])*scale, uz = b[2]-a[2];
    const vx = (c[0]-a[0])*scale, vy = (c[1]-a[1])*scale, vz = c[2]-a[2];
    const area = ux*vy - uy*vx;
    if (Math.abs(area) < .0001) return;
    const left = Math.max(0, Math.floor(ax + Math.min(0,ux,vx)));
    const right = Math.min(w-1, Math.ceil(ax + Math.max(0,ux,vx)));
    const top = Math.max(0, Math.floor(ay + Math.min(0,uy,vy)));
    const bottom = Math.min(h-1, Math.ceil(ay + Math.max(0,uy,vy)));
    const du = vy/area, dv = -uy/area;
    for (let y = top; y <= bottom; y++) {
      const dy = y+.5-ay, dx = left+.5-ax;
      let u = (dx*vy-dy*vx)/area, v = (ux*dy-uy*dx)/area;
      let i = y*w+left;
      for (let x=left; x<=right; x++, i++, u+=du, v+=dv) {
        if (u < -.000001 || v < -.000001 || u+v > 1.000001) continue;
        const z = a[2]+u*uz+v*vz;
        if (z <= this.depth[i]) continue;
        this.depth[i] = z;
        this.owner[i] = owner;
        this.pixels[i] = color;
      }
    }
  }

  blit(context, width, height) {
    this.context.putImageData(this.image, 0, 0);
    context.drawImage(this.canvas, 0, 0, width, height);
  }

  indexAt(x,y) {
    const px=Math.floor(x*this.scale), py=Math.floor(y*this.scale);
    if(px<0 || py<0 || px>=this.canvas.width || py>=this.canvas.height) return -1;
    return py*this.canvas.width+px;
  }

  // Locate visible pixels near each part's projected anchor, even at grazing angles.
  anchors(targets) {
    const best = new Map();
    const stride = Math.max(1,Math.round(2*this.scale));
    const w = this.canvas.width, h = this.canvas.height;
    for (let y=0; y<h; y+=stride) {
      for(let x=0; x<w; x+=stride) {
        const id=this.owner[y*w+x], target=targets.get(id);
        if(!target) continue;
        const sx=x/this.scale, sy=y/this.scale;
        const distance=(sx-target[0])**2+(sy-target[1])**2;
        if(distance < (best.get(id)?.distance ?? Infinity)) best.set(id,{x:sx,y:sy,distance});
      }
    }
    return best;
  }
}
globalThis.D2DepthSurface = D2DepthSurface;
