export function MobileSkeleton() {
  return (
    <div class="p-4 animate-pulse space-y-4">
      <div class="h-6 bg-[#21262d] rounded w-1/2" />
      <div class="h-4 bg-[#21262d] rounded w-full" />
      <div class="h-4 bg-[#21262d] rounded w-4/5" />
      <div class="h-24 bg-[#21262d] rounded" />
    </div>
  );
}
