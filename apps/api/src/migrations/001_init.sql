-- Et spil er én række. Hele tilstanden ligger som JSONB, fordi regelmotoren
-- ejer formen og alligevel læser og skriver den samlet ved hver handling.
create table if not exists spil (
  id          uuid primary key,
  kode        text not null unique,
  fase        text not null default 'lobby',
  tilstand    jsonb not null,
  version     integer not null default 1,
  oprettet    timestamptz not null default now(),
  opdateret   timestamptz not null default now()
);

create index if not exists spil_opdateret_idx on spil (opdateret desc);

-- Hændelseslog. Selve spillet kan køre uden den, men den gør det muligt at
-- se hvad der skete, og at genskabe et spil hvis en tilstand skulle knække.
create table if not exists haendelser (
  id          bigserial primary key,
  spil_id     uuid not null references spil (id) on delete cascade,
  spiller_id  text,
  slags       text not null,
  tekst       text not null,
  data        jsonb,
  tidspunkt   timestamptz not null default now()
);

create index if not exists haendelser_spil_idx on haendelser (spil_id, id desc);
