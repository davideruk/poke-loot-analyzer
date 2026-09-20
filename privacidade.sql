-- ============================================================
--  Mega Loot - Privacidade: dados privados por conta
-- ============================================================
--  Cada usuario passa a LER somente as PROPRIAS sessoes (dados
--  detalhados privados). O RANKING vira uma view publica que
--  mostra APENAS o resumo (player, apelido, profit, kills, etc.),
--  sem os dados detalhados (raw_json, email).
--  Rode no SQL Editor do Supabase.
-- ============================================================

-- 1) Leitura da tabela sessions: somente as proprias linhas
drop policy if exists "leitura autenticados" on public.sessions;
drop policy if exists "leitura propria"       on public.sessions;
create policy "leitura propria"
    on public.sessions for select
    to authenticated
    using (auth.uid() = user_id);

-- (mantem) insercao e delete apenas das proprias sessoes
drop policy if exists "insercao propria" on public.sessions;
create policy "insercao propria"
    on public.sessions for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "apagar propria" on public.sessions;
create policy "apagar propria"
    on public.sessions for delete
    to authenticated
    using (auth.uid() = user_id);

-- 2) View publica do ranking: SO colunas de resumo (nada privado)
--    security_invoker = false -> a view roda com privilegio do dono
--    e ignora o RLS da tabela, mostrando o resumo de todos.
drop view if exists public.ranking;
create view public.ranking
    with (security_invoker = false) as
    select id, player, uploaded_by, user_id,
           profit_per_hour, profit, kills, duration_seconds,
           created_at, start_time
    from public.sessions;

grant select on public.ranking to authenticated;
