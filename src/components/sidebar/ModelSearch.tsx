import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { useMainContext } from "../../context/MainContext";

export const ModelSearch = observer(() => {
  const stateManager = useMainContext();
  const { sideBarManager } = stateManager.designManager;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = sideBarManager.searchModels(query);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (index: number) => {
    const model = results[index];
    if (!model) return;
    sideBarManager.selectModelFromSearch(model);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      choose(active);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        aria-label="Search model"
        type="text"
        value={query}
        placeholder="AC-06-J7"
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 py-2 pl-9 pr-3"
      />
      {open && query.trim() && (
        <ul className="absolute left-0 right-0 mt-1 max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg z-20">
          {results.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-500">No models found</li>
          )}
          {results.map((m, i) => (
            <li
              key={m.id}
              ref={i === active ? activeRef : null}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(i);
              }}
              className={`px-3 py-2 text-xs cursor-pointer ${i === active ? "bg-blue-50" : ""}`}
            >
              <div className="font-medium text-gray-800">{m.id}</div>
              <div className="text-[10px] text-gray-500">
                {m.name !== m.id ? `${m.name} · ` : ""}
                {m.category}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
