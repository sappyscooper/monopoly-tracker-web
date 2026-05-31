export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex min-h-[48dvh] flex-col items-center justify-center text-center px-8 py-16 gap-4">
      <div className="text-5xl text-[#E8C96A]">{icon}</div>
      <div>
        <p className="text-xl font-bold text-white mb-1">{title}</p>
        <p className="secondary-text">{message}</p>
      </div>
      {action}
    </div>
  );
}
