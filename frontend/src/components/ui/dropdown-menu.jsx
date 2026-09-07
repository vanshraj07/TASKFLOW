import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const Ctx = React.createContext(null);

export function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        contentRef.current &&
        !contentRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <Ctx.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      <div className="relative">{children}</div>
    </Ctx.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild = false }) {
  const c = React.useContext(Ctx);

  const handleClick = useCallback(
    (e) => {
      children.props.onClick?.(e);
      c.setOpen(!c.open);
    },
    [c, children.props] // eslint-disable-line
  );

  if (asChild) {
    return React.cloneElement(children, {
      ref: c.triggerRef,
      onClick: handleClick,
    });
  }
  return (
    <button ref={c.triggerRef} onClick={() => c.setOpen(!c.open)}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  className = "",
  align = "end",
  sideOffset = 4,
  ...props
}) {
  const c = React.useContext(Ctx);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!c.open || !c.triggerRef.current) return;

    const updatePosition = () => {
      const rect = c.triggerRef.current.getBoundingClientRect();

      setPos({
        top: rect.bottom + sideOffset,
        left: align === "end" ? rect.right : rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    requestAnimationFrame(updatePosition);

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [c.open, c.triggerRef, align, sideOffset]);

  if (!c.open) return null;

  const style = {
    position: "fixed",
    zIndex: 150,
    top: pos.top,
  };

  if (align === "end") {
    style.right = window.innerWidth - pos.left;
  } else {
    style.left = pos.left;
  }

  return createPortal(
    <div ref={c.contentRef} {...props} style={style} className={`min-w-[180px] bg-white ${className}`}>
      {children}
    </div>,
    document.body
  );
}

export function DropdownMenuItem({ children, onClick, ...props }) {
  const c = React.useContext(Ctx);
  return (
    <button
      {...props}
      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-100 flex items-center transition-colors ${props.className || ""}`}
      onClick={(e) => {
        onClick?.(e);
        c.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ children, className = "" }) {
  return <div className={`px-4 py-2.5 text-sm font-semibold ${className}`}>{children}</div>;
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-neutral-200 mx-2" />;
}
