export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-fg">O</span>
      <span className="text-[15px] font-semibold tracking-tight">
        Omni<span className="text-accent">Kink</span>List
      </span>
    </span>
  );
}
