import { useState, useCallback } from 'react'
import { AxiosError } from 'axios'
import type { ApiResponse } from '../types/api'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | null>
  reset: () => void
}

/**
 * Generic hook for wrapping API calls with loading / error / data state.
 *
 * @example
 * const { data, loading, error, execute } = useApi(healthCheck)
 * useEffect(() => { execute() }, [execute])
 */
export function useApi<T>(
  fn: (...args: unknown[]) => Promise<ApiResponse<T>>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const response = await fn(...args)
        const data = response.data ?? null
        setState({ data, loading: false, error: null })
        return data
      } catch (err) {
        let message = 'An unexpected error occurred'
        if (err instanceof AxiosError) {
          const body = err.response?.data as ApiResponse | undefined
          message = body?.error ?? err.message
        } else if (err instanceof Error) {
          message = err.message
        }
        setState((prev) => ({ ...prev, loading: false, error: message }))
        return null
      }
    },
    // fn identity is the caller's responsibility to memoize if needed
    [fn]
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, execute, reset }
}
