// The fox's night visit (Audrey, 22 Oct: the fox is a proper character who sometimes visits the coops at night; he never
// harms a hen; a player who's up can send the farmer). Late at night Rusty slips out of the den and trots off to a coop,
// picking one whose pop door was left open. There he hops the fence, creeps up the ramp and pokes his nose in at the door:
// the hens wake in a flurry of squawks and feathers and peck him on the nose, so he tumbles back down the ramp, sneezing,
// a feather stuck on his nose; he tries once more, gets pecked again, and trots home. If the door is shut he sniffs and
// scratches at it, sits there puzzled and tries another coop (or gives up). While he's out, "Send the farmer" brings the
// farmer's torch bobbing down the path from the farmhouse: it shines on Rusty and he bolts home.
// The way there is found on a grid of the village (NavGrid): round trees, bushes, rocks, buildings, other pens, the pond
// and the streams (crossed only on the bridges).
import * as THREE from 'three';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = x => Math.min(1, Math.max(0, x));
const angTo = (fx, fz, tx, tz) => Math.atan2(tx - fx, tz - fz);

// ---------------------------------------------------------------- the village as a grid of free and blocked cells
export class NavGrid {
  constructor(x0, z0, x1, z1, cell = 0.25) {
    this.x0 = x0; this.z0 = z0; this.cell = cell;
    this.nx = Math.ceil((x1 - x0) / cell); this.nz = Math.ceil((z1 - z0) / cell);
    this.block = new Uint8Array(this.nx * this.nz);
    this.links = new Map();                 // crossings (a footbridge): from one end's cell straight to the other's
  }
  // a crossing from (ax, az) to (bx, bz) and back, both ends on free ground
  link(ax, az, bx, bz) {
    const a = this.iz(az) * this.nx + this.ix(ax), b = this.iz(bz) * this.nx + this.ix(bx), d = Math.hypot(bx - ax, bz - az) / this.cell;
    for (const [i, j, P] of [[a, b, [bx, bz]], [b, a, [ax, az]]]) { if (!this.links.has(i)) this.links.set(i, []); this.links.get(i).push([j, d, P]); }
    this.linkAt = this.linkAt || new Map(); this.linkAt.set(a, [ax, az]); this.linkAt.set(b, [bx, bz]);
  }
  ix(x) { return Math.floor((x - this.x0) / this.cell); }
  iz(z) { return Math.floor((z - this.z0) / this.cell); }
  cx(i) { return this.x0 + (i + 0.5) * this.cell; }
  cz(k) { return this.z0 + (k + 0.5) * this.cell; }
  // block every cell whose middle passes test(x, z), within a box round (x, z)
  mark(xa, za, xb, zb, test, v = 1) {
    const i0 = Math.max(0, this.ix(xa)), i1 = Math.min(this.nx - 1, this.ix(xb)), k0 = Math.max(0, this.iz(za)), k1 = Math.min(this.nz - 1, this.iz(zb));
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) if (test(this.cx(i), this.cz(k))) this.block[k * this.nx + i] = v;
  }
  circle(x, z, r) { this.mark(x - r, z - r, x + r, z + r, (a, b) => (a - x) ** 2 + (b - z) ** 2 <= r * r); }
  // a box in its own frame (inverse: world to the box's frame), grown by `grow`
  box(inverse, min, max, grow, worldBounds) {
    const v = new THREE.Vector3();
    this.mark(worldBounds.min.x - grow, worldBounds.min.z - grow, worldBounds.max.x + grow, worldBounds.max.z + grow, (a, b) => {
      v.set(a, 0, b).applyMatrix4(inverse);
      return v.x >= min.x - grow && v.x <= max.x + grow && v.z >= min.z - grow && v.z <= max.z + grow;
    });
  }
  freeAt(x, z) {
    const i = this.ix(x), k = this.iz(z);
    return i >= 0 && k >= 0 && i < this.nx && k < this.nz && !this.block[k * this.nx + i];
  }
  nearestFree(x, z, maxR = 3) {
    if (this.freeAt(x, z)) return [x, z];
    for (let r = this.cell; r <= maxR; r += this.cell)
      for (let a = 0; a < 24; a++) { const px = x + Math.cos(a / 24 * Math.PI * 2) * r, pz = z + Math.sin(a / 24 * Math.PI * 2) * r; if (this.freeAt(px, pz)) return [px, pz]; }
    return null;
  }
  // every cell that can be walked to from (x, z), over the crossings too: a mask, for picking places one can really get to
  // (a free cell can still be shut in, between a pen's fence and a hedge, say)
  reach(x, z) {
    const s = this.nearestFree(x, z), m = new Uint8Array(this.block.length); if (!s) return m;
    const nx = this.nx, st = [this.iz(s[1]) * nx + this.ix(s[0])]; m[st[0]] = 1;
    while (st.length) {
      const i = st.pop(), X0 = i % nx, Z0 = (i / nx) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = X0 + dx, Z = Z0 + dz; if (X < 0 || Z < 0 || X >= nx || Z >= this.nz) continue;
        const j = Z * nx + X; if (!m[j] && !this.block[j]) { m[j] = 1; st.push(j); }
      }
      const L = this.links.get(i); if (L) for (const [j] of L) if (!m[j]) { m[j] = 1; st.push(j); }
    }
    return m;
  }
  // the nearest free cell to (x, z), within maxR, that's in `mask` (from reach)
  nearestIn(mask, x, z, maxR = 3) {
    const ok = (px, pz) => this.freeAt(px, pz) && !!mask[this.iz(pz) * this.nx + this.ix(px)];
    if (ok(x, z)) return [x, z];
    for (let r = this.cell; r <= maxR; r += this.cell)
      for (let a = 0; a < 24; a++) { const px = x + Math.cos(a / 24 * Math.PI * 2) * r, pz = z + Math.sin(a / 24 * Math.PI * 2) * r; if (ok(px, pz)) return [px, pz]; }
    return null;
  }
  // a straight line clear of everything, `w` either side of it too (room for a little drift after a bend)
  clearLine(ax, az, bx, bz, w = 0) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / (this.cell * 0.4)), ox = d ? -(bz - az) / d * w : 0, oz = d ? (bx - ax) / d * w : 0;
    for (let s = 1; s < n; s++) {
      const x = ax + (bx - ax) * s / n, z = az + (bz - az) * s / n;
      if (!this.freeAt(x, z) || (w && (!this.freeAt(x + ox, z + oz) || !this.freeAt(x - ox, z - oz)))) return false;
    }
    return true;
  }
  // what walking each cell costs (1 on the paths, more on the grass, for the farmer, who keeps to the paths): fill(c) sets
  // every cell, line(a, b, r, c) the cells within r of a stretch of path
  costs(c) { this.cost = new Float32Array(this.block.length).fill(c); }
  costLine(ax, az, bx, bz, r, c) {
    const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
    this.markCost(Math.min(ax, bx) - r, Math.min(az, bz) - r, Math.max(ax, bx) + r, Math.max(az, bz) + r, (x, z) => { const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)); return Math.hypot(x - ax - dx * t, z - az - dz * t) <= r; }, c);
  }
  markCost(xa, za, xb, zb, test, c) {
    const i0 = Math.max(0, this.ix(xa)), i1 = Math.min(this.nx - 1, this.ix(xb)), k0 = Math.max(0, this.iz(za)), k1 = Math.min(this.nz - 1, this.iz(zb));
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) if (test(this.cx(i), this.cz(k))) this.cost[k * this.nx + i] = c;
  }
  costAt(x, z) { const i = this.ix(x), k = this.iz(z); return this.cost && i >= 0 && k >= 0 && i < this.nx && k < this.nz ? this.cost[k * this.nx + i] : 1; }
  // what walking straight from a to b costs (in cells walked, each at its own cost)
  lineCost(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / (this.cell * 0.5))); let c = 0;
    for (let s = 0; s < n; s++) c += this.costAt(ax + (bx - ax) * (s + 0.5) / n, az + (bz - az) * (s + 0.5) / n);
    return c / n * d / this.cell;
  }
  // A* over the cells (8 ways), then straightened (each point goes as far as it can see); null if there's no way. With
  // useCost, the cells' own costs count (the paths preferred), and a straightened stretch never leaves the path
  find(ax, az, bx, bz, useCost = false) {
    const W = useCost && this.cost ? this.cost : null;
    const s = this.nearestFree(ax, az), g = this.nearestFree(bx, bz);
    if (!s || !g) return null;
    const nx = this.nx, si = this.iz(s[1]) * nx + this.ix(s[0]), gi = this.iz(g[1]) * nx + this.ix(g[0]);
    const gx = this.ix(g[0]), gz = this.iz(g[1]);
    const N = this.block.length, cost = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    const heap = [], push = (i, f) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const hfun = i => { const x = i % nx, z = (i / nx) | 0, dx = Math.abs(x - gx), dz = Math.abs(z - gz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    cost[si] = 0; push(si, hfun(si));
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = false, guard = 0;
    while (heap.length && guard++ < 400000) {
      const [, i] = pop(); if (done[i]) continue; done[i] = 1;
      if (i === gi) { found = true; break; }
      const x = i % nx, z = (i / nx) | 0;
      for (const [dx, dz, c] of D) {
        const X = x + dx, Z = z + dz; if (X < 0 || Z < 0 || X >= nx || Z >= this.nz) continue;
        const j = Z * nx + X; if (this.block[j] || done[j]) continue;
        if (dx && dz && (this.block[z * nx + X] || this.block[Z * nx + x])) continue;          // no cutting corners
        const nc = cost[i] + c * (W ? W[j] : 1); if (nc < cost[j]) { cost[j] = nc; from[j] = i; push(j, nc + hfun(j)); }
      }
      const L = this.links.get(i);
      if (L) for (const [j, c] of L) { if (done[j]) continue; const nc = cost[i] + c; if (nc < cost[j]) { cost[j] = nc; from[j] = i; push(j, nc + hfun(j)); } }
    }
    if (!found) return null;
    // the cells back from the goal; a crossing's two ends are kept exactly (it's walked straight along its middle)
    const cells = [], fixed = [], gs = [];
    for (let i = gi; i !== -1; i = from[i]) {
      gs.push(cost[i]);
      const at = this.linkAt && this.linkAt.get(i), pi = from[i];
      const cross = at && pi !== -1 && this.links.has(pi) && this.links.get(pi).some(l => l[0] === i);
      const crossFrom = at && cells.length && fixed[fixed.length - 1] === 'end';
      cells.push(at && (cross || crossFrom) ? at.slice() : [this.cx(i % nx), this.cz((i / nx) | 0)]);
      fixed.push(cross ? 'end' : crossFrom ? 'start' : '');
    }
    cells.reverse(); fixed.reverse(); gs.reverse(); cells[0] = s; cells[cells.length - 1] = g;
    // fixed after reversing: 'start' is where a crossing begins, 'end' where it ends
    const out = [cells[0]];
    let a = 0;
    while (a < cells.length - 1) {
      let b = cells.length - 1;
      // never shortcut past the start of a crossing; from its start, straight to its end
      for (let k = a + 1; k < b; k++) if (fixed[k] === 'start') { b = k; break; }
      if (fixed[a] === 'start') b = a + 1;
      // (with costs: a straight stretch only where it costs no more than the way found: along a path, never across the grass)
      while (b > a + 1 && (!this.clearLine(cells[a][0], cells[a][1], cells[b][0], cells[b][1], this.room ?? this.cell * 0.45) || (W && this.lineCost(cells[a][0], cells[a][1], cells[b][0], cells[b][1]) > (gs[b] - gs[a]) * 1.04 + 0.5))) b--;
      out.push(cells[b]); a = b;
    }
    return out;
  }
}

// ---------------------------------------------------------------- little things that fly about (feathers, "!" marks, a "?")
function canvasTex(size, draw) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d'); draw(c);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TEX = {};
function textures() {
  if (TEX.feather) return TEX;
  TEX.feather = canvasTex(64, c => {                    // a small body feather: a curved quill, fine barbs, a downy base
    c.translate(32, 33); c.rotate(-0.45);
    const quill = t => [Math.sin(t * 1.1) * 3.5, -26 + 52 * t];           // t 0 (tip) .. 1 (base)
    for (let k = 0; k <= 46; k++) {
      const t = k / 46, [qx, qy] = quill(t), half = (t < 0.75 ? Math.sin(Math.min(1, t / 0.75) * Math.PI * 0.62) : 1 - (t - 0.75) * 1.4) * 12;
      const down = t > 0.68;                                                  // the fluffy bit at the base
      for (const side of [-1, 1]) {
        const len = half * (down ? 1.25 : 1) * (0.85 + 0.3 * Math.random());
        c.strokeStyle = down ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.92)'; c.lineWidth = down ? 1.1 : 1.35;
        c.beginPath(); c.moveTo(qx, qy);
        c.quadraticCurveTo(qx + side * len * 0.6, qy - 1.5, qx + side * len, qy - (down ? 1 + 3 * Math.random() : 5.5));
        c.stroke();
      }
    }
    c.strokeStyle = 'rgba(235,225,205,1)'; c.lineWidth = 1.6; c.beginPath();
    for (let k = 0; k <= 20; k++) { const [x, y] = quill(k / 20); if (k) c.lineTo(x, y); else c.moveTo(x, y); }
    c.lineTo(Math.sin(1.1) * 3.5, 29); c.stroke();
  });
  const mark = ch => canvasTex(64, c => {
    c.beginPath(); c.arc(32, 32, 27, 0, Math.PI * 2); c.fillStyle = '#fff7e2'; c.fill(); c.lineWidth = 5; c.strokeStyle = '#2b3a24'; c.stroke();
    c.font = 'bold 42px Fredoka, Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ch === '!' ? '#d2462f' : '#3a5fae'; c.fillText(ch, 32, 35);
  });
  TEX.bang = mark('!'); TEX.what = mark('?');
  // the dog's bark: a speech bubble, "Woof!" (French "Ouaf !")
  const woof = word => canvasTex(128, c => {
    c.beginPath(); const x0 = 8, y0 = 22, w = 112, h = 62, r = 22;
    c.moveTo(x0 + r, y0); c.arcTo(x0 + w, y0, x0 + w, y0 + h, r); c.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
    c.lineTo(40, y0 + h); c.lineTo(26, y0 + h + 22); c.lineTo(30, y0 + h);
    c.arcTo(x0, y0 + h, x0, y0, r); c.arcTo(x0, y0, x0 + w, y0, r); c.closePath();
    c.fillStyle = '#fff7e2'; c.fill(); c.lineWidth = 6; c.strokeStyle = '#2b3a24'; c.stroke();
    c.font = 'bold 34px Fredoka, Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#2b3a24'; c.fillText(word, 64, y0 + h / 2 + 2);
  });
  TEX.woof = woof('Woof!'); TEX.ouaf = woof('Ouaf !');
  TEX.star = canvasTex(64, c => {                       // a peck on the nose: a little burst
    c.translate(32, 32); c.fillStyle = '#ffe36b'; c.strokeStyle = '#7a4a10'; c.lineWidth = 3; c.beginPath();
    for (let k = 0; k < 16; k++) { const r = k % 2 ? 11 : 27, a = k / 16 * Math.PI * 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill(); c.stroke();
  });
  TEX.glow = canvasTex(64, c => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,245,215,0.85)'); g.addColorStop(1, 'rgba(255,230,170,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  });
  // the torch's beam on the ground: a fan from the torch, brightest a couple of metres out where it's pointed
  TEX.beam = canvasTex(128, c => {
    const img = c.createImageData(128, 128), a = img.data;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const u = (x - 64) / 64, v = (127 - y) / 127;                // v: 0 at the torch, 1 at the far end
      const across = Math.abs(u) / Math.max(0.06, 0.12 + 0.88 * v);  // the fan widens
      const side = 1 - smooth(0.3, 1, across), along = smooth(0, 0.25, v) * (1 - smooth(0.72, 1, v));
      const spot = Math.exp(-(((v - 0.62) / 0.22) ** 2) - ((u / Math.max(0.1, 0.62 * v)) ** 2));
      const k = clamp01(side * along * 0.32 + 0.42 * spot * side);
      const o = (y * 128 + x) * 4; a[o] = 255; a[o + 1] = 244; a[o + 2] = 214; a[o + 3] = Math.round(255 * k);
    }
    c.putImageData(img, 0, 0);
  });
  return TEX;
}
const FEATHER_TINT = { rir: '#d2875c', orp: '#ecc488', leg: '#e6dfd0', bra: '#f6f3ec', sil: '#f8f5ee' };

class Fx {
  constructor(scene, grade) {
    this.scene = scene; this.grade = grade; this.list = []; textures();
  }
  sprite(key, tint) {
    let s = this.list.find(x => x.life <= 0 && x.key === key + (tint || ''));
    if (!s) {
      if (this.list.length > 80) return null;
      const m = new THREE.SpriteMaterial({ map: TEX[key], transparent: true, depthWrite: false, color: tint || '#ffffff' });
      if (key === 'feather' && this.grade) this.grade(m); else { m.userData.noGrade = true; m.depthTest = false; }
      s = { key: key + (tint || ''), sp: new THREE.Sprite(m), life: 0 }; s.sp.renderOrder = key === 'feather' ? 3 : 11;
      this.scene.add(s.sp); this.list.push(s);
    }
    s.sp.visible = true; s.sp.material.opacity = 1; s.sp.material.rotation = 0;
    return s;
  }
  // a burst of feathers from a point, flying out along dir (a world direction) and drifting down
  feathers(at, dir, n, tint) {
    for (let i = 0; i < n; i++) {
      const s = this.sprite('feather', tint); if (!s) return;
      s.type = 'feather'; s.life = s.full = 2.6 + Math.random() * 1.6;
      s.sp.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 0.12, (Math.random() - 0.3) * 0.12, (Math.random() - 0.5) * 0.12));
      const sp = 0.6 + Math.random() * 0.9;
      s.v = new THREE.Vector3(dir.x * sp + (Math.random() - 0.5) * 0.9, 0.6 + Math.random() * 1.1, dir.z * sp + (Math.random() - 0.5) * 0.9);
      s.size = 0.09 + Math.random() * 0.06; s.spin = (Math.random() - 0.5) * 6; s.ph = Math.random() * 6;
      s.sp.scale.setScalar(s.size);
    }
  }
  pop(key, at, size = 0.22, life = 1.6) {
    const s = this.sprite(key); if (!s) return null;
    s.type = 'pop'; s.life = s.full = life; s.at = at.clone(); s.size = size; s.sp.position.copy(at);
    return s;
  }
  update(dt) {
    for (const s of this.list) {
      if (s.life <= 0 || s.type === 'stuck') continue;
      s.life -= dt;
      if (s.life <= 0) { s.sp.visible = false; continue; }
      const t = 1 - s.life / s.full;
      if (s.type === 'feather') {
        s.v.y -= 2.2 * dt; s.v.multiplyScalar(1 - Math.min(1, 2.6 * dt));                 // falls, but the air holds it
        if (s.v.y < -0.22) s.v.y = -0.22;
        const p = s.sp.position; p.addScaledVector(s.v, dt);
        p.x += Math.sin(s.ph + t * 9) * 0.12 * dt; p.z += Math.cos(s.ph + t * 7) * 0.12 * dt;  // a flutter as it falls
        if (p.y < 0.02) { p.y = 0.02; s.v.set(0, 0, 0); }
        s.sp.material.rotation += s.spin * dt * (p.y > 0.03 ? 1 : 0);
        s.sp.material.opacity = Math.min(1, s.life * 1.5);
      } else {
        const k = Math.min(1, t * 6), bob = Math.sin(Math.min(1, t * 3) * Math.PI) * 0.05;
        s.sp.scale.setScalar(s.size * (k < 1 ? 0.5 + 0.7 * k : 1.1 - 0.1 * Math.min(1, (t - 0.17) * 4)));
        s.sp.position.copy(s.at); s.sp.position.y += t * 0.18 + bob;
        s.sp.material.opacity = Math.min(1, s.life * 3);
      }
    }
  }
  busy() { return this.list.some(s => s.life > 0); }
}

// ---------------------------------------------------------------- the farmer's torch, coming down the path in the dark
export class Torch {
  constructor(scene) {
    textures();
    this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group);
    const beamMat = new THREE.MeshBasicMaterial({ map: TEX.beam, color: '#fff3d6', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 });
    beamMat.userData.noGrade = true;
    // a fan 3.4 m long and 2.4 m wide at its end, starting at the torch and lying on the ground
    this.beam = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.4).rotateX(Math.PI / 2).translate(0, 0.016, 1.7), beamMat);
    this.beam.geometry.computeBoundingSphere(); this.beam.renderOrder = 2;
    const pool = new THREE.MeshBasicMaterial({ map: TEX.glow, color: '#ffe7b0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    pool.userData.noGrade = true;
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2).translate(0, 0.014, 0), pool); this.pool.renderOrder = 2;
    const gm = new THREE.SpriteMaterial({ map: TEX.glow, color: '#fff2cc', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); gm.userData.noGrade = true;
    this.glow = new THREE.Sprite(gm); this.glow.renderOrder = 4;
    this.group.add(this.beam, this.pool, this.glow);
    this.pos = new THREE.Vector2(); this.heading = 0; this.aim = 0; this.on = 0; this.t = 0;
  }
  place(x, z, heading) { this.pos.set(x, z); this.heading = heading; this.aim = heading; }
  update(dt, show) {
    this.t += dt; this.on += ((show ? 1 : 0) - this.on) * Math.min(1, dt * 3);
    this.group.visible = this.on > 0.01;
    if (!this.group.visible) return;
    let d = this.aim - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); this.heading += d * Math.min(1, dt * 5);
    const step = this.walking ? Math.sin(this.t * 2 * Math.PI * 1.9) : 0;
    this.group.position.set(this.pos.x, 0, this.pos.y);
    this.beam.rotation.y = this.heading + step * 0.06;                    // the beam swings a little with each step
    this.beam.material.opacity = 0.62 * this.on;
    this.pool.material.opacity = 0.3 * this.on;
    if (this.glowAt) { const g = this.glowAt(); this.glow.position.set(g.x - this.pos.x, g.y, g.z - this.pos.y); }        // (the farmer's own torch, in his hand)
    else this.glow.position.set(Math.sin(this.heading) * 0.18, 1.0 + 0.025 * Math.abs(step), Math.cos(this.heading) * 0.18);
    this.glow.scale.setScalar(0.42 * this.on); this.glow.material.opacity = this.on;
  }
}

// ---------------------------------------------------------------- the visit
// o: { scene, fam (FoxFamily), nav, coops() (the coop plots), doorOpen(p), nestOf(p), D2, house: [x, z], grade(material),
//      say(text, worldPos, seconds), hint(text), text: { key: [en, fr] }, lang, r,
//      the game (release 3, Audrey: "He takes the nest's eggs"): eggsAt(p) (the eggs in its nest: at an open door with some
//      there he takes them, carrying one home in his mouth), eggColour(p), tookEggs(p) (they're gone); fences() (the wild
//      meadow's fences, [[x, z], ...] lines: nav then leaves them out and he leaps each one on his way); alarm() (the farm's
//      guards up and raising the alarm, { x, z, who }, or null: he hears them and runs for home, wherever they are) }
export class NightVisit {
  constructor(o) {
    Object.assign(this, o);
    this.fox = this.fam.foxes.find(f => f.role === 'dad');
    this.fx = new Fx(this.scene, this.grade);
    this.torch = new Torch(this.scene);
    this.state = 'idle';            // idle, out (on his way or at a coop), fleeing, home
    this.next = o.firstIn ?? 150; this.log = [];
    this.fam.visit = this;
    this.nose = null;               // the feather stuck on his nose
    this.v = new THREE.Vector3(); this.w = new THREE.Vector3();
  }
  T(k) { const t = this.text[k]; return t ? t[this.lang === 'fr' ? 1 : 0].replace('{dog}', this.dogName ? this.dogName() : 'Biscuit').replace('{farmer}', this.farmerName ? this.farmerName() : (this.lang === 'fr' ? 'le fermier' : 'the farmer')) : k; }
  note(s) { this.log.push(s); if (this.log.length > 60) this.log.shift(); }
  active() { return this.state === 'out' || this.state === 'fleeing'; }
  canSend() { return this.state === 'out' && !this.farmer && this.fox.root.visible; }
  // pen frame (local) to world, and a heading in the pen frame
  W(p, x, y, z) { return p.frame.localToWorld(this.v.set(x, y, z)).clone(); }
  heading(p, lx, lz) { const a = this.W(p, 0, 0, 0), b = this.W(p, lx, 0, lz); return Math.atan2(b.x - a.x, b.z - a.z); }

