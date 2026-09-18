import { useUser } from '@clerk/react';
import React, { useEffect, useState } from 'react'
import { dummyPublishedCreationData } from '../assets/assets';
import { Heart } from 'lucide-react';

const Community = () => {

  const [creations, setCreations] = useState([])
  const {user} = useUser()

  const fetchCreations = async() => {
    setCreations(dummyPublishedCreationData)
  }

  useEffect(() => {
    if(user) {
      fetchCreations()
    }
  },[user])

  return (
    <div className='flex-1 h-full flex flex-col gap-4 p-6'>
      Creations

      <div className='bg-white h-full w-full rounded-cl overflow-y-scroll'>
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
                <p>{creation.likes.length}</p>
                <Heart
                  className={`h-5 min-w-5 cursor-pointer hover:scale-110 ${
                    creation.likes.includes(user?.id)
                      ? 'fill-red-500 text-red-600'
                      : 'text-white'
                  }`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

export default Community
