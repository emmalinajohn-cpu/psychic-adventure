-- Map layers and locations for each processed item.
alter table item_analysis add column map_layers text[] not null default '{}';
alter table item_analysis add column location_name text;
create index item_analysis_layers on item_analysis using gin (map_layers);

-- Coordinates published by the source itself (e.g. GDACS), when present
alter table items add column geo_lat double precision;
alter table items add column geo_lon double precision;
