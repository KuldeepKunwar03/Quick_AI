import { Image, Sparkles } from 'lucide-react';
import React, { useState } from 'react'
import { useApi, unwrap } from '../lib/useApi'

const GenerateImages = () => {

   const imageStyle = [
    'Realistic', 'Ghibli', 'Anime Style', 'Cartoon style', 'Fantasy style', 'Realistic style', '3D style', 'portrait style', 'Abstract', 'Minimalist', 'Cyberpunk', 'Watercolor', 'Pixel Art'
  ]

  const [selectedStyle, setSelectedStyle] = useState('Realistic')
  const [input, setInput] = useState("")
  const [publish, setPublish] = useState(false)
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const api = useApi()

  const onSubmitHandler = async (e)=>{
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // The endpoint takes a single prompt, so the chosen style has to be
      // folded into it rather than sent as its own field.
      const prompt = `Generate an image of ${input} in the style ${selectedStyle}`
      const { data } = await api.post('/api/ai/generate-image', { prompt, publish })
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
            <Sparkles className='w-6 text-[#00AD25]' />
            <h1 className='text-xl font-semibold'>AI Image Generator</h1>
          </div>

          <p className='mt-6 text-sm font-medium'>Describe Your Image</p>

          <textarea onChange={(e) => setInput(e.target.value)}
          value={input}
          rows={4}
          className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300'
          placeholder='Describe what you want to see in the image...' required/>

          <p className='mt-4 text-sm font-medium'>Styles</p>

          <div className='mt-3 flex gap-3 flex-wrap sm:max-w-9/11'>
            {imageStyle.map((item) => (
              <span onClick={() =>setSelectedStyle(item)}
              className={`text-xs px-4 py-1 border rounded-full cursor-pointer
                ${selectedStyle === item ? 'bg-green-50 text-green-700' : 'text-gray-500 border-gray-300'}`}
               key={item}>{item}</span>
            ) )}
          </div>

          <div className='my-6 flex items-center gap-2'>
            <label className='relative cursor-pointer'>
              <input className='sr-only peer'
              type="checkbox"
              onChange={(e) => setPublish(e.target.checked)}
              checked={publish}/>

              <div className='w-9 h-5 bg-slate-300 rounded-full peer-checked:bg-green-500 transition'></div>

              <span className='absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition peer-checked:translate-x-4'></span>

            </label>
            <p className='text-sm'>Make this image Public</p>
          </div>

          <button disabled={loading}
          className='w-full flex justify-center items-center gap-2 bg-linear-to-r from-[#00AD25] to-[#04FF50] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed'>
            {loading
              ? <span className='w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin'></span>
              : <Image className='w-5' />}
            Generate Image
          </button>

          {error && <p className='mt-3 text-sm text-red-600'>{error}</p>}
      </form>

      {/* right Column */}
      <div className='w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96'>

            <div className='flex items-center gap-3'>
                <Image className='w-5 h-5 text-[#00AD25]' />
                <h1 className='text-xl font-semibold'>Generated Image</h1>
            </div>

            {!content ? (
              <div className='flex-1 flex justify-center items-center'>
                <div className='text-sm flex flex-col items-center gap-5 text-gray-400'>
                  <Image className='w-9 h-9' />
                  <p>Describe an image and Click "Generate Image" to get started</p>
                </div>
              </div>
            ) : (
              <div className='mt-3 h-full'>
                <img src={content} alt={input} className='w-full h-full object-contain' />
              </div>
            )}
      </div>

    </div>
  )
}

export default GenerateImages
