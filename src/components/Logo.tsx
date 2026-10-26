// Pacific Watchmen "Horizon" mark: a sun on the horizon under a watch arc, over the sea.
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Pacific Watchmen">
      <rect x="6" y="6" width="108" height="108" rx="26" fill="#0B1726" stroke="#1E3A5F" strokeWidth="2" />
      <path d="M24 66 A36 36 0 0 1 96 66" fill="none" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M38 66 A22 22 0 0 1 82 66" fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <circle cx="60" cy="58" r="7" fill="#FBBF24" />
      <path d="M20 76 L36 92 L48 78 L60 92 L72 78 L84 92 L100 76" fill="none" stroke="#E2E8F0" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-3">
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold text-ink">Pacific Watchmen</span>
        <span className="block font-mono text-[10px] tracking-[0.22em] text-muted">OSINT · PACIFIC SECURITY INTELLIGENCE</span>
      </span>
    </span>
  );
}
