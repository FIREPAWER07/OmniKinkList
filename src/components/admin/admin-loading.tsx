export function AdminLoading() {
  return (
    <div aria-busy="true" className="grid animate-pulse gap-4">
      <div className="h-8 w-64 rounded-lg bg-surface-2" />
      <div className="h-24 rounded-xl bg-surface-2" />
      <div className="h-24 rounded-xl bg-surface-2" />
      <div className="h-24 rounded-xl bg-surface-2" />
    </div>
  );
}
