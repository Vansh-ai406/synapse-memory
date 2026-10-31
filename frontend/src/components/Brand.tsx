export default function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M9 23V9h8a5 5 0 0 1 0 10h-2l8 5M9 16h8" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="24" cy="8" r="3" fill="currentColor"/></svg></span>{!compact && <span>Recall<span className="brand-os">OS</span></span>}</div>
}
