// Reads the caller's provider settings off the request headers.
//
// Nothing is persisted, anywhere. The key arrives with each request, lives in
// memory for the duration of that request, and is gone when it ends - it is
// never written to the database, to Clerk metadata, to a session store or to a
// log. Keep it that way: the UI promises the user exactly this.

export const auth = async (req, res, next) => {
    try{
        req.userApi = {
            key: req.get('X-Api-Key') || null,
            baseUrl: req.get('X-Api-Base-Url') || null,
            model: req.get('X-Api-Model') || null,
        }

        next()
    }catch(error){
        res.json({success : false, message: error.message})
    }
}
