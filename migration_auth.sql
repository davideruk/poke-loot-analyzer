-- ============================================================
--  Poke X Loot Analyzer - Migracao: login com email/senha
-- ============================================================
--  Rode este arquivo no SQL Editor do Supabase DEPOIS do schema.sql,
--  quando ativar o login (email/senha) no site.
-- ============================================================

-- Novas colunas para vincular a sessao ao usuario logado.
alter table public.sessions add column if not exists user_id    uuid;
alter table public.sessions add column if not exists user_email text;

-- Trocamos as regras "publicas" (anon) por regras de usuarios logados.
drop policy if exists "leitura publica"     on public.sessions;
drop policy if exists "insercao publica"    on public.sessions;
drop policy if exists "leitura autenticados" on public.sessions;
drop policy if exists "insercao propria"     on public.sessions;
drop policy if exists "apagar propria"       on public.sessions;

-- Qualquer usuario logado pode VER o ranking (todas as sessoes).
create policy "leitura autenticados"
    on public.sessions for select
    to authenticated
    using (true);

-- Cada um so pode INSERIR sessoes em nome da propria conta.
create policy "insercao propria"
    on public.sessions for insert
    to authenticated
    with check (auth.uid() = user_id);

-- (Opcional) Cada um pode APAGAR as proprias sessoes.
create policy "apagar propria"
    on public.sessions for delete
    to authenticated
    using (auth.uid() = user_id);
