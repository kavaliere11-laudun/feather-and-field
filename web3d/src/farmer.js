// The farmer in 3D (farmer.glb / farmer.json, made by stylized/export_farmer.py from the 2D game's own Blender model,
// character/farmer.py): both looks, 'm' (Arthur) and 'f' (Rosie): straw hat, checked shirt with rolled sleeves, denim
// dungarees, wellies. One skinned mesh each, every part rigid on its joint, so the farmer is one draw. Posed here from the
// same joint angles as the 2D game's sprites (farmer.py's POSES, in degrees), eased from one to the next; the face moves:
// eyelids (open, half shut, shut, blinking, slanted when cross or worried), eyes that look about, brows that rise and slant,
// one mouth shape at a time (smile, grin, talk, shout, worried, frown), cheeks that blush. The torch and the feed pail come
// out when wanted. The checked shirt is drawn per pixel (as the Blender material: bands both ways, darker where they cross).
import * as THREE from 'three';

let MODELS = {}, INFO = null;
export function initFarmer(gltf, json) {
  MODELS = {}; INFO = json;
  for (const child of gltf.scene.children) {
    let mesh = null; child.traverse(c => { if (c.isMesh && !mesh) mesh = c; });
    if (mesh) MODELS[child.name.replace('farmer_', '')] = mesh.geometry;
  }
}
// another look made the same way, in its own file (the show judge: judge.glb + judge.json, look 'j'), added after
// initFarmer; it then makes a FarmerRig or a Farmer like Arthur and Rosie, with the same poses and faces
export function addLook(gltf, json) {
  for (const child of gltf.scene.children) {
    let mesh = null; child.traverse(c => { if (c.isMesh && !mesh) mesh = c; });
    if (mesh) MODELS[child.name.replace('farmer_', '')] = mesh.geometry;
  }
  for (const k of ['joints', 'info', 'plaid', 'colours', 'stats']) INFO[k] = Object.assign(INFO[k] || {}, json[k]);
}
export const hasLook = (look) => !!MODELS[look];
const FR = typeof location !== 'undefined' && /[?&]lang=fr\b/.test(location.search);
export const FARMER_NAME = { m: ['Arthur', 'Arthur'], f: ['Rosie', 'Rose'], j: ['The judge', 'Le juge'] };
const DEG = Math.PI / 180;
const ease = (a, b, k) => a + (b - a) * k;

