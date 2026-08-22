import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  heading?: string;
}

export default function Card({ heading, className = '', children, ...props }: CardProps) {
  return (
    <div className={`card ${className}`} {...props}>
      {heading && <h3 className="card__heading">{heading}</h3>}
      {children}
    </div>
  );
}
