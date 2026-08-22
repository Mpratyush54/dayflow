import type { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'success' | 'error';
}

export default function Badge({ tone = 'neutral', className = '', children, ...props }: BadgeProps) {
  return (
    <span className={`badge badge--${tone} ${className}`} {...props}>
      {children}
    </span>
  );
}
