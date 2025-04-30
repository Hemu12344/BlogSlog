const mongoose = require('mongoose')
const { type } = require('os')
const { ref } = require('process')

mongoose.connect("mongodb://127.0.0.1:27017/userDatabase")

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