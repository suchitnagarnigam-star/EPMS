interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const isRenderColdStart = message.includes("fetch") || message.includes("network");

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">⚡</div>
      <p className="text-gray-600 font-medium mb-1">
        {isRenderColdStart ? "Server is waking up…" : "Failed to load data"}
      </p>
      <p className="text-sm text-gray-400 mb-4 max-w-sm">
        {isRenderColdStart
          ? "Render free-tier spins down after inactivity. This usually takes 20–30 seconds."
          : message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}
