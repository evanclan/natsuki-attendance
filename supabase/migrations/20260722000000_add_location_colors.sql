-- Merge shift legend colours into the locations table.
--
-- SAFETY: this migration is additive only.
--   * It adds one nullable column to `locations` and fills it in.
--   * It never reads or writes the `shifts` table, so every existing shift keeps
--     the colour it already has (July 2026 and earlier, and the August 2026
--     shifts already prepared by the admin, are all untouched).
--   * No location row is renamed, deactivated or deleted.

alter table locations add column if not exists color text;

comment on column locations.color is
  'Shared colour for this location. NULL means the location is deliberately colourless (e.g. Academy) and is omitted from the printed legend.';

-- Backfill from the existing shift_legends entries, matched by name.
-- A legend where from = to is simply that location's colour.
-- A legend where from <> to corresponds to the "From→To" location the admin
-- already maintains by hand (e.g. legend Shimoarata→Academy = location "Shimoarata→Academy").
update locations l
set color = sl.color
from shift_legends sl
where l.color is null
  and lower(btrim(l.name)) = lower(btrim(
        case
            when sl.from_location = sl.to_location then sl.from_location
            else sl.from_location || '→' || sl.to_location
        end
  ));

-- The orphan "SSE" legend is the admin's abbreviation for Summer School Elementary:
-- all 35 of that location's shifts already carry this exact colour.
update locations
set color = '#fbf546'
where lower(btrim(name)) = 'summer school elementary'
  and color is null;

-- Remaining locations had no legend of their own. These are starting colours,
-- changeable at any time from Settings > Manage Locations.
update locations set color = '#c8b6ff' where lower(btrim(name)) = 'spring school' and color is null;
update locations set color = '#a0e7c5' where btrim(name) = '出張' and color is null;

-- Academy is intentionally left colourless (color stays NULL). It has never had a
-- legend entry, and 1,516 of its 1,524 shifts carry no colour at all.

-- NOTE: the shift_legends table is deliberately left in place as a backup of the
-- original colour assignments. Nothing reads from it after this change.
