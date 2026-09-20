import { forwardRef, useId } from 'react'
import { cn } from '../../utils/cn'

const Input = forwardRef(
  ({ label, error, hint, className, id: externalId, ...props }, ref) => {
    const generatedId = useId()
    const id = externalId ?? generatedId

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={id}
            className="text-xs font-medium"
            style={{ color: 'var(--color-black)' }}
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={id}
          className={cn(
            'input',
            error && 'error',
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          {...props}
        />

        {hint && !error && (
          <span
            id={`${id}-hint`}
            className="text-xs"
            style={{ color: 'var(--color-muted-dark)' }}
          >
            {hint}
          </span>
        )}

        {error && (
          <span
            id={`${id}-error`}
            className="text-xs"
            role="alert"
            style={{ color: 'var(--color-primary)' }}
          >
            {error}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
