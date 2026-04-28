-- Denní Todolist — initial schema
-- Spusť v Supabase SQL Editoru (DEV projekt)

CREATE TABLE todos (
  id integer generated always as identity primary key,
  title text not null,
  done boolean not null default false,
  date date not null,
  user_id uuid,
  created_at timestamptz not null default now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "todos_allow_all" ON todos FOR ALL USING (true) WITH CHECK (true);
