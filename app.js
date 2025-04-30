const express = require("express");
const userModel = require("./Model/user");
const postModel = require("./Model/post");
const path = require("path");
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { error, profile } = require("console");
const multer = require("multer");
const upload =require("./untils/multerconfig")
const uploadPostImg=require("./untils/postconfig")
const app = express();
const JWT_SECRET = 'sec'; 

const fs = require("fs")

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use(cookieParser());


// Profile

app.get("/profile/:uId",function(req,res){
    const pId=req.params.uId
    res.render("profileupload",{pId})
})

app.post("/profile",upload.single("image"),async(req,res)=>{
    const pId=req.body.pId
    const user=await userModel.findById(pId)
    if(!user){
        console.log("User Not Found");
    }
    await userModel.findByIdAndUpdate(pId,{profilepic:req.file.filename})
    res.redirect("/")
})
// Homepage
app.get("/", async (req, res) => {
    const token = req.cookies.user;
    let userId = null;
    let userType = null;
    let Auth = null;
    const data = await postModel.find().populate('user');
    const newData = data.map(post => ({
        pId: post._id,
        user: post.user ? post.user.username : "Unknown",
        date: post.date,
        photo:post.photo,
        likeArr: post.like || [],
        pData: post.postData,
        comment: post.comments || [],
        likes: post.like ? post.like.length : 0
    }));

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
            userType = decoded.userType;
            Auth = decoded.Auth;
        } catch (err) {
            console.log("Invalid token");
        }
    }

    // Check if user exists before accessing profilepic
    const user = await userModel.findById(userId);
    if (!user) {
        console.log("User not found");
        return res.redirect("/login");  // Redirect to login if the user is not found
    }
    const profile = user.profilepic;  // Now it's safe to access profilepic
    console.log(profile);
    res.render("index", { token, userId, newData, userType, Auth, profile });
});

// Logout
app.get("/logout", (req, res) => {
    res.clearCookie("user");
    res.redirect("/");
});

// Login & Signup Pages
app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));


// Signup logic
app.post("/signup", async (req, res) => {
    try {
        const { username, email, password, select } = req.body;
        const checkUser = await userModel.findOne({ email });
        if (checkUser) {
            console.log("User Exists");
            return res.render("login");
        }

        const hash = await bcrypt.hash(password, 10);

        await userModel.create({
            username,
            email,
            password: hash,
            type: select,
            Auth:select==="creator"?"No":"Yes"
        });

        console.log("User Created Successfully");
        res.render("login");
    } catch (error) {
        console.error("Signup error:", error);
        res.send("Signup failed");
    }
});

// Login logic
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await userModel.findOne({ email });
        console.log(user);
        
        if (!user) {
            console.log("Email not found");
            return res.redirect("/login");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if(isMatch && user.type==="admin"){
            const payload = { name:user.username,id: user._id, email: user.email, userType: user.type,Auth:user.Auth,Pic:user.profilepic };
            const token = jwt.sign(payload, JWT_SECRET);
            res.cookie("user", token, { httpOnly: true });
            return res.redirect("admin")
        }
        if (isMatch) {
            const payload = { name:user.username,id: user._id, email: user.email, userType: user.type,Auth:user.Auth };
            const token = jwt.sign(payload, JWT_SECRET);
            res.cookie("user", token, { httpOnly: true });
            res.redirect(`/Home/${user._id}`);
        }else {
            console.log("Incorrect password");
            res.redirect("/login");
        }
    } catch (err) {
        console.error("Login error:", err);
        res.send("Something went wrong");
    }
});

// Home after login
app.get("/Home/:id", async (req, res) => {
    const token = req.cookies.user;
    const userId = req.params.id;
    let userType = null;
    let Auth=null;
    try {
        const data = await postModel.find().populate('user');
        const newData = data.map(post => ({
            pId: post._id,
            userId: post.user ? post.user._id : null,
            user: post.user ? post.user.username : "Unknown",
            date: post.date,
            photo:post.photo,
            pData: post.postData,
            likeArr: post.like || [],
            comment: post.comments || [],
            likes: post.like ? post.like.length : 0
        }));

        console.log(data);
        
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                userType = decoded.userType;
                Auth=decoded.Auth;

            } catch (err) {
                console.log("Invalid token in /Home route");
            }
        }
        const user = await userModel.findById(userId);
    if (!user) {
        console.log("User not found");
        return res.redirect("/login");  // Redirect to login if the user is not found
    }
    const profile = user.profilepic;  // Now it's safe to access profilepic
    console.log(profile);
        res.render("index", { userId, token, userType, newData,Auth,profile });
    } catch (error) {
        console.error("Error loading /Home route:", error);
        res.send("Something went wrong loading the page.");
    }
});


// View posts
app.get("/posts/:id", async (req, res) => {
    const token = req.cookies.user;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await userModel.findOne({ email: decoded.email });

        const posts = await postModel.find({ user: user._id });

        res.render("post", { posts, token, userId: user._id });
    } catch (err) {
        console.log("Token Invalid or User Not Logged In", err);
        res.redirect("/login");
    }
});

// Create post page
app.get("/createPost/:id", (req, res) => {
    const userId = req.params.id;
    res.render("createPost", { userId });
});

