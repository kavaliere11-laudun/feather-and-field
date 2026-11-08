// The art style mocks (8 Nov 2026, Audrey: "I think our current art style is trying to be too realistic and potentially
// causing some performance issues (low frames when panning around the map) I want a stylised art style but still high
// quality and polished. Smooth frame rates while scrolling around"). Only with ?look=NAME; without it the game's look is
// exactly as before.
//   toon: "Storybook": light in soft bands (lit, half-lit, shade) with crisp shadows, clean warm colours a touch richer, a
//         warm rim on rounded things, the lawn painted in soft blobs of three greens with a few chunky tufts, no blades
//   clay: "Soft diorama": gentle light wrapping round (no hard dark sides), softer creamy colours, lifted shadows, a smooth
//         lawn with wide soft patches and no tufts, a tilt-shift blur along the screen's top and bottom (a model village)
//   paint: "Watercolour": a picture book's washes: lighter, softer colours on textured paper, the lawn brushed in strokes,
//          soft sepia lines
// Each: the lawn's thousands of grass blades gone (the farm's biggest cost to draw, about a quarter of its triangles and
// most of its draws), so it pans more smoothly.
export const LOOKS = {
  toon: { spec: 0.12, ramp: 'bands', shadow: 'crisp', sat: 1.04, contrast: 1.06, warm: [1.04, 1.0, 0.93], lift: [0.006, 0.008, 0.024], rim: 0.4, ground: 'painted', grass: 'clumps', wild: 0.5, sun: 1.0, hemi: 1.0, ink: [0.85, 0.02, 0], inkW: 1.5 },
  clay: { spec: 0.2, ramp: 'wrap', shadow: 'soft', sat: 0.97, contrast: 0.93, warm: [1.05, 1.0, 0.95], lift: [0.03, 0.026, 0.03], rim: 0.0, ground: 'smooth', grass: 'none', wild: 0.35, sun: 0.86, hemi: 1.05, tilt: true, ink: [0.22, 0.02, 0], inkW: 3.0 },
  paint: { spec: 0.08, ramp: 'bands', shadow: 'soft', sat: 0.9, contrast: 0.88, warm: [1.03, 1.0, 0.93], lift: [0.05, 0.046, 0.034], rim: 0.15, ground: 'brushed', grass: 'clumps', wild: 0.5, sun: 1.0, hemi: 1.0, paper: true, ink: [0.6, 0.02, 0], inkW: 1.4 },
};
const f = n => (Math.round(n * 1000) / 1000).toFixed(3);
const v3 = a => `vec3(${a.map(f).join(', ')})`;
// the shaders' light changed for every material at once (three's own pieces of shader, before anything is drawn)
export function lookChunks(THREE, L) {
  const C = THREE.ShaderChunk;
  const ramp = L.ramp === 'bands'
    ? 'return smoothstep(-0.02, 0.07, d) * 0.4 + smoothstep(0.28, 0.42, d) * 0.34;'      // (three bands, soft-edged; the lit one as bright as the lawn under the midday sun was)
    : 'return clamp((d + 0.5) / 1.5, 0.0, 1.0) * 0.86;';                                         // (wrapped round: no hard dark side)
  const shadow = L.shadow === 'crisp' ? 'return smoothstep(0.32, 0.62, s);' : 'return s;';
  C.common += `
float lookRamp(float d) { ${ramp} }
float lookShadow(float s) { ${shadow} }
vec3 lookGrade(vec3 c, vec3 n, vec3 v) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, ${f(L.sat)});
  c = max((c - 0.2) * ${f(L.contrast)} + 0.2, 0.0);
  c = c * ${v3(L.warm)} + ${v3(L.lift)};
  float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0) * ${f(L.rim)};
  return c + rim * l * vec3(1.0, 0.86, 0.62);
}
`;
  const dot = 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );';
  for (const k of ['lights_physical_pars_fragment', 'lights_lambert_pars_fragment', 'lights_phong_pars_fragment']) {
    if (!C[k].includes(dot)) throw new Error('look: ' + k);
    C[k] = C[k].replace(dot, 'float dotNL = lookRamp( dot( geometryNormal, directLight.direction ) );');
  }
  C.lights_physical_pars_fragment = C.lights_physical_pars_fragment.replace('reflectedLight.directSpecular += irradiance * BRDF_GGX(', `reflectedLight.directSpecular += ${f(L.spec)} * irradiance * BRDF_GGX(`);
  const sh = 'directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;';
  if (!C.lights_fragment_begin.includes(sh)) throw new Error('look: shadows');
  C.lights_fragment_begin = C.lights_fragment_begin.replace(sh, sh.replace('? getShadow(', '? lookShadow( getShadow(').replace(') : 1.0;', ') ) : 1.0;'));
  C.opaque_fragment = C.opaque_fragment.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', `#ifdef RE_Direct
