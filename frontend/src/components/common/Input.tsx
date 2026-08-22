import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function Input({ label, id, className = '', ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <input id={inputId} className={`input ${className}`} {...props} />
    </div>
  );
}
