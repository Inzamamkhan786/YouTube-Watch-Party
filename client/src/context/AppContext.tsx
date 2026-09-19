import { createContext, useContext, useState, type ReactNode } from 'react'

/**
 * Global app state.
 * Expanded in Module 2 (auth) and later modules.
 */
interface AppState {
  /** Authenticated user — null when logged out. Populated in Module 2. */
  user: null
}

interface AppContextValue extends AppState {
  // Actions are added module by module
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [user] = useState<null>(null)

  return (
    <AppContext.Provider value={{ user }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used inside <AppProvider>')
  }
  return ctx
}
