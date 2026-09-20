import { Component } from 'react'
import Button from './ui/Button'

export default class ErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="card card-body max-w-md w-full space-y-4">
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-lg font-bold"
              style={{
                backgroundColor: 'var(--color-primary-soft)',
                color: 'var(--color-primary)',
              }}
            >
              !
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-black)' }}>
              Something went wrong
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-black)', opacity: 0.7 }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={this.handleReload}>
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
