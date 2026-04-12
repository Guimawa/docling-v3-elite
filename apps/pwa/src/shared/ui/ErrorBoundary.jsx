import { Component } from 'react'
import * as Sentry from '@sentry/react'
import { RotateCcw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center">
            <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center">
              <RotateCcw size={28} className="text-white" />
            </div>

            <h1 className="text-xl font-black text-text-primary mb-2">
              Quelque chose s'est mal passé
            </h1>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Une erreur inattendue est survenue. Vous pouvez essayer de recharger
              la page ou revenir à l'accueil.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs text-red-400/80 bg-stone-100 border border-border rounded-xl p-3 mb-6 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-cta-hover
                  text-white rounded-xl font-bold text-sm transition-colors"
              >
                <RotateCcw size={16} />
                Réessayer
              </button>
              <a
                href="/"
                className="flex items-center px-5 py-3 bg-surface hover:bg-stone-200
                  text-text-primary rounded-xl font-bold text-sm border border-border transition-colors"
              >
                Accueil
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
