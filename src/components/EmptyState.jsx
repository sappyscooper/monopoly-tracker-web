export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-8 gap-4">
      <div className="text-5xl">{icon}</div>
      <div>
        <p className="text-lg font-bold text-white mb-1">{title}</p>
        <p className="text-sm text-[#8E8E93]">{message}</p>
      </div>
      {action}
    </div>
  );
}
