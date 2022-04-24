import mongoose from "mongoose";

const postsModel = mongoose.Schema({
    image:String,
    user:String,
    caption:String
})

export default mongoose.model('posts', postsModel);
