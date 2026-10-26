import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-3xl bg-slate-950 border border-rose-500/40 text-right space-y-4 shadow-2xl my-4 max-w-xl mx-auto">
          <div className="flex items-center gap-3 text-rose-400">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">تنبيه أمان: تم احتواء خطأ في هذه النافذة</h3>
              <p className="text-xs text-slate-400 mt-0.5">النظام يعمل ومحمي، انقر على زر الاستعادة للمتابعة</p>
            </div>
          </div>

          {this.state.error && (
            <div className="p-3 rounded-xl bg-slate-900 border border-white/10 font-mono text-xs text-rose-300 overflow-x-auto">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <button
            type="button"
            onClick={this.handleReset}
            className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة واجهة العمل 🔄</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
