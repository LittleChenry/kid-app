import { Component } from 'react';

interface Props { children: React.ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>出错了</h1>
          <pre style={{ fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
            style={{ marginTop: 16, padding: '8px 24px', fontSize: 16 }}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
