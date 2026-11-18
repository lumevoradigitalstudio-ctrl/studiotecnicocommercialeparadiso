-- Difesa in profondità: l'app richiede login, quindi `anon` non accede a nessuna tabella; audit_events è solo service_role.
revoke all on all tables in schema public from anon;
revoke all on public.audit_events from authenticated;
alter default privileges in schema public revoke all on tables from anon;
