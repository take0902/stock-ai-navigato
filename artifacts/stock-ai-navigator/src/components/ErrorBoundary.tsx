import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center" data-testid="error-boundary-message">
          <div className="card border-red-500 text-red-600 dark:text-red-400 font-bold p-6">
            <p className="mb-4">申し訳ありません。予期せぬエラーが発生しました。</p>
            <button 
              className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg text-sm"
              onClick={() => this.setState({ hasError: false })}
            >
              再試行
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
