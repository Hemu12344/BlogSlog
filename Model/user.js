const mongoose = require('mongoose')
const MONGO_URI="mongodb+srv://hemantdixit00000:Hemu1234%40@blogsite.zrwnljt.mongodb.net/blogDB"
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));
const userSchema=mongoose.Schema({
    username:String,
    email:String,
    password:String,
    type:String,
    Auth:{
        type:String,
        default:"Yes"
    },
    profilepic:{
        type:String,
        default:"default.jpg",
        trim: true,
    },
    post:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'post'
        },
    ],
})

module.exports=mongoose.model('user',userSchema)