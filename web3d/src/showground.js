// The show ground (release 1 step 9: Audrey chose a "show day on the farm" for the poultry shows): when a show's results
// come, a white marquee stands on the farm, the farmer carries the player's bird there, a judge looks at each bird in its
// show pen and pins the rosettes. This file has the pieces (the scene's choreography is main.js's):
// - loadShow(): showground.glb / showground.json (stylized/export_showground.py) and the judge (judge.glb / judge.json,
//   stylized/export_farmer.py ... j, a third look on the farmers' own skeleton: farmer.js drives him with the same poses);
// - ShowGround: the marquee open towards the player, its trestle table with six show pens, the sign board (its words drawn
//   here, in English or French), the judge's table with his clipboard, tea and the rosette box; places in its own frame
//   (showground.json: each pen, where its bird stands, where the judge and the farmer stand, its rosette pin, the sign's
//   rectangle, the footprints), rosettes pinned on a pen or held in the judge's hand;
// - ShowLineup: the test page's ?lineup=show: the show ground on open grass, a bird of each breed in the pens, the four
//   rosettes pinned, the judge in front going through his poses in turn, Arthur standing by.
import * as THREE from 'three';
import { addLook, Farmer, POSES } from './farmer.js';

const DEG = Math.PI / 180;
const FR = typeof location !== 'undefined' && /[?&]lang=fr\b/.test(location.search);
export let SHOW = null;                       // showground.json, once loaded
const PARTS = {};
let HOLD = { palm: [0, -0.059, 0], pinch: [0, -0.105, 0.045] };     // (judge.json: where a held thing goes in his hand)
export const ROSETTES = ['first', 'second', 'third', 'champion'];

// a touch richer colours, as the village's own models get (main.js richer)
function richer(geo, sat = 1.15) {
  const c = geo.getAttribute('color');
  if (!c || geo.userData.richer) return;
  const k = c.normalized ? 255 : 1, a = c.array;
  for (let i = 0; i < c.count; i++) {
    const o = i * c.itemSize, r = a[o] / k, g = a[o + 1] / k, b = a[o + 2] / k, l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    a[o] = Math.min(1, Math.max(0, l + (r - l) * sat)) * k; a[o + 1] = Math.min(1, Math.max(0, l + (g - l) * sat)) * k; a[o + 2] = Math.min(1, Math.max(0, l + (b - l) * sat)) * k;
  }
  c.needsUpdate = true; geo.userData.richer = true;
}

// the show ground's models and the judge, loaded once (with main.js's own loaders, so they share its cache-busting)
export async function loadShow(loadGLB, loadJSON) {
  if (SHOW) return SHOW;
  const [g, info, jg, jinfo] = await Promise.all([loadGLB('showground.glb'), loadJSON('showground.json'), loadGLB('judge.glb'), loadJSON('judge.json')]);
  for (const child of [...g.scene.children]) {
    child.traverse(c => { if (c.isMesh) { richer(c.geometry); c.material.vertexColors = true; } });
    PARTS[child.name] = child;
  }
  addLook(jg, jinfo);
  if (jinfo.info.j && jinfo.info.j.hold) HOLD = jinfo.info.j.hold;
  SHOW = info;
  return info;
}

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

