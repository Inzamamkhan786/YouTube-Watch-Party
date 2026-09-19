interface LoadingSkeletonProps {
  className?: string
  label?: string
}

export default function LoadingSkeleton({ className = '', label = 'Loading' }: LoadingSkeletonProps) {
  return <div className={`skeleton ${className}`} role="status" aria-label={label} />
}
