// App.jsx
// Root component. Sets up React Router with all page routes.
// Auth state is held here and passed down via context so all pages can read it.

import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Task from './pages/Task'
import Profile from './pages/Profile'

// -------------------------------------------------------------------------
// Auth context — provides { user, setUser, loading } to the whole tree
// -------------------------------------------------------------------------

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// -------------------------------------------------------------------------
// Route guard — redirects unauthenticated users to /login
// -------------------------------------------------------------------------

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}

// -------------------------------------------------------------------------
// App
// -------------------------------------------------------------------------

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, check if a session cookie is already valid
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { setUser(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile/:username" element={<Profile />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/task/:id" element={<PrivateRoute><Task /></PrivateRoute>} />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
