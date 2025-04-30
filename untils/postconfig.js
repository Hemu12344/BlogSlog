const multer =require("multer");
const path=require("path");
const crypto=require("crypto");

// Disk Storage 

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images/postImg')
    },
    filename: function (req, file, cb) {
        crypto.randomBytes(15,function(err,bytes){
            const name=bytes.toString("hex")+path.extname(file.originalname)
            cb(null,name)
        })
    } 
  })

const upload = multer({storage:storage})

module.exports=upload