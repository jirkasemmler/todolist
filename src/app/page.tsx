"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase";

type Todo = {
  id: number;
  title: string;
  done: boolean;
  date: string;
  position: number;
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

  // Drag & drop state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Touch drag state
  const touchState = useRef<{
    id: number;
    startY: number;
    currentY: number;
    el: HTMLElement | null;
    clone: HTMLElement | null;
  } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const isToday = currentDate === formatDate(new Date());

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("date", currentDate)
      .order("position", { ascending: true });
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
    // Spočítej max position pro daný den
    const maxPos = todos.length > 0 ? Math.max(...todos.map((t) => t.position)) : -1;
    const { error } = await supabase
      .from("todos")
      .insert({ title: newTitle.trim(), date: currentDate, position: maxPos + 1 });
    if (error) { setError("Nepodařilo se přidat úkol."); return; }
    setNewTitle("");
    fetchTodos();
  }

  // Persist nové pořadí do DB — atomická transakce přes RPC
  async function updatePositions(reordered: Todo[]) {
    const todo_ids = reordered.map((t) => t.id);
    const new_positions = reordered.map((_, i) => i);
    const { error } = await supabase.rpc("reorder_todos", { todo_ids, new_positions });
    if (error) {
      setError("Nepodařilo se uložit pořadí.");
      fetchTodos();
    }
  }

  // Přesuň todo z fromIndex na toIndex
  function reorderTodos(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const reordered = [...todos];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setTodos(reordered);
    updatePositions(reordered);
  }

  // --- Desktop drag & drop handlery ---
  function handleDragStart(e: React.DragEvent, todoId: number) {
    setDraggedId(todoId);
    e.dataTransfer.effectAllowed = "move";
    // Průhledný drag image
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    }
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetIndex(index);
  }

  function handleDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault();
    if (draggedId == null) return;
    const fromIndex = todos.findIndex((t) => t.id === draggedId);
    reorderTodos(fromIndex, toIndex);
    setDraggedId(null);
    setDropTargetIndex(null);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDropTargetIndex(null);
  }

  // --- Touch drag handlery pro mobil ---
  function handleTouchStart(e: React.TouchEvent, todoId: number) {
    const touch = e.touches[0];
    // Najdi rodičovský <li> pro klon celého řádku
    const target = (e.currentTarget as HTMLElement).closest("li") as HTMLElement;
    if (!target) return;
    // Vytvoř vizuální klon
    const clone = target.cloneNode(true) as HTMLElement;
    clone.style.position = "fixed";
    clone.style.left = `${target.getBoundingClientRect().left}px`;
    clone.style.top = `${touch.clientY - 20}px`;
    clone.style.width = `${target.offsetWidth}px`;
    clone.style.opacity = "0.85";
    clone.style.pointerEvents = "none";
    clone.style.zIndex = "1000";
    clone.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    clone.style.borderRadius = "0.5rem";
    document.body.appendChild(clone);

    touchState.current = {
      id: todoId,
      startY: touch.clientY,
      currentY: touch.clientY,
      el: target,
      clone,
    };
    target.style.opacity = "0.3";
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchState.current || !listRef.current) return;
    const touch = e.touches[0];
    touchState.current.currentY = touch.clientY;

    // Posuň klon
    if (touchState.current.clone) {
      touchState.current.clone.style.top = `${touch.clientY - 20}px`;
    }

    // Zjisti nad kterým prvkem jsme
    const items = listRef.current.querySelectorAll("[data-todo-index]");
    let newDropIndex: number | null = null;
    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (touch.clientY > rect.top && touch.clientY < rect.bottom) {
        const idx = Number(item.getAttribute("data-todo-index"));
        newDropIndex = touch.clientY < midY ? idx : idx + 1;
      }
    });

    // Pokud jsme pod posledním prvkem
    if (newDropIndex === null && items.length > 0) {
      const lastRect = items[items.length - 1].getBoundingClientRect();
      if (touch.clientY > lastRect.bottom) {
        newDropIndex = todos.length;
      }
    }

    setDropTargetIndex(newDropIndex);
  }

  function handleTouchEnd() {
    if (!touchState.current) return;
    const { id, el, clone } = touchState.current;

    // Odstraň klon
    if (clone && clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
    // Obnov opacity
    if (el) {
      el.style.opacity = "1";
    }

    if (dropTargetIndex != null) {
      const fromIndex = todos.findIndex((t) => t.id === id);
      let toIndex = dropTargetIndex;
      // Korekce indexu pokud posouváme dolů
      if (toIndex > fromIndex) toIndex--;
      reorderTodos(fromIndex, toIndex);
    }

    touchState.current = null;
    setDraggedId(null);
    setDropTargetIndex(null);
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
            <ul ref={listRef} className="space-y-2">
              {todos.map((todo, index) => (
                <li
                  key={todo.id}
                  data-todo-index={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, todo.id)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 rounded-lg bg-white p-3 shadow-sm dark:bg-gray-900 transition-opacity ${
                    draggedId === todo.id ? "opacity-30" : ""
                  } ${
                    dropTargetIndex === index && draggedId !== todo.id
                      ? "border-t-2 border-blue-500"
                      : "border-t-2 border-transparent"
                  }`}
                >
                  {/* Drag handle */}
                  <button
                    type="button"
                    aria-label="Změnit pořadí"
                    tabIndex={0}
                    onTouchStart={(e) => handleTouchStart(e, todo.id)}
                    onTouchMove={(e) => handleTouchMove(e)}
                    onTouchEnd={handleTouchEnd}
                    className="shrink-0 cursor-grab touch-none select-none border-0 bg-transparent p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    title="Přetáhni pro změnu pořadí"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="5" cy="3" r="1.2" />
                      <circle cx="11" cy="3" r="1.2" />
                      <circle cx="5" cy="8" r="1.2" />
                      <circle cx="11" cy="8" r="1.2" />
                      <circle cx="5" cy="13" r="1.2" />
                      <circle cx="11" cy="13" r="1.2" />
                    </svg>
                  </button>
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
