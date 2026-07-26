export function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1 text-gray-600 dark:text-gray-300">
        <span className="font-bold">{label}</span>
        <span className="font-bold">{score}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
        <div 
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}
