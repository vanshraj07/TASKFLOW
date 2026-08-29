import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const Ctx = React.createContext(null);

export function Popover({ children }) {
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

export function PopoverTrigger({ children, asChild = false, ...props }) {
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
      ...props,
      ref: c.triggerRef,
      onClick: handleClick,
    });
  }
  return (
    <button ref={c.triggerRef} {...props} onClick={() => c.setOpen(!c.open)}>
      {children}
    </button>
  );
}

export function PopoverContent({
  children,
  className = "",
  align = "center",
  sideOffset = 4,
  ...props
}) {
  const c = React.useContext(Ctx);
  const [pos, setPos] = useState({ top: 0, left: 0, side: "bottom" });

  useEffect(() => {
    if (!c.open || !c.triggerRef.current) return;

    const updatePosition = () => {
      const rect = c.triggerRef.current.getBoundingClientRect();
      const contentEl = c.contentRef.current;
      const contentHeight = contentEl ? contentEl.offsetHeight : 300;

      /* Decide: open below or above? */
      const spaceBelow = window.innerHeight - rect.bottom - sideOffset;
      const spaceAbove = rect.top - sideOffset;
      const side =
        spaceBelow >= contentHeight || spaceBelow >= spaceAbove
          ? "bottom"
          : "top";

      let left;
      if (align === "end") {
        left = rect.right;
      } else if (align === "start") {
        left = rect.left;
      } else {
        left = rect.left + rect.width / 2;
      }

      setPos({
        top: side === "bottom" ? rect.bottom + sideOffset : rect.top - sideOffset,
        left,
        width: rect.width,
        side,
      });
    };

    /* Run twice: once to mount, once to measure */
    updatePosition();
    requestAnimationFrame(updatePosition);

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [c.open, c.triggerRef, align, sideOffset, c.contentRef]);

  if (!c.open) return null;

  const style = {
    position: "fixed",
    zIndex: 150,
  };

  if (pos.side === "bottom") {
    style.top = pos.top;
  } else {
    style.bottom = window.innerHeight - pos.top;
  }

  if (align === "end") {
    style.right = window.innerWidth - pos.left;
  } else if (align === "start") {
    style.left = pos.left;
  } else {
    style.left = pos.left;
    style.transform = "translateX(-50%)";
  }

  return createPortal(
    <div ref={c.contentRef} {...props} style={style} className={className}>
      {children}
    </div>,
    document.body
  );
}
