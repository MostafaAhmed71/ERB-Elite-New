import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../supabase/functions/teacher-password-auth/logic.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { handleTeacherPassword: handle, normalizePhone, codeHash } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
function fixture() {
  const teacher = { id: 'teacher-1', email: 'internal@example.test', phone: '0501234567' };
  const rows = new Map();
  let admin = true, allowed = true, writeCount = 0, failWrite = false;
  let password = 'initial-secret';
  let now = new Date('2026-10-07T10:00:00Z');
  const deps = {
    now: () => now,
    authorizedAdmin: async () => admin ? 'admin-1' : null,
    findTeachers: async phone => phone === '966501234567' ? [teacher] : [],
    getTeacher: async id => id === teacher.id ? teacher : null,
    getSetup: async id => rows.get(id) ?? null,
    issueCode: async (id, hash, expires) => {
      if (rows.get(id)?.password_configured_at) return false;
      rows.set(id, { hash, expires, password_configured_at: null, claim_expires_at: null }); return true;
    },
    claimCode: async (id, hash, claim, current, until) => {
      const r = rows.get(id);
      if (!r || r.hash !== hash || r.password_configured_at || r.expires <= current || r.claim_expires_at && r.claim_expires_at > current) return false;
      r.claim = claim; r.claim_expires_at = until; return true;
    },
    releaseClaim: async (id, claim) => { const r = rows.get(id); if (r?.claim === claim) { r.claim = null; r.claim_expires_at = null; } },
    finishSetup: async (id, claim, date) => { const r = rows.get(id); if (!r || r.claim !== claim || r.password_configured_at) return false; r.password_configured_at = date; r.hash = null; r.claim_expires_at = null; return true; },
    setPassword: async (_id, value) => { if (failWrite) throw Error('upstream failed'); password = value; writeCount++; },
    signIn: async (_teacher, value) => value === password ? { access_token: 'test-access', refresh_token: 'test-refresh' } : null,
    rateLimit: async () => allowed,
  };
  return { deps, teacher, rows, setAdmin: value => admin = value, setAllowed: value => allowed = value, setFailWrite: value => failWrite = value, advance: () => now = new Date(now.getTime() + 49 * 60 * 60 * 1000), writes: () => writeCount };
}
const issue = f => handle({ action: 'issue_code', user_id: f.teacher.id }, f.deps);
const setup = (f, code, password = 'teacher-secret') => handle({ action: 'setup', phone: f.teacher.phone, code, password }, f.deps);
async function sharedFixture() {
  const f = fixture();
  f.deps.sharedCodeHash = await codeHash('shared-teacher-activation', 'shared-fixture-code');
  f.deps.claimSharedCode = async (id, claim, current, until) => {
    let row = f.rows.get(id);
    if (!row) { row = { password_configured_at: null, claim_expires_at: null }; f.rows.set(id, row); }
    if (row.password_configured_at || row.claim_expires_at && row.claim_expires_at > current) return false;
    row.claim = claim; row.claim_expires_at = until; return true;
  };
  return f;
}
test('shared code activates separate registered teachers without administrator issuance', async () => {
  for (let i = 0; i < 2; i++) {
    const f = await sharedFixture();
    f.teacher.id = `shared-teacher-${i}`;
    assert.equal((await setup(f, 'incorrect-shared-code')).status, 401);
    assert.equal(f.rows.size, 0);
    assert.equal((await setup(f, 'shared-fixture-code')).status, 200);
    assert.equal((await setup(f, 'shared-fixture-code', 'changed-secret')).status, 409);
    assert.equal((await issue(f)).status, 409);
    assert.equal(f.writes(), 1);
    assert.equal((await handle({ action: 'check', phone: f.teacher.phone }, f.deps)).body.state, 'password');
  }
});
test('shared activation preserves per-account concurrent claim protection', async () => {
  const f = await sharedFixture();
  const results = await Promise.all([setup(f, 'shared-fixture-code'), setup(f, 'shared-fixture-code', 'other-password')]);
  assert.equal(results.filter(r => r.status === 200).length, 1);
  assert.equal(f.writes(), 1);
});
test('Saudi local, international and Arabic digits identify the same phone', () => {
  for (const p of ['0501234567', '501234567', '+966 50 123 4567', '٠٥٠١٢٣٤٥٦٧', '۰۵۰۱۲۳۴۵۶۷']) assert.equal(normalizePhone(p), '966501234567');
});
test('registration lookup never reveals email, code or auth tokens', async () => {
  const f = fixture();
  const result = await handle({ action: 'check', phone: f.teacher.phone }, f.deps);
  assert.deepEqual(result.body, { state: 'setup' });
});
test('only administrators can issue a teacher-specific activation code', async () => {
  const f = fixture(); f.setAdmin(false); assert.equal((await issue(f)).status, 403);
  f.setAdmin(true); const result = await issue(f);
  assert.equal(result.status, 200); assert.match(result.body.code, /^([A-F0-9]{6}-){3}[A-F0-9]{6}$/);
  assert.notEqual(f.rows.get(f.teacher.id).hash, result.body.code);
  assert.notEqual(await codeHash('another-teacher', result.body.code), f.rows.get(f.teacher.id).hash);
});
test('wrong/expired/replaced codes cannot change a password', async () => {
  const f = fixture(); const old = await issue(f); const fresh = await issue(f);
  assert.equal((await setup(f, old.body.code)).status, 401);
  assert.equal((await setup(f, 'AAAAAA-AAAAAA-AAAAAA-AAAAAA')).status, 401);
  f.advance(); assert.equal((await setup(f, fresh.body.code)).status, 401); assert.equal(f.writes(), 0);
});
test('one-time setup transitions to password-only login and blocks code reuse/reissue', async () => {
  const f = fixture(); const { body } = await issue(f);
  assert.equal((await setup(f, body.code)).status, 200);
  assert.deepEqual((await handle({ action: 'check', phone: f.teacher.phone }, f.deps)).body, { state: 'password' });
  assert.equal((await setup(f, body.code, 'attacker-secret')).status, 409);
  assert.equal((await issue(f)).status, 409);
  assert.equal((await handle({ action: 'login', phone: f.teacher.phone, password: 'wrong' }, f.deps)).status, 401);
  assert.equal((await handle({ action: 'login', phone: f.teacher.phone, password: 'teacher-secret' }, f.deps)).status, 200);
  assert.equal(f.writes(), 1);
});
test('concurrent setup submissions only write one password', async () => {
  const f = fixture(); const { body } = await issue(f);
  const results = await Promise.all([setup(f, body.code), setup(f, body.code, 'other-secret')]);
  assert.equal(results.filter(r => r.status === 200).length, 1); assert.equal(f.writes(), 1);
});
test('upstream password failure releases the claim for a safe retry', async () => {
  const f = fixture(); const { body } = await issue(f); f.setFailWrite(true);
  assert.equal((await setup(f, body.code)).status, 503); f.setFailWrite(false);
  assert.equal((await setup(f, body.code)).status, 200);
});
test('ambiguous phones, inactive/unregistered users, short passwords and rate limits fail closed', async () => {
  const f = fixture();
  assert.equal((await handle({ action: 'check', phone: '0500000000' }, f.deps)).status, 404);
  f.deps.findTeachers = async () => [f.teacher, { ...f.teacher, id: 'teacher-2' }];
  assert.equal((await handle({ action: 'login', phone: f.teacher.phone, password: 'secret' }, f.deps)).status, 401);
  f.deps.findTeachers = async () => [f.teacher]; const { body } = await issue(f);
  assert.equal((await setup(f, body.code, 'short')).status, 400);
  f.setAllowed(false); assert.equal((await setup(f, body.code)).status, 429); assert.equal(f.writes(), 0);
});
