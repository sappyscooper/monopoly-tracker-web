export default function GlassCard({ children, className = '', tint }) {
  const tintClass = tint === 'gold' ? 'border-[#E8C96A]/25 bg-[#E8C96A]/[0.055]'
    : tint === 'blue' ? 'border-[#6EB5D4]/25 bg-[#6EB5D4]/[0.055]'
    : tint === 'rose' ? 'border-[#E07B6A]/25 bg-[#E07B6A]/[0.055]'
    : '';
  return (
    <div className={`card ${tintClass} ${className}`}>
      {children}
    </div>
  );
}
