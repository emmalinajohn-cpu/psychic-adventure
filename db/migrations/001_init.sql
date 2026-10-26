-- Pacific Watchmen core schema.
-- Reference tables (countries, themes) hold fixed facts. Everything else is
-- filled by the collector, the processing pipeline or user actions.

create extension if not exists pgcrypto;

-- Reference data -------------------------------------------------------------

create table countries (
  iso2        char(2) primary key,
  name        text not null,
  subregion   text not null check (subregion in ('Melanesia', 'Micronesia', 'Polynesia')),
  capital     text not null,
  lat         double precision not null,
  lon         double precision not null,
  -- Extra names used to match articles to this country (e.g. "PNG", "Port Moresby")
  aliases     text[] not null default '{}'
);

create table themes (
  slug        text primary key,
  name        text not null,
  sort_order  int not null
);

-- Sources and collection -------------------------------------------------------

create table sources (
  id               serial primary key,
  slug             text not null unique,
  name             text not null,
  kind             text not null check (kind in ('regional', 'government', 'media', 'research', 'aggregator')),
  homepage         text not null,
  feed_url         text not null,
  feed_type        text not null default 'rss' check (feed_type in ('rss', 'guardian', 'reliefweb')),
  country_iso      char(2) references countries(iso2),
  -- 0-100, set by source type and adjustable by administrators
  base_credibility int not null check (base_credibility between 0 and 100),
  -- When false, an item is kept only if it mentions a Pacific country
  pacific_focused  boolean not null default true,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

create table fetch_runs (
  id           bigserial primary key,
  source_id    int not null references sources(id) on delete cascade,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       text not null default 'running' check (status in ('running', 'ok', 'error')),
  items_found  int not null default 0,
  items_new    int not null default 0,
  error        text
);
create index fetch_runs_source_started on fetch_runs (source_id, started_at desc);

create table items (
  id             bigserial primary key,
  source_id      int not null references sources(id),
  url            text not null unique,
  title          text not null,
  description    text,
  author         text,
  published_at   timestamptz,
  fetched_at     timestamptz not null default now(),
  content_hash   text not null,
  -- Analyst review: nothing reaches dashboards until approved
  review_status  text not null default 'pending' check (review_status in ('pending', 'approved', 'discarded')),
  reviewed_by    uuid,
  reviewed_at    timestamptz,
  review_note    text,
  -- Approved items an analyst also cleared for the public site
  is_public      boolean not null default false,
  search         tsvector generated always as (
                   setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                   setweight(to_tsvector('english', coalesce(description, '')), 'B')
                 ) stored
);
create index items_review on items (review_status, published_at desc);
create index items_published on items (published_at desc);
create index items_search on items using gin (search);
create index items_content_hash on items (content_hash);

create table item_analysis (
  item_id              bigint primary key references items(id) on delete cascade,
  countries            char(2)[] not null default '{}',
  themes               text[] not null default '{}',
  keywords             text[] not null default '{}',
  entities             jsonb not null default '[]',
  executive_summary    text not null,
  analyst_summary      text not null,
  alert_category       text not null,
  priority             text not null check (priority in ('high', 'medium', 'low')),
  is_commentary        boolean not null default false,
  confidence           int not null check (confidence between 0 and 100),
  verification_status  text not null check (verification_status in ('official', 'corroborated', 'single_source', 'unverified')),
  model                text not null,
  analysed_at          timestamptz not null default now()
);
create index item_analysis_countries on item_analysis using gin (countries);
create index item_analysis_themes on item_analysis using gin (themes);

-- Failed processing attempts, so a bad item doesn't block the queue forever
create table analysis_failures (
  item_id    bigint primary key references items(id) on delete cascade,
  attempts   int not null default 1,
  last_error text not null,
  last_at    timestamptz not null default now()
);

-- Events: one real-world development, reported by one or more items
create table events (
  id            bigserial primary key,
  headline      text not null,
  first_seen    timestamptz not null,
  last_updated  timestamptz not null,
  countries     char(2)[] not null default '{}',
  themes        text[] not null default '{}',
  priority      text not null check (priority in ('high', 'medium', 'low')),
  confidence    int not null,
  source_count  int not null default 1
);
create index events_last_updated on events (last_updated desc);

create table event_items (
  item_id   bigint primary key references items(id) on delete cascade,
  event_id  bigint not null references events(id) on delete cascade
);
create index event_items_event on event_items (event_id);

create table alerts (
  id          bigserial primary key,
  event_id    bigint references events(id) on delete cascade,
  priority    text not null check (priority in ('high', 'medium', 'low')),
  title       text not null,
  category    text not null,
  origin      text not null check (origin in ('rule', 'admin')),
  created_by  uuid,
  status      text not null default 'active' check (status in ('active', 'closed')),
  created_at  timestamptz not null default now(),
  unique (event_id)
);

-- Users, sessions, audit -----------------------------------------------------

create table users (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  password_hash      text not null,
  full_name          text not null,
  organisation       text not null,
  position           text not null,
  intended_use       text not null,
  role               text not null default 'registered' check (role in ('registered', 'analyst', 'senior_analyst', 'admin')),
  status             text not null default 'unverified' check (status in ('unverified', 'pending', 'approved', 'rejected', 'suspended')),
  email_verified_at  timestamptz,
  decided_by         uuid references users(id),
  decided_at         timestamptz,
  created_at         timestamptz not null default now()
);

create table email_tokens (
  token_hash  text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  purpose     text not null check (purpose in ('verify_email')),
  expires_at  timestamptz not null,
  used_at     timestamptz
);

create table sessions (
  token_hash  text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index sessions_user on sessions (user_id);

create table audit_log (
  id       bigserial primary key,
  user_id  uuid references users(id),
  action   text not null,
  target   text,
  detail   jsonb not null default '{}',
  at       timestamptz not null default now()
);
create index audit_log_at on audit_log (at desc);

alter table items add constraint items_reviewed_by_fk foreign key (reviewed_by) references users(id);
alter table alerts add constraint alerts_created_by_fk foreign key (created_by) references users(id);
