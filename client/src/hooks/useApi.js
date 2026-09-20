import { useState, useCallback } from 'react'
import { AxiosError } from 'axios'

/**
 * Generic hook for wrapping API calls with loading / error / data state.
 */
export function useApi(fn) {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async (...args) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const response = await fn(...args)
        const data = response.data ?? null
        setState({ data, loading: false, error: null })
        return data
      } catch (err) {
        let message = 'An unexpected error occurred'
        if (err instanceof AxiosError) {
          const body = err.response?.data
          message = body?.error ?? err.message
        } else if (err instanceof Error) {
          message = err.message
        }
        setState((prev) => ({ ...prev, loading: false, error: message }))
        return null
      }
    },
    [fn]
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, execute, reset }
}
