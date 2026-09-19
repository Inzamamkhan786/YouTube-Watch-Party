import { Link } from 'react-router-dom'
import { ROUTES } from '../utils/constants'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-4 px-4"
      style={{ backgroundColor: 'var(--color-white)' }}
    >
      <p
        className="text-8xl font-bold select-none"
        style={{ color: 'var(--color-muted)' }}
      >
        404
      </p>
      <h1 className="text-xl font-semibold" style={{ color: 'var(--color-black)' }}>
        Page not found
      </h1>
      <p className="text-sm text-center max-w-xs" style={{ color: 'var(--color-black)', opacity: 0.5 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to={ROUTES.HOME}>
        <Button variant="primary" id="not-found-home-btn">
          Go to Home
        </Button>
      </Link>
    </div>
  )
}
