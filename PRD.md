# PRD: Denní Todolist

## Problém
Potřebuju jednoduchý přehled úkolů na konkrétní den — co mám dnes udělat, co jsem splnil, co zbývá.

## Cílový uživatel
Jeden uživatel (já), bez nutnosti přihlášení.

## User Stories
- Jako uživatel chci přidat úkol na konkrétní den, abych si naplánoval co mám udělat
- Jako uživatel chci vidět seznam úkolů na dnešní den, abych věděl co mě čeká
- Jako uživatel chci označit úkol jako hotový, abych viděl svůj pokrok
- Jako uživatel chci smazat úkol, abych se zbavil neaktuálních položek
- Jako uživatel chci přepínat mezi dny, abych viděl úkoly na zítra nebo včera

## MVP Scope

### In scope
- Přidat úkol s textem a datem
- Zobrazit úkoly na vybraný den (default: dnes)
- Označit úkol jako hotový / vrátit zpět
- Smazat úkol
- Navigace mezi dny (dopředu/dozadu, dnes)

### Out of scope
- Kategorie / štítky
- Opakující se úkoly
- Priorita / řazení drag & drop
- Auth / login
- Notifikace / remindery

## Datový model

### Tabulka: todos
| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | integer (PK, generated always as identity) | Unikátní ID |
| title | text NOT NULL | Text úkolu |
| done | boolean NOT NULL DEFAULT false | Stav splnění |
| date | date NOT NULL | Den, ke kterému úkol patří |
| user_id | uuid | Pro budoucí auth (auth.users reference) |
| created_at | timestamptz NOT NULL DEFAULT now() | Čas vytvoření |

## SQL pro Supabase

```sql
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
```
