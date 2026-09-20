import { KeyRound, RefreshCw, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import React, { useState } from 'react'
import { useApiKeyStatus } from '../lib/apiKeyContext'
import { useApi, unwrap } from '../lib/useApi'
import { PROVIDERS, CUSTOM_MODEL } from '../lib/providers'

const ApiKey = () => {

  const { credentials, setCredentials, clearCredentials } = useApiKeyStatus()

  // These routes sit under /api/ai, below the server's Clerk gate, so they need
  // the session token attached. Plain axios gets a 401.
  const api = useApi()

  const [providerId, setProviderId] = useState(PROVIDERS[0].id)
  const [input, setInput] = useState("")
  const [customBaseUrl, setCustomBaseUrl] = useState("")

  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(PROVIDERS[0].fallbackModels[0] ?? "")
  const [customModel, setCustomModel] = useState("")

  const [loadingModels, setLoadingModels] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const provider = PROVIDERS.find(p => p.id === providerId) ?? PROVIDERS[0]
  const baseUrl = provider.id === 'custom' ? customBaseUrl : provider.baseUrl

  // Whatever the provider reported, otherwise the small built-in list.
  const modelOptions = models.length ? models : provider.fallbackModels
  const usingCustomModel = selectedModel === CUSTOM_MODEL
  const effectiveModel = usingCustomModel ? customModel.trim() : selectedModel

  const onProviderChange = (id) => {
    const next = PROVIDERS.find(p => p.id === id)
    setProviderId(id)
    setModels([])
    // Preselect the provider's newest known model where we have a list.
    setSelectedModel(next?.fallbackModels?.[0] ?? "")
    setCustomModel("")
    setError("")
    setNotice("")
  }

  const loadModels = async () => {
    setLoadingModels(true)
    setError("")
    setNotice("")

    try {
      const { data } = await api.post('/api/ai/provider-models', { apiKey: input, baseUrl })
      const result = unwrap(data)

      setModels(result.models)
      if(result.models.length) setSelectedModel(result.models[0])
      setNotice(`Found ${result.models.length} models on your account.`)
    } catch (err) {
      // Not fatal: the fallback list and the custom field still work.
      setError(`${err.message} - pick from the list below or enter a model name yourself.`)
    } finally {
      setLoadingModels(false)
    }
  }

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setNotice("")

    try {
      if(!effectiveModel) throw new Error('Choose a model first')

      // The server tries the key once and tells us whether it works. It does
      // not keep it - the copy below says so, so this must stay true.
      const { data } = await api.post('/api/ai/validate-key', {
        apiKey: input, baseUrl, model: effectiveModel,
      })
      const result = unwrap(data)

      setCredentials({
        apiKey: input,
        baseUrl: result.baseUrl,
        model: result.model,
        supportsImages: result.supportsImages,
        last4: input.slice(-4),
      })

      setInput("")
      setNotice("Key works. Every tool is unlocked for this tab.")
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const onRemoveHandler = () => {
    clearCredentials()
    setInput("")
    setModels([])
    setSelectedModel("")
    setCustomModel("")
    setError("")
    setNotice("Key forgotten.")
  }

  const field = 'w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300'

  return (
    <div className='h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700'>

      {/* left column */}
      <form onSubmit={onSubmitHandler}
       className='w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200'>

          <div className='flex items-center gap-3'>
            <Sparkles className='w-6 text-[#5044E5]' />
            <h1 className='text-xl font-semibold'>Your API Key</h1>
          </div>

          <p className='mt-6 text-sm font-medium'>Provider</p>

          <select value={providerId} onChange={(e) => onProviderChange(e.target.value)}
          className={`${field} cursor-pointer`}>
            {PROVIDERS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>

          {provider.id === 'custom' && (
            <input onChange={(e) => setCustomBaseUrl(e.target.value)}
            value={customBaseUrl}
            className={field}
            type="text"
            placeholder='https://your-provider.com/v1' required/>
          )}

          <p className='mt-4 text-sm font-medium'>API Key</p>

          <input onChange={(e) => setInput(e.target.value)}
          value={input}
          className={field}
          type="password"
          autoComplete='off'
          placeholder='Paste your API key' required/>

          {provider.keyUrl && (
            <p className='text-xs text-gray-500 font-light mt-1'>
              Get one from <a href={provider.keyUrl} target='_blank' rel='noreferrer'
              className='text-[#5044E5] underline'>{provider.keyHint}</a>.
            </p>
          )}

          <div className='mt-4 flex items-center justify-between'>
            <p className='text-sm font-medium'>Model</p>
            <button type='button' onClick={loadModels} disabled={!input || loadingModels}
            className='flex items-center gap-1 text-xs text-[#5044E5] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'>
              <RefreshCw className={`w-3 ${loadingModels ? 'animate-spin' : ''}`} />
              Load my models
            </button>
          </div>

          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
          className={`${field} cursor-pointer`} required>
            <option value='' disabled>
              {modelOptions.length ? 'Choose a model' : 'Load your models, or enter one manually'}
            </option>
            {modelOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
            <option value={CUSTOM_MODEL}>Enter a model name myself…</option>
          </select>

          {usingCustomModel && (
            <input onChange={(e) => setCustomModel(e.target.value)}
            value={customModel}
            className={field}
            type="text"
            placeholder='exact model id, e.g. gemini-3.8-flash' required/>
          )}

          <p className='text-xs text-gray-500 font-light mt-1'>
            Not sure? Paste your key and hit <span className='font-medium'>Load my models</span> —
            we'll ask your provider what it offers.
          </p>

          <button disabled={saving}
          className='w-full flex justify-center items-center gap-2 bg-linear-to-r from-[#5044E5] to-[#8E37EB] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed'>
            {saving
              ? <span className='w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin'></span>
              : <KeyRound className='w-5' />}
            {credentials ? 'Use a different key' : 'Unlock the tools'}
          </button>

          {error && <p className='mt-3 text-sm text-red-600'>{error}</p>}
          {notice && <p className='mt-3 text-sm text-green-600'>{notice}</p>}
      </form>

      {/* right Column */}
      <div className='w-full max-w-lg flex flex-col gap-4'>

        <div className='p-4 bg-white rounded-lg border border-gray-200'>
            <div className='flex items-center gap-3'>
                <ShieldCheck className='w-5 h-5 text-[#00AD25]' />
                <h1 className='text-xl font-semibold'>We have a terrible memory</h1>
            </div>

            <p className='mt-4 text-sm text-gray-600'>
              Your key goes straight from this tab to your provider and back. We don't keep it.
              Not in a database, not in a cookie, not on a sticky note by the server.
            </p>

            <p className='mt-3 text-sm text-gray-600'>
              <span className='font-medium text-slate-700'>Refresh the page and it's gone</span>
              {' '}— you'll paste it again next visit. Mildly annoying, deliberately so. The only
              copy that outlives this tab is the one you already have.
            </p>
        </div>

        <div className='p-4 bg-white rounded-lg border border-gray-200 flex flex-col gap-4 text-sm'>

            <div className='flex items-center gap-3'>
                <KeyRound className='w-5 h-5 text-[#5044E5]' />
                <h1 className='text-xl font-semibold'>This tab</h1>
            </div>

            <div className='flex items-center justify-between p-3 rounded-lg bg-[#F4F7FB]'>
              <span>Key</span>
              {credentials
                ? <span className='text-green-600 font-medium'>Active &middot; ••••{credentials.last4}</span>
                : <span className='text-red-600 font-medium'>Not set</span>}
            </div>

            {credentials && (
              <>
                <div className='flex items-center justify-between gap-4 p-3 rounded-lg bg-[#F4F7FB]'>
                  <span className='shrink-0'>Model</span>
                  <span className='font-medium truncate'>{credentials.model}</span>
                </div>

                <div className='flex items-center justify-between gap-4 p-3 rounded-lg bg-[#F4F7FB]'>
                  <span className='shrink-0'>Endpoint</span>
                  <span className='font-medium truncate' title={credentials.baseUrl}>{credentials.baseUrl}</span>
                </div>
              </>
            )}

            {!credentials ? (
              <p className='text-gray-500'>
                No key in this tab, so every generation tool stays locked. Add one to unlock them.
              </p>
            ) : (
              <p className='text-gray-500'>
                Article, blog title and resume review run on this key.{' '}
                {credentials.supportsImages
                  ? 'Image generation works too, because this is a Google AI key.'
                  : 'Image generation will not work with this provider — it needs a Google AI key.'}
                {' '}Background and object removal use image processing on the server, so they
                never touch your key.
              </p>
            )}

            {credentials && (
              <button onClick={onRemoveHandler} type='button'
              className='flex items-center justify-center gap-2 border border-red-200 text-red-600 px-4 py-2 text-sm rounded-lg cursor-pointer active:scale-95'>
                <Trash2 className='w-4' />
                Forget it now
              </button>
            )}

        </div>
      </div>

    </div>
  )
}

export default ApiKey
