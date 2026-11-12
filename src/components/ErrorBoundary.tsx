import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-rose-50/70 border border-rose-200 rounded-2xl max-w-xl mx-auto my-12 select-none" dir="rtl">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-base font-black text-rose-950 mb-1.5">
            {this.props.fallbackTitle || 'حدث خطأ أثناء تحميل البيانات أو المخططات'}
          </h3>
          <p className="text-xs text-rose-700 leading-relaxed mb-6 font-medium">
            {this.state.error?.message || 'تعذر عرض هذه الصفحة. يرجى الضغط على زر التحديث أدناه.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw size={14} />
            <span>إعادة المحاولة والتحديث</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
