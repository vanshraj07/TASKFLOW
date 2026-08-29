import React from "react";
import { Toaster as Sonner, toast } from "sonner";
export const Toaster=({...props})=><Sonner position="top-right" toastOptions={{classNames:{toast:"border-2 border-neutral-900 rounded-none shadow-[4px_4px_0_0_rgba(10,10,10,1)]",actionButton:"bg-[#FF4500] text-white"}}} {...props}/>;
export { toast };
