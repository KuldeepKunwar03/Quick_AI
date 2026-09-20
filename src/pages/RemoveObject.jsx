import { Scissors, Sparkles } from 'lucide-react';
import React, { useState } from 'react'
import { useApi, unwrap } from '../lib/useApi'

const RemoveObject = () => {

  const [input, setInput] = useState("")
  const [object, setIObject] = useState('')
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const api = useApi()

  const onSubmitHandler = async (e)=>{
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Cloudinary's gen_remove takes one token, so reject a multi-word entry
      // here rather than silently mangling it server-side.
      if(object.trim().split(/\s+/).length > 1){
        throw new Error('Please enter only one object name')
      }

      const formData = new FormData()
      formData.append('image', input)
      formData.append('object', object)

      const { data } = await api.post('/api/ai/remove-image-object', formData)
      setContent(unwrap(data).content)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
     <div className='h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700'>

      {/* left column */}
      <form onSubmit={onSubmitHandler}
       className='w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200'>

          <div className='flex items-center gap-3'>
            <Sparkles className='w-6 text-[#4A7AFF]' />
            <h1 className='text-xl font-semibold'>Object Removal</h1>
          </div>

          <p className='mt-6 text-sm font-medium'>Upload Image</p>

          <input onChange={(e) => setInput(e.target.files[0])}
          className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300 text-gray-600'
          type="file"
          accept='image/*'
          required/>

          <p className='mt-6 text-sm font-medium'>Describe object name to remove</p>

          <textarea onChange={(e) => setIObject(e.target.value)}
          value={object}
          rows={4}
          className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300'
          placeholder='e.g. car or tree, only one object name' required/>

          <button disabled={loading}
          className='w-full flex justify-center items-center gap-2 bg-linear-to-r from-[#417DF6] to-[#8E37EB] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed'>
            {loading
              ? <span className='w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin'></span>
              : <Scissors className='w-5' />}
            Remove Object
          </button>

          {error && <p className='mt-3 text-sm text-red-600'>{error}</p>}
      </form>

      {/* right Column */}
      <div className='w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96'>

            <div className='flex items-center gap-3'>
                <Scissors className='w-5 h-5 text-[#4A7AFF]' />
                <h1 className='text-xl font-semibold'>Processed Image</h1>
            </div>

            {!content ? (
              <div className='flex-1 flex justify-center items-center'>
                <div className='text-sm flex flex-col items-center gap-5 text-gray-400'>
                  <Scissors className='w-9 h-9' />
                  <p>Upload an image and Click "Remove Object" to get started</p>
                </div>
              </div>
            ) : (
              <div className='mt-3 h-full'>
                <img src={content} alt="Processed" className='w-full h-full object-contain' />
              </div>
            )}
      </div>

    </div>
  )
}

export default RemoveObject
