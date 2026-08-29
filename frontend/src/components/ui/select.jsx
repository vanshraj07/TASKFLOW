import React, { useState, useRef, useEffect, useCallback } from "react";

const Ctx = React.createContext(null);

export function Select({ value, onValueChange, children }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(new Map());

  const registerItem = useCallback((val, label) => {
    setItems((prev) => {
      if (prev.get(val) === label) return prev;
      const next = new Map(prev);
      next.set(val, label);
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ value, onValueChange, open, setOpen, items, registerItem }}>
      <div className="relative">{children}</div>
    </Ctx.Provider>
  );
}

export function SelectTrigger({ children, className = "", ...props }) {
  const c = React.useContext(Ctx);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!c.open) return;
    const handler = (e) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.closest(".relative")?.contains(e.target)
      ) {
        c.setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [c.open, c]);

  return (
    <button
      ref={wrapperRef}
      type="button"
      {...props}
      className={`w-full text-left bg-transparent h-9 px-3 border text-sm flex items-center justify-between gap-2 ${className}`}
      onClick={() => c.setOpen(!c.open)}
    >
      <span className="flex-1 min-w-0">{children}</span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        className={`shrink-0 transition-transform duration-150 ${c.open ? "rotate-180" : ""}`}
      >
        <path
          d="M3 4.5L6 7.5L9 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function SelectValue({ placeholder }) {
  const c = React.useContext(Ctx);
  const label = c.items.get(c.value);
  if (!label && !c.value) {
    return <span className="text-neutral-500">{placeholder || ""}</span>;
  }
  return <span>{label || c.value}</span>;
}

export function SelectContent({ children, className = "" }) {
  const c = React.useContext(Ctx);
  return (
    <>
      {/* Hidden mount so items can register labels before dropdown opens */}
      {!c.open && (
        <div style={{ display: "none" }} aria-hidden="true">
          {children}
        </div>
      )}
      {c.open && (
        <div
          className={`absolute z-[120] left-0 right-0 mt-1 bg-white border-2 border-neutral-900 brutal-shadow-sm ${className}`}
          style={{ maxHeight: "240px", overflowY: "auto" }}
        >
          {children}
        </div>
      )}
    </>
  );
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
    <path
      d="M3 7.5L5.5 10L11 4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function SelectItem({ value, children }) {
  const c = React.useContext(Ctx);
  const isSelected = c.value === value;

  useEffect(() => {
    c.registerItem(value, children);
  }, [value, children]); // eslint-disable-line

  return (
    <button
      type="button"
      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
        isSelected
          ? "bg-neutral-100 font-semibold"
          : "hover:bg-neutral-50"
      }`}
      onClick={() => {
        c.onValueChange(value);
        c.setOpen(false);
      }}
    >
      <span className="flex-1 min-w-0">{children}</span>
      {isSelected && <CheckIcon />}
    </button>
  );
}
