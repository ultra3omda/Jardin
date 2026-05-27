'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * React class error boundary — catches rendering errors in child subtrees.
 * Displays a centered fallback card with a reload action.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Structured log — swap for Sentry.captureException in V11
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-[320px] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-paper-100 bg-white p-8 shadow-sm text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ambre-50"
            aria-hidden="true"
          >
            <svg
              className="h-6 w-6 text-ambre-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>

          <h2 className="mb-2 text-lg font-semibold text-navy-900">
            Une erreur est survenue
          </h2>

          {this.state.error?.message && (
            <p className="mb-6 text-sm text-ink-500 font-mono break-words">
              {this.state.error.message}
            </p>
          )}

          <Button onClick={this.handleReload} className="w-full">
            Recharger la page
          </Button>
        </div>
      </div>
    );
  }
}

/**
 * HOC convenience wrapper — wraps any component in an ErrorBoundary.
 *
 * @example
 * const SafeStudentList = withErrorBoundary(StudentList);
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode,
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName ?? Component.name ?? 'Component'})`;
  return WrappedComponent;
}
