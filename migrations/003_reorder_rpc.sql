-- RPC funkce pro atomické přeřazení úkolů
-- Spusť v Supabase SQL Editoru (DEV projekt)

CREATE OR REPLACE FUNCTION reorder_todos(todo_ids int[], new_positions int[])
RETURNS void AS $$
BEGIN
  IF array_length(todo_ids, 1) != array_length(new_positions, 1) THEN
    RAISE EXCEPTION 'todo_ids and new_positions must have the same length';
  END IF;
  FOR i IN 1..array_length(todo_ids, 1) LOOP
    UPDATE todos SET position = new_positions[i] WHERE id = todo_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
