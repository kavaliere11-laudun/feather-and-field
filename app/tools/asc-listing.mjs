// The App Store page into App Store Connect (24 Nov 2026, Audrey, on the draft page: "Yes, send it to Apple
// (Recommended)"): run in the workflow's asc-listing job (a push whose message has [asc-listing]) with the key from the
// repository's secrets; prints only what it did and the states, never the key. Never submits anything.
//   ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8 from the environment; node app/tools/asc-listing.mjs
// From app/store/listing.json, for each language: the app's name, subtitle and privacy page (its App Information), and the
// version's description, keywords and promotional text; and app/store/shots/<language>/*.jpg (2796 x 1290, the 6.9-inch
// iPhone on its side) as the version's iPhone screenshots, in order, replacing any there. The version must already exist,
// waiting to be prepared ("Prepare for Submission"); none: it says so and stops (it never makes one).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const { ASC_KEY_ID: kid, ASC_ISSUER_ID: iss, ASC_KEY_P8: p8 } = process.env;
if (!kid || !iss || !p8) { console.log('no key in this run'); process.exit(1); }
const HERE = path.dirname(new URL(import.meta.url).pathname), STORE = path.join(HERE, '../store');
const L = JSON.parse(fs.readFileSync(path.join(STORE, 'listing.json'), 'utf8'));
const LOCALES = Object.keys(L).filter(k => !k.startsWith('_'));
const PRIVACY = 'https://kavaliere11-laudun.github.io/feather-and-field/privacy.html';
const SUPPORT = 'https://kavaliere11-laudun.github.io/feather-and-field/support.html';      // (the help page, 24 Nov 2026: web3d/support/)
const MARKETING = 'https://kavaliere11-laudun.github.io/';      // (the developer website, 27 Nov 2026, Audrey: "Free GitHub site": its root holds AdMob's app-ads.txt)
const SHOTS = process.env.SHOTS !== '0';                         // (SHOTS=0: the words only, the pictures left as they are)
// the picture sets: the iPhone's (app/store/shots/<language>, 2796 x 1290 on its side, the 6.7 and 6.9-inch iPhones) and, since
// the app runs on iPad too (27 Nov 2026), the iPad's (app/store/shots-ipad/<language>, 2752 x 2064 on its side: the 13-inch
// iPad, Apple's APP_IPAD_PRO_3GEN_129 in the API); SETS=iphone (the default), ipad, or iphone,ipad
const SET_DIRS = { iphone: ['shots', process.env.SHOT_TYPE || 'APP_IPHONE_67'], ipad: ['shots-ipad', 'APP_IPAD_PRO_3GEN_129'] };
const SETS = (process.env.SETS || 'iphone').split(',').filter(k => SET_DIRS[k]);
const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
let token = '', tokenAt = 0;
const auth = () => {
  const now = Math.floor(Date.now() / 1000); if (token && now - tokenAt < 600) return token;
  const head = b64({ alg: 'ES256', kid, typ: 'JWT' }) + '.' + b64({ iss, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' });
  token = head + '.' + crypto.sign('sha256', Buffer.from(head), { key: p8, dsaEncoding: 'ieee-p1363' }).toString('base64url'); tokenAt = now; return token;
};
const api = async (method, p, body) => {
  const r = await fetch('https://api.appstoreconnect.apple.com' + p, { method, headers: { Authorization: 'Bearer ' + auth(), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 204) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${p.split('?')[0]} ${r.status} ${JSON.stringify((j.errors || []).map(e => e.detail || e.title))}`);
  return j;
};
const all = async p => { let out = [], next = p; while (next) { const j = await api('GET', next); out = out.concat(j.data || []); next = j.links && j.links.next ? j.links.next.replace('https://api.appstoreconnect.apple.com', '') : null; } return out; };
const upsert = async (type, list, locale, attrs, rel) => {
  const have = list.find(x => x.attributes.locale === locale);
  if (have) { await api('PATCH', `/v1/${type}/${have.id}`, { data: { type, id: have.id, attributes: attrs } }); return have.id; }
  const j = await api('POST', `/v1/${type}`, { data: { type, attributes: { locale, ...attrs }, relationships: rel } }); return j.data.id;
};

const app = (await api('GET', '/v1/apps?filter[bundleId]=com.featherandfield.game')).data[0];
if (!app) { console.log('no app with that ID in App Store Connect'); process.exit(1); }
console.log('app:', app.attributes.name, '| primary language:', app.attributes.primaryLocale);
// ---- the App Information (name, subtitle, privacy page): the one being edited
const infos = await all(`/v1/apps/${app.id}/appInfos`);
const info = infos.find(i => /PREPARE|REJECTED|WAITING|DEVELOPER/.test(i.attributes.state || i.attributes.appStoreState || '')) || infos[0];
console.log('app information:', info.attributes.state || info.attributes.appStoreState);
const infoLocs = await all(`/v1/appInfos/${info.id}/appInfoLocalizations`);
for (const loc of LOCALES) {
  const v = L[loc], lang = loc.slice(0, 2);
  try { await upsert('appInfoLocalizations', infoLocs, loc, { name: v.name, subtitle: v.subtitle, privacyPolicyUrl: `${PRIVACY}?lang=${lang}` }, { appInfo: { data: { type: 'appInfos', id: info.id } } }); console.log(loc, 'name, subtitle, privacy page: done'); }
  catch (e) { console.log(loc, 'name, subtitle, privacy page: NOT done:', e.message); }
}
// ---- the app's category (listing.json _app: Games, Simulation)
const A = L._app || {};
if (A.category) {
  const rel = { primaryCategory: { data: { type: 'appCategories', id: A.category } } };
  if (A.subcategory) rel.primarySubcategoryOne = { data: { type: 'appCategories', id: A.subcategory } };
  try { await api('PATCH', `/v1/appInfos/${info.id}`, { data: { type: 'appInfos', id: info.id, relationships: rel } }); console.log('category:', A.category, A.subcategory || '', 'done'); }
  catch (e) { console.log('category: NOT done:', e.message); }
}
// ---- the version waiting to be prepared: its words and its pictures
const vers = await all(`/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS`);
for (const v of vers) console.log('version', v.attributes.versionString, '|', v.attributes.appVersionState || v.attributes.appStoreState);
const ver = vers.find(v => /PREPARE_FOR_SUBMISSION|DEVELOPER_REJECTED|REJECTED|METADATA_REJECTED/.test(v.attributes.appVersionState || v.attributes.appStoreState || ''));
if (!ver) { console.log('no version waiting to be prepared: nothing more done'); process.exit(0); }
if (A.copyright) {                                                // (the line under the game: "2026 Audrey Bellegarde")
  try { await api('PATCH', `/v1/appStoreVersions/${ver.id}`, { data: { type: 'appStoreVersions', id: ver.id, attributes: { copyright: A.copyright } } }); console.log('copyright:', A.copyright, 'done'); }
  catch (e) { console.log('copyright: NOT done:', e.message); }
}
const vlocs = await all(`/v1/appStoreVersions/${ver.id}/appStoreVersionLocalizations`);
for (const loc of LOCALES) {
  const v = L[loc];
  let vid;
  try { vid = await upsert('appStoreVersionLocalizations', vlocs, loc, { description: v.description, keywords: v.keywords, promotionalText: v.promo, supportUrl: `${SUPPORT}?lang=${loc.slice(0, 2)}`, marketingUrl: MARKETING }, { appStoreVersion: { data: { type: 'appStoreVersions', id: ver.id } } }); console.log(loc, 'description, keywords, promotional text, help page, website: done'); }
  catch (e) { console.log(loc, 'description, keywords, promotional text: NOT done:', e.message); continue; }
  if (!SHOTS) continue;
  for (const [folder, SHOT_TYPE] of SETS.map(k => SET_DIRS[k])) {
  const dir = path.join(STORE, folder, loc); if (!fs.existsSync(dir)) { console.log(loc, folder, 'no pictures'); continue; }
  const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f)).sort();
  try {
    const sets = await all(`/v1/appStoreVersionLocalizations/${vid}/appScreenshotSets`);
    let set = sets.find(s => s.attributes.screenshotDisplayType === SHOT_TYPE);
    if (!set) set = (await api('POST', '/v1/appScreenshotSets', { data: { type: 'appScreenshotSets', attributes: { screenshotDisplayType: SHOT_TYPE }, relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: vid } } } } })).data;
    for (const old of await all(`/v1/appScreenshotSets/${set.id}/appScreenshots`)) await api('DELETE', `/v1/appScreenshots/${old.id}`);
    const ids = [];
    for (const f of files) {
      const buf = fs.readFileSync(path.join(dir, f));
      const made = (await api('POST', '/v1/appScreenshots', { data: { type: 'appScreenshots', attributes: { fileName: `${loc}-${f}`, fileSize: buf.length }, relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } } } })).data;
      for (const op of made.attributes.uploadOperations || []) {
        const r = await fetch(op.url, { method: op.method, headers: Object.fromEntries((op.requestHeaders || []).map(h => [h.name, h.value])), body: buf.subarray(op.offset, op.offset + op.length) });
        if (!r.ok) throw new Error(`upload ${f} ${r.status}`);
      }
      await api('PATCH', `/v1/appScreenshots/${made.id}`, { data: { type: 'appScreenshots', id: made.id, attributes: { uploaded: true, sourceFileChecksum: crypto.createHash('md5').update(buf).digest('hex') } } });
      ids.push(made.id);
    }
    await api('PATCH', `/v1/appScreenshotSets/${set.id}/relationships/appScreenshots`, { data: ids.map(id => ({ type: 'appScreenshots', id })) });
    console.log(loc, SHOT_TYPE, 'pictures uploaded:', ids.length);
  } catch (e) { console.log(loc, SHOT_TYPE, 'pictures: NOT done:', e.message); }
  }
}
// ---- Apple checking the pictures (a few seconds each): their states
if (SHOTS) await new Promise(r => setTimeout(r, 20000));
for (const loc of LOCALES) {
  const vl = (await all(`/v1/appStoreVersions/${ver.id}/appStoreVersionLocalizations`)).find(x => x.attributes.locale === loc); if (!vl) continue;
  const sets = await all(`/v1/appStoreVersionLocalizations/${vl.id}/appScreenshotSets`);
  for (const s of sets) {
    const shots = await all(`/v1/appScreenshotSets/${s.id}/appScreenshots`);
    const st = shots.map(x => (x.attributes.assetDeliveryState || {}).state || '?');
    const errs = shots.flatMap(x => ((x.attributes.assetDeliveryState || {}).errors || []).map(e => e.description || e.code));
    console.log(loc, s.attributes.screenshotDisplayType, shots.length, 'pictures:', [...new Set(st)].join(', '), errs.length ? '| ' + [...new Set(errs)].join('; ') : '');
  }
}
console.log('nothing submitted');
