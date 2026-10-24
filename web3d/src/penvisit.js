// The farmer in a pen (farmlife.js visitPen; main.js sets the pen up and the hens' side of it): corn scattered for the
// hens, grains flying from the farmer's hand in little arcs, lying on the ground and pecked up one by one. All in the pen's
// own frame (plot.frame), one batch of grains per pen.
import * as THREE from 'three';

const GEO = new THREE.SphereGeometry(1, 6, 4);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

export class Corn {
  // free(x, z): a spot in the yard a grain may land on (inside the fence, not on the feeder, the water or the hay)
  constructor(frame, free, r, grade, max = 120) {
    this.free = free; this.r = r; this.max = max; this.g = [];
    const mat = new THREE.MeshLambertMaterial({ color: '#efbd3f' }); if (grade) grade(mat);
    this.mesh = new THREE.InstancedMesh(GEO, mat, max); this.mesh.count = 0;
    this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.userData.moves = true;
    frame.add(this.mesh);
  }
  // a handful thrown from `from` (the hand, in the pen's frame) to land round (cx, cz), `spread` either way
  // (avoid: [x, z, r], nowhere within r of it: the farmer's feet)
  handful(from, cx, cz, spread, n, avoid) {
    for (let i = 0; i < n && this.g.length < this.max; i++) {
      let tx = 0, tz = 0, k = 0;
      for (; k < 14; k++) {
        const a = this.r() * 6.283, d = spread * Math.sqrt(this.r()); tx = cx + Math.cos(a) * d; tz = cz + Math.sin(a) * d;
        if (this.free(tx, tz) && !(avoid && Math.hypot(tx - avoid[0], tz - avoid[1]) < avoid[2])) break;
      }
      if (k >= 14) continue;
      this.g.push({ from: from.clone(), to: [tx, tz], t: -this.r() * 0.12, dur: 0.42 + this.r() * 0.22, h: 0.18 + this.r() * 0.14, rot: this.r() * 6.28, landed: false, eaten: false, by: null });
    }
  }
  get left() { let n = 0; for (const q of this.g) if (!q.eaten) n++; return n; }
  get flying() { return this.g.some(q => !q.landed && !q.eaten); }
  // the grain for a hen at (x, z) to go for: the nearest lying grain, steering clear of where the others are going
  pick(x, z, me, others) {
    let best = null, bestS = Infinity;
    for (const q of this.g) {
      if (!q.landed || q.eaten) continue;
      let s = Math.hypot(q.to[0] - x, q.to[1] - z);
      for (const o of others) if (o !== me && o.eatAt) { const d = Math.hypot(o.eatAt[0] - q.to[0], o.eatAt[1] - q.to[1]); if (d < 0.3) s += (0.3 - d) * 3; }
      if (s < bestS) { bestS = s; best = q; }
    }
    return best ? best.to : null;
  }
  // a peck at (x, z): up to `n` grains within `rad` gone
  eat(x, z, rad = 0.1, n = 5) {
    let k = 0;
    for (const q of this.g) if (q.landed && !q.eaten && Math.hypot(q.to[0] - x, q.to[1] - z) < rad) { q.eaten = true; if (++k >= n) break; }
    return k;
  }
  update(dt) {
    let i = 0;
    for (const q of this.g) {
      if (q.eaten) continue;
      if (!q.landed) { q.t += dt; if (q.t >= q.dur) q.landed = true; }
      const u = Math.max(0, Math.min(1, q.t / q.dur));
      if (q.landed) _p.set(q.to[0], 0.026, q.to[1]);
      else _p.set(q.from.x + (q.to[0] - q.from.x) * u, q.from.y * (1 - u) + 0.022 * u + q.h * 4 * u * (1 - u), q.from.z + (q.to[1] - q.from.z) * u);
      _q.setFromEuler(_e.set(0.3, q.rot + (q.landed ? 0 : q.t * 9), 0.2));
      this.mesh.setMatrixAt(i++, _m.compose(_p, _q, _s.set(0.013, 0.009, 0.011)));
    }
    if (this.g.length > 40 && this.g.filter(q => q.eaten).length > 30) this.g = this.g.filter(q => !q.eaten);       // (tidied now and then)
    this.mesh.count = i; this.mesh.instanceMatrix.needsUpdate = true;
    return i;
  }
}
