import { useMemo } from 'react'
import { useAuth } from '@clerk/react'
import axios from 'axios'
import { useApiKeyStatus } from './apiKeyContext'

const baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000'

// Every /api/ai route sits behind the server's Clerk gate, so each request
// needs a fresh session token attached.
//
// The provider credentials ride along as headers, read from memory on each
// request. The server uses them for that one call and keeps nothing.
export const useApi = () => {
  const { getToken } = useAuth()
  const { credentials } = useApiKeyStatus()

  return useMemo(() => {
    const instance = axios.create({ baseURL })

    instance.interceptors.request.use(async (config) => {
      const token = await getToken()
      if (token) config.headers.Authorization = `Bearer ${token}`

      if (credentials?.apiKey) {
        config.headers['X-Api-Key'] = credentials.apiKey
        if (credentials.baseUrl) config.headers['X-Api-Base-Url'] = credentials.baseUrl
        if (credentials.model) config.headers['X-Api-Model'] = credentials.model
      }

      return config
    })

    return instance
  }, [getToken, credentials])
}

// Controllers answer with HTTP 200 and {success:false, message} on failure, so
// a rejected promise is not the only failure mode to handle.
export const unwrap = (data) => {
  if (!data?.success) throw new Error(data?.message || 'Request failed')
  return data
}
