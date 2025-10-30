const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcryptjs");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");


const app = express();
// Middleware
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(expressLayouts);
app.set("layout", "layout");
app.use(express.urlencoded({ extended: true }));

require("dotenv").config();
mongoose.connect(process.env.MONGO_URI);
// Define User Schema
const userSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String, unique: true },
    password: { type: String },
    friends: {type: Array, default: []},
    frequests: {type: Array, default: []},
    pendingreq: {type: Array, default: []},
});
const User = mongoose.model("User", userSchema, "user");


//The messages Array will contain: [[User.gmail: Message], ...]
const messageSchema = new mongoose.Schema({
    emailAmalgam: { type: String, unique: true },
    messages: {type: Array},
    date: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema, "message");


// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET, // change for production
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: null, // Session expires when browser closes
  },
}));

//For proxy
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

// Middleware to make user available in all templates
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  //Allows middleware to proceed to next function
  next();
});

//Home page: friends
//Also look into select() to filter query
app.get("/", async (req, res) => {
    try {
        const user = await User.find({email: req.session.user.email});
        const friendVar = user.friends;
        const friends = await User.find({email: { $in: friendVar }});
        res.render("index", { user: req.session.user, title: "Friends", friends: friends || []});
    } catch {
        res.redirect("/login");
    }
});

// Register page
app.get("/register", (req, res) => {
  res.render("register", { title: "Register" });
});

//Change bcrypt to argon2
app.post("/register", async (req, res) => {
    const {username, email, password} = req.body;
    const hash = await bcrypt.hash(password, 10);
    try {
        const user = new User({name: username, email: email, password: hash, friends: [], frequests: []});
        await user.save();
        console.log("User registered:", user);
        req.session.user = user;
        res.redirect("/");
    } catch (err) {
        console.log("Error during registration", err);
        res.send("Email already exists");
    };
});

//Login
app.get("/login", (req, res) => {
    res.render("login", {title: "Login"});
});

app.post("/login", async (req, res) => {
    const {email, password} = req.body;
    const user = await User.findOne({email: email});
    if (user){
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = user;
            res.redirect("/");
        } else {
            res.send("Invalid Credentials");
        }
    } else {
        res.send("Invalid Credentials");
    };
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

app.get("/reg/:register", (req, res) => { 
    res.render("register", { title: "Register" });
});
app.get("/log/:login", (req, res) => { 
    res.render("login", { title: "Login" });
});

app.get("/delve/:email", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    const amalgam = [req.session.user.email, req.params.email].sort().join();
    const chat = await Message.findOne({emailAmalgam: amalgam});
    //This is for the add feature as it will change everytime a different friend's page is viewed
    const friend = await User.findOne({email: req.params.email})
    res.render("chat", {title: friend, chat: chat || { messages: [] }});
});

app.post("/add", async (req, res) => {
    if (!req.body) {
        res.send("Invalid Text Input");
    };
    const text = req.body;
    const chat = await Message.findOne({emailAmalgam: res.session.amalgamG});
    chat.push([res.session.user.email, text]);
    //Reloads page
    res.render("chat", {title: session.friendG, chat: chat || { messages: [] }});
});

//Search for users by username or email
app.get("/findUser", async (req, res) => {
    const { username, email } = req.query;
    if (!username && !email) {
        res.send("Please enter a username or email to search.");
        return res.redirect("/");
    } else if (username) { 
        const query = await User.find({name: username});
        res.render("search", {title: "Results", results: query});
    } else if (email) {
        const query = await User.find({email: email});
        res.render("search", {title: "Results", results: query});
    } else {
        alert("Please enter a username or email to search.");
        return res.redirect("/");
    }
});

app.get("/friendReq/:email", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    const userE = req.params.email;
    const user = await User.findOne({email: userE});
    const real = await User.findOne({email: req.session.user.email});
    if (userE in real.frequests || userE in real.friends) {
        res.send("User already added");
    } else if (real.email in user.frequests) {
        //Message start and emailAmalgam
        const amalgam = [user.email, invite.email].sort().join();
        if (await Message.findOne({emailAmalgam: amalgam})) {
            res.send("Chat already exists");
            await real.save();
            await user.save();
            req.session.user = await User.findOne({email: real.email});
        } else {
            const newChat = new Message({emailAmalgam: amalgam, message: [user.email, "Hey!"]});
            newChat.save();
            await user.save();
            await real.save();
            req.session.user = await User.findOne({email: real.email});
            res.redirect("/");
    };
    } else {
        real.frequests.push(userE);
        user.pendingreq.push(real.email);
        await real.save();
        await user.save();
        res.redirect("/");
    }
});

app.get("/frequests", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    let user = await User.findOne({email: req.session.user.email});
    var1 = user.frequests
    //Using the %in operator, we dont need a loop
    const frequest = await User.find({ email: { $in: user.frequests } });
    res.render("frequests", {title: "Friend Requests", user:user, frequests: frequest});
});

app.get("/accept/:email", async (req, res) => {
    const user = await User.findOne({email: req.session.user.email});
    user.friends.push(req.params.email);
    const invite = await User.findOne({email: req.params.email});
    invite.friends.push(user.email);
    const index = user.frequests.indexOf(invite.email);
    user.frequests.splice(index, 1);
    //Message start and emailAmalgam
    const amalgam = [user.email, invite.email].sort().join();
    if (await Message.findOne({emailAmalgam: amalgam})) {
        res.send("Chat already exists");
            await user.save();
            await invite.save();
            req.session.user = await User.findOne({email: user.email});
    } else {
        const newChat = new Message({emailAmalgam: amalgam, message: [invite.email, "Hey!"]});
        newChat.save();
        await user.save();
        await invite.save();
        req.session.user = await User.findOne({email: user.email});
        res.redirect("/");
    }
});

app.get("/decline/:email", async (req, res) => {
    const invite = await User.findOne({email: req.params.email});
    const index = invite.indexOf(req.session.user.email);
    invite.pendingreq.splice(index, 1);
    req.session.user.frequests.splice(req.session.user.frequests.indexOf(invite.email), 1);
    await req.session.user.save();
    await invite.save();
});
// Start Server
app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));