import { KeyRound, Lock } from 'lucide-react';
import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useApiKeyStatus } from '../lib/apiKeyContext'

// Wraps the generation tools. Nothing behind it renders until the user has a
// key saved, because every one of those tools needs a provider to call and the
// server holds no key of its own. The server enforces this too - this is the
// friendly half of the lock, not the whole of it.
const RequireApiKey = () => {

  const { credentials } = useApiKeyStatus()
  const navigate = useNavigate()

  if(credentials){
    return <Outlet />
  }

  return (
    <div className='h-full flex justify-center items-center p-6 text-slate-700'>
      <div className='w-full max-w-md p-8 bg-white rounded-lg border border-gray-200 flex flex-col items-center text-center gap-4'>

        <div className='w-14 h-14 rounded-full bg-[#F4F7FB] flex justify-center items-center'>
          <Lock className='w-6 text-[#5044E5]' />
        </div>

        <h1 className='text-xl font-semibold'>Enter a valid API key first</h1>

        <p className='text-sm text-gray-500'>
          This tool runs on your own API key, and you have not added one yet.
          Save a key to unlock every generation tool.
        </p>

        <button onClick={() => navigate('/ai/api-key')}
        className='flex justify-center items-center gap-2 bg-linear-to-r from-[#5044E5] to-[#8E37EB] text-white px-5 py-2 mt-2 text-sm rounded-lg cursor-pointer active:scale-95'>
          <KeyRound className='w-4' />
          Add API Key
        </button>

      </div>
    </div>
  )
}

export default RequireApiKey
