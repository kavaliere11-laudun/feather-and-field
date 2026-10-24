// The game's welcome picture (main.js ?poster): node posterpic.mjs OUT  (W, H: css px; DSF; EL, AZ, DIST, FOV, AT=x,y,z: the camera; T: seconds of posing)
// Made with: AT=1.05,0.75,0.1 DIST=9.8 FOV=28.5 W=1100 H=500 DSF=5 ./withserver.sh node posterpic.mjs /tmp/p  (5500x2500: the scene
// with grass to spare all round, more on the right for the card sideways; shrunk to 3300x1500 for smooth edges and saved as
// welcome.jpg, quality 86, full colour; gameui.js HERO: its size and the part that must always show)
// The app icon: AT=0.58,0.98,-1.25 EL=12 AZ=-75 DIST=1.75 FOV=26 W=320 H=320 DSF=4 (the rooster crowing), shrunk to 512, 192, 180
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const out = process.argv[2] || '/tmp/claude-0/farmer/poster/p';
const W = +(process.env.W || 402), H = +(process.env.H || 432);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DSF || 2) });
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' / ')));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&poster&coops=0&time=10:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #replaybtn, #farmerbtn, #foxbtn, #tag, .vignette { display: none !important; }' });
const o = { el: +(process.env.EL || 26), az: +(process.env.AZ || 0), dist: +(process.env.DIST || 9), fov: +(process.env.FOV || 24), aspect: W / H, at: (process.env.AT || '0.15,0.4,0.05').split(',').map(Number) };
await p.evaluate(([o, T]) => { const f = window.__farm; f.pause(true); if (window.__TOSS) f.poster().toss = window.__TOSS; for (let i = 0; i < T * 30; i++) f.step(1 / 30, 1); f.posterShot(o); }, [o, +(process.env.T || 3)]);
await p.screenshot({ path: out + '.png' });
console.log('errors', errs);
await b.close();
