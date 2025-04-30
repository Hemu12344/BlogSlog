const mongoose = require('mongoose')
const postSchema=mongoose.Schema({
    postData:String,
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    },
    date:{
        type:Date,
        default:Date.now
    },
    photo:{
        type:String,
        trim:true
    },
    comments: [
        {
            text: String,
            user: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'User' 
            },
            date: {
                type: Date,
                default: Date.now
            },
            userName:String,
        }
    ],
    like: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      
})

module.exports=mongoose.model('post',postSchema)