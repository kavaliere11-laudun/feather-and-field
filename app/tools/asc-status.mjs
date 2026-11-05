// What App Store Connect says about the app's builds and TestFlight (5 Nov 2026: "I haven't had any email"): run in the
// workflow's asc-status job with the key from the repository's secrets; prints only states, never the key.
//   ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8 from the environment; node asc-status.mjs
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