// ------------------------------------------------------------------ poses: farmer.py's POSES (degrees). shoulders (out to the side,
// - raise forwards, twist); elbow: bend forwards (negative); hips: (out, - leg forwards); knee: bend back (positive); chest and
// head: (roll, pitch forwards +, yaw); root_z: the hips lowered (m)
export const POSES = {
  stand: {},
  turn: { shL: [6, 0, 0], shR: [-6, 0, 0], elL: -8, elR: -8, hand: ['relax', 'relax'] },
  wave: { shL: [14, -4, 0], elL: -14, shR: [-128, -18, 0], elR: -28, wrR: [0, 0, 0], hand: ['relax', 'open'], chest: [-3, 0, 0], head: [-6, -2, 0] },
  telloff: { chest: [0, 10, 0], head: [0, 4, 0], shR: [-58, -28, 0], elR: [-108, 0, 0], wrR: [0, 0, 0], shL: [38, 18, 0], elL: [-70, -20, 0], hand: ['fist', 'point'], hipL: [0, -8, 0], hipR: [0, 10, 0], kneeR: 10 },
  worried: { head: [8, -4, 12], chest: [4, 4, 0], shL: [18, -55, 0], elL: -125, shR: [-18, -55, 0], elR: -125, hand: ['relax', 'relax'], wrL: [0, -20, 0], wrR: [0, -20, 0] },
  panic: { chest: [0, 18, -6], head: [0, -6, -4], shR: [-10, -75, 0], elR: -15, shL: [8, 40, 0], elL: -50, hand: ['fist', 'hold'], hipL: [0, -32, 0], kneeL: 14, hipR: [0, 26, 0], kneeR: 34, root_z: -0.01 },
  cuddle: { head: [-6, 10, 0], chest: [0, -4, 0], shL: [6, -50, 0], elL: [-45, -72, 0], shR: [-6, -50, 0], elR: [45, -72, 0], hand: ['relax', 'relax'], wrL: [0, 0, -20], wrR: [0, 0, 20] },
  pet: { root_z: -0.285, hipL: [10, -100, 0], hipR: [-10, -100, 0], kneeL: 150, kneeR: 150, ankleL: -50, ankleR: -50, chest: [0, 10, 0], head: [0, -4, 0], shR: [-10, -78, 0], elR: -14, wrR: [0, 6, 0], shL: [14, -30, 0], elL: -60, hand: ['relax', 'open'] },
  feed: { chest: [0, 4, 12], head: [0, 8, 14], shR: [-62, -40, 0], elR: -25, shL: [10, -12, 0], elL: -20, hand: ['hold', 'hold'] },      // (3D: the left hand round the pail's handle)
  // (3D only) hands on hips, looking at the hens; the torch held out in front; a big stretch in the morning
  hips: { shL: [38, 18, 0], elL: [-70, -20, 0], shR: [-38, 18, 0], elR: [70, -20, 0], hand: ['fist', 'fist'], chest: [0, -3, 0] },
  torch: { shR: [-8, -62, 0], elR: -18, wrR: [0, 10, 0], hand: ['relax', 'hold'] },
  stretch: { shL: [30, -150, 0], elL: -10, shR: [-30, -150, 0], elR: -10, chest: [0, -8, 0], head: [0, -12, 0], hand: ['open', 'open'] },
  carry: { shL: [10, -12, 0], elL: -20, shR: [-6, 0, 0], elR: -8, hand: ['hold', 'relax'] },          // (3D only) the pail carried, as when feeding
  // (3D only) a proper cuddle: crouched with both arms reaching down and forward to scoop a hen up; then standing with her
  // held against his chest, the left arm under her, the right hand on her back (farmlife.js: stroking, a gentle sway)
  scoop: { root_z: -0.27, hipL: [10, -96, 0], hipR: [-10, -96, 0], kneeL: 142, kneeR: 142, ankleL: -46, ankleR: -46, chest: [0, 24, 0], head: [0, -2, 0],
    shL: [10, -66, 0], elL: [-15, -22, 0], shR: [-10, -66, 0], elR: [15, -22, 0], hand: ['hold', 'hold'], wrL: [0, 10, 0], wrR: [0, 10, 0] },
  hold: { head: [-8, 14, 0], chest: [0, -5, 0], shL: [10, -42, 0], elL: [-55, -80, 0], wrL: [0, 0, -15], shR: [-4, -68, 0], elR: [40, -58, 0], wrR: [0, 18, 10], hand: ['relax', 'open'] },
  // (3D only) the show judge (showground.js; any look can take them): leaning in to peer into a show coop, hands clasped
  // behind his back; writing on his clipboard (held flat on his left forearm, the pencil in the right hand: props clipboard
  // and pencil); reaching out to pin a rosette on a coop's front (the rosette in his right hand: ShowGround.hold); clapping
  // the winners; his clipboard held up against his chest as he walks from coop to coop (props clipboard)
  judge_look: { chest: [0, 30, 0], head: [0, -22, 0], hipL: [0, -10, 0], hipR: [0, -10, 0], kneeL: 14, kneeR: 14, root_z: -0.015, shL: [16, 40, -70], elL: [0, -75, 0], shR: [-16, 40, 70], elR: [0, -75, 0], hand: ['relax', 'relax'] },
  judge_write: { head: [0, 14, 0], chest: [0, 6, 0], shL: [0, -15, -40], elL: [0, -100, 0], wrL: [0, 0, 90], shR: [-8, -35, 30], elR: [0, -90, 0], wrR: [0, 30, 0], hand: ['hold', 'hold'] },
  judge_pin: { chest: [0, 10, 0], head: [0, 4, 0], shR: [-6, -82, 0], elR: -10, wrR: [0, -8, 0], shL: [10, -4, 0], elL: -14, hand: ['relax', 'hold'], hipR: [0, -14, 0], kneeR: 8 },
  clap: { head: [0, -8, 0], chest: [0, -3, 0], shL: [-8, -44, -30], elL: [0, -80, 0], shR: [8, -44, 30], elR: [0, -80, 0], hand: ['open', 'open'] },
  judge_carry: { shL: [0, -15, -40], elL: [0, -100, 0], wrL: [-90, 0, 90], hand: ['hold', 'relax'] },
};
// faces (farmer.py's FACE): the upper and lower lids' edges (-1..1 of the eye's height), the lids slanted (degrees), where the
// eyes look, the brows' slant (+ worried, - cross) and height, the mouth, the blush
export const FACES = {
  neutral: { up: 0.75, lo: -0.8, look: [0, 0], brow: 0, browH: 0.2, mouth: 'smile', blush: 0.35 },
  happy: { up: 0.95, lo: -0.4, look: [0, 0.05], brow: -0.05, browH: 0.5, mouth: 'grin', blush: 0.6 },
  stern: { up: 0.55, lo: -0.62, tilt: 18, brow: -0.75, browH: -0.1, mouth: 'talk', blush: 0.3 },
  worried: { up: 0.82, lo: -0.75, tilt: -14, look: [-0.55, 0], brow: 0.75, browH: 0.35, mouth: 'wavy', blush: 0.2 },
  panic: { up: 1.0, lo: -1.0, brow: 0.6, browH: 0.95, mouth: 'o', blush: 0 },
  cuddle: { up: -0.2, lo: -0.25, brow: 0.1, browH: 0.45, mouth: 'smile', blush: 1.0 },
  feeding: { up: 0.9, lo: -0.45, look: [0.35, -0.2], brow: 0, browH: 0.4, mouth: 'grin', blush: 0.5 },
  // (3D only) the judge weighing a bird up: eyes narrowed, brows down a little, lips pressed
  peer: { up: 0.5, lo: -0.55, look: [0, -0.15], brow: -0.3, browH: 0.05, mouth: 'smile', blush: 0.3 },
};
const HANDS = { relax: [25, 18, 20, 4], open: [5, 0, 20, 14], point: [95, 0, 20, 4], fist: [105, 110, 40, 4], hold: [85, 85, 40, 4] };      // knuckles, index, thumb, spread
const MOUTHS = ['smile', 'grin', 'talk', 'o', 'wavy', 'frown'];

