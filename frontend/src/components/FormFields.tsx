import React from "react";

interface FieldWrapperProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}

function FieldWrapper({ label, error, children, hint }: FieldWrapperProps) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-medium text-slate-600">{label}</span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-500">{error}</span> : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-harbor-200 transition-shadow";

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, className = "", ...rest }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint}>
      <input
        ref={ref}
        className={`${inputBase} ${error ? "border-rose-400" : "border-slate-200"} ${className}`}
        {...rest}
      />
    </FieldWrapper>
  )
);
TextField.displayName = "TextField";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className = "", ...rest }, ref) => (
    <FieldWrapper label={label} error={error}>
      <textarea
        ref={ref}
        rows={3}
        className={`${inputBase} resize-none ${error ? "border-rose-400" : "border-slate-200"} ${className}`}
        {...rest}
      />
    </FieldWrapper>
  )
);
TextAreaField.displayName = "TextAreaField";

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { label: string; value: string }[];
  placeholder?: string;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, options, placeholder, className = "", ...rest }, ref) => (
    <FieldWrapper label={label} error={error}>
      <select
        ref={ref}
        className={`${inputBase} ${error ? "border-rose-400" : "border-slate-200"} ${className}`}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  )
);
SelectField.displayName = "SelectField";
