// The tablet QA's eyes in the page (28 Nov 2026, Audrey: "creates a new persona (or more if you think it's needed) that
// plays on tablet and do an end to end QA, look for messages broken, out of the screen, not displaying properly, or low
// quality content"): put in by playthrough.mjs (QA=1) before the game loads. Whenever the game's cards, buttons or words
// change (a card opens, a word comes up, a screen like grooming or fishing appears), a moment later it looks at everything
// in sight and notes what's wrong, once per kind of thing:
//   - off the screen: a card, a button, a word or a picture partly outside the window
//   - words cut: wider than their box, squashed in it, or under something else
//   - words not ready: a word's key (shop_tab_x), a {placeholder}, undefined or NaN shown
//   - blurry: a picture drawn bigger than it has pixels for on a tablet's sharp screen (2 pixels a point), by 1.35 or more
// window.__qa: [{ at, kind, where, what }] for playthrough.mjs to read, write down and take a picture of.
(() => {
  const DPR = 2, seen = new Set(), sizes = new Map();
  window.__qa = []; window.__qaNew = 0;
  const vis = e => { if (!e || !e.getClientRects().length) return false; const c = getComputedStyle(e); if (c.visibility === 'hidden' || c.display === 'none' || +c.opacity < 0.05) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const words = e => (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50);
  const where = () => { const s = document.querySelector('.gsheet:not([hidden])'), f = window.__farm, u = f && f.gameUI && f.gameUI(); if (s && u) return 'card ' + (u.kind || '?'); if (document.querySelector('.groom')) return 'grooming'; if (document.body.classList.contains('fishing')) return 'fishing'; if (document.querySelector('#loading')) return 'loading'; return 'farm'; };
  let how = 'timer';
  const add = (kind, what, key) => { const k = kind + '|' + (key || what); if (seen.has(k)) return; seen.add(k); window.__qa.push({ at: window.__T || Date.now(), kind, where: where(), what, how }); window.__qaNew++; };
  const natural = url => { if (sizes.has(url)) return sizes.get(url); sizes.set(url, null); const im = new Image(); im.onload = () => { sizes.set(url, [im.naturalWidth, im.naturalHeight]); later(); }; im.src = url; return null; };
  const look = () => {
    const W = innerWidth, H = innerHeight, here = where();
    // ---- what's in sight: the open card, the game's own buttons and words over the farm, grooming, fishing
    const roots = [...document.querySelectorAll('.gsheet:not([hidden]), .gbar, .gacts, #hint.on, .gpill, .gguide:not([hidden]), .groom, .fishrow, .fishbar, #moment, #sideways, .gmove, #compass, #farmerbtn, #replaybtn, #henbtns, .gstory, #loading')].filter(vis);      // (the story and the loading screen too: 28 Nov 2026, the story's pictures drawn 2.1 times their size on an iPad)
    for (const R of roots) {
      const rr = R.getBoundingClientRect();
      if (rr.left < -1 || rr.top < -1 || rr.right > W + 1 || rr.bottom > H + 1) add('off the screen', (R.id || R.className.split(' ')[0]) + ' ' + [rr.left, rr.top, rr.right, rr.bottom].map(Math.round).join(','), here + R.className);
      const leaves = [...R.querySelectorAll('*'), R].filter(e => vis(e) && !e.closest('svg') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
      const scroller = R.querySelector('.gsheet-body');
      for (const e of leaves) {
        const r = e.getBoundingClientRect(), cs = getComputedStyle(e), t = words(e);
        // (in a card's scrolling part, out of sight is fine: further down, it scrolls)
        const sb = scroller && scroller.contains(e) ? scroller.getBoundingClientRect() : null, inView = !sb || (r.bottom > sb.top + 2 && r.top < sb.bottom - 2);
        const vt = sb ? Math.max(r.top, sb.top) : r.top, vb = sb ? Math.min(r.bottom, sb.bottom) : r.bottom;      // (what's seen of it: a card's scrolling part cuts it off at its edge)
        if (inView && (r.left < -1 || r.right > W + 1 || vt < -1 || vb > H + 1)) add('off the screen', t, here + t);
        if (inView && (r.left < rr.left - 2 || r.right > rr.right + 2) && R.classList.contains('gsheet')) add('cut at the side', t, here + t);
        if (e.scrollWidth > e.clientWidth + 2 && cs.overflowX !== 'visible' && e.clientWidth > 0 && cs.display !== 'inline') add('words cut in their box', t + ' (' + e.className + ')', here + t);
        if (e.scrollHeight > e.clientHeight + 3 && e.clientHeight > 0 && cs.display !== 'inline' && cs.overflowY !== 'auto' && cs.overflowY !== 'scroll' && t.length > 3) {
          const rg = document.createRange(); rg.selectNodeContents(e); const tr = rg.getBoundingClientRect();
          if (cs.overflowY !== 'visible' || tr.bottom > r.bottom + 4) add('squashed', t + ' (' + e.className + ')', here + t);
        }
        if (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) add('cut short with …', t, here + t);
        // (under something else: what's at its middle isn't it)
        if (inView && r.width > 6 && r.height > 6) {
          const x = Math.min(r.right - 3, r.left + Math.min(40, r.width / 2)), y = r.top + r.height * 0.5;
          if (x > 0 && y > 0 && x < W && y < H) {
            const hit = document.elementFromPoint(x, y), over = hit && hit.closest('.gsheet:not([hidden]), .groom, #sideways, .gguide, #loading, .gstory, .gmodal, .gdim, .ghero');
            // (the farm's own buttons under an open card are meant to be: only words covered within their own card or screen count)
            const sticky = q => { for (let a = q; a && a !== R; a = a.parentElement) if (getComputedStyle(a).position === 'sticky') return a; return null; };
            const st = hit && R.contains(hit) ? sticky(hit) : null;
            // (inside its own card: covered only by something that stays put while the rest scrolls; outside it: by anything but a card or screen over the farm)
            const clear = q => { const c = getComputedStyle(q); return /rgba\(0, 0, 0, 0\)|transparent/.test(c.backgroundColor) && c.backgroundImage === 'none' && !q.textContent.trim() && !q.children.length; };      // (a see-through catcher of taps, fishing's: nothing seen)
            const bad = hit && hit.tagName !== 'CANVAS' && !clear(hit) && getComputedStyle(e).pointerEvents !== 'none' && hit !== e && !e.contains(hit) && !hit.contains(e) && !hit.closest('.gfade') && (R.contains(hit) ? st && !st.contains(e) && !sticky(e) && !(scroller && scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2) : !over || over.contains(e));      // (a sticky button over words further down that the card scrolls to is fine)
            if (bad) add('covered', t + ' under ' + (hit.id || String(hit.className).slice(0, 40) || hit.tagName), here + t);
          }
        }
        // (words not ready)
        if (/(^|\s)[a-z]{2,}(_[a-z0-9]+)+($|\s|[.:!?])/.test(t) || /\{[a-z_]+\}/.test(t) || /\bundefined\b|\bNaN\b|\[object /.test(t)) add('words not ready', t, t);
      }
      // ---- pictures: drawn bigger than they have pixels for
      for (const im of [...R.querySelectorAll('img'), ...(R.tagName === 'IMG' ? [R] : [])]) {
        if (!vis(im) || !im.naturalWidth) continue;
        const r = im.getBoundingClientRect(), fit = getComputedStyle(im).objectFit, sx = r.width * DPR / im.naturalWidth, sy = r.height * DPR / im.naturalHeight;
        const k = fit === 'cover' ? Math.max(sx, sy) : fit === 'contain' ? Math.min(sx, sy) : Math.max(sx, sy);
        if (k >= 1.35) add('blurry picture', (im.getAttribute('src') || '').split('?')[0] + ' ×' + k.toFixed(2) + ' (' + Math.round(r.width) + 'x' + Math.round(r.height) + ' pt, ' + im.naturalWidth + 'x' + im.naturalHeight + ' px)', (im.getAttribute('src') || '').split('?')[0]);
      }
      for (const e of [R, ...R.querySelectorAll('*')]) {
        if (!vis(e)) continue; const cs = getComputedStyle(e), m = /url\("?([^")]+)"?\)/.exec(cs.backgroundImage); if (!m || /^data:/.test(m[1])) continue;
        const n = natural(m[1]); if (!n) continue;
        const r = e.getBoundingClientRect(), bs = cs.backgroundSize, sx = r.width * DPR / n[0], sy = r.height * DPR / n[1];
        const k = bs === 'cover' ? Math.max(sx, sy) : bs === 'contain' ? Math.min(sx, sy) : /%|px/.test(bs) ? null : 1 * DPR / 1;
        if (k && k >= 1.35) add('blurry picture', m[1].split('?')[0].split('/').slice(-2).join('/') + ' ×' + k.toFixed(2) + ' (' + Math.round(r.width) + 'x' + Math.round(r.height) + ' pt, ' + n[0] + 'x' + n[1] + ' px)', m[1].split('?')[0]);
      }
    }
  };
  let tm = 0; const later = () => { clearTimeout(tm); tm = setTimeout(() => { try { look(); } catch (e) { add('qa error', e.message); } }, 160); };
  window.__qaLook = () => { how = 'now'; try { look(); } catch (e) { add('qa error', e.message); } how = 'timer'; return window.__qa.length; };
  const start = () => { new MutationObserver(later).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden'] }); later(); };
  if (document.body) start(); else addEventListener('DOMContentLoaded', start);
})();
