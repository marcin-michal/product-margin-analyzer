import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui/Button.tsx";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
  retryKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState((prev) => ({ error: null, retryKey: prev.retryKey + 1 }));
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-sm font-medium text-red-700">Something went wrong</p>
          <p className="max-w-md text-xs text-gray-500">{this.state.error.message}</p>
          <Button variant="secondary" size="sm" onClick={this.handleRetry}>
            Try again
          </Button>
        </div>
      );
    }

    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
