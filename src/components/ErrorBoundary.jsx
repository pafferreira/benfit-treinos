import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '1rem',
                    margin: '0.5rem 0',
                    border: '1px solid #EF4444',
                    borderRadius: '0.5rem',
                    backgroundColor: '#FEF2F2',
                    color: '#B91C1C',
                    fontSize: '0.875rem'
                }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>Erro ao renderizar exercício</h4>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                        {this.state.error && this.state.error.toString()}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
