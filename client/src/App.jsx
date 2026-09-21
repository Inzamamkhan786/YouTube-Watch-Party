import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import MainLayout from './layouts/MainLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import NotFoundPage from './pages/NotFoundPage'
import CreateRoomPage from './pages/CreateRoomPage'
import JoinRoomPage from './pages/JoinRoomPage'
import RoomPage from './pages/RoomPage'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { ROUTES } from './utils/constants'

/**
 * Application router with authentication and layout wrapping.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public shell */}
              <Route element={<MainLayout />}>
                <Route path={ROUTES.HOME} element={<HomePage />} />
                <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
                <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />
                <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
                <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route path={ROUTES.ROOMS_CREATE} element={<CreateRoomPage />} />
                  <Route path={ROUTES.ROOMS_JOIN} element={<JoinRoomPage />} />
                  <Route path={ROUTES.ROOM} element={<RoomPage />} />
                  <Route path="/rooms/create" element={<Navigate to={ROUTES.ROOMS_CREATE} replace />} />
                  <Route path="/rooms/join" element={<Navigate to={ROUTES.ROOMS_JOIN} replace />} />
                </Route>
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AppProvider>
    </ErrorBoundary>
  )
}