outgoingLight = lookGrade( outgoingLight, normal, geometryViewDir );
#else
outgoingLight = lookGrade( outgoingLight, vec3( 0.0, 0.0, 1.0 ), vec3( 0.0, 0.0, 1.0 ) );
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`);
}
// the lawn's shader: in place of the fine grass texture and the gentle patches
export function lookGround(L) {
  if (L.ground === 'painted') return `{
  float gd = texture2D(grassDetail, vGW * 0.62).r * 0.6 + texture2D(grassDetail, vGW * 0.23 + 0.37).r * 0.4;
  diffuseColor.rgb *= 0.96 + 0.08 * gd;
  float n1 = sin(vGW.x * 0.21 + sin(vGW.y * 0.17) * 1.7) * sin(vGW.y * 0.19 + sin(vGW.x * 0.13) * 1.9);
  float n2 = sin(vGW.x * 0.63 + vGW.y * 0.41 + sin(vGW.y * 0.5) * 2.0) * sin(vGW.y * 0.57 - vGW.x * 0.29);
  float n3 = sin(vGW.x * 1.7 + sin(vGW.y * 1.3) * 1.2) * sin(vGW.y * 1.9 + sin(vGW.x * 1.1));
  float t = n1 * 0.62 + n2 * 0.28 + n3 * 0.1;
  float n4 = sin(vGW.x * 1.1 + sin(vGW.y * 0.9) * 1.4) * sin(vGW.y * 1.25 - sin(vGW.x * 0.8) * 1.3);
  t = t * 0.75 + n4 * 0.25;
  float a = smoothstep(-0.26, -0.2, t), b = smoothstep(0.2, 0.26, t);
  diffuseColor.rgb *= mix(mix(vec3(0.8, 0.9, 0.78), vec3(0.97, 1.0, 0.95), a), vec3(1.12, 1.1, 0.8), b);
}`;
  if (L.ground === 'brushed') return `{
  float n1 = sin(vGW.x * 0.21 + sin(vGW.y * 0.17) * 1.7) * sin(vGW.y * 0.19 + sin(vGW.x * 0.13) * 1.9);
  float n2 = sin(vGW.x * 0.63 + vGW.y * 0.41 + sin(vGW.y * 0.5) * 2.0) * sin(vGW.y * 0.57 - vGW.x * 0.29);
  float t = n1 * 0.7 + n2 * 0.3;
  vec2 q = vec2(vGW.x * 0.8 + vGW.y * 0.6, vGW.y * 0.8 - vGW.x * 0.6);
  float stroke = texture2D(grassDetail, vec2(q.x * 0.9, q.y * 0.18)).r;
  float s2 = texture2D(grassDetail, vec2(q.y * 0.7 + 0.3, q.x * 0.15)).r;
  float a = smoothstep(-0.32, -0.18, t + (stroke - 0.5) * 0.35), b = smoothstep(0.18, 0.34, t + (s2 - 0.5) * 0.35);
  diffuseColor.rgb *= mix(mix(vec3(0.84, 0.93, 0.8), vec3(1.0, 1.0, 0.96), a), vec3(1.12, 1.08, 0.84), b);
  diffuseColor.rgb *= 0.93 + 0.14 * stroke;
}`;
  return `{
  float n1 = sin(vGW.x * 0.13 + sin(vGW.y * 0.11) * 1.7) * sin(vGW.y * 0.12 + sin(vGW.x * 0.09) * 1.9);
  float t = smoothstep(-0.9, 0.9, n1);
  diffuseColor.rgb *= mix(vec3(0.95, 0.99, 0.94), vec3(1.05, 1.04, 0.95), t);
}`;
}
// a chunky tuft for the painted lawn: five broad blades with rounded tips, deeper at their roots
export function clumpGeo(THREE, rng) {
  const r = rng(911), pos = [], col = [], nrm = [], c0 = new THREE.Color(), c1 = new THREE.Color(), c = new THREE.Color();
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + r() * 0.6, d = 0.012 + r() * 0.02, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const h = 0.07 + r() * 0.05, w = 0.018 + r() * 0.008, lean = 0.025 + r() * 0.02, face = a + Math.PI / 2;
    const px = Math.cos(face) * w, pz = Math.sin(face) * w, tx = x + Math.cos(a) * lean, tz = z + Math.sin(a) * lean;
    // (a blade: its base, two sides narrowing, a rounded tip: four triangles)
    const P = [[x - px, 0, z - pz], [x + px, 0, z + pz], [x + Math.cos(a) * lean * 0.5 + px * 0.8, h * 0.6, z + Math.sin(a) * lean * 0.5 + pz * 0.8], [x + Math.cos(a) * lean * 0.5 - px * 0.8, h * 0.6, z + Math.sin(a) * lean * 0.5 - pz * 0.8], [tx, h, tz]];
    const tri = [[0, 1, 2], [0, 2, 3], [3, 2, 4]];
    c0.setRGB(0.44, 0.64, 0.22, THREE.SRGBColorSpace); c1.setRGB(0.66, 0.86, 0.34, THREE.SRGBColorSpace);      // (the roots near the lawn's own green: tufts, not specks)
    for (const t of tri) for (const k of t) { pos.push(...P[k]); c.copy(c0).lerp(c1, P[k][1] / h); col.push(c.r, c.g, c.b); nrm.push(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.normalizeNormals(); g.computeBoundingSphere();
  return g;
}
