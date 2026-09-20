export default function Toast({ message, onDismiss }) {
  if (!message) return null

  return (
    <div className="toast" role="alert">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification">
        Dismiss
      </button>
    </div>
  )
}
