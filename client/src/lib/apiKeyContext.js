import { createContext, useContext } from 'react'

// The API key lives here and nowhere else: plain React state, in memory, for
// the life of the page. It is deliberately NOT in localStorage, sessionStorage,
// a cookie or the server - a refresh wipes it, which is exactly what the UI
// promises the user. Don't add persistence here without changing that promise.
export const ApiKeyContext = createContext({
  credentials: null,
  setCredentials: () => {},
  clearCredentials: () => {},
})

export const useApiKeyStatus = () => useContext(ApiKeyContext)
