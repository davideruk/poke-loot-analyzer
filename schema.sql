-- ============================================================
--  Poke X Loot Analyzer - Schema do banco (Supabase / Postgres)
-- ============================================================
--  Como usar:
--  1) Crie um projeto gratis em https://supabase.com
--  2) Va em "SQL Editor" -> "New query"
--  3) Cole TODO este arquivo e clique em "Run"
-- ============================================================

-- Tabela unica de sessoes.
-- Guardamos algumas colunas "resumo" (para ranking/consultas rapidas)
-- e o JSON completo em raw_json (para desenhar os graficos de detalhe).
create table if not exists public.sessions (
    id                bigint generated always as identity primary key,
    game_session_id   bigint,                       -- "Session ID" vindo do jogo (ex: 1366)
    player            text        not null,
    session_type      text,                         -- "player", "party", etc.
    start_time        timestamptz,
    duration_seconds  integer,
    profit            bigint,
    profit_per_hour   bigint,
    raw_gains         bigint,
    supplies_cost     bigint,
    kills             integer,
    rare_kills        integer,
    kills_per_hour    integer,
    damage_dealt      bigint,
    damage_taken      bigint,
    raw_json          jsonb       not null,         -- o JSON inteiro do analiser
    uploaded_by       text,                         -- nome/apelido de quem enviou (opcional)
    created_at        timestamptz not null default now()
);

-- Evita salvar a MESMA sessao do jogo duas vezes (mesmo player + mesmo id do jogo).
create unique index if not exists sessions_unique_game
    on public.sessions (player, game_session_id)
    where game_session_id is not null;

-- Indices para ordenar rankings rapido.
create index if not exists sessions_profit_hour_idx on public.sessions (profit_per_hour desc);
create index if not exists sessions_created_idx     on public.sessions (created_at desc);

-- ============================================================
--  Seguranca (RLS)
-- ============================================================
--  Como e uma ferramenta so entre amigos (sem login), liberamos
--  leitura e insercao para a chave publica "anon".
--  NAO liberamos update/delete pela web (so pelo painel do Supabase).
-- ============================================================
alter table public.sessions enable row level security;

drop policy if exists "leitura publica"  on public.sessions;
drop policy if exists "insercao publica" on public.sessions;

create policy "leitura publica"
    on public.sessions for select
    to anon
    using (true);

create policy "insercao publica"
    on public.sessions for insert
    to anon
    with check (true);
