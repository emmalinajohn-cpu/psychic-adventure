-- AI Analyst questions and answers. Each answer keeps a snapshot of the reports
-- it was given, so a citation still resolves after the underlying item changes.
create table analyst_queries (
  id             bigserial primary key,
  user_id        uuid not null references users(id),
  question       text not null,
  filters        jsonb not null default '{}',
  status         text not null check (status in ('answered', 'no_sources', 'declined', 'error')),
  answer         jsonb not null default '[]',  -- [{text, sources: [n, ...]}]
  sources        jsonb not null default '[]',  -- [{n, id, title, url, source, at, confidence}]
  model          text,
  input_tokens   int,
  output_tokens  int,
  error          text,
  created_at     timestamptz not null default now()
);
create index analyst_queries_user on analyst_queries (user_id, created_at desc);
