import React,{useState} from "react";
const Ctx=React.createContext(null);
export function DropdownMenu({children}){const [open,setOpen]=useState(false);return <Ctx.Provider value={{open,setOpen}}>{children}</Ctx.Provider>}
export function DropdownMenuTrigger({children,asChild=false}){const c=React.useContext(Ctx);return asChild?React.cloneElement(children,{onClick:e=>{children.props.onClick?.(e);c.setOpen(!c.open)}}):<button onClick={()=>c.setOpen(!c.open)}>{children}</button>}
export function DropdownMenuContent({children,className="",align="end"}){const c=React.useContext(Ctx);if(!c.open)return null;return <div className={`absolute z-[120] mt-2 ${align==="end"?"right-0":"left-0"} min-w-48 bg-white ${className}`}>{children}</div>}
export function DropdownMenuItem({children,onClick,...props}){const c=React.useContext(Ctx);return <button {...props} className={`w-full text-left px-3 py-2 hover:bg-neutral-100 ${props.className||""}`} onClick={e=>{onClick?.(e);c.setOpen(false)}}>{children}</button>}
export function DropdownMenuLabel({children,className=""}){return <div className={`px-3 py-2 text-sm ${className}`}>{children}</div>}
export function DropdownMenuSeparator(){return <div className="h-px bg-neutral-200"/>}
