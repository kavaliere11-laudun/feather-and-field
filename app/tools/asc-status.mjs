// What App Store Connect says about the app's builds and TestFlight (5 Nov 2026: "I haven't had any email"): run in the
// workflow's asc-status job with the key from the repository's secrets; prints only states, never the key.
//   ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8 from the environment; node asc-status.mjs
// (21 Nov 2026: run again after Audrey's app was set free and available in the UK and the US in App Store Connect.)
import crypto from 'node:crypto';
const { ASC_KEY_ID: kid, ASC_ISSUER_ID: iss, ASC_KEY_P8: p8 } = process.env;
const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const head = b64({ alg: 'ES256', kid, typ: 'JWT' }) + '.' + b64({ iss, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' });
const sig = crypto.sign('sha256', Buffer.from(head), { key: p8, dsaEncoding: 'ieee-p1363' }).toString('base64url');
const token = head + '.' + sig;
const api = async path => {
  const r = await fetch('https://api.appstoreconnect.apple.com' + path, { headers: { Authorization: 'Bearer ' + token } });
  const j = await r.json(); if (!r.ok) throw new Error(path + ' ' + r.status + ' ' + JSON.stringify(j.errors?.map(e => e.detail || e.title)));
  return j;
};
const apps = await api('/v1/apps?filter[bundleId]=com.featherandfield.game');
const app = apps.data[0]; if (!app) { console.log('no app with that ID in App Store Connect'); process.exit(0); }
console.log('app:', app.attributes.name, app.id);
const builds = await api(`/v1/builds?filter[app]=${app.id}&sort=-uploadedDate&limit=10&include=buildBetaDetail,preReleaseVersion`);
const inc = Object.fromEntries((builds.included || []).map(x => [x.type + ':' + x.id, x.attributes]));
for (const b of builds.data) {
  const a = b.attributes, d = inc['buildBetaDetails:' + b.relationships?.buildBetaDetail?.data?.id] || {}, v = inc['preReleaseVersions:' + b.relationships?.preReleaseVersion?.data?.id] || {};
  console.log('build', a.version, 'version', v.version, '| uploaded', a.uploadedDate, '| processing:', a.processingState, '| expired:', a.expired,
    '| encryption answered:', a.usesNonExemptEncryption, '| internal testing:', d.internalBuildState, '| external:', d.externalBuildState);
}
if (!builds.data.length) console.log('no builds yet');
const groups = await api(`/v1/betaGroups?filter[app]=${app.id}`);
for (const g of groups.data) console.log('tester group:', g.attributes.name, '| internal:', g.attributes.isInternalGroup, '| all builds automatically:', g.attributes.hasAccessToAllBuilds);
if (!groups.data.length) console.log('no tester groups yet');
// (18 Nov 2026, Audrey, the Coins shelf empty in TestFlight: "I thought the game was ready for me to test buying things ?":
// what Apple says of each thing to buy: its state, and whether it has its words, its price and its review picture.
// Read only: states, never the key.)
try {
  const iaps = await api(`/v1/apps/${app.id}/inAppPurchasesV2?limit=50`);
  const by = {};
  for (const p of iaps.data) {
    const a = p.attributes; let loc = '?', price = '?', shot = '?';
    try { loc = (await api(`/v2/inAppPurchases/${p.id}/inAppPurchaseLocalizations?limit=10`)).data.map(x => x.attributes.locale + ':' + x.attributes.state).join(','); } catch (e) { loc = 'error'; }
    try { const s = await api(`/v2/inAppPurchases/${p.id}/iapPriceSchedule?include=manualPrices,baseTerritory`); price = (s.included || []).filter(x => x.type === 'inAppPurchasePrices').length + ' price(s), base ' + ((s.included || []).find(x => x.type === 'territories')?.id || '?'); } catch (e) { price = 'none'; }
    try { const s = await api(`/v2/inAppPurchases/${p.id}/appStoreReviewScreenshot`); shot = s.data ? s.data.attributes.assetDeliveryState?.state : 'none'; } catch (e) { shot = 'none'; }
    let where = '?';      // (22 Nov 2026, the TestFlight shop empty: where each is sold, the UK, the US and France in particular)
    try { const s = await api(`/v2/inAppPurchases/${p.id}/inAppPurchaseAvailability?include=availableTerritories&limit[availableTerritories]=200`); const t = (s.included || []).filter(x => x.type === 'territories').map(x => x.id); where = t.length + ' countries' + (s.data?.attributes?.availableInNewTerritories ? ' +new' : '') + ' (GBR ' + t.includes('GBR') + ', USA ' + t.includes('USA') + ', FRA ' + t.includes('FRA') + ')'; } catch (e) { where = 'none · ' + e.message.slice(0, 80); }
    console.log('to buy:', a.productId, '|', a.inAppPurchaseType, '| state:', a.state, '| words:', loc, '| price:', price, '| review picture:', shot, '| where:', where, '| family sharing:', a.familySharable);
    by[a.state] = (by[a.state] || 0) + 1;
  }
  console.log('things to buy:', iaps.data.length, JSON.stringify(by));
} catch (e) { console.log('things to buy: could not be read:', e.message); }
// (the app's own price and where it is sold: a thing to buy isn't handed to a phone while the app has neither)
for (const [what, path] of [['app price', `/v1/apps/${app.id}/appPriceSchedule?include=manualPrices,baseTerritory`], ['app availability', `/v1/apps/${app.id}/appAvailabilityV2?include=territoryAvailabilities&limit[territoryAvailabilities]=50`], ['app versions', `/v1/apps/${app.id}/appStoreVersions?limit=5`], ['agreements/app info', `/v1/apps/${app.id}/appInfos?limit=3`]]) {
  try { const s = await api(path);
    if (what === 'app price') console.log(what + ':', (s.included || []).filter(x => x.type === 'appPrices').length, 'price(s), base', (s.included || []).find(x => x.type === 'territories')?.id || 'none');
    else if (what === 'app availability') { const t = (s.included || []).filter(x => x.type === 'territoryAvailabilities'); console.log(what + ': new territories', s.data?.attributes?.availableInNewTerritories, '| listed', t.length, '| available', t.filter(x => x.attributes.available).length, '| e.g.', t.slice(0, 4).map(x => x.attributes.available + ':' + x.attributes.contentStatuses).join(' ')); }
    else if (what === 'app versions') console.log(what + ':', s.data.map(v => v.attributes.versionString + ' ' + (v.attributes.appVersionState || v.attributes.appStoreState)).join(', ') || 'none');
    else console.log(what + ':', s.data.map(v => (v.attributes.state || v.attributes.appStoreState) + ' age:' + v.attributes.appStoreAgeRating).join(', '));
  } catch (e) { console.log(what + ': not set or not readable ·', e.message.slice(0, 160)); }
}
