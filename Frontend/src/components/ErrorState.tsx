interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const isRenderColdStart = message.includes("fetch") || message.includes("network");

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center card p-8 m-6">
      <div className="text-4xl mb-3">⚡</div>
      <p className="font-semibold text-[15px] mb-1" style={{ color: 'var(--text-1)' }}>
        {isRenderColdStart ? "Server is waking up..." : "Failed to load data"}
      </p>
      <p className="text-[12px] mb-5 max-w-sm" style={{ color: 'var(--text-3)' }}>
        {isRenderColdStart
          ? "Render free-tier spins down after inactivity. This usually takes 20–30 seconds."
          : message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-accent px-5 py-2 text-[12px]"
        >
          Try again
        </button>
      )}
    </div>
  );
}
