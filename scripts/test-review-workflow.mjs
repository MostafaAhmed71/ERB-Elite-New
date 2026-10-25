// Run: PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-review-workflow.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const ids = Object.fromEntries(['teacher','supervisor','reviewer','principal','other'].map((r,i)=>[r,`00000000-0000-0000-0000-00000000000${i+1}`]));
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
CREATE TYPE academic_review_status AS ENUM ('pending','approved','needsRevision','awaitingPrincipal','sentToParent');
CREATE TABLE users (id uuid PRIMARY KEY,role text,is_active boolean DEFAULT true);
CREATE FUNCTION get_my_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT role FROM public.users WHERE id=auth.uid()$$;
CREATE TABLE academic_exam_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), teacher_id uuid REFERENCES users(id), teacher_name text,subject text,
 file_url text NOT NULL,file_name text NOT NULL,file_type text DEFAULT 'pdf',status academic_review_status DEFAULT 'pending',
 principal_notes text,reviewer_id uuid,reviewer_notes text,reviewer_reviewed_at timestamptz,
 submitted_to_principal_at timestamptz,uploaded_at timestamptz DEFAULT now(),reviewed_at timestamptz,sent_to_parent_at timestamptz,
 updated_at timestamptz DEFAULT now()
);
ALTER TABLE academic_exam_reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON academic_exam_reviews TO authenticated;
GRANT SELECT ON academic_exam_reviews TO anon;
CREATE POLICY academic_reviews_teacher ON academic_exam_reviews FOR ALL TO authenticated USING(teacher_id=auth.uid()) WITH CHECK(teacher_id=auth.uid());
CREATE POLICY academic_reviews_reviewer ON academic_exam_reviews FOR ALL TO authenticated USING(get_my_role()='reviewer') WITH CHECK(get_my_role()='reviewer');
CREATE POLICY academic_reviews_public ON academic_exam_reviews FOR SELECT USING(status='sentToParent');
CREATE TABLE notifications(user_id uuid,title text,body text,type text,link text);

`);
for (const [role,id] of Object.entries(ids)) await db.query('INSERT INTO users(id,role) VALUES($1,$2)',[id,role==='other'?'teacher':role]);
await db.exec(await readFile(new URL('../supabase/migrations/20261025143446_exam_review_supervisor_workflow.sql',import.meta.url),'utf8'));
let count=0;
async function actor(role){await db.exec('RESET ROLE');await db.query("SELECT set_config('test.uid',$1,false)",[ids[role]]);await db.exec('SET ROLE authenticated');}
async function rejects(sql){await assert.rejects(db.exec(sql));count++;}
async function update(id,sql){const r=await db.query(`UPDATE academic_exam_reviews SET ${sql} WHERE id=$1 RETURNING *`,[id]);assert.equal(r.rows.length,1);count++;return r.rows[0];}
await actor('teacher');
const {rows:[review]}=await db.query("INSERT INTO academic_exam_reviews(teacher_id,teacher_name,subject,file_url,file_name) VALUES($1,'Teacher','Math','v1.pdf','v1.pdf') RETURNING *",[ids.teacher]);
const id=review.id;
await rejects(`UPDATE academic_exam_reviews SET status='sentToParent' WHERE id='${id}'`);
await actor('other');assert.equal((await db.query('SELECT * FROM academic_exam_reviews')).rows.length,0);count++;
await actor('supervisor');
await rejects(`UPDATE academic_exam_reviews SET status='needsRevision',supervisor_notes='  ' WHERE id='${id}'`);
await rejects(`UPDATE academic_exam_reviews SET status='approved',file_url='tampered' WHERE id='${id}'`);
await update(id,"status='needsRevision',supervisor_notes='Fix question 1'");
await actor('teacher');
await rejects(`UPDATE academic_exam_reviews SET status='pending' WHERE id='${id}'`);
await update(id,"status='pending',file_url='v2.pdf',file_name='v2.pdf'");
await actor('reviewer');await rejects(`UPDATE academic_exam_reviews SET status='awaitingPrincipal' WHERE id='${id}'`);
await actor('supervisor');await update(id,"status='approved',supervisor_notes='Checked'");
await actor('reviewer');await rejects(`UPDATE academic_exam_reviews SET status='needsRevision',reviewer_notes='' WHERE id='${id}'`);
await update(id,"status='needsRevision',reviewer_notes='Fix answer 2'");
await actor('teacher');const reset=await update(id,"status='pending',file_url='v3.pdf',file_name='v3.pdf'");
assert.equal(reset.supervisor_id,null);assert.equal(reset.reviewer_notes,null);count++;
await actor('supervisor');await update(id,"status='approved'");
await actor('reviewer');await update(id,"status='awaitingPrincipal'");
await actor('principal');await rejects(`UPDATE academic_exam_reviews SET status='needsRevision',principal_notes=' ' WHERE id='${id}'`);
await update(id,"status='needsRevision',principal_notes='Fix title'");
await actor('teacher');await update(id,"status='pending',file_url='v4.pdf',file_name='v4.pdf'");
await actor('supervisor');await update(id,"status='approved'");
await actor('principal');await rejects(`UPDATE academic_exam_reviews SET status='sentToParent' WHERE id='${id}'`);
await actor('reviewer');await update(id,"status='awaitingPrincipal'");
await actor('principal');await update(id,"status='sentToParent'");
await actor('teacher');await rejects(`UPDATE academic_exam_reviews SET file_url='changed-after-publish' WHERE id='${id}'`);
const history=await db.query('SELECT * FROM academic_exam_review_history WHERE review_id=$1 ORDER BY id',[id]);
assert.equal(history.rows.length,13);assert(history.rows.some(r=>r.notes==='Fix question 1'&&r.file_url==='v1.pdf'));count++;
await rejects(`UPDATE academic_exam_review_history SET notes='tampered'`);
await actor('other');assert.equal((await db.query('SELECT * FROM academic_exam_review_history')).rows.length,0);count++;
await db.exec('RESET ROLE; SET ROLE anon');assert.equal((await db.query('SELECT * FROM academic_exam_reviews')).rows.length,1);count++;
await rejects('SELECT * FROM academic_exam_review_history');
await db.exec('RESET ROLE');const notifications=await db.query('SELECT * FROM notifications');assert.equal(notifications.rows[0].user_id,ids.supervisor);count++;
await actor('teacher');
await rejects(`INSERT INTO academic_exam_reviews(teacher_id,file_url,file_name,status) VALUES('${ids.teacher}','bad.pdf','bad.pdf','sentToParent')`);
await actor('principal');
const direct=await db.query(`INSERT INTO academic_exam_reviews(teacher_id,file_url,file_name,status) VALUES('${ids.principal}','direct.pdf','direct.pdf','sentToParent') RETURNING *`);
assert(direct.rows[0].sent_to_parent_at);count++;
await actor('reviewer');await rejects(`DELETE FROM academic_exam_reviews WHERE id='${id}'`);
await db.close();console.log(`PASS: ${count} workflow, rejection, resubmission, RLS, audit and notification checks`);
