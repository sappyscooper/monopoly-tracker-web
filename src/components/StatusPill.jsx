export default function StatusPill({ active, children }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
      active
        ? 'bg-[#E8C96A]/15 text-[#E8C96A] ring-1 ring-[#E8C96A]/30'
        : 'bg-white/8 text-[#8E8E93] ring-1 ring-white/15'
    }`}>
      {children || (active ? '● Active' : '✓ Ended')}
    </span>
  );
}
