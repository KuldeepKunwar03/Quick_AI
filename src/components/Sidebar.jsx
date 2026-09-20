import { useClerk, useUser } from '@clerk/react';
import { Eraser, FileText, Hash, House, Images, KeyRound, Lock, LogOut, Scissors, SquarePen, Users } from 'lucide-react';
import React from 'react'
import { NavLink } from 'react-router-dom';
import { useApiKeyStatus } from '../lib/apiKeyContext';

// gated: needs a saved API key, and shows a lock until there is one.
const navItems = [
    {to: '/ai', label: 'Dashboard', Icon: House},
    {to: '/ai/write-article', label: 'Write Article', Icon: SquarePen, gated: true},
    {to: '/ai/blog-titles', label: 'Blog Titles', Icon: Hash, gated: true},
    {to: '/ai/generate-images', label: 'Generate Images', Icon: Images, gated: true},
    {to: '/ai/remove-background', label: 'Remove Background', Icon: Eraser, gated: true},
    {to: '/ai/remove-object', label: 'Remove Object', Icon: Scissors, gated: true},
    {to: '/ai/review-resume', label: 'Review Resume', Icon: FileText, gated: true},
    {to: '/ai/community', label: 'Community', Icon: Users},
    {to: '/ai/api-key', label: 'API Key', Icon: KeyRound},
]

const Sidebar = ({sidebar, setSidebar}) => {

    const {user} = useUser()
    const {signOut, openUserProfile} = useClerk()
    const {credentials} = useApiKeyStatus()

    // In-memory only, so this is known synchronously - no loading state and no
    // flash of the wrong icon.
    const locked = !credentials

  return (
    <div
      className={`w-60 h-full bg-white border-r border-gray-200
      flex flex-col items-center justify-between
      max-sm:absolute top-14 bottom-0
      ${sidebar ? "translate-x-0" : "max-sm:-translate-x-full"}
      transition-all duration-300 ease-in-out`}
    >

        <div className='my-7 w-full'>
            <img src={user.imageUrl} alt="User avatar" className='w-13 rounded-full mx-auto' />

            <h1 className='mt-1 text-center'>{user.fullName}</h1>

            <div className='mt-3'>
                {navItems.map(({to, label, Icon, gated}) => (
                    <NavLink key={to} to={to} end={to === '/ai'} onClick={() => setSidebar(false)}
                    className={({isActive}) => `px-3.5 py-2.5 flex items-center gap-3 rounded ${isActive ? 'bg-linear-to-r from-[#3C81F6] to-[#9234EA] text-white' : 'text-gray-600'}`}>
                        {({ isActive }) => (
                            <>
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''} `} />
                            <span className='flex-1'>{label}</span>
                            {gated && locked && (
                              <Lock aria-label='Locked until an API key is added'
                              className={`w-3.5 h-3.5 ${isActive ? 'text-white/80' : 'text-gray-400'}`} />
                            )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>

        </div>

        <div className='w-full border-t border-gray-200 p-4 px-7 flex items-center justify-between'>
            <div className='flex gap-2 items-center cursor-pointer'
            onClick={openUserProfile}>
                <img src={user.imageUrl} alt="" className='w-8 rounded-full'/>
                <div>
                    <h1 className='text-sm font-medium'>{user.fullName}</h1>
                </div>
            </div>
            <LogOut className='w-4.5 text-gray-400 hover:text-gray-700 transition cursor-pointer'
             onClick={signOut} />
        </div>

    </div>
  )
}

export default Sidebar