// a whole pose from one of POSES (every joint given; the elbows' and knees' single angles as farmer.py reads them; the ankles
// follow the legs unless given)
export function fullPose(p = {}) {
  const v3 = (v, d) => v === undefined ? d.slice() : typeof v === 'number' ? [0, v, 0] : v.slice();
  const o = {
    shL: v3(p.shL, [6, 0, 0]), shR: v3(p.shR, [-6, 0, 0]), elL: v3(p.elL, [0, -6, 0]), elR: v3(p.elR, [0, -6, 0]),
    wrL: v3(p.wrL, [0, 0, 0]), wrR: v3(p.wrR, [0, 0, 0]), hipL: v3(p.hipL, [0, 0, 0]), hipR: v3(p.hipR, [0, 0, 0]),
    kneeL: p.kneeL || 0, kneeR: p.kneeR || 0, chest: v3(p.chest, [0, 0, 0]), head: v3(p.head, [0, 0, 0]), rootZ: p.root_z || 0,
    handL: HANDS[(p.hand || ['relax', 'relax'])[0]].slice(), handR: HANDS[(p.hand || ['relax', 'relax'])[1]].slice(),
  };
  o.ankleL = p.ankleL !== undefined ? p.ankleL : -o.kneeL - o.hipL[1] * 0.6;
  o.ankleR = p.ankleR !== undefined ? p.ankleR : -o.kneeR - o.hipR[1] * 0.6;
  return o;
}
function lerpPose(a, b, k) {
  for (const key in b) {
    if (Array.isArray(b[key])) for (let i = 0; i < b[key].length; i++) a[key][i] = ease(a[key][i], b[key][i], k);
    else a[key] = ease(a[key], b[key], k);
  }
  return a;
}
export function fullFace(f = {}) {
  const o = Object.assign({ up: 0.75, lo: -0.8, tilt: 0, look: [0, 0], brow: 0, browH: 0.2, mouth: 'smile', blush: 0.35 }, f);
  o.look = o.look.slice(); return o;
}

