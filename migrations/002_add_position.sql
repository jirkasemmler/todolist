-- Přidání sloupce position pro řazení úkolů drag & drop
-- Spusť v Supabase SQL Editoru (DEV projekt)

ALTER TABLE todos ADD COLUMN position integer NOT NULL DEFAULT 0;

-- Existující řádky dostanou pořadí chronologicky podle created_at v rámci dne
UPDATE todos SET position = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY date ORDER BY created_at) - 1 AS rn
  FROM todos
) sub WHERE todos.id = sub.id;
