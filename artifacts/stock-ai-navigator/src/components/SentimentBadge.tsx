export function SentimentBadge({ sentiment }: { sentiment: "ポジティブ" | "中立" | "ネガティブ" }) {
  const colors = {
    "ポジティブ": "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    "中立": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    "ネガティブ": "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${colors[sentiment]}`}>
      {sentiment}
    </span>
  );
}
