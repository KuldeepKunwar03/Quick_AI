// For api controller function
import OpenAI from "openai";
import sql from "../configs/db.js";
import axios from "axios";
import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs/promises'
import { PDFParse } from 'pdf-parse'

// Text runs against any OpenAI-compatible provider. These are only the
// defaults used when the caller has not chosen their own.
export const DEFAULT_BASE_URL = process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/"
export const DEFAULT_TEXT_MODEL = process.env.AI_TEXT_MODEL || "gemini-3.8-flash"

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image"
const GOOGLE_HOST = "generativelanguage.googleapis.com"

const isGoogleBase = (baseUrl) => {
    try {
        return new URL(baseUrl).hostname === GOOGLE_HOST
    } catch {
        return false
    }
}

// Every request runs on the caller's own key. The server holds no key of its
// own, so there is nothing to fall back to. req.userApi comes from the auth
// middleware.
const textConfigFor = (req) => {
    const user = req.userApi ?? {}

    if(!user.key){
        throw new Error('Add your API key on the API Key page to start generating.')
    }

    return {
        apiKey: user.key,
        baseURL: user.baseUrl || DEFAULT_BASE_URL,
        model: user.model || DEFAULT_TEXT_MODEL,
    }
}

// Image generation uses Gemini's native REST API rather than the OpenAI shape,
// so it needs a Google key specifically - a key for any other provider cannot
// serve this route.
const imageKeyFor = (req) => {
    const user = req.userApi ?? {}

    if(!user.key){
        throw new Error('Add your API key on the API Key page to start generating.')
    }

    if(!isGoogleBase(user.baseUrl || DEFAULT_BASE_URL)){
        throw new Error('Image generation needs a Google AI key. Your key is configured for a different provider, which this feature cannot use.')
    }

    return user.key
}

// The two Cloudinary tools never spend the caller's key, but they are gated on
// having one anyway: every generation tool is locked the same way, and the
// operator's Cloudinary quota stays closed to users who have not set up at all.
const requireApiKey = (req) => {
    if(!req.userApi?.key){
        throw new Error('Add your API key on the API Key page to start generating.')
    }
}

const aiClient = ({apiKey, baseURL}) => new OpenAI({ apiKey, baseURL })

const generateText = async (prompt, maxTokens, config) => {
    const params = {
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: maxTokens,
    }

    // Gemini spends its token budget on reasoning before writing anything, so
    // without this a small max_tokens comes back empty or truncated. It is a
    // Google-specific parameter, and other providers reject what they don't know.
    if(isGoogleBase(config.baseURL)){
        params.reasoning_effort = 'none'
    }

    const response = await aiClient(config).chat.completions.create(params)

    return response.choices[0].message.content
}

const generateImageFromPrompt = async (prompt, apiKey) => {
    const { data } = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`,
        { contents: [{ parts: [{ text: prompt }] }] },
        { headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
        } }
    )

    // The image comes back as an inlineData part alongside any text parts.
    const parts = data.candidates?.[0]?.content?.parts ?? []
    const inline = parts.find(p => p.inlineData || p.inline_data)

    if(!inline){
        throw new Error(`Image generation failed: ${data.candidates?.[0]?.finishReason ?? 'no image returned'}`)
    }

    const payload = inline.inlineData ?? inline.inline_data
    const mimeType = payload.mimeType ?? payload.mime_type ?? 'image/png'

    return `data:${mimeType};base64,${payload.data}`
}

// error.message alone is just "Request failed with status code NNN", which
// hides what the provider actually said.
const describeError = (error) => {
    // axios-shaped provider errors carry the upstream body
    const upstream = error.response?.data?.error
    if(upstream){
        return `${error.response.status}: ${upstream.message ?? JSON.stringify(upstream)}`
    }

    // Cloudinary SDK errors carry http_code instead, and their message names no
    // service at all - "Server returned unexpected status code - 403".
    if(error.http_code){
        const hint = error.http_code === 403
            ? ' (the Cloudinary API key is missing upload permissions)'
            : ''
        return `Cloudinary ${error.http_code}: ${error.message}${hint}`
    }

    return error.message
}

const removeTempFile = async (file) => {
    if(file?.path){
        await fs.unlink(file.path).catch(() => {})
    }
}

export const generateArticle = async (req,res) => {
    try{
        const { userId } = req.auth()
        const { prompt, length} = req.body

        const content = await generateText(prompt, length, textConfigFor(req))

        await sql` INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, ${prompt}, ${content}, 'article')`

        res.json({success: true, content})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: describeError(error)})
    }
}

export const generateBlogTitle = async (req,res) => {
    try{
        const { userId } = req.auth()
        const { prompt } = req.body

        const content = await generateText(prompt, 300, textConfigFor(req))

        await sql` INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, ${prompt}, ${content}, 'blog-title')`

        res.json({success: true, content})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: describeError(error)})
    }
}

export const generateImage = async (req,res) => {
    try{
        const { userId } = req.auth()
        const { prompt, publish } = req.body

        const base64Image = await generateImageFromPrompt(prompt, imageKeyFor(req))

        const { secure_url } = await cloudinary.uploader.upload(base64Image)

        await sql` INSERT INTO creations (user_id, prompt, content, type, publish)
        VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`

        res.json({success: true, content: secure_url})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: describeError(error)})
    }
}

export const removeImageBackground = async (req,res) => {
    try{
        const { userId } = req.auth()
        const image = req.file

        requireApiKey(req)

        if(!image){
            return res.json({success: false, message: "No image uploaded"})
        }

        const { secure_url } = await cloudinary.uploader.upload(image.path, {
            transformation: [{
                effect: 'background_removal',
                background_removal: 'remove_the_background'
            }]
        })

        await sql` INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image')`

        res.json({success: true, content: secure_url})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: describeError(error)})
    } finally {
        await removeTempFile(req.file)
    }
}

