import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'outline' | 'text';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary: 'btn btn--primary',
  outline: 'btn btn--outline',
  text: 'btn btn--text',
};

export default function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button className={`${styles[variant]} ${className}`} {...props} />;
}