  // which coop: one whose birds are all in bed; an open door first (the nearer the likelier), else a shut one
  pick(exclude) {
    const den = this.fam.den, list = this.coops().filter(p => p.birds.length && p.birds.every(b => b.asleep) && !exclude.includes(p) && !(this.busyPlot && this.busyPlot(p)));
    if (!list.length) return null;
    const open = list.filter(p => this.doorOpen(p)), pool = open.length ? open : list;
    const w = pool.map(p => 1 / Math.max(3, Math.hypot(p.centre.x - den[0], p.centre.z - den[1])) ** 2);
    let r = this.r() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  // the way into a pen: from a spot outside the fence (take-off) over it to a spot inside (landing); the side with the
  // shortest way there wins
  entry(p, fromX, fromZ) {
    // (both spots about a metre from the fence, so his brush clears it after landing either way)
    const sides = [[[-2.66, 1.38], [-0.52, 1.38]], [[2.8, 1.02], [0.92, 1.02]], [[-0.5, 3.5], [-0.5, 1.42]]];
    let best = null;
    for (const [t, l] of sides) {
      const tw = this.W(p, t[0], 0, t[1]);
      if (!this.nav.freeAt(tw.x, tw.z)) continue;
      const path = this.nav.find(fromX, fromZ, tw.x, tw.z); if (!path) continue;
      let len = 0; for (let i = 1; i < path.length; i++) len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      if (!best || len < best.len) best = { len, path, take: tw, land: this.W(p, l[0], 0, l[1]) };
    }
    return best;
  }
  start(plotIndex) {
    if (this.active()) return false;
    const f = this.fox;
    if (!f.home || this.fam.out) return false;
    this.tries = []; this.pecks = 0; this.farmer = null; this.nose = null; this.ended = null; this.byGeese = false; this.scare = null; this.helpers = {}; this.took = 0; this.dropEgg();
    const forced = plotIndex !== undefined ? this.coops().find(p => p.index === plotIndex) : null;
    this.target = forced || this.pick([]);
    if (!this.target) return false;
    this.state = 'out'; this.phase = 'emerge'; this.note('start ' + this.target.index + (this.doorOpen(this.target) ? ' open' : ' shut'));
    // out of the den: Rusty alone, along the tunnel (FoxFamily.emergeTask)
    f.home = false; f.todo = []; f.task = null; f.root.visible = false;
    this.hint(this.T('out'));
    return true;
  }
  // FoxFamily asks what Rusty does next while he's on his visit
  // (with an egg in his mouth: his jaws a little open round it, whatever he's doing)
  nextTask(f) {
    const t = this.nextTask0(f);
    if (!t || !this.egg || !this.egg.parent) return t;
    return { name: t.name, inner: t, cur() { return t.cur ? t.cur() : t; }, run(f, dt) { const d = t.run(f, dt); f.A.mouthGoal = Math.max(f.A.mouthGoal || 0, 0.34); f.A.mouth = Math.max(f.A.mouth || 0, 0.3); return d; } };
  }
  nextTask0(f) {
    const self = this;
    if (this.state === 'fleeing') return this.fleeTask();
    switch (this.phase) {
      case 'emerge': this.phase = 'trip'; return this.fam.emergeTask();
      case 'trip': {
        const p = this.target, e = this.entry(p, f.pos.x, f.pos.z);
        if (!e) { this.note('no way to ' + p.index); this.phase = 'home'; return this.wait(0.5); }
        this.way = e; this.phase = 'jumpIn';
        return this.walk(e.path, 'trot', 3.2);
      }
      case 'jumpIn': this.phase = 'toRamp'; return this.leap(this.way.take, this.way.land);
      case 'toRamp': {
        const p = this.target, G = this.nestOf(p), a = this.W(p, G.pop[0], 0, G.foot[1] + 0.4), pre = this.W(p, G.pop[0], 0, Math.min(2.1, G.foot[1] + 0.85));
        this.phase = 'climb';
        return seq(this.follow(this.penPath(p, f.pos, pre).concat([[a.x, a.z]]), 'walk', 99, 0.05, 0.6), this.face(this.heading(p, 0, -1)));
      }
      case 'climb': this.phase = 'atDoor'; return this.climb(this.target, true);
      case 'atDoor': {
        const p = this.target;
        if (this.doorOpen(p) && this.eggsAt && this.eggsAt(p) > 0) { this.phase = 'grab'; return this.poke(p); }      // (the game: eggs in the nest)
        if (this.doorOpen(p)) { this.phase = 'recoil'; this.pecks++; return this.poke(p); }
        this.phase = 'shutDoor'; return this.scratch(p);
      }
      case 'recoil': this.phase = this.pecks < 2 ? 'again' : 'leave'; return this.recoil(this.target);
      case 'grab': this.phase = 'carry'; return this.grab(this.target);
      case 'carry': this.phase = 'show'; return this.backDown(this.target);
      case 'show': this.phase = 'leave'; return this.showOff(f);
      case 'again': {           // a moment's thought, then back in line with the ramp for another try
        this.phase = 'climb';
        const p = this.target, G = this.nestOf(p), a = this.W(p, G.pop[0], 0, G.foot[1] + 0.4), pre = this.W(p, G.pop[0], 0, Math.min(2.1, G.foot[1] + 0.85));
        const away = Math.hypot(a.x - f.pos.x, a.z - f.pos.z) > 0.05;
        return away ? seq(this.sit(1.2, true), this.follow(this.penPath(p, f.pos, pre).concat([[a.x, a.z]]), 'walk', 99, 0.05, 0.6), this.face(this.heading(p, 0, -1)))
                    : seq(this.sit(1.2, true), this.face(this.heading(p, 0, -1)));
      }
      case 'shutDoor': {
        this.tries.push(this.target);
        const other = this.tries.length < 2 ? this.pick(this.tries) : null;
        if (other && this.doorOpen(other)) { this.next2 = other; this.phase = 'leaveFor'; }
        else this.phase = 'leave';
        return seq(this.climb(this.target, false), this.sit(2.4, true, 'what'));
      }
      case 'leaveFor': case 'leave': {
        const going = this.phase === 'leaveFor';
        this.phase = going ? 'jumpOutFor' : 'jumpOut';
        return this.follow(this.penPath(this.target, f.pos, this.way.land), 'trot', 99, 0.05, 0.6);
      }
      case 'jumpOut': this.phase = 'trotHome'; return this.leap(this.way.land, this.way.take);
      case 'jumpOutFor': this.phase = 'trip'; this.target = this.next2; this.note('next ' + this.target.index); return this.leap(this.way.land, this.way.take);
      case 'trotHome': this.phase = 'in'; return this.homeTask('trot');
      case 'in': return this.denIn();
      default: return this.wait(1);
    }
  }
  // ---- Rusty's moves
  wait(s) { return { name: 'wait', t: 0, run(f, dt) { this.t += dt; return this.t >= s; } }; }
  face(h) { const self = this; return { name: 'face', t: 0, run(f, dt) { this.t += dt; if (self.inPen()) f.A.tailUpGoal = 0.6; return f.turnTo(h, dt, 4) < 0.05 || this.t > 2; } }; }
  // along a list of points; slinking low and slow for the last `sneak` metres to the end
  follow(path, pace, sneak, tol = 0.1, tailUp = 0) {
    const pts = path.slice(1).map(p => [p[0], p[1]]), self = this;
    return { name: 'go', t: 0, i: 0, run(f, dt) {
      this.t += dt;
      if (this.i >= pts.length || this.t > 90) return true;
      let left = 0; for (let k = this.i; k < pts.length; k++) left += Math.hypot(pts[k][0] - (k === this.i ? f.pos.x : pts[k - 1][0]), pts[k][1] - (k === this.i ? f.pos.z : pts[k - 1][1]));
      const slink = left < sneak;
      const [x, z] = pts[this.i];
      // running, he eases to a trot for a sharp bend so he doesn't swing wide into what he's going round
      let gait = slink || pace === 'walk' ? 'walk' : pace;
      if (gait === 'run' && this.i < pts.length - 1 && Math.hypot(x - f.pos.x, z - f.pos.z) < 0.7) {
        const [nx, nz] = pts[this.i + 1], a1 = Math.atan2(x - f.pos.x, z - f.pos.z), a2 = Math.atan2(nx - x, nz - z);
        if (Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1))) > 0.45) gait = 'trot';
      }
      if (f.moveTo(x, z, dt, gait, this.i < pts.length - 1) || Math.hypot(x - f.pos.x, z - f.pos.z) < (this.i < pts.length - 1 ? tol : 0.06)) this.i++;
      if (slink) { f.A.crouchGoal = 0.45; f.A.lookPitchGoal = -0.1; f.A.tailUpGoal = -0.2; f.A.earsGoal = 1; f.A.squintGoal = 0.3; }     // slinking up: ears pricked, eyes narrowed, sly
      else if (gait === 'trot' && pace !== 'run') f.A.earsGoal = 0.45;
      if (self.groundY) {                                      // up and over a footbridge's arched deck
        const S = f.q.S * f.scale, sx = Math.sin(f.heading), cz = Math.cos(f.heading);
        const fy = self.groundY(f.pos.x + sx * 0.14 * S, f.pos.z + cz * 0.14 * S), hy = self.groundY(f.pos.x - sx * 0.13 * S, f.pos.z - cz * 0.13 * S);
        if (fy || hy) {
          f.A.lift = (fy + hy) / 2; f.A.pitch = -Math.atan2(fy - hy, 0.27 * S);
          f.A.groundF = fy; f.A.groundH = self.groundY(f.pos.x - sx * 0.185 * S, f.pos.z - cz * 0.185 * S);
          f.A.groundAt = d => self.groundY(f.pos.x + sx * d, f.pos.z + cz * d);
        }
      }
      if (pace === 'run') { f.A.tailUpGoal = 0.3; f.A.earsGoal = -0.85; f.A.mouthGoal = 0.3; f.A.wideGoal = 0.3; }     // running for it: ears flat, panting
      if (tailUp) f.A.tailUpGoal = Math.max(f.A.tailUpGoal || 0, tailUp);
      return this.i >= pts.length;
    } };
  }
  // over the fence: a crouch, a spring and a soft landing
  leap(a, b) {
    const h = angTo(a.x, a.z, b.x, b.z);
    return seq(this.face(h), { name: 'leap', t: 0, run(f, dt) {
      this.t += dt; f.turnTo(h, dt, 6);
      // gathering himself: down low, weight back on the haunches
      const T0 = 0.38, T1 = T0 + 0.7, T2 = T1 + 0.34;
      if (this.t < T0) { const k = smooth(0, T0, this.t); f.A.crouchGoal = 1; f.A.crouch = Math.max(f.A.crouch || 0, k); f.A.pitch = -0.12 * k; f.A.tailUpGoal = 0.3; f.A.earsGoal = 1; f.A.wideGoal = 0.6; return false; }
      // in the air: a parabola just clearing the fence, nose up off the ground and down for the landing; front legs folded up
      // under the chest going over, then reaching for the ground; hind legs pushing off, then tucked up (pose airPh)
      if (this.t < T1) {
        const u = (this.t - T0) / (T1 - T0);
        f.pos.x = a.x + (b.x - a.x) * u; f.pos.z = a.z + (b.z - a.z) * u;
        f.A.lift = 4 * u * (1 - u) * 0.7; f.A.air = f.A.airGoal = Math.min(1, Math.min(u, 1 - u) * 8); f.A.airPh = u;
        f.A.crouch = f.A.crouchGoal = 0; f.A.pitch = -0.38 + 0.72 * u; f.A.tailUpGoal = 0.7; f.A.tailUp = Math.max(f.A.tailUp || 0, 0.5);
        f.A.earsGoal = -0.6 + 1.2 * smooth(0.5, 1, u); f.A.wideGoal = 0.5; f.A.mouthGoal = 0.15;
        return false;
      }
      // the landing: front feet first, the legs folding to take it, then up
      f.pos.x = b.x; f.pos.z = b.z; f.A.airPh = undefined;
      const v = (this.t - T1) / (T2 - T1);
      f.A.crouch = f.A.crouchGoal = 0.75 * (1 - smooth(0.2, 1, v)); f.A.pitch = 0.34 * (1 - smooth(0, 0.6, v)); f.A.tailUpGoal = 0.6; f.A.tailUp = Math.max(f.A.tailUp || 0, 0.5);
      return this.t > T2;
    } });
  }
  // across the yard, round the feeder, the water, the hay, the ramp's sides and anything in front of the house (a small grid
  // in the pen's own frame, one per house style); world points in and out
  penPath(p, a, b) {
    this.penGrids = this.penGrids || {};
    let g = this.penGrids[p.breed];
    if (!g) {
      g = this.penGrids[p.breed] = new NavGrid(-1.62, 0.2, 1.77, 2.48, 0.08);
      g.room = 0.12;                                                            // (his straight stretches with room to swing a little at the bends)
      for (const o of this.penObstacles || []) if (Math.abs(o[0] - this.nestOf(p).pop[0]) > 0.05) g.circle(o[0], o[2], o[3] + 0.2);   // (the old single farm's ramp marks: the ramp is the house's now)
      for (const o of (this.nestOf(p).block || [])) g.circle(o[0], o[1], o[2] + 0.2);
      g.mark(-1.7, 0, 1.8, 0.62, () => true);                                  // the house and just in front of it
      g.mark(-1.7, 0, 1.8, 2.6, (x, z) => x < -1.64 + 0.36 || x > 1.79 - 0.36 || z > 2.5 - 0.36);     // and off the fence
      const G = this.nestOf(p);                                                 // and round the ramp (not over its sides)
      g.mark(-1.7, 0, 1.8, 2.6, (x, z) => Math.abs(x - G.pop[0]) < 0.13 + 0.24 && z < G.foot[1] + 0.05);
    }
    const la = p.frame.worldToLocal(this.w.copy(a)).clone(), lb = p.frame.worldToLocal(this.w.copy(b)).clone();
    const path = g.find(la.x, la.z, lb.x, lb.z) || [[la.x, la.z], [lb.x, lb.z]];
    path[path.length - 1] = [lb.x, lb.z];
    return path.map(([x, z]) => { const w = this.W(p, x, 0, z); return [w.x, w.z]; });
  }
  // the ramp: how high it is under a point of the pen (z in the pen frame)
  rampY(p, lz) { const G = this.nestOf(p); return G.house * clamp01((G.foot[1] - lz) / Math.max(0.05, G.foot[1] - G.pop[1])); }
  // up the ramp until his nose is at the pop door (in: true), or back down to its foot
  climb(p, up) {
    const self = this, G = this.nestOf(p), h = this.heading(p, 0, -1);
    const top = G.pop[1] + 0.42; let bottom = G.foot[1] + 0.4;
    return { name: 'climb', t: 0, run(f, dt) {
      if (this.t === 0 && up) bottom = Math.max(top, p.frame.worldToLocal(self.v.copy(f.pos)).z);          // from wherever he is
      this.t += dt; const dur = up ? 1.6 : 1.1, u = smooth(0, dur, this.t);
      const lz = up ? bottom + (top - bottom) * u : top + (bottom - top) * u;
      const w = self.W(p, G.pop[0], 0, lz); f.pos.x = w.x; f.pos.z = w.z; f.turnTo(h, dt, 6);
      self.lean(f, p, lz); self.lz = lz;
      f.pace = 0.5; if (!up) f.A.crouchGoal = 0.3;
      if (up) { f.A.crouchGoal = 0.35 * u; f.A.lookPitchGoal = 0.35 * smooth(0.4, 1, u); f.A.earsGoal = 1; f.A.wideGoal = 0.4; }
      else f.A.earsGoal = -0.3;      // head down as he nears the doorway
      if (this.t >= dur && !up) self.lz = null;
      return this.t >= dur;
    } };
  }
  // standing on the ramp (body z in the pen frame): lifted to its height and tipped to its slope
  lean(f, p, lz) {
    const fy = this.rampY(p, lz - 0.14), hy = this.rampY(p, lz + 0.13);
    f.A.lift = (fy + hy) / 2; f.A.pitch = -Math.atan2(fy - hy, 0.27);
    // the ground under the paws: tipping the body round its middle swings the feet forward up the slope, so look there
    const S = f.q.S * f.scale, pt = f.A.pitch, down = 0.018 * S - f.q.hy * f.scale;
    const fwdF = down * Math.sin(pt) + 0.14 * S * Math.cos(pt), fwdH = down * Math.sin(pt) - 0.185 * S * Math.cos(pt);
    f.A.groundF = this.rampY(p, lz - fwdF); f.A.groundH = this.rampY(p, lz - fwdH);
    // and how steep it is there (the paws laid along it)
    const G = this.nestOf(p), slope = Math.atan2(G.house, Math.max(0.05, G.foot[1] - G.pop[1])), on = z => z > G.pop[1] - 0.02 && z < G.foot[1] + 0.01 ? slope : 0;
    f.A.slopeF = on(lz - fwdF); f.A.slopeH = on(lz - fwdH);
    if (f.A.slopeF) f.A.groundF += 0.02; if (f.A.slopeH) f.A.groundH += 0.02;            // the tips of the toes clear of the boards
    // and for each foot where it really is, a step ahead or behind (the pose asks, d metres forward of his middle)
    f.A.groundAt = d => { const z = lz - d; return this.rampY(p, z) + (on(z) ? 0.02 : 0); }; f.A.slopeAt = d => on(lz - d);
  }
  // nose in at the open door: the hens wake in a flurry, peck his nose; he yelps
  poke(p) {
    const self = this, G = this.nestOf(p), lz = G.pop[1] + 0.42;
    return { name: 'poke', t: 0, burst: false, run(f, dt) {
      this.t += dt; self.lean(f, p, lz); self.lz = lz;
      const w = self.W(p, G.pop[0], 0, lz); f.pos.x = w.x; f.pos.z = w.z;
      const k = smooth(0, 0.7, this.t);
      f.A.crouchGoal = 0.35 + 0.2 * k; f.A.lookPitchGoal = 0.2 + 0.25 * k; f.A.wagGoal = this.t < 1.1 ? 0.6 : 0;      // nose down and in, a sniff, a hopeful wag
      if (this.t < 1.1) { f.A.earsGoal = 1; f.A.wideGoal = 0.5; f.A.squintGoal = 0.25 * k; f.A.mouthGoal = 0.06 * Math.max(0, Math.sin(this.t * 22)); }
      else { f.A.earsGoal = -1; f.A.wideGoal = 1; f.A.squint = 0; f.A.mouthGoal = 0.3; }              // !
      if (this.t > 1.1 && !this.burst) { this.burst = true; self.flurry(p); }
      return this.t > 1.45;
    } };
  }
  // the hens' flurry: feathers out of the pop door and the nest window, "!" over the roof, a squawk
  flurry(p) {
    const G = this.nestOf(p), tint = FEATHER_TINT[p.breed] || '#ffffff', out = this.W(p, 0, 0, 1).sub(this.W(p, 0, 0, 0)).normalize();
    this.fx.feathers(this.W(p, G.pop[0], G.house + 0.2, this.D2 + 0.04), out, 16, tint);
    this.fx.feathers(this.W(p, G.win[0], (G.win[1] + G.win[2]) / 2, this.D2 + 0.04), out, 10, tint);
    const roof = this.W(p, -0.2, 1.35, 0.55), roof2 = this.W(p, 0.4, 1.25, 0.6);
    this.fx.pop('bang', roof, 0.26, 1.8); setTimeout(() => this.fx.pop('bang', roof2, 0.22, 1.5), 250);
    this.say(this.T('squawk'), this.W(p, 0, 2.0, 0), 2.2);
    this.note('flurry ' + p.index);
  }
  // back down the ramp in a hurry (a hop backwards), a feather stuck on his nose, a sneeze and a shake
  recoil(p) {
    const self = this, G = this.nestOf(p), h = this.heading(p, 0, -1);
    const top = G.pop[1] + 0.42, end = G.foot[1] + 0.4;
    return seq({ name: 'recoil', t: 0, run(f, dt) {
      this.t += dt; const u = smooth(0, 0.55, this.t);
      if (this.t < 0.05) { self.fx.pop('star', self.noseAt(f), 0.16, 0.6); self.stick(f); }
      const lz = top + (end - top) * u, w = self.W(p, G.pop[0], 0, lz); f.pos.x = w.x; f.pos.z = w.z;
      f.heading = h; f.A.rearGoal = 0.6 * (1 - u); f.A.rear = Math.max(f.A.rear || 0, 0.6 * (1 - u));
      f.A.lift = Math.max(self.rampY(p, lz), 0) * (1 - u) + Math.sin(u * Math.PI) * 0.12; f.A.tailUpGoal = 0.6;
      f.A.squintGoal = 1; f.A.earsGoal = -1; f.A.mouthGoal = this.t < 0.35 ? 1 : 0.3;                   // "Yip!"
      self.lz = this.t > 0.6 ? null : lz;
      return this.t > 0.6;
    } }, { name: 'sneeze', t: 0, run(f, dt) {
      // round, so we see his face (and the feather): of a few ways facing the player, the one where his brush curls round
      // onto clear ground
      if (!this.spot) {
        // where: here if his brush can curl round onto clear ground, else a step or two away where it can
        for (const [dx, dz] of [[0, 0], [0.22, 0.12], [-0.22, 0.12], [0, 0.22], [0.36, 0.25], [-0.36, 0.25], [0.5, 0.05], [-0.5, 0.05]]) {
          const w = self.W(p, G.pop[0] + dx, 0, G.foot[1] + 0.4 + dz), r = self.sitSpot(f, self.toCamera ? self.toCamera(w.x, w.z) : f.heading, w);
          if (!this.spot || r[2] < this.spot[4] - 1) this.spot = [w.x, w.z, r[0], r[1], r[2]];     // (moving only when it's clearly better)
          if (r[2] === 0) break;
        }
        this.h = this.spot[2]; f.curlSide = this.spot[3]; self.curlSet = true;
      }
      self.curlSet = true; f.curlSide = this.spot[3];          // (its choice holds while it lasts)
      if (!this.there) {
        f.A.tailUpGoal = 0.5; f.A.earsGoal = -0.5; f.A.squintGoal = 0.35;
        if (Math.hypot(this.spot[0] - f.pos.x, this.spot[1] - f.pos.z) < 0.04 || f.moveTo(this.spot[0], this.spot[1], dt, 'walk')) this.there = true;
        return false;
      }
      this.t += dt;
      f.turnTo(this.h, dt, 3.5);
      f.A.sitGoal = 1; f.A.lookPitchGoal = this.t < 0.6 ? -0.35 : 0.3;            // a breath in, nose up... and the sneeze
      if (this.t < 0.6) { const k = smooth(0, 0.6, this.t); f.A.mouthGoal = 0.45 * k; f.A.squintGoal = 0.35 + 0.55 * k; f.A.earsGoal = -0.4 * k; }    // ah... ah...
      else if (this.t < 0.85) { f.A.mouthGoal = this.t < 0.7 ? 1 : 0; f.A.squintGoal = 1; f.A.earsGoal = -0.9; }   // ...choo!
      if (this.t > 0.6 && this.t < 1.4) { f.A.shakeGoal = 1; f.A.squintGoal = 1; }
      if (this.t > 1.4 && this.t < 2.2) { f.A.headTiltGoal = 0.35; f.A.earLGoal = 0.5; f.A.earRGoal = -0.6; }       // what was that?
      if (this.t > 1.4) f.A.wideGoal = 0.3;
      return this.t > 2.4;
    } });
  }
  // the game's eggs: his head in through the pop door, the hens squawking, and out it comes with an egg in his mouth
  grab(p) {
    const self = this, G = this.nestOf(p), lz = G.pop[1] + 0.42;
    return { name: 'grab', t: 0, run(f, dt) {
      this.t += dt; const k = smooth(0, 0.45, this.t) - smooth(0.75, 1.1, this.t), z = lz - 0.07 * k;
      self.lean(f, p, z); self.lz = z;
      const w = self.W(p, G.pop[0], 0, z); f.pos.x = w.x; f.pos.z = w.z;
      f.A.crouchGoal = 0.45 + 0.25 * k; f.A.lookPitchGoal = 0.35 + 0.25 * k; f.A.earsGoal = 0.2; f.A.wideGoal = 0.6;
      f.A.mouthGoal = this.t < 0.7 ? 0.55 : 0.34; f.A.wagGoal = this.t > 0.8 ? 0.7 : 0;
      if (this.t > 0.7 && !(self.egg && self.egg.parent)) self.takeEgg(f, p);
      return this.t > 1.25;
    } };
  }
  takeEgg(f, p) {
    if (!this.egg) {
      this.egg = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), new THREE.MeshStandardMaterial({ roughness: 0.45 }));
    }
    this.egg.material.color.set(this.eggColour ? this.eggColour(p) : '#efe4cf');
    this.egg.material.emissive.copy(this.egg.material.color).multiplyScalar(0.3);      // (it shows in the dark: the story's whole point)
    this.egg.scale.set(0.064, 0.05, 0.05);                  // (lying across his jaws)
    const jaw = f.q.bones.jaw; jaw.add(this.egg); this.egg.position.copy(f.q.mouthSpot());
    this.took = this.eggsAt ? this.eggsAt(p) : 1;
    if (this.tookEggs) this.tookEggs(p, this.took);
    this.say(this.T('grabbed'), this.W(p, 0, 2.0, 0), 2.4);
    this.note('eggs ' + p.index + ' ' + this.took);
  }
  dropEgg() { if (this.egg && this.egg.parent) this.egg.removeFromParent(); }
  // back down the ramp with it, pleased with himself (no peck, no feather), then off home
  backDown(p) {
    const self = this, G = this.nestOf(p), h = this.heading(p, 0, -1), top = G.pop[1] + 0.42, end = G.foot[1] + 0.4;
    return { name: 'backDown', t: 0, run(f, dt) {
      this.t += dt; const u = smooth(0, 0.7, this.t);
      const lz = top + (end - top) * u, w = self.W(p, G.pop[0], 0, lz); f.pos.x = w.x; f.pos.z = w.z;
      f.heading = h; f.A.lift = Math.max(self.rampY(p, lz), 0) * (1 - u) + Math.sin(u * Math.PI) * 0.06;
      f.A.tailUpGoal = 0.8; f.A.wagGoal = 1; f.A.earsGoal = 0.8; f.A.squintGoal = 0.3;
      self.lz = this.t > 0.75 ? null : lz;
      return this.t > 0.8;
    } };
  }
  // round to face you at the foot of the ramp, the egg in his mouth: very pleased with himself (a wag, ears up, eyes
  // narrowed), then off
  showOff(f) {
    const self = this;
    return { name: 'showOff', t: 0, run(f, dt) {
      this.t += dt;
      const h = self.toCamera ? self.toCamera(f.pos.x, f.pos.z) : f.heading; f.turnTo(h, dt, 4);
      f.A.lookPitchGoal = -0.18; f.A.earsGoal = 1; f.A.wagGoal = 1; f.A.tailUpGoal = 0.7; f.A.squintGoal = 0.45; f.A.headTiltGoal = this.t > 0.9 ? 0.25 : 0;
      return this.t > 1.9;
    } };
  }
  // at a shut door: sniffs along it, scratches at it, sits back puzzled
  scratch(p) {
    const self = this, G = this.nestOf(p), lz = G.pop[1] + 0.42;
    return { name: 'scratch', t: 0, run(f, dt) {
      this.t += dt; self.lean(f, p, lz); self.lz = lz;
      f.A.crouchGoal = 0.3;
      if (this.t < 1.4) { f.A.lookYawGoal = 0.35 * Math.sin(this.t * 7); f.A.lookPitchGoal = 0.15; f.A.earsGoal = 1; f.A.mouthGoal = 0.06 * Math.max(0, Math.sin(this.t * 22)); }    // sniffing along the door
      else if (this.t < 2.8) { f.A.rearGoal = 0.25; f.A.paw = 1; f.A.pawGoal = 1; f.A.earsGoal = 0.6; f.A.squintGoal = 0.35; }    // scratching at it
      else { f.A.earsGoal = -0.4; }
      if (this.t > 2.8 && !this.said) { this.said = true; self.say(self.T('shut'), self.W(p, G.pop[0], G.house + 0.8, self.D2 + 0.2), 2.4); }
      return this.t > 3.2;
    } };
  }
  sit(s, puzzled, mark) {
    const self = this;
    return { name: 'sit', t: 0, run(f, dt) {
      this.t += dt; f.A.sitGoal = 1; f.A.lift = 0; f.A.pitch = 0;
      if (puzzled) { const sd = this.t % 2 < 1 ? 1 : -1; f.A.headTiltGoal = 0.4 * Math.sin(Math.min(1, this.t / 0.8) * Math.PI / 2) * sd; f.A.earLGoal = 0.5 * sd; f.A.earRGoal = -0.5 * sd; f.A.wideGoal = 0.25; }
      if (mark && !this.marked && this.t > 0.4) { this.marked = true; self.fx.pop(mark, self.overHead(f), 0.2, 1.8); }
      return this.t > s;
    } };
  }
  homeTask(pace) {
    const f = this.fox, [x, z, h] = this.fam.den, dx = x + Math.sin(h) * 1.05, dz = z + Math.cos(h) * 1.05;
    const path = this.nav.find(f.pos.x, f.pos.z, dx, dz) || [[f.pos.x, f.pos.z], [dx, dz]];
    path.push([dx, dz]);
    return this.walk(path, pace, 0);
  }
  // along a way, over the wild meadow's fences where it crosses them (the game): to a spot 0.8 m short of the first fence,
  // a leap square over it, then on from the far side the same way (a way found again from there)
  walk(path, pace, sneak, tol, tailUp, depth = 0) {
    const F = this.fences ? this.fences() : null;
    if (!F || !F.length || path.length < 2 || depth > 6) return this.follow(path, pace, sneak, tol, tailUp);
    let c = null;
    for (let i = 1; i < path.length && !c; i++) {
      const [ax, az] = path[i - 1], [bx, bz] = path[i], ex = bx - ax, ez = bz - az;
      let best = null;
      for (const L of F) for (let j = 1; j < L.length; j++) {
        const [cx, cz] = L[j - 1], [dx, dz] = L[j], gx = dx - cx, gz = dz - cz, den = ex * gz - ez * gx;
        if (Math.abs(den) < 1e-9) continue;
        const u = ((cx - ax) * gz - (cz - az) * gx) / den, v = ((cx - ax) * ez - (cz - az) * ex) / den;
        if (u < 0 || u > 1 || v < 0 || v > 1 || (best && u >= best.u)) continue;
        const gl = Math.hypot(gx, gz) || 1; let nx = -gz / gl, nz = gx / gl; if (nx * ex + nz * ez < 0) { nx = -nx; nz = -nz; }
        best = { u, x: ax + ex * u, z: az + ez * u, nx, nz, tx: gx / gl, tz: gz / gl };
      }
      c = best;
    }
    if (!c) return this.follow(path, pace, sneak, tol, tailUp);
    // the take-off and landing square to the fence, slid along it a little if one of them is in something's way
    let take = null, land = null;
    for (const sl of [0, 0.25, -0.25, 0.5, -0.5, 0.8, -0.8, 1.2, -1.2]) {
      const tx = c.x - c.nx * 0.8 + c.tx * sl, tz = c.z - c.nz * 0.8 + c.tz * sl, lx = c.x + c.nx * 0.8 + c.tx * sl, lz = c.z + c.nz * 0.8 + c.tz * sl;
      if (this.nav.freeAt(tx, tz) && this.nav.freeAt(lx, lz)) { take = { x: tx, z: tz }; land = { x: lx, z: lz }; break; }
    }
    if (!take) return this.follow(path, pace, sneak, tol, tailUp);
    const self = this, f0 = path[0], end = path[path.length - 1];
    const to = this.nav.find(f0[0], f0[1], take.x, take.z) || [[f0[0], f0[1]], [take.x, take.z]]; to.push([take.x, take.z]);
    const on = { name: 'go', inner: null, cur() { return this.inner ? (this.inner.cur ? this.inner.cur() : this.inner) : this; }, run(f, dt) {
      if (!this.inner) { const r = self.nav.find(land.x, land.z, end[0], end[1]) || [[land.x, land.z], [end[0], end[1]]]; r.push([end[0], end[1]]); this.inner = self.walk(r, pace, sneak, tol, tailUp, depth + 1); }
      return this.inner.run(f, dt);
    } };
    return seq(this.follow(to, pace, 0, tol, tailUp), this.leap(take, land), on);
  }
  denIn() { return this.fam.inTask(() => this.finish()); }
  // ---- the farmer
  sendFarmer() {
    if (!this.canSend()) return false;
    const f = this.fox, h = this.house;
    const start = this.door ? [this.door[0], this.door[1]] : this.nav.nearestFree(h[0] + Math.sign(f.pos.x - h[0]) * 2.0, h[1] + Math.sign(f.pos.z - h[1]) * 2.0, 4) || [h[0], h[1]];      // (out of the farmhouse door)
    this.farmer = { stage: 'coming', at: start, path: null, replan: 0, t: 0 };
    this.torch.place(start[0], start[1], angTo(start[0], start[1], f.pos.x, f.pos.z)); this.torch.walking = true;
    this.hint(this.T('sent'));
    this.note('farmer');
    return true;
  }
  tickFarmer(dt) {
    const F = this.farmer; if (!F) { this.torch.update(dt, false); return; }
    F.t += dt;
    const f = this.fox, T = this.torch, speed = 2.1;
    const walk = (tx, tz) => {
      F.replan -= dt;
      if (!F.path || F.replan <= 0) { F.path = this.nav.find(T.pos.x, T.pos.y, tx, tz) || [[T.pos.x, T.pos.y], [tx, tz]]; F.path.shift(); F.replan = 1; }
      let step = speed * dt;
      while (step > 0 && F.path.length) {
        const [x, z] = F.path[0], d = Math.hypot(x - T.pos.x, z - T.pos.y);
        if (d <= step) { T.pos.set(x, z); step -= d; F.path.shift(); continue; }
        T.pos.x += (x - T.pos.x) / d * step; T.pos.y += (z - T.pos.y) / d * step; T.aim = Math.atan2(x - T.pos.x, z - T.pos.y); step = 0;
      }
      return !F.path.length;
    };
    if (F.stage === 'coming') {
      T.walking = true;
      const d = Math.hypot(f.pos.x - T.pos.x, f.pos.z - T.pos.y);
      if ((d < 3.3 && this.nav.clearLine(T.pos.x, T.pos.y, f.pos.x, f.pos.z)) || d < 2.0 || F.t > 40 || !f.root.visible) {
        F.stage = 'shine'; F.t = 0; T.walking = false;
        if (f.root.visible && this.state === 'out') { this.shoo(); }
      } else walk(f.pos.x, f.pos.z);
    } else if (F.stage === 'shine') {
      T.aim = angTo(T.pos.x, T.pos.y, f.pos.x, f.pos.z);
      if (F.t > 3.2) { F.stage = 'back'; F.path = null; F.t = 0; }
    } else if (F.stage === 'back') {
      T.walking = true;
      if (walk(F.home ? F.home[0] : this.house[0], F.home ? F.home[1] : this.house[1]) || F.t > 30) { F.stage = 'gone'; }
    }
    T.update(dt, F.stage !== 'gone');
    if (F.stage === 'gone' && T.on < 0.02) { this.farmer = null; if (this.state === 'idle' || this.state === 'home') this.torch.update(0, false); }
  }
  // the torch finds Rusty: a jump of surprise, then off home as fast as he can (over the fence if he's in a pen)
  shoo() {
    const f = this.fox, T = this.torch;
    this.state = 'fleeing'; this.fleeStage = 'startle'; this.note('shoo'); this.scare = null;
    this.farmer.home = this.door ? [this.door[0], this.door[1]] : [this.house[0], this.house[1]];
    this.say(this.T('shoo'), new THREE.Vector3(T.pos.x, 1.5, T.pos.y), 2.6);
    f.todo = []; f.task = null;
  }
  // the geese have come for him (geese.js): the same jump of surprise, facing them, and off home as fast as he can
  // seen off by the farm's guards (who: 'geese' or 'dog'; helpers: who was out after him, for the night's last message)
  chasedBy(x, z, who = 'geese') {
    if (this.state !== 'out' || !this.fox.root.visible) return false;
    this.state = 'fleeing'; this.fleeStage = 'startle'; this.scare = [x, z]; this.byGeese = true; this.note(who);
    (this.helpers || (this.helpers = {}))[who] = true;
    const f = this.fox; f.todo = []; f.task = null;
    return true;
  }
  fleeTask() {
    const self = this, f = this.fox, T = this.torch, S = this.scare ? { x: this.scare[0], y: this.scare[1] } : T.pos;
    const inPen = this.inPen();
    switch (this.fleeStage) {
      case 'startle': this.fleeStage = 'away'; return { name: 'startle', t: 0, run(f, dt) {
        this.t += dt;
        if (this.t < 0.05) self.fx.pop('bang', self.overHead(f), 0.2, 1.2);
        if (self.lz == null) f.turnTo(angTo(f.pos.x, f.pos.z, S.x, S.y), dt, 8);
        else f.A.lookYawGoal = Math.max(-1, Math.min(1, Math.atan2(Math.sin(angTo(f.pos.x, f.pos.z, S.x, S.y) - f.heading), Math.cos(angTo(f.pos.x, f.pos.z, S.x, S.y) - f.heading))));
        f.A.lookPitchGoal = -0.2;
        if (self.lz != null) { self.lean(f, self.target, self.lz); f.A.lift += Math.sin(clamp01(this.t / 0.4) * Math.PI) * 0.1; }
        else { f.A.lift = Math.sin(clamp01(this.t / 0.4) * Math.PI) * 0.18; f.A.airGoal = this.t < 0.4 ? 0.5 : 0; }
        f.A.tailUpGoal = 0.8; f.A.wideGoal = 1; f.A.wide = Math.max(f.A.wide || 0, 0.8); f.A.earsGoal = -1; f.A.mouthGoal = this.t < 0.3 ? 0.6 : 0.2;
        return this.t > 0.7;
      } };
      case 'away':
        if (this.lz != null) return this.slide(this.target);
        if (inPen && this.way) { this.fleeStage = 'over'; return this.follow(this.penPath(this.target, f.pos, this.way.land), 'trot', 0, 0.05, 0.6); }
        this.fleeStage = 'run'; return this.wait(0);
      case 'over': this.fleeStage = 'run'; return this.leap(this.way.land, this.way.take);
      case 'run': this.fleeStage = 'in'; return this.homeTask('run');
      case 'in': return this.denIn();
    }
    return this.wait(1);
  }
  // down from the ramp in a hurry, from wherever he is on it
  slide(p) {
    const self = this, G = this.nestOf(p), from = this.lz, end = G.foot[1] + 0.4;
    return { name: 'slide', t: 0, run(f, dt) {
      this.t += dt; const u = smooth(0, 0.45, this.t), lz = from + (end - from) * u, w = self.W(p, G.pop[0], 0, lz);
      f.pos.x = w.x; f.pos.z = w.z; self.lean(f, p, lz); f.A.crouchGoal = 0.5; f.pace = 1; f.A.earsGoal = -1; f.A.wideGoal = 0.8;
      if (this.t > 0.45) { self.lz = null; return true; } return false;
    } };
  }
  inPen(margin = 0) {
    const p = this.target; if (!p) return false;
    const l = p.frame.worldToLocal(this.w.copy(this.fox.pos));
    return l.x > -1.7 - margin && l.x < 1.85 + margin && l.z > -0.85 - margin && l.z < 2.55 + margin;
  }
  finish() {
    const shooed = this.state === 'fleeing';
    const H = this.helpers || {}, guards = H.geese && H.dog ? 'team' : H.dog ? 'dog' : 'geese';
    this.ended = shooed ? (this.byGeese ? guards : 'shooed') : this.took ? 'eggs' : this.pecks ? 'pecked' : 'shut';
    this.hint(this.T(shooed ? (this.byGeese ? guards + 'Safe' : 'safe') : this.took ? 'eggsGone' : this.pecks ? 'feather' : 'allShut'));
    this.dropEgg();
    this.byGeese = false; this.scare = null; this.helpers = {};
    this.note('home ' + this.ended);
    this.state = 'idle'; this.phase = null; this.lz = null;
    if (this.nose) { this.nose.life = 0; this.nose.sp.visible = false; this.nose.type = 'feather'; this.nose = null; }
    this.fam.hide(this.fox);
    this.next = this.again ? this.again() : 900 + this.r() * 900;
  }
  // back to before any visit: Rusty home, no feather, no farmer, nothing in the air (the morning replay's own visit, before
  // each showing)
  reset() {
    if (this.nose) { this.nose.type = 'feather'; this.nose = null; }
    this.dropEgg(); this.took = 0;
    for (const s of this.fx.list) { s.life = 0; s.sp.visible = false; if (s.type === 'stuck') s.type = 'feather'; }
    this.state = 'idle'; this.phase = null; this.lz = null; this.helpers = {}; this.byGeese = false; this.scare = null; this.ended = null;
    this.farmer = null; this.torch.on = 0; this.torch.group.visible = false; this.pecks = 0; this.tries = []; this.curlSet = false;
    this.fam.hide(this.fox); this.next = Infinity;
  }
  // which way to sit (near `want`) and which side to curl the brush, so it lies on clear ground
  sitSpot(f, want, at = f.pos) {
    const p = this.target, G = this.nestOf(p), obs = (this.penObstacles || []).filter(o => Math.abs(o[0] - G.pop[0]) > 0.05), S0 = f.q.S * f.scale;
    const blocked = (x, z) => {
      const l = p.frame.worldToLocal(this.v.set(x, 0, z));
      if (l.x < -1.64 + 0.2 || l.x > 1.79 - 0.2 || l.z > 2.5 - 0.2) return true;
      if (Math.abs(l.x - G.pop[0]) < 0.2 && l.z < G.foot[1] + 0.12 && l.z > G.pop[1] - 0.1) return true;
      return obs.some(o => Math.hypot(l.x - o[0], l.z - o[2]) < o[3] + 0.14);            // (a brush can lie on a let-down nest door: it's a flat board on the ground)
    };
    let best = [want, 1], bestN = 99;
    for (const dh of [0.35, -0.35, 0.8, -0.8, 0, 1.3, -1.3]) for (const side of [1, -1]) {
      const h = want + dh, rx = -Math.cos(h), rz = Math.sin(h), bx = -Math.sin(h), bz = -Math.cos(h);
      const n = [[0.32, 0.1], [0.22, 0.26], [0.06, 0.34], [0.42, 0.0]].filter(([bk, sd]) => blocked(at.x + bx * bk * S0 + rx * sd * side * S0, at.z + bz * bk * S0 + rz * sd * side * S0)).length
        + (blocked(at.x, at.z) ? 9 : 0);
      if (n < bestN) { bestN = n; best = [h, side]; }
    }
    return [best[0], best[1], bestN];
  }
  // ---- in the yard he lifts his brush clear of what it would brush past: the hay bale, the feeder, the water dish, the
  // ramp, the fence (looking where it is now and where it's swinging to)
  brush(dt) {
    const f = this.fox, p = this.target; let want = 0;
    if (this.active() && f.root.visible && p && this.inPen(0.9)) {
      const G = this.nestOf(p), obs = (this.penObstacles || []).filter(o => Math.abs(o[0] - G.pop[0]) > 0.05);
      const blocked = (x, z) => {
        const l = p.frame.worldToLocal(this.v.set(x, 0, z));
        if (l.x < -1.64 + 0.18 || l.x > 1.79 - 0.18 || l.z > 2.5 - 0.18) return true;
        if (Math.abs(l.x - G.pop[0]) < 0.2 && l.z < G.foot[1] + 0.08 && l.z > G.pop[1] - 0.1) return true;
        return obs.some(o => Math.hypot(l.x - o[0], l.z - o[2]) < o[3] + 0.12);
      };
      // sitting down: the brush curls round whichever side is clear (chosen as he sits, kept till he stands)
      const S0 = f.q.S * f.scale, sitting = f.A.sitGoal > 0.5 || (f.A.sit || 0) > 0.3;
      if (sitting && !this.curlSet) {
        const rx = -Math.cos(f.heading), rz = Math.sin(f.heading), bx = -Math.sin(f.heading), bz = -Math.cos(f.heading);
        const hits = side => [[0.3, 0.12], [0.2, 0.26], [0.05, 0.32]].filter(([bk, sd]) => blocked(f.pos.x + bx * bk * S0 + rx * sd * side * S0, f.pos.z + bz * bk * S0 + rz * sd * side * S0)).length;
        f.curlSide = hits(1) <= hits(-1) ? 1 : -1; this.curlSet = true;        // (the sneeze picks its own, above)
      }
      if (!sitting) this.curlSet = false;
      const hd = f.heading - f.turn * 0.25, S = f.q.S * f.scale;
      if (!sitting) for (const back of [0.26, 0.4, 0.58, 0.74]) for (const sw of [-0.5, 0, 0.5]) {
        const a = hd + Math.PI + sw * Math.min(1, Math.abs(f.turn) / 2 + 0.3) * Math.sign(f.turn || 1);
        if (blocked(f.pos.x + Math.sin(a) * back * S, f.pos.z + Math.cos(a) * back * S)) want = 1;
      }
    }
    f.tailLift = (f.tailLift || 0) + (want * 1.25 - (f.tailLift || 0)) * Math.min(1, dt * 10);
    if (f.tailLift < 0.01 && !want) f.tailLift = 0;
  }
  // ---- little helpers: where his nose and the top of his head are, and the feather stuck on his nose
  noseAt(f) { const b = f.q.bones.head; b.updateWorldMatrix(true, false); return b.localToWorld(new THREE.Vector3(0, 0.03, 0.21)); }
  overHead(f) { const b = f.q.bones.head; b.updateWorldMatrix(true, false); return b.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.32, 0)); }
  stick(f) {
    if (this.nose) return;
    const s = this.fx.sprite('feather', FEATHER_TINT[this.target.breed]); if (!s) return;
    s.type = 'stuck'; s.life = s.full = 1e9; s.size = 0.075; s.sp.scale.setScalar(0.075); s.sp.material.rotation = 0.9;
    this.nose = s;
  }
  // ---- every frame
  update(dt, hour, opts = {}) {
    const night = hour >= 23 || hour < 4.5;
    if (this.alarm && this.state === 'out' && this.fox.root.visible) {      // (the game: the guards' alarm heard, wherever they are)
      const a = this.alarm();
      if (a) { this.alarmT = (this.alarmT || 0) + dt; if (this.alarmT > (a.quick ? 0.8 : 1.6) && this.chasedBy(a.x, a.z, a.who[0])) for (const w of a.who) this.helpers[w] = true; }
    } else this.alarmT = 0;
    if (this.state === 'idle') {
      if (!this.farmer || this.farmer.stage === 'gone') this.next -= dt;
      if (night && this.next <= 0) { if (!this.start(opts.plot)) this.next = 20; }
    }
    if (this.nose) {
      const f = this.fox;
      this.nose.sp.visible = f.root.visible;
      if (f.root.visible) {
        const b = f.q.bones.head; b.updateWorldMatrix(true, false);
        this.nose.sp.position.copy(b.localToWorld(this.w.set(0.012, 0.06, 0.165)));
        this.nose.sp.visible = true;
      }
    }
    this.brush(dt);
    this.tickFarmer(dt);
    this.fx.update(dt);
  }
}
function seq(...tasks) { return { name: 'seq', i: 0, cur() { return tasks[this.i]; }, run(f, dt) { while (this.i < tasks.length) { if (tasks[this.i].run(f, dt) === false) return false; this.i++; } return true; } }; }
