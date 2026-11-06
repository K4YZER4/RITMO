import type { ReactNode } from 'react';
export function Page({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <>
      <div className="page-title">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
        </div>
        {action}
      </div>
      {children}
    </>
  );
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <DumbbellIcon />
      <p>{children}</p>
    </div>
  );
}
function DumbbellIcon() {
  return <span className="empty-icon">↗</span>;
}
export function Loading() {
  return (
    <div className="loading">
      <i />
      <i />
      <i />
    </div>
  );
}
export const fullName = (u: { nombre: string; apellidoPaterno: string }) =>
  `${u.nombre} ${u.apellidoPaterno}`;