// ------------------------------------------------------------------ the show ground itself, in its own frame (its +z towards the
// player: deg 45 faces the game's camera, as the decorations); everything in showground.json is in this frame
export class ShowGround {
  constructor(parent, { x = 0, z = 0, deg = 45, grade = null } = {}) {
    this.info = SHOW; this.grade = grade;
    this.group = new THREE.Group(); this.group.position.set(x, 0, z); this.group.rotation.y = deg * DEG; parent.add(this.group);
    this.parts = {};
    for (const name of ['show_tent', 'show_pens', 'show_sign', 'show_jtable', 'show_clipboard']) {
      const m = this.prep(PARTS[name].clone());
      this.group.add(m); this.parts[name] = m;
    }
    this.pinned = new Array(SHOW.pens.length).fill(null);
    // the sign's words: a canvas on its face (drawn by sign())
    const S = SHOW.sign, cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * S.h / S.w);
    this.signCanvas = cv; this.signTex = new THREE.CanvasTexture(cv); this.signTex.colorSpace = THREE.SRGBColorSpace; this.signTex.anisotropy = 4;
    const mat = new THREE.MeshStandardMaterial({ map: this.signTex, transparent: true, roughness: 0.8, alphaTest: 0.05, polygonOffset: true, polygonOffsetFactor: -2 });
    if (grade) grade(mat);
    this.signMesh = new THREE.Mesh(new THREE.PlaneGeometry(S.w, S.h), mat);
    this.signMesh.position.set(S.centre[0], S.centre[1], S.centre[2] + 0.002); this.signMesh.visible = false;
    this.group.add(this.signMesh);
    this.group.updateMatrixWorld(true);
  }
  prep(o) {
    o.traverse(c => {
      if (!c.isMesh) return;
      c.castShadow = true; c.receiveShadow = true;
      if (this.grade) for (const m of [].concat(c.material)) this.grade(m);
    });
    return o;
  }
  // from the show ground's frame to the world (a point, a yaw)
  world(x, y, z) { this.group.updateMatrixWorld(true); return this.group.localToWorld(new THREE.Vector3(x, y, z)); }
  worldYaw(yaw) { return yaw + this.group.rotation.y; }
  // pen i's places, in the world: where its bird stands (and her yaw), where the judge stands to look at her and to pin
  // her rosette, where the farmer stands to put her in, its rosette pin, its door
  pen(i) {
    const P = SHOW.pens[i];
    return { bird: this.world(...P.bird), birdYaw: this.worldYaw(P.birdYaw), judge: this.world(P.judge[0], 0, P.judge[1]), judgeYaw: this.worldYaw(P.judgeYaw),
      pinAt: this.world(P.pinAt[0], 0, P.pinAt[1]), pinYaw: this.worldYaw(P.pinYaw),
      farmer: this.world(P.farmer[0], 0, P.farmer[1]), farmerYaw: this.worldYaw(P.farmerYaw), pin: this.world(...P.pin), door: this.world(...P.door) };
  }
  // a rosette ('first', 'second', 'third', 'champion'): a new one, not placed yet (its origin is its pin; it faces +z)
  rosette(kind) { return this.prep(PARTS['rosette_' + kind].clone()); }
  // pinned on pen i's front (on its bottom rail, in the middle, hanging over the table's cloth); one rosette a pen
  pin(i, kind) {
    this.unpin(i);
    const r = typeof kind === 'string' ? this.rosette(kind) : kind;
    if (r.parent) r.parent.remove(r);
    r.position.copy(v3(SHOW.pens[i].pin)); r.quaternion.identity(); r.scale.setScalar(1);
    this.group.add(r); this.pinned[i] = r;
    return r;
  }
  unpin(i) { if (this.pinned[i]) { this.pinned[i].removeFromParent(); this.pinned[i] = null; } }
  // a rosette in the judge's right hand, held by its pin between his thumb and finger, its face forward (as when he reaches
  // out to pin it: judge_pin)
  hold(farmer, kind) {
    const r = typeof kind === 'string' ? this.rosette(kind) : kind;
    if (r.parent) r.parent.remove(r);
    const H = farmer.rig.B.wristR, at = HOLD.pinch;
    r.position.set(at[0], at[1], at[2]); r.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 90 * DEG); r.scale.setScalar(1);
    H.add(r); return r;
  }
  // the judge reaching out with a rosette (judge_pin, posed): moves him (his feet, his turn kept) so the rosette's pin is
  // right at pen i's pin; returns how far he moved (m). Then pin(i, held) hands it over to the pen.
  reachPin(judge, i) {
    const par = judge.root.parent; judge.root.updateMatrixWorld(true);
    const h = par.worldToLocal(judge.rig.B.wristR.localToWorld(v3(HOLD.pinch))), p = par.worldToLocal(this.world(...SHOW.pens[i].pin));
    const dx = p.x - h.x, dz = p.z - h.z; judge.pos.x += dx; judge.pos.z += dz;
    return Math.hypot(dx, dz);
  }
  // the clipboard lying on the judge's table (hidden while he carries his own)
  clipboard(on) { this.parts.show_clipboard.visible = !!on; }
  // the sign's words: a title and a line under it (in the player's language: the caller's), a little rosette either side
  // of the line; drawn again once the page's fonts are in
  sign(title, sub = '') {
    const cv = this.signCanvas, c = cv.getContext('2d'), W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H); c.textAlign = 'center'; c.textBaseline = 'middle';
    const fit = (text, px, weight, maxW) => { do { c.font = `${weight} ${px}px Fredoka, Nunito, sans-serif`; px -= 2; } while (c.measureText(text).width > maxW && px > 12); return px + 2; };
    c.fillStyle = '#3d6b48';
    fit(title, Math.round(H * (sub ? 0.36 : 0.46)), 600, W * 0.92); c.fillText(title, W / 2, H * (sub ? 0.36 : 0.5));
    if (sub) {
      c.fillStyle = '#8a5a2e'; fit(sub, Math.round(H * 0.22), 600, W * 0.66); c.fillText(sub, W / 2, H * 0.74);
      const ros = (x, y, r, col) => {
        c.fillStyle = col;
        for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * r * 0.15, y); c.lineTo(x + s * r * 0.75, y + r * 2.1); c.lineTo(x + s * r * 0.35, y + r * 1.8); c.lineTo(x + s * r * 0.05, y + r * 2.1); c.closePath(); c.fill(); }
        c.beginPath(); for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, rr = r * (k % 2 ? 0.86 : 1); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill();
        c.fillStyle = '#efbf45'; c.beginPath(); c.arc(x, y, r * 0.42, 0, Math.PI * 2); c.fill();
      };
      ros(W * 0.09, H * 0.66, H * 0.12, '#d0342c'); ros(W * 0.91, H * 0.66, H * 0.12, '#2f62b8');
    }
    this.signTex.needsUpdate = true; this.signMesh.visible = !!(title || sub);
    if (!this.fontsIn && typeof document !== 'undefined' && document.fonts) { this.fontsIn = true; document.fonts.ready.then(() => this.sign(title, sub)); }
  }
}

