import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[10px] font-bold uppercase text-grayscale-500 tracking-wider">
        {label}
      </label>
      <input
        ref={ref}
        {...props}
        className={`w-full px-4 py-3 rounded-lg border bg-grayscale-white text-sm text-grayscale-600 transition-all outline-none
          ${error ? 'border-feedback-danger focus:ring-1 focus:ring-feedback-danger' : 'border-grayscale-200 focus:border-blue-base focus:ring-1 focus:ring-blue-base'}`}
      />
      {error && <span className="text-feedback-danger text-xs font-semibold">{error}</span>}
    </div>
  );
});

Input.displayName = "Input";