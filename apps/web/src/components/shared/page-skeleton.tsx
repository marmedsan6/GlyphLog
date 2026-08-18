export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-[2px] bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded-[2px] bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-[2px] bg-muted" />
      </div>
      <div className="space-y-4">
        <div className="h-12 w-full animate-pulse rounded-[2px] bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-[2px] border">
              <div className="aspect-[3/4] animate-pulse bg-muted" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 animate-pulse rounded-[2px] bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded-[2px] bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