// ------------------------------------------------------------------ ?lineup=show: the show ground on open grass beside the village, a bird
// of each breed in the pens (the line-up's own birds), the four rosettes pinned, the judge in front going through his poses
// in turn (looking into a pen, writing, pinning a rosette, clapping, carrying his clipboard), Arthur standing by.
// &pose=judge_write holds one pose (&pose=walk: walking along the pens); &pen=N puts the judge at pen N.
const SHOW_BIRDS = [['rir', 'hen'], ['orp', 'hen'], ['sil', 'hen', 'white'], ['leg', 'hen'], ['bra', 'hen'], ['bra', 'rooster']];
const SHOW_PINS = [[1, 'first'], [3, 'second'], [0, 'third'], [5, 'champion']];
// each pose of the judge's turn: where he stands (a pen), what he holds, his face, a little movement
const TURN = [
  { pose: 'judge_look', face: 'peer', pen: 2, props: {}, anim: (P, F, t) => { P.head[2] += 6 * Math.sin(t * 0.9); P.chest[2] += 3 * Math.sin(t * 0.9); } },
  { pose: 'judge_write', face: 'peer', pen: 2, props: { clipboard: true, pencil: true }, anim: (P, F, t) => { P.wrR[0] += 7 * Math.sin(t * 14); P.wrR[2] += 6 * Math.sin(t * 5); F.look = [0.1, -0.5]; } },
  { pose: 'judge_pin', face: 'happy', pen: 2, props: {}, rosette: 'first', anim: (P, F, t) => { P.shR[1] += 3 * Math.sin(t * 2); } },
  { pose: 'clap', face: 'happy', pen: 2, props: {}, anim: (P, F, t) => { const u = Math.sin(t * 13); P.shL[0] -= 7 * u; P.shR[0] += 7 * u; P.shL[2] += 8 * u; P.shR[2] -= 8 * u; } },
  { pose: 'judge_carry', face: 'neutral', pen: 2, props: { clipboard: true }, anim: (P, F, t) => { F.look = [0.2 * Math.sin(t * 0.7), 0]; } },
  { name: 'walk', pose: 'judge_carry', face: 'happy', pen: 1, to: 4, props: { clipboard: true } },          // (from pen to pen, his clipboard held still)
];
export class ShowLineup {
  // ctx: { scene, centre (world), grade, newBird(plot, breed, kind, colour, pos, yaw, r), plots, allBirds, r, params }
  constructor(ctx) {
    const params = ctx.params || new URLSearchParams();
    this.ground = new ShowGround(ctx.scene, { x: ctx.centre.x, z: ctx.centre.z, deg: 45, grade: ctx.grade });
    const G = this.ground, I = SHOW, r = ctx.r || Math.random;
    G.sign(FR ? 'Concours avicole' : 'Poultry Show', 'Feather & Field');
    // the birds in their pens (a plot of their own, so the village's frame loop wakes them as any line-up's)
    const plot = this.plot = { kind: 'lineup', frame: G.group, birds: [], centre: G.world(0, 0, I.pens[0].front - 0.4) };
    I.pens.forEach((p, i) => {
      const [breed, kind, colour] = SHOW_BIRDS[i % SHOW_BIRDS.length];
      const b = ctx.newBird(plot, breed, kind, colour || null, [p.bird[0], 0, p.bird[2]], p.birdYaw, r);
      b.stay = true; b.root.position.y = p.bird[1]; plot.birds.push(b);
    });
    ctx.plots.push(plot); ctx.allBirds.push(...plot.birds);
    for (const [i, k] of SHOW_PINS) G.pin(i, k);
    G.clipboard(true);
    // the judge, and Arthur standing by (by the sign, watching)
    this.judge = new Farmer(G.group, 'j', ctx.grade, r);
    this.arthur = new Farmer(G.group, 'm', ctx.grade, r);
    this.arthur.pos.set(-1.75, 0, I.aisle[3] - 0.05); this.arthur.root.rotation.y = 0.55;
    this.fixed = params.get('pose'); this.penAt = params.has('pen') ? +params.get('pen') : null;
    this.t = 0; this.k = -1; this.held = null; this.POSES = POSES;          // (POSES: for tests trying a pose out)
    this.update(0);
    ShowLineup.on = this; if (typeof window !== 'undefined') window.__show = this;          // (main.js ticks it; tests reach it)
  }
  // which of the turn's poses (every 3.5 s, or the one asked for)
  step() { const n = TURN.length; return this.fixed ? Math.max(0, TURN.findIndex(s => (s.name || s.pose) === this.fixed)) : Math.floor(this.t / 3.5) % n; }
  update(dt) {
    this.t += dt;
    const G = this.ground, k = this.step(), S = TURN[k];
    if (S.pose === 'judge_pin' && this.held && !this.reached && this.t - this.since > 1) {           // (posed: his rosette's pin to the pen's)
      this.reached = G.reachPin(this.judge, this.penAt ?? S.pen); this.judge.root.updateMatrixWorld(true);
    }
    if (k !== this.k) {                                            // a new pose: where he stands, what he holds
      this.k = k; this.since = this.t; this.reached = 0;
      const i = this.penAt ?? S.pen, P = SHOW.pens[i];
      if (S.pose === 'judge_pin') { this.judge.pos.set(P.pinAt[0], 0, P.pinAt[1]); this.judge.root.rotation.y = P.pinYaw; }
      else { this.judge.pos.set(P.judge[0], 0, P.judge[1]); this.judge.root.rotation.y = S.pose === 'judge_look' ? P.judgeYaw : S.pose === 'clap' ? 0.25 : -0.35; }
      if (this.held) { this.held.removeFromParent(); this.held = null; }
      if (S.rosette) this.held = G.hold(this.judge, S.rosette);
      G.clipboard(!S.props.clipboard);
    }
    this.judge.want = { pose: S.pose, face: S.face, props: S.props, anim: S.anim };
    if (S.to !== undefined) {                                      // walking along the front of the pens, an easy amble
      const A = SHOW.pens[this.penAt ?? S.pen].judge, B = SHOW.pens[S.to].judge, u = Math.min(1, (this.t - this.since) / 3.2), e = u * u * (3 - 2 * u);
      const x = A[0] + (B[0] - A[0]) * e, moved = Math.abs(x - this.judge.pos.x);
      this.walkPh = (this.walkPh || 0) + moved / 0.85 * Math.PI * 2;
      this.judge.pos.set(x, 0, A[1]); this.judge.root.rotation.y = Math.sign(B[0] - A[0]) * Math.PI / 2;
      Object.assign(this.judge.want, { walk: dt > 0 ? Math.min(1, moved / dt / 0.9) : 0, phase: this.walkPh, keepArms: 'R' });
    }
    this.arthur.want = { pose: 'hips', face: 'happy', props: {}, anim: (P, F) => { F.look = [0.6, 0.1]; P.head[2] -= 14; } };
    if (dt > 0) { this.judge.update(dt); this.arthur.update(dt); }
    else { this.judge.update(1); this.arthur.update(1); }
  }
  // the view: the pens in the middle, the whole marquee across
  frameView(view) { const c = this.ground.world(0, 0, SHOW.pens[0].front + 0.1); view.target.set(c.x, 0, c.z); view.size = 2.6; }
}

ShowLineup.on = null;                          // (the test page's ?lineup=show, once made)
