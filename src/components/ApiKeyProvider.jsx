import React, { useCallback, useMemo, useState } from 'react'
import { ApiKeyContext } from '../lib/apiKeyContext'

const ApiKeyProvider = ({ children }) => {

  // In-memory only. No localStorage, no sessionStorage, no cookie - a refresh
  // must lose this, because that is what the API Key page tells the user.
  const [credentials, setCredentialsState] = useState(null)

  const setCredentials = useCallback((next) => setCredentialsState(next), [])
  const clearCredentials = useCallback(() => setCredentialsState(null), [])

  const value = useMemo(
    () => ({ credentials, setCredentials, clearCredentials }),
    [credentials, setCredentials, clearCredentials]
  )

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
    </ApiKeyContext.Provider>
  )
}

export default ApiKeyProvider
