import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DialogCtx = React.createContext(null);

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <DialogCtx.Provider value={{ onOpenChange }}>
      <div
        className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-in fade-in"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onOpenChange?.(false);
        }}
      >
        {children}
      </div>
    </DialogCtx.Provider>
  );
}

export function DialogContent({ children, className = "", ...props }) {
  const ctx = React.useContext(DialogCtx);
  return (
    <div
      {...props}
      className={cn(
        "relative w-full max-w-lg bg-white p-8 shadow-[8px_8px_0_0_rgba(10,10,10,1)] border-2 border-neutral-900 rounded-md",
        className
      )}
    >
      {children}
      {/* Auto close button */}
      <button
        onClick={() => ctx?.onOpenChange?.(false)}
        className="absolute top-4 right-4 p-1 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close"
      >
        <X size={20} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function DialogHeader({ children, className = "" }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function DialogTitle({ children, asChild = false, className = "", ...props }) {
  return asChild ? (
    children
  ) : (
    <h2 {...props} className={className}>
      {children}
    </h2>
  );
}

export function DialogClose({ onClose, className = "" }) {
  return (
    <button
      onClick={onClose}
      className={cn(
        "absolute top-4 right-4 p-1 opacity-70 hover:opacity-100 transition-opacity",
        className
      )}
      aria-label="Close"
    >
      <X size={20} strokeWidth={2.5} />
    </button>
  );
}

export function DialogTrigger({ children, asChild = false, ...props }) {
  return asChild ? React.cloneElement(children, props) : <button {...props}>{children}</button>;
}
