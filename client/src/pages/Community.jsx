import { useUser } from '@clerk/react';
import React, { useEffect, useState } from 'react'
import { Heart } from 'lucide-react';
import { useApi, unwrap } from '../lib/useApi'

const Community = () => {

  const [creations, setCreations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [pendingId, setPendingId] = useState(null)
  const {user} = useUser()

  const api = useApi()

  const toggleLike = async (id) => {
    setPendingId(id)
    setError("")

    try {
      const { data } = await api.post('/api/ai/toggle-like-creation', { id })
      unwrap(data)

      // Mirror the server's toggle locally instead of refetching the whole list.
      setCreations(prev => prev.map(creation => {
        if(creation.id !== id) return creation
        const likes = creation.likes ?? []
        return {
          ...creation,
          likes: likes.includes(user.id)
            ? likes.filter(u => u !== user.id)
            : [...likes, user.id],
        }
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingId(null)
    }
  }

  const userId = user?.id

  useEffect(() => {
    if(!userId) return

    let cancelled = false

    const fetchCreations = async() => {
      try {
        const { data } = await api.get('/api/ai/get-published-creations')
        if(!cancelled) setCreations(unwrap(data).creations)
      } catch (err) {
        if(!cancelled) setError(err.message)
      } finally {
        if(!cancelled) setLoading(false)
      }
    }

    fetchCreations()
    return () => { cancelled = true }
  },[userId, api])

  return (
    <div className='flex-1 h-full flex flex-col gap-4 p-6'>
      Creations

      {error && <p className='text-sm text-red-600'>{error}</p>}

      {loading ? (
        <div className='flex-1 flex justify-center items-center'>
          <span className='w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin'></span>
        </div>
      ) : (
        <div className='bg-white h-full w-full rounded-xl overflow-y-scroll'>
          {creations.length === 0 && (
            <p className='p-4 text-sm text-gray-400'>No published creations yet.</p>
          )}

          {creations.map((creation, index) => (
            <div
              key={creation.id ?? index}
              className="relative group inline-block pl-3 pt-3 w-full sm:w-1/2 lg:w-1/3"
            >
              <img
                className="w-full h-full object-cover rounded-lg"
                src={creation.content}
                alt={creation.prompt}
              />

              <div className="absolute inset-0 left-3 flex flex-col items-end justify-end gap-2 p-3 text-white rounded-lg group-hover:bg-linear-to-b from-transparent to-black/80">
                <p className="hidden text-sm group-hover:block">
                  {creation.prompt}
                </p>

                <div className="flex items-center gap-1">
                  <p>{(creation.likes ?? []).length}</p>
                  <Heart
                    onClick={() => pendingId !== creation.id && toggleLike(creation.id)}
                    className={`h-5 min-w-5 cursor-pointer hover:scale-110 ${
                      pendingId === creation.id ? 'opacity-50' : ''
                    } ${
                      (creation.likes ?? []).includes(user?.id)
                        ? 'fill-red-500 text-red-600'
                        : 'text-white'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default Community
