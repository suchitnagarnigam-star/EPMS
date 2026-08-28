import { useApi } from "../data/useApi";
import { fetchSyncStatus } from "../data/api";

export function SyncStatus() {
  const { data } = useApi(fetchSyncStatus);

  if (!data?.last_synced_at) return null;

  const date = new Date(data.last_synced_at);
  const formatted = date.toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  });

  return (
    <span className="text-xs text-gray-400 flex items-center gap-1.5">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
      Data as of {formatted} · {data.total_works} works
    </span>
  );
}
