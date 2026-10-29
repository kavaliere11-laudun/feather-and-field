// My account's security rules (firestore.rules) tried on the Firestore emulator: each farm its owner's own, the save's
// number exactly one more each time, the server's time, a save at most every 2 seconds, nothing else readable or writable.
//   java -jar cloud-firestore-emulator-v*.jar --host=127.0.0.1 --port=8080 &      (or firebase emulators:start --only firestore)
//   node rulestest.mjs                          (EMU=127.0.0.1:8080)
// Plain requests to the emulator's REST interface, signed in as a pretend player with an unsigned token (the emulator
// takes those); the rules loaded first through the emulator's own door.
import fs from 'fs';
const EMU = process.env.EMU || '127.0.0.1:8080', PROJECT = 'demo-feather-and-field', DB = `projects/${PROJECT}/databases/(default)/documents`;
const base = `http://${EMU}/v1/${DB}`;
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info).slice(0, 200) : '')); if (!cond) fails++; };
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = uid => b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({ iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, iat: Math.floor(Date.now() / 1e3), exp: Math.floor(Date.now() / 1e3) + 3600, auth_time: Math.floor(Date.now() / 1e3), sub: uid, user_id: uid, firebase: { sign_in_provider: 'google.com', identities: {} } }) + '.';
const head = uid => ({ 'Content-Type': 'application/json', ...(uid ? { Authorization: 'Bearer ' + token(uid) } : {}) });
const val = v => (typeof v === 'string' ? { stringValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : typeof v === 'number' ? { doubleValue: v } : v === null ? { nullValue: null } : typeof v === 'boolean' ? { booleanValue: v } : { timestampValue: v.ts });
// a save: the fields, with `at` the server's time unless given (then as a client's timestamp)
async function save(uid, owner, fields, { at } = {}) {
  const name = `${DB}/farms/${owner}`, f = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, val(v)]));
  if (at) f.at = { timestampValue: at };
  const write = { update: { name, fields: f }, ...(at ? {} : { updateTransforms: [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }] }) };
  const r = await fetch(`http://${EMU}/v1/projects/${PROJECT}/databases/(default)/documents:commit`, { method: 'POST', headers: head(uid), body: JSON.stringify({ writes: [write] }) });
  return r.status;
}
const get = async (uid, path) => (await fetch(`${base}/${path}`, { headers: head(uid) })).status;
const del = async (uid, path) => (await fetch(`${base}/${path}`, { method: 'DELETE', headers: head(uid) })).status;
const list = async uid => (await fetch(`${base}/farms`, { headers: head(uid) })).status;
const wait = ms => new Promise(r => setTimeout(r, ms));

// the rules in, the database empty
const rules = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');
let r = await fetch(`http://${EMU}/emulator/v1/projects/${PROJECT}:securityRules`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: rules }] } }) });
ok('the rules load', r.ok, r.status);
await fetch(`http://${EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });

const farm = JSON.stringify({ d: { v: 3, coins: 100 }, s: '0123abcd' }), now = Date.now();
const good = n => ({ farm, n, lv: 3, coins: 100, made: now - 86400e3 });
const OK = s => s === 200, NO = s => s === 403;
ok('signed out: no save', NO(await save(null, 'sam', good(1))));
ok('another player: no save in Sam\'s place', NO(await save('ann', 'sam', good(1))));
ok('Sam: the first save, number 2: no', NO(await save('sam', 'sam', good(2))));
ok('Sam: the first save, its time from the phone: no', NO(await save('sam', 'sam', good(1), { at: new Date().toISOString() })));
ok('Sam: the first save, an extra field: no', NO(await save('sam', 'sam', { ...good(1), admin: true })));
ok('Sam: the first save, a field missing: no', NO(await save('sam', 'sam', { farm, n: 1, lv: 3, coins: 100 })));
ok('Sam: the first save, coins below nothing: no', NO(await save('sam', 'sam', { ...good(1), coins: -5 })));
ok('Sam: the first save, level 0: no', NO(await save('sam', 'sam', { ...good(1), lv: 0 })));
ok('Sam: the first save, the farm not text: no', NO(await save('sam', 'sam', { ...good(1), farm: 12345 })));
ok('Sam: the first save, too big a farm: no', NO(await save('sam', 'sam', { ...good(1), farm: 'x'.repeat(900001) })));
ok('Sam: the first save, started in the future: no', NO(await save('sam', 'sam', { ...good(1), made: now + 3 * 86400e3 })));
ok('Sam: the first save (number 1): yes', OK(await save('sam', 'sam', good(1))));
ok('Sam: reads it', OK(await get('sam', 'farms/sam')));
ok('another player: can\'t read it', NO(await get('ann', 'farms/sam')));
ok('signed out: can\'t read it', NO(await get(null, 'farms/sam')));
ok('nobody can list the farms', NO(await list('sam')) && NO(await list(null)));
ok('Sam: saving again at once (under 2 s): no', NO(await save('sam', 'sam', good(2))));
await wait(2300);
ok('Sam: number 1 again: no', NO(await save('sam', 'sam', good(1))));
ok('Sam: number 3 (skipping 2): no', NO(await save('sam', 'sam', good(3))));
ok('Sam: number 2, two seconds on: yes', OK(await save('sam', 'sam', good(2))));
ok('another player: can\'t delete it', NO(await del('ann', 'farms/sam')));
ok('anything else in the database: nobody reads or writes it', NO(await get('sam', 'users/sam')) && NO((await fetch(`${base}/other/x`, { method: 'PATCH', headers: head('sam'), body: JSON.stringify({ fields: { a: { stringValue: 'b' } } }) })).status));
ok('Sam: deletes it (his account deleted)', OK(await del('sam', 'farms/sam')));
ok('…and it\'s gone', (await fetch(`${base}/farms/sam`, { headers: head('sam') })).status === 404);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
process.exit(fails ? 1 : 0);
