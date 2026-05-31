export default function StatusPill({ active }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
      active
        ? 'bg-[#E8C96A]/15 text-[#E8C96A] ring-1 ring-[#E8C96A]/30'
        : 'bg-white/8 text-[#8E8E93] ring-1 ring-white/15'
    }`}>
      {active ? '● Active' : '✓ Ended'}
    </span>
  );
}
