-- Transnational crime assessments. Claude drafts each one from approved reports;
-- it stays a draft, visible only on the review screen, until an analyst publishes it.
create table crime_assessments (
  id            bigserial primary key,
  country_iso   char(2) references countries(iso2),  -- null = regional (all PICTs)
  period_start  timestamptz not null,
  period_end    timestamptz not null,
  status        text not null default 'draft' check (status in ('draft', 'published', 'rejected')),
  content       jsonb not null,   -- bottom line, judgements, indicators, gaps, seizures; each finding cites report numbers
  sources       jsonb not null,   -- [{n, id, title, url, source, at, confidence}] snapshot of the reports given to the model
  model         text not null,
  drafted_by    uuid not null references users(id),
  drafted_at    timestamptz not null default now(),
  reviewed_by   uuid references users(id),
  reviewed_at   timestamptz,
  review_note   text
);
create index crime_assessments_status on crime_assessments (status, drafted_at desc);
