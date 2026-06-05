import { Component } from "react";

export class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "24px", color: "#ef4444", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fee2e2", margin: "20px" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 600 }}>组件渲染崩溃</h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "14px", opacity: 0.85 }}>{this.state.error?.message || String(this.state.error)}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "6px 12px",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            尝试重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
