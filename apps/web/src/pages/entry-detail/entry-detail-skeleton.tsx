export function EntryDetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-40 rounded bg-muted" />
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="aspect-[3/4] rounded-md bg-muted" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 rounded bg-muted" />
          <div className="h-6 w-1/2 rounded bg-muted" />
          <div className="h-6 w-1/3 rounded bg-muted" />
          <div className="h-32 w-full rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
