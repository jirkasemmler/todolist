"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

type Todo = {
  id: number;
  title: string;
  done: boolean;
  date: string;
  created_at: string;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("sv-SE");
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const supabase = createClient();

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [currentDate, setCurrentDate] = useState(() => formatDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isToday = currentDate === formatDate(new Date());

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("date", currentDate)
      .order("created_at", { ascending: true });
    if (error) {
      setError("Nepodařilo se načíst úkoly.");
    } else {
      setTodos(data ?? []);
    }
    setLoading(false);
  }, [currentDate]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  async function addTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const { error } = await supabase.from("todos").insert({ title: newTitle.trim(), date: currentDate });
    if (error) { setError("Nepodařilo se přidat úkol."); return; }
    setNewTitle("");
    fetchTodos();
  }

  async function toggleTodo(id: number, done: boolean) {
    const { error } = await supabase.from("todos").update({ done: !done }).eq("id", id);
    if (error) { setError("Nepodařilo se změnit stav úkolu."); return; }
    fetchTodos();
  }

  async function deleteTodo(id: number) {
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) { setError("Nepodařilo se smazat úkol."); return; }
    fetchTodos();
  }

  function shiftDate(days: number) {
    const date = new Date(currentDate + "T00:00:00");
    date.setDate(date.getDate() + days);
    setCurrentDate(formatDate(date));
  }

  const doneCount = todos.filter((t) => t.done).length;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Můj todolist
        </h1>

        {/* Navigace mezi dny */}
        <div className="mb-6 flex items-center justify-between rounded-lg bg-white p-3 shadow-sm dark:bg-gray-900">
          <button
            onClick={() => shiftDate(-1)}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            ← Včera
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatDisplayDate(currentDate)}
            </div>
            {!isToday && (
              <button
                onClick={() => setCurrentDate(formatDate(new Date()))}
                className="mt-0.5 text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                Dnes
              </button>
            )}
          </div>
          <button
            onClick={() => shiftDate(1)}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Zítra →
          </button>
        </div>

        {/* Přidání úkolu */}
        <form onSubmit={addTodo} className="mb-6 flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nový úkol..."
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Přidat
          </button>
        </form>

        {/* Chyba */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Seznam úkolů */}
        {loading ? (
          <p className="text-center text-sm text-gray-500">Načítám...</p>
        ) : todos.length === 0 ? (
          <p className="text-center text-sm text-gray-500">
            Žádné úkoly na tento den.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm dark:bg-gray-900"
                >
                  <button
                    onClick={() => toggleTodo(todo.id, todo.done)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      todo.done
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {todo.done && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      todo.done
                        ? "text-gray-400 line-through dark:text-gray-500"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {todo.title}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-center text-xs text-gray-400">
              {doneCount}/{todos.length} splněno
            </p>
          </>
        )}
      </div>
    </main>
  );
}
