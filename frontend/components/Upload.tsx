"use client";

import { useCallback, useRef, useState } from "react";

interface UploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export default function Upload({ value, onChange, disabled }: UploadProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      // Accept anything the user drops; the backend expects a PDF but we let
      // it surface the real error rather than blocking at the UI.
      onChange(file);
    },
    [onChange],
   );

  return (
    <div
       onDragOver={(e) => {
         e.preventDefault();
         if (!disabled) setDragging(true);
       }}
       onDragLeave={() => setDragging(false)}
       onDrop={(e) => {
         e.preventDefault();
         setDragging(false);
         if (disabled) return;
         accept(e.dataTransfer.files?.[0]);
       }}
       onClick={() => !disabled && inputRef.current?.click()}
       className={[
         "rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition",
         dragging
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-300 hover:border-indigo-400 bg-white",
         disabled ? "opacity-50 cursor-not-allowed" : "",
       ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => accept(e.target.files?.[0])}
         />
        <div className="text-slate-500 text-sm mb-2">
           <svg
             className="mx-auto h-10 w-10 text-indigo-500"
             fill="none"
             stroke="currentColor"
             strokeWidth={1.5}
             viewBox="0 0 24 24"
             aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 4.5 4.5 0 011.41-8.775M17.25 19.5A4.5 4.5 0 0018.66 10.725a4.5 4.5 0 00-1.41-8.775"
               />
            </svg>
         </div>
         {value ? (
           <p className="text-sm font-medium text-indigo-600">
             {value.name} · {(value.size / 1024).toFixed(0)} KB
           </p>
         ) : (
           <p className="text-sm text-slate-600">
             <span className="font-medium text-indigo-600">Click to upload</span>{" "}
             or drag and drop a CV (PDF)
           </p>
         )}
       </div>
   );
}
