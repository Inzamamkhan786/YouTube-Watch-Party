export default function LoadingSkeleton({ className = '', label = 'Loading' }) {
  return <div className={`skeleton ${className}`} role="status" aria-label={label} />
}
