import multer from "multer";

// Files are only held long enough to forward to Cloudinary / the PDF parser,
// then unlinked by the controller.
const upload = multer({ storage: multer.diskStorage({}) })

export default upload
