// The SafeShare logo: the bar mark (a redaction bar with a marigold square at
// its bottom-right corner) beside the name. Same mark as the app icon.

/** The bar mark on its own. In secure mode (dark) the bar turns off-white so it stays visible. */
export function BarMark({ dark = false, className = 'h-[0.7em] w-auto' }: { dark?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 40 18" className={className} aria-hidden="true">
      <rect width="40" height="18" fill={dark ? '#f4f1ea' : '#111111'} />
      <rect x="31" y="9" width="9" height="9" fill="#f5a524" />
    </svg>
  )
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`flex items-center gap-2 font-display text-[22px] font-extrabold tracking-tight ${dark ? 'text-paper' : 'text-ink'}`}>
      <BarMark dark={dark} className="h-[15px] w-auto" />
      SafeShare
    </span>
  )
}
