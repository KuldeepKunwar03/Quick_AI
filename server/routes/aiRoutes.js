import express from "express";
import { auth } from "../middlewares/auth.js";
import upload from "../configs/multer.js";
import {
    generateArticle,
    generateBlogTitle,
    generateImage,
    removeImageBackground,
    removeImageObject,
    resumeReview,
    getUserCreations,
    getPublishedCreations,
    toggleLikeCreation,
    validateApiKey,
    listProviderModels,
} from "../controllers/aiController.js";

const aiRouter = express.Router()

aiRouter.post('/generate-article', auth, generateArticle)
aiRouter.post('/generate-blog-title', auth, generateBlogTitle)
aiRouter.post('/generate-image', auth, generateImage)
aiRouter.post('/remove-image-background', upload.single('image'), auth, removeImageBackground)
aiRouter.post('/remove-image-object', upload.single('image'), auth, removeImageObject)
aiRouter.post('/resume-review', upload.single('resume'), auth, resumeReview)

aiRouter.get('/get-user-creations', auth, getUserCreations)
aiRouter.get('/get-published-creations', auth, getPublishedCreations)
aiRouter.post('/toggle-like-creation', auth, toggleLikeCreation)

// Neither of these stores anything - validate checks a key and forgets it.
aiRouter.post('/validate-key', validateApiKey)
aiRouter.post('/provider-models', listProviderModels)

export default aiRouter