// ------------------------------------------------------------------ the material: vertex colours, the checked shirt per pixel, the blush
function farmerMaterial(look, grade) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.66, metalness: 0 });
  const P = INFO.plaid[look].map(h => new THREE.Color(h)), blush = { value: 0.35 };
  m.userData.blush = blush;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.plaidA = { value: P[0] }; sh.uniforms.plaidB = { value: P[1] }; sh.uniforms.plaidC = { value: P[2] };
    sh.uniforms.blushCol = { value: new THREE.Color(INFO.colours[look].blush) }; sh.uniforms.blushAmt = blush;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 _cloth; attribute float _cmode; attribute float _blush;\nvarying vec3 vCloth; varying float vCMode; varying float vBlush;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCloth = _cloth; vCMode = _cmode; vBlush = _blush;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 plaidA; uniform vec3 plaidB; uniform vec3 plaidC; uniform vec3 blushCol; uniform float blushAmt;\nvarying vec3 vCloth; varying float vCMode; varying float vBlush;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vCMode > 0.5) {          // the checked shirt: coloured bands both ways (sin > 0.35), darker where they cross
          vec2 q = (vCMode < 1.5 ? vCloth.yz : vCloth.xz) * 135.0;
          vec2 s = sin(q), w = max(fwidth(s), vec2(1e-3));
          vec2 st = clamp((s - 0.35) / w + 0.5, 0.0, 1.0);
          float h = (st.x + st.y) * 0.5;
          vec3 c = mix(plaidA, plaidB, clamp(h * 2.0, 0.0, 1.0));
          diffuseColor.rgb = mix(c, plaidC, clamp(h * 2.0 - 1.0, 0.0, 1.0));
        }
        diffuseColor.rgb = mix(diffuseColor.rgb, blushCol, clamp(vBlush * blushAmt, 0.0, 1.0) * 0.75);`);
  };
  m.customProgramCacheKey = () => 'farmer';
  if (grade) grade(m);
  return m;
}

// ------------------------------------------------------------------ one farmer's body and face, posed from a pose and a face
const _e = new THREE.Euler(), _q = new THREE.Quaternion();
export class FarmerRig {
  constructor(look, grade) {
    this.look = look;
    const J = INFO.joints[look], B = {}, list = [];
    this.rest = {};
    for (const j of J) {
      const b = new THREE.Bone(); b.name = j.name; b.position.fromArray(j.pos); b.quaternion.fromArray(j.quat); b.scale.fromArray(j.scale);
      B[j.name] = b; list.push(b); if (j.parent) B[j.parent].add(b);
      this.rest[j.name] = { p: b.position.clone(), q: b.quaternion.clone(), s: b.scale.clone() };
    }
    this.mesh = new THREE.SkinnedMesh(MODELS[look], farmerMaterial(look, grade));
    this.mesh.add(B.root); B.root.updateMatrixWorld(true); this.mesh.bind(new THREE.Skeleton(list));
    this.mesh.frustumCulled = false; this.mesh.castShadow = true;
    // (three.js refreshes a skin once a frame, but counts a shadow redraw as that frame's refresh, so the picture just after
    // a shadow redraw would show last frame's pose, a step behind his torch's glow: refreshed here right before each draw)
    this.mesh.onBeforeRender = () => this.mesh.skeleton.update();
    // the pail came out of the 2D model standing on the ground at the farmer's feet: hung from the left hand here instead, its
    // handle's top in the hand (the pail is built round its bottom's middle, the handle 0.21 m up; the hand reaches 0.08 m
    // below the wrist)
    if (B.pail) { B.pail.position.set(0.012, -0.3, 0); this.rest.pail.p.copy(B.pail.position); }
    this.B = B; this.blush = this.mesh.material.userData.blush;
    this.eyeR = INFO.info[look].eyes.L.r; this.gazeUp = 0.55;
  }
  // a joint turned to farmer.py's angles (degrees: about the farmer's forward, left and up axes), from its rest
  turn(name, a) { _e.set(a[1] * DEG, a[2] * DEG, a[0] * DEG, 'YXZ'); this.B[name].quaternion.copy(this.rest[name].q).multiply(_q.setFromEuler(_e)); }
  hand(side, h) {
    const s = side === 'L' ? 1 : -1, B = this.B;
    _e.set(0, 0, -s * h[0] * DEG, 'YXZ'); B['knuckle' + side].quaternion.setFromEuler(_e);
    _e.set(-h[3] * DEG, 0, -s * h[1] * DEG, 'YXZ'); B['idx' + side].quaternion.setFromEuler(_e);
    _e.set(-50 * DEG, 0, -s * h[2] * DEG, 'YXZ'); B['thumb' + side].quaternion.setFromEuler(_e);
  }
  // P: a whole pose (fullPose), F: a face (fullFace), with blink 0..1 and props { torch, pail }
  pose(P, F, blink = 0, props = {}) {
    const B = this.B, R = this.rest;
    for (const k of ['shL', 'shR', 'elL', 'elR', 'wrL', 'wrR', 'hipL', 'hipR', 'chest', 'head']) this.turn(this.jointOf(k), P[k]);
    this.turn('kneeL', [0, P.kneeL, 0]); this.turn('kneeR', [0, P.kneeR, 0]);
    this.turn('ankleL', [0, P.ankleL, 0]); this.turn('ankleR', [0, P.ankleR, 0]);
    B.pelvis.position.copy(R.pelvis.p); B.pelvis.position.y += P.rootZ;
    this.hand('L', P.handL); this.hand('R', P.handR);
    // ---- the face: lids turned open or shut about the eye's side axis (and slanted), the eyes turned to look, brows, mouth
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const up = Math.max(-1, Math.min(1, ease(F.up + (F.up > 0.3 ? 0.08 : 0), -1.05, blink))), lo = Math.max(-1, Math.min(1, F.lo));          // (a touch more open: they look up at us)
      const a = Math.asin(Math.max(-1, Math.min(1, up))) - (up < -1 ? 0.2 : 0);
      _e.set((F.tilt || 0) * s * DEG, 0, a, 'XYZ'); B['lid' + side].quaternion.copy(R['lid' + side].q).multiply(_q.setFromEuler(_e));
      _e.set(0, 0, Math.asin(lo), 'XYZ'); B['lidlo' + side].quaternion.copy(R['lidlo' + side].q).multiply(_q.setFromEuler(_e));
      _e.set(0, Math.atan(0.5 * F.look[0]) * s, Math.atan(0.5 * (F.look[1] + this.gazeUp)), 'YXZ');          // (+ a little up: the game looks down at them)
      B['eye' + side].quaternion.copy(R['eye' + side].q).multiply(_q.setFromEuler(_e));
      B['eye' + side].scale.setScalar(1 - 0.22 * Math.min(1, Math.max(0, (0.25 - up) / 0.5)));        // (shut: the shine and the iris sink behind the lid)
      const br = B['brow' + side];
      br.position.copy(R['brow' + side].p).add(new THREE.Vector3(0, this.eyeR * 0.5 * (F.browH - 0.2), 0).applyQuaternion(R['brow' + side].q));
      _e.set(-F.brow * 26 * s * DEG, 0, 0, 'XYZ'); br.quaternion.copy(R['brow' + side].q).multiply(_q.setFromEuler(_e));
    }
    for (const m of MOUTHS) { const b = B['mouth_' + m]; if (b) b.scale.setScalar(m === F.mouth ? 1 : 1e-4); }
    this.blush.value = F.blush;
    B.torch.scale.setScalar(props.torch ? 1 : 1e-4); B.pail.scale.setScalar(props.pail ? 1 : 1e-4);
    if (B.clipboard) { B.clipboard.scale.setScalar(props.clipboard ? 1 : 1e-4); B.pencil.scale.setScalar(props.pencil ? 1 : 1e-4); }     // (the judge's)
    // the hat pushed back on the head, so the face shows from up where the game looks down (the 2D game's map does the same)
    const ht = (typeof window !== 'undefined' && window.__HAT) || {};
    this.turn('hat', [0, ht.tilt ?? -20, 0]); B.hat.position.copy(R.hat.p).add(new THREE.Vector3(0, ht.up ?? 0.01, ht.back ?? -0.02));
  }
  jointOf(k) { return { shL: 'shoulderL', shR: 'shoulderR', elL: 'elbowL', elR: 'elbowR', wrL: 'wristL', wrR: 'wristR', hipL: 'hipL', hipR: 'hipR', chest: 'chest', head: 'head' }[k]; }
}

// ------------------------------------------------------------------ one farmer standing about and doing things (for the line-up now;
// the farm's own farmer comes next): the pose eased towards what's wanted, a walk or a run on top, blinking, looking about,
// talking
export class Farmer {
  constructor(parent, look, grade, r = Math.random) {
    this.r = r; this.look = look;
    this.root = new THREE.Group(); parent.add(this.root);
    this.rig = new FarmerRig(look, grade); this.root.add(this.rig.mesh);
    this.P = fullPose(POSES.turn); this.F = fullFace(); this.t = r() * 10; this.blinkIn = 1 + r() * 3; this.blinkT = 0;
    this.want = { pose: 'turn', face: 'neutral', walk: 0, run: 0, talk: 0, props: {} };
    this.label = FARMER_NAME[look][FR ? 1 : 0];
    this.hitR = 0.35; this.hitY = 0.7; this.tagY = 1.6;
    const m = this.rig.mesh.material; m.transparent = true; this.opacity = 1;          // (fading in and out at the farmhouse door)
  }
  fade(o) { this.opacity = o; this.rig.mesh.material.opacity = o; this.rig.mesh.visible = o > 0.01; this.rig.mesh.castShadow = o > 0.5; }
  get pos() { return this.root.position; }
  update(dt) {
    const W = this.want, t = (this.t += dt);
    const target = fullPose(POSES[W.pose] || {}), face = fullFace(FACES[W.face] || {});
    // a walk (or a run): legs swinging from the hips, knees bending as each comes through, arms swinging against them, a bob
    const g = W.walk || 0, rn = W.run || 0, ph = W.phase !== undefined ? W.phase : t * (W.run ? 11 : 6.6);      // (phase: from how far he's really gone)
    if (g > 0) {
      const sw = (24 + 16 * rn) * g, s = Math.sin(ph), c = Math.cos(ph);
      target.hipL[1] += -sw * s; target.hipR[1] += sw * s;
      target.kneeL += (8 + (30 + 30 * rn) * Math.max(0, -c)) * g; target.kneeR += (8 + (30 + 30 * rn) * Math.max(0, c)) * g;
      target.ankleL = -target.kneeL - target.hipL[1] * 0.6; target.ankleR = -target.kneeR - target.hipR[1] * 0.6;
      if (!W.keepArms) { target.shL[1] += (20 + 25 * rn) * s * g; target.shR[1] += -(20 + 25 * rn) * s * g; target.elL[1] -= (10 + 40 * rn) * g; target.elR[1] -= (10 + 40 * rn) * g; }
      else if (W.keepArms === 'L') { target.shL[1] += (20 + 25 * rn) * s * g; target.elL[1] -= (10 + 40 * rn) * g; }          // (the torch held steady in the right hand)
      else if (W.keepArms === 'R') { target.shR[1] += -(20 + 25 * rn) * s * g; target.elR[1] -= (10 + 40 * rn) * g; }        // (the pail held steady in the left)
      target.chest[2] += 5 * s * g; target.chest[1] += 6 * rn; target.rootZ += -0.012 * g * Math.abs(c) - 0.03 * rn;
    }
    if (W.anim) W.anim(target, face, t);
    const k = Math.min(1, dt * (g > 0 ? 14 : 6));
    lerpPose(this.P, target, k);
    for (const key of ['up', 'lo', 'tilt', 'brow', 'browH', 'blush']) this.F[key] = ease(this.F[key], face[key], Math.min(1, dt * 9));
    this.F.look[0] = ease(this.F.look[0], face.look[0], Math.min(1, dt * 6)); this.F.look[1] = ease(this.F.look[1], face.look[1], Math.min(1, dt * 6));
    this.F.mouth = face.mouth;
    if ((this.blinkIn -= dt) <= 0) { this.blinkT = typeof window !== 'undefined' && window.__noBlink ? 0 : 0.18; this.blinkIn = 2 + this.r() * 3.5; }
    const blink = this.blinkT > 0 ? Math.sin(Math.PI * (1 - (this.blinkT -= dt) / 0.18)) : 0;
    this.rig.pose(this.P, this.F, W.face === 'cuddle' ? 0 : blink, W.props || {});
  }
}

// ------------------------------------------------------------------ ?lineup=farmer: Arthur and Rosie side by side, in the moods the 2D
// game shows. &set=1 (the default): looking about, waving hello, telling off, worried; &set=2: walking, the torch at night,
// feeding, a cuddle; &set=3: their faces close, going through every expression
const LINE = {
  look: { pose: 'turn', face: 'neutral', anim: (P, F, t) => { const u = t % 6; F.look = [u < 2 ? 0.8 : u < 4 ? -0.6 : 0, u > 4 ? 0.4 : 0]; P.head[2] += u < 2 ? 14 : u < 4 ? -12 : 0; } },
  wave: { pose: 'wave', face: 'happy', anim: (P, F, t) => { P.shR[0] += 10 * Math.sin(t * 7); P.wrR[0] += 18 * Math.sin(t * 7 + 0.6); P.head[0] += 4 * Math.sin(t * 2); } },
  telloff: { pose: 'telloff', face: 'stern', anim: (P, F, t) => { P.wrR[0] += 25 * Math.sin(t * 9); P.elR[0] += 10 * Math.sin(t * 9); F.mouth = Math.sin(t * 13) > 0 ? 'talk' : 'frown'; P.head[0] += 3 * Math.sin(t * 4.5); } },
  worried: { pose: 'worried', face: 'worried', anim: (P, F, t) => { P.head[2] += 10 * Math.sin(t * 2.2); P.chest[2] += 4 * Math.sin(t * 2.2); } },
  walk: { pose: 'turn', face: 'happy', walk: 1 },
  torch: { pose: 'panic', face: 'panic', walk: 1, run: 1, keepArms: true, props: { torch: true }, anim: (P, F, t) => { P.shL[1] += 30 * Math.sin(t * 11); } },
  feed: { pose: 'feed', face: 'feeding', props: { pail: true }, anim: (P, F, t) => { const u = (t * 1.1) % 1; P.shR[1] += -30 * Math.sin(u * Math.PI); P.elR[1] += 20 * Math.sin(u * Math.PI); P.wrR[1] += -30 * Math.sin(u * Math.PI); } },
  pet: { pose: 'pet', face: 'cuddle', anim: (P, F, t) => { P.shR[1] += 8 * Math.sin(t * 3); P.elR[1] += 10 * Math.sin(t * 3 + 1); P.head[0] += 5 * Math.sin(t * 1.5); } },
};
const FACE_CYCLE = ['neutral', 'happy', 'stern', 'worried', 'panic', 'cuddle', 'feeding'];
export class FarmerLineup {
  constructor(scene, centre, yaw, grade, r, set = 1) {
    this.group = new THREE.Group(); this.group.position.copy(centre); this.group.rotation.y = yaw; scene.add(this.group);
    this.set = set; this.farmers = [];
    const rows = set === 2 ? ['walk', 'torch', 'feed', 'pet'] : set === 3 ? ['face'] : ['look', 'wave', 'telloff', 'worried'];
    rows.forEach((row, i) => {
      for (const [look, x] of [['m', -0.62], ['f', 0.62]]) {
        const f = new Farmer(this.group, look, grade, r);
        f.pos.set(x * (set === 3 ? 0.36 : 1), 0, (set === 3 ? 0 : -3.6 + i * 2.4)); f.root.rotation.y = -0.3; f.row = row;
        this.farmers.push(f);
      }
    });
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    for (const f of this.farmers) {
      if (f.row === 'face') { const k = Math.floor(this.t / 3) % FACE_CYCLE.length; f.want = { pose: 'turn', face: FACE_CYCLE[k], props: {}, anim: (P, F, t) => { if (FACE_CYCLE[k] === 'stern') F.mouth = Math.sin(t * 13) > 0 ? 'talk' : 'frown'; } }; }
      else f.want = Object.assign({ props: {} }, LINE[f.row]);
      f.update(dt);
    }
  }
  get geese() { return this.farmers; }
}
