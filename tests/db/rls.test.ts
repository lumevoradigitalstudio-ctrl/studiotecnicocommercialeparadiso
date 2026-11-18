import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, readdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";

// Test DB reali su PostgreSQL 16 locale (non Supabase cloud). Saltati se Postgres non è installato.
const PGBIN = ["/usr/lib/postgresql/16/bin", "/usr/lib/postgresql/17/bin", "/usr/lib/postgresql/15/bin"].find(p => existsSync(p + "/initdb"));
const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b";
const PORT = 54329;
let proc: ChildProcess, admin: pg.Client, dir: string;

async function as(user: string | null, fn: (c: pg.Client) => Promise<void>) {
  const c = new pg.Client({ host: "127.0.0.1", port: PORT, user: "postgres", database: "ritmo" });
  await c.connect();
  try {
    await c.query(`set role ${user ? "authenticated" : "anon"}`);
    if (user) await c.query(`select set_config('request.jwt.claim.sub', '${user}', false)`);
    await fn(c);
  } finally { await c.end(); }
}

describe.skipIf(!PGBIN)("RLS e quote su Postgres reale", () => {
  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "pgritmo-"));
    const run = (cmd: string) => execSync(cmd, { stdio: "pipe", env: { ...process.env, PATH: `${PGBIN}:${process.env.PATH}` } });
    // postgres non può girare da root: eseguiamo come utente 'postgres' se necessario
    execSync(`chown -R postgres ${dir}`); 
    const su = (cmd: string) => execSync(`su postgres -c "${cmd.replace(/"/g, '\\"')}"`, { stdio: "pipe", env: { ...process.env, PATH: `${PGBIN}:${process.env.PATH}` } });
    su(`${PGBIN}/initdb -D ${dir}/data -A trust`);
    proc = spawn("su", ["postgres", "-c", `${PGBIN}/postgres -D ${dir}/data -p ${PORT} -k ${dir} -c listen_addresses=127.0.0.1`], { stdio: "ignore" });
    for (let i = 0; i < 40; i++) { try { run(`${PGBIN}/pg_isready -h 127.0.0.1 -p ${PORT}`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
    const boot = new pg.Client({ host: "127.0.0.1", port: PORT, user: "postgres", database: "postgres" });
    await boot.connect(); await boot.query("create database ritmo"); await boot.end();
    admin = new pg.Client({ host: "127.0.0.1", port: PORT, user: "postgres", database: "ritmo" });
    await admin.connect();
    // Stub minimo dello schema auth di Supabase
    await admin.query(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated, service_role;
      grant execute on function auth.uid() to anon, authenticated, service_role;`);
    const mdir = path.resolve(__dirname, "../../supabase/migrations");
    const migs = readdirSync(mdir).filter(f => f.endsWith(".sql")).sort();
    await admin.query(readFileSync(path.join(mdir, migs[0]!), "utf8"));
    await admin.query(`grant usage on schema public to anon, authenticated, service_role;
      grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
      grant usage on all sequences in schema public to authenticated, service_role;`);
    // le revoke della migration devono prevalere: ri-applichiamo come fa Supabase (default privileges) senza concedere scrittura sulle tabelle protette
    for (const f of migs.slice(1)) await admin.query(readFileSync(path.join(mdir, f), "utf8")); // hardening dopo i grant di test
    await admin.query(`revoke insert, update, delete on public.subscription_entitlements, public.ai_usage_ledger, public.plan_limits, public.audit_events from authenticated`);
    await admin.query(`insert into auth.users values ('${A}'), ('${B}')`);
  }, 60_000);

  afterAll(async () => {
    await admin?.end(); proc?.kill();
    try { execSync(`su postgres -c "${PGBIN}/pg_ctl -D ${dir}/data -m immediate stop"`, { stdio: "ignore" }); } catch { /* già fermo */ }
  });

  it("A non legge né modifica i pasti di B", async () => {
    await admin.query(`insert into meal_entries (user_id, meal_type, eaten_at, description) values ('${B}','cena',now(),'pasta di B')`);
    await as(A, async c => {
      expect((await c.query("select * from meal_entries")).rowCount).toBe(0);
      expect((await c.query(`update meal_entries set description='hack' where user_id='${B}'`)).rowCount).toBe(0);
      expect((await c.query(`delete from meal_entries where user_id='${B}'`)).rowCount).toBe(0);
      await expect(c.query(`insert into meal_entries (user_id, meal_type, eaten_at, description) values ('${B}','cena',now(),'x')`)).rejects.toThrow(/row-level security/);
    });
  });

  it("A può gestire i propri dati (dispensa)", async () => {
    await as(A, async c => {
      await c.query(`insert into pantry_items (user_id, name) values ('${A}','uova')`);
      expect((await c.query("select name from pantry_items")).rows).toEqual([{ name: "uova" }]);
    });
  });

  it("anon non vede nulla", async () => {
    await as(null, async c => { await expect(c.query("select * from pantry_items")).rejects.toThrow(); });
  });

  it("il client non può auto-assegnarsi un abbonamento Plus", async () => {
    await as(A, async c => {
      await expect(c.query(`insert into subscription_entitlements (user_id, plan, active) values ('${A}','plus',true)`)).rejects.toThrow();
      await expect(c.query(`update subscription_entitlements set plan='plus', active=true`)).rejects.toThrow();
    });
  });

  it("il client non può chiamare consume_ai_quota né alterare il ledger", async () => {
    await as(A, async c => {
      await expect(c.query(`select * from consume_ai_quota('${A}')`)).rejects.toThrow(/permission denied/);
      await expect(c.query(`insert into ai_usage_ledger (user_id) values ('${A}')`)).rejects.toThrow();
    });
  });

  it("quota atomica: 20 richieste concorrenti sul piano free → al massimo 5 al giorno", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, async () => {
      const c = new pg.Client({ host: "127.0.0.1", port: PORT, user: "postgres", database: "ritmo" });
      await c.connect();
      try {
        await c.query("set role service_role");
        const r = await c.query(`select decision, ledger_id from consume_ai_quota('${B}')`);
        const row = r.rows[0];
        if (row.decision === "ok") await c.query(`select finish_ai_request('${row.ledger_id}', 10, 10, 0.001, true)`);
        return row.decision as string;
      } finally { await c.end(); }
    }));
    expect(results.filter(d => d === "ok").length).toBeLessThanOrEqual(5);
    expect(results.filter(d => d === "ok").length).toBeGreaterThan(0);
  });

  it("il piano Plus scaduto torna a free (derivato dal server)", async () => {
    await admin.query(`insert into subscription_entitlements (user_id, plan, active, expires_at) values ('${A}','plus',true, now() - interval '1 day')`);
    let ok = 0;
    for (let i = 0; i < 8; i++) {
      const r = await admin.query(`select decision, ledger_id from consume_ai_quota('${A}')`);
      if (r.rows[0].decision === "ok") { ok++; await admin.query(`select finish_ai_request('${r.rows[0].ledger_id}',1,1,0,true)`); }
    }
    expect(ok).toBe(5);
  });

  it("budget globale: oltre la soglia le richieste sono rifiutate", async () => {
    const r = await admin.query(`select decision from consume_ai_quota('${A}', 0.0000001)`);
    expect(r.rows[0].decision).toBe("budget");
  });

  it("eliminazione account: cascade su tutti i dati", async () => {
    await admin.query(`delete from auth.users where id='${B}'`);
    expect((await admin.query(`select count(*) from meal_entries where user_id='${B}'`)).rows[0].count).toBe("0");
    expect((await admin.query(`select count(*) from ai_usage_ledger where user_id='${B}'`)).rows[0].count).toBe("0");
  });
});