// Post creation logic
app.post("/createPost/:id",uploadPostImg.single("pImg"), async (req, res) => {
    const { text } = req.body;
    const userId = req.params.id;
    const postImg=req.file.filename;
    try {
        const post = await postModel.create({
            postData: text,
            user: userId,
            photo:postImg
        });

        await userModel.findByIdAndUpdate(userId, {
            $push: { post: post._id }
        });

        res.redirect(`/Home/${userId}`);
    } catch (err) {
        console.error("Error creating post:", err);
        res.send("Error creating post");
    }
});

// Forgot password
app.get("/forgot", (req, res) => res.render("forgotPass"));
app.post("/forgot", async (req, res) => {
    const { email } = req.body;
    const user = await userModel.findOne({ email });
    if (user) {
        res.render("newPass", { user });
    } else {
        console.log("No user found");
        res.send("No user found with this email");
    }
});

// New password
app.get("/newPass", (req, res) => res.render("newPass"));
app.post("/newPass", async (req, res) => {
    const { password, password2, userId } = req.body;

    if (password !== password2) {
        console.log("Passwords do not match");
        return res.send("Passwords do not match");
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        await userModel.findByIdAndUpdate(userId, { password: hash });
        console.log("Password updated successfully");
        res.redirect("/login");
    } catch (error) {
        console.error("Error updating password:", error);
        res.send("Error updating password");
    }
});

// Add Comment
app.post("/comment/:postId", async (req, res) => {
    const { comment } = req.body;
    const token = req.cookies.user;
    const postId = req.params.postId;

    if (!token) {
        return res.redirect("/login");
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;

        const user=await userModel.findById(userId)
        const post = await postModel.findById(postId);
        console.log(post);
        
        if (!post) {
            return res.send("Post not found");
        }

        post.comments.push({ text: comment, user: userId ,userName:user.username});
        await post.save();

        res.redirect("/"); // Redirect back to home after adding comment
    } catch (error) {
        console.error("Error adding comment:", error);
        res.send("Error adding comment");
    }
});

// Like
app.get("/like/:Pid", async function (req, res) {
    const token = req.cookies.user;
    if (!token) return res.redirect("/login");

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id.toString();
        const post = await postModel.findById(req.params.Pid);
        if (!post) return res.send("Post not found");

        if (!post.like) post.like = [];

        const index = post.like.findIndex(id => id.toString() === userId);
        if (index === -1) {
            post.like.push(userId);
            console.log("Liked");
        } else {
            post.like.splice(index, 1);
            console.log("Unliked");
        }

        await post.save();

        // Redirect back to previous page
        res.redirect(req.get('referer'));
    } catch (error) {
        console.error("Like error:", error);
        res.send("Error toggling like");
    }
});

// Remove Post For Creator

// Remove Post For Creator
app.get("/rem/:pId/:uId", async function (req, res) {
    const { pId, uId } = req.params;

    try {
        // Delete post from postModel
        const deletedPost = await postModel.findByIdAndDelete(pId);
        if (!deletedPost) {
            return res.send("Post not found or already deleted.");
        }

        // Remove the post ID from the user's posts array
        await userModel.findByIdAndUpdate(uId, {
            $pull: { post: pId }
        });

        console.log(`Post ${pId} deleted and removed from user ${uId}`);
        res.redirect(`/Home/${uId}`);
    } catch (error) {
        console.error("Error removing post:", error);
        res.send("Failed to remove post.");
    }
});



//Edit Your Post 

app.get("/edit/:pId",function(req,res){
    postId=req.params.pId
    res.render("editPost",{postId})
})

app.post("/editPost", async function(req,res){
    const pdata = await postModel.findById(req.body.postId)
    const newData = req.body.edit
    if(!pdata){
        res.render("login")
    }
    try{
        await postModel.findByIdAndUpdate(req.body.postId,{postData:newData})
        console.log("Update Success fully");
        res.redirect("/")
    }catch (error) {
        console.log("Error Is",error);
    }
})

// Admin Panel


app.get("/admin", async (req, res) => {
    const token = req.cookies.user;
    if (!token) return res.redirect("/login");
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const admin=decoded.name
        if (decoded.userType !== "admin") {
            res.send("Unauthorized: Admins only");
        }
        const users = await userModel.find();
        res.render("admin", { users, token ,admin});
    } catch (error) {
        console.error("Admin access error:", error);
        res.send("Access denied");
    }
});

app.get("/access/:uId",async function(req,res){
    const userId=req.params.uId
    const user=await userModel.findById(userId)
    
    if(!user){
        console.log("User Not Find");
        
    }
    try{
        if (user.Auth === "No"){
            await userModel.findByIdAndUpdate(userId, { Auth: "Yes" });
            console.log("Auth success");
        } else {
            await userModel.findByIdAndUpdate(userId, { Auth: "No" });
            console.log("Blocked");
        }
        res.redirect("/admin")
    }catch (error){
        console.log(error)
    }
})

app.post("/admin/delete/:uId",async function(req,res){
    const userId=req.params.uId;

    const user=await userModel.findById(userId);

    if(!user){
        console.log("User Not Found");
    }

    await userModel.findByIdAndDelete(userId);
    res.redirect("/admin")
})
// Server
app.listen(3000, () => console.log("Server started on port 3000"));