export const removeImageObject = async (req,res) => {
    try{
        const { userId } = req.auth()
        const { object } = req.body
        const image = req.file

        requireApiKey(req)

        if(!image){
            return res.json({success: false, message: "No image uploaded"})
        }

        if(!object){
            return res.json({success: false, message: "Describe the object to remove"})
        }

        // gen_remove takes a single token, so a multi-word object has to be joined.
        const target = object.trim().split(/\s+/).join('_')

        const { public_id } = await cloudinary.uploader.upload(image.path)

        const imageUrl = cloudinary.url(public_id, {
            transformation: [{ effect: `gen_remove:${target}` }],
            resource_type: 'image'
        })

        await sql` INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image')`

        res.json({success: true, content: imageUrl})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: describeError(error)})
    } finally {
        await removeTempFile(req.file)
    }
}

export const resumeReview = async (req,res) => {
    try{
        const { userId } = req.auth()
        const resume = req.file

        // Checked before the file is read and parsed, so a locked account does
        // not pay for that work only to be refused afterwards.
        requireApiKey(req)

        if(!resume){
            return res.json({success: false, message: "No resume uploaded"})
        }

        if(resume.size > 5 * 1024 * 1024){
            return res.json({success: false, message: "Resume file size exceeds allowed size (5MB)."})
        }

        const parser = new PDFParse({ data: await fs.readFile(resume.path) })
        const { text } = await parser.getText()
        await parser.destroy()

        const prompt = `Review the following resume and give constructive feedback on its strengths, weaknesses and areas for improvement. Resume Content:\n\n${text}`

        const content = await generateText(prompt, 2000, textConfigFor(req))

        await sql` INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')`

        res.json({success: true, content})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: describeError(error)})
    } finally {
        await removeTempFile(req.file)
    }
}

export const getUserCreations = async (req,res) => {
    try{
        const { userId } = req.auth()

        const creations = await sql` SELECT * FROM creations
        WHERE user_id = ${userId} ORDER BY created_at DESC`

        res.json({success: true, creations})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

export const getPublishedCreations = async (req,res) => {
    try{
        const creations = await sql` SELECT * FROM creations
        WHERE publish = true ORDER BY created_at DESC`

        res.json({success: true, creations})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

export const toggleLikeCreation = async (req,res) => {
    try{
        const { userId } = req.auth()
        const { id } = req.body

        const [creation] = await sql` SELECT * FROM creations WHERE id = ${id}`

        if(!creation){
            return res.json({success: false, message: "Creation not found"})
        }

        const currentLikes = creation.likes ?? []
        const alreadyLiked = currentLikes.includes(userId)

        const updatedLikes = alreadyLiked
            ? currentLikes.filter(user => user !== userId)
            : [...currentLikes, userId]

        // The driver needs an explicit array literal for a text[] column.
        const formattedLikes = `{${updatedLikes.join(',')}}`

        await sql` UPDATE creations SET likes = ${formattedLikes}::text[] WHERE id = ${id}`

        res.json({success: true, message: alreadyLiked ? 'Creation Unliked' : 'Creation Liked'})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

/* ---------- personal API key ---------- */

// Checks that a key actually works, and answers yes or no. Nothing is stored:
// the key arrives in this request, is used for one 5-token call, and is dropped
// when the handler returns. The browser holds the only copy.
export const validateApiKey = async (req,res) => {
    try{
        const apiKey = (req.body?.apiKey ?? '').trim()
        const baseUrl = (req.body?.baseUrl ?? '').trim() || DEFAULT_BASE_URL
        const model = (req.body?.model ?? '').trim() || DEFAULT_TEXT_MODEL

        if(!apiKey){
            return res.json({success: false, message: "Enter an API key"})
        }

        try {
            new URL(baseUrl)
        } catch {
            return res.json({success: false, message: "Base URL is not a valid URL"})
        }

        // Verify against the provider the user actually chose, so a bad paste or
        // a wrong model name fails here rather than on their first generation.
        try {
            const params = {
                model,
                messages: [{ role: "user", content: "ping" }],
                max_tokens: 5,
            }
            if(isGoogleBase(baseUrl)){
                params.reasoning_effort = 'none'
            }
            await aiClient({ apiKey, baseURL: baseUrl }).chat.completions.create(params)
        } catch (verifyError) {
            return res.json({
                success: false,
                message: `The provider rejected that key - ${describeError(verifyError)}`,
            })
        }

        res.json({
            success: true,
            message: "Key works",
            baseUrl,
            model,
            supportsImages: isGoogleBase(baseUrl),
        })

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

// Asks the provider what it offers, so the model dropdown shows real, current
// options instead of a hardcoded list that rots. The key is used for this one
// call and dropped.
export const listProviderModels = async (req,res) => {
    try{
        const apiKey = (req.body?.apiKey ?? '').trim()
        const baseUrl = (req.body?.baseUrl ?? '').trim() || DEFAULT_BASE_URL

        if(!apiKey){
            return res.json({success: false, message: "Enter an API key"})
        }

        try {
            new URL(baseUrl)
        } catch {
            return res.json({success: false, message: "Base URL is not a valid URL"})
        }

        const list = await aiClient({ apiKey, baseURL: baseUrl }).models.list()

        const models = (list.data ?? [])
            .map(m => (m.id ?? '').replace(/^models\//, ''))
            .filter(Boolean)
            // Image, embedding, TTS and vision models can't answer a chat
            // completion, so they would only be traps in a text-model dropdown.
            .filter(id => !/embed|image|imagen|tts|vision|whisper|dall-e|moderation|veo/i.test(id))
            .sort()

        res.json({success: true, models})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: describeError(error)})
    }
}

