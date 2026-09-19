-- ============================================================
--  Mega Loot - Tabelas da Wiki PxG (loot, itens, hunts, pokemon)
-- ============================================================
--  Rode no SQL Editor do Supabase.
--  Quem preenche essas tabelas e o "scraper" (robo), usando a chave
--  service_role (secreta). Os usuarios do site so LEEM.
-- ============================================================

-- Pokemon (bestiario)
create table if not exists public.wiki_pokemon (
    id          bigint generated always as identity primary key,
    name        text unique not null,
    types       text[],            -- ex: {Water, Rock}
    boosts      text,              -- texto livre de boost/skills
    image_url   text,
    page_url    text,
    updated_at  timestamptz not null default now()
);

-- Itens e preco no NPC
create table if not exists public.wiki_items (
    id          bigint generated always as identity primary key,
    name        text unique not null,
    npc_price   bigint,
    page_url    text,
    updated_at  timestamptz not null default now()
);

-- Drops: qual pokemon dropa qual item (com chance)
create table if not exists public.wiki_drops (
    id          bigint generated always as identity primary key,
    pokemon     text not null,
    item        text not null,
    chance      text,              -- ex: "1/500" ou "0.2%"
    page_url    text,
    updated_at  timestamptz not null default now(),
    unique (pokemon, item)
);

-- Hunts / locais
create table if not exists public.wiki_hunts (
    id          bigint generated always as identity primary key,
    name        text not null,     -- nome do local/hunt
    location    text,
    min_level   integer,
    pokemons    text[],            -- pokemons que aparecem
    notes       text,
    page_url    text,
    updated_at  timestamptz not null default now()
);

create index if not exists wiki_drops_pokemon_idx on public.wiki_drops (pokemon);
create index if not exists wiki_drops_item_idx    on public.wiki_drops (item);

-- ============================================================
--  Seguranca: usuarios logados so LEEM. Escrita e do scraper
--  (service_role bypassa RLS). Ninguem edita pela web.
-- ============================================================
alter table public.wiki_pokemon enable row level security;
alter table public.wiki_items   enable row level security;
alter table public.wiki_drops   enable row level security;
alter table public.wiki_hunts   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['wiki_pokemon','wiki_items','wiki_drops','wiki_hunts'] loop
    execute format('drop policy if exists "leitura wiki" on public.%I', t);
    execute format('create policy "leitura wiki" on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;
