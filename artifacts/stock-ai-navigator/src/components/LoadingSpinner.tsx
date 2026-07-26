export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 h-64">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      {message && <p className="mt-4 text-sm font-bold text-gray-500">{message}</p>}
    </div>
  );
}
