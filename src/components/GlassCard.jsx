export default function GlassCard({ children, className = '', tint }) {
  const tintClass = tint === 'gold' ? 'ring-1 ring-[#E8C96A]/20'
    : tint === 'blue' ? 'ring-1 ring-[#6EB5D4]/20'
    : tint === 'rose' ? 'ring-1 ring-[#E07B6A]/20'
    : 'ring-1 ring-white/8';
  return (
    <div className={`bg-[#1c1c22] rounded-2xl ${tintClass} shadow-xl ${className}`}>
      {children}
    </div>
  );
}
