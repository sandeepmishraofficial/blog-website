const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");

const app = express();
const PORT = 3000 || process.env.port;
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
      next();
    } else {
      res.redirect('/');
    }
};
mongoose.connect(
    `mongodb://127.0.0.1:27017/BlogDB`
);

const SignUpSchema = new mongoose.Schema({
    fname: String,
    lname: String,
    email: String,
    password: String,
});
const BlogSchema = new mongoose.Schema({
    postedBy: String,
    heading: String,
    time: String,
    date: String,
    content: String,
});
const Users = new mongoose.model("SignUp", SignUpSchema);
const Blogs = new mongoose.model("Blogs", BlogSchema);

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/pages/loginPage.html");
});
app.get("/home", isAuthenticated, async (req, res) => {
    try {
        const fs = require("fs");
        let htmls = fs.readFileSync(__dirname + "/pages/mainPage.html", "utf8");
        const array = await Blogs.find();
        array.reverse();
        let posts = "";
        array.forEach((element) => {
            posts += `<article class="flex max-w-xl flex-col items-start justify-between" style="border: 2px solid black; padding: 10%; border-radius: 5%; transition: transform 0.3s ease-in-out;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            <div class="flex items-center gap-x-4 text-xs">
              <time datetime="2020-03-16" class="text-gray-500">${element.date} ${element.time}</time>
            </div>
            <div class="group relative">
              <h3 class="mt-3 text-lg font-bold leading-6 text-gray-900 group-hover:text-gray-600">
                <a href="/readmore/${element._id}" target="_blank">
                  <span class="absolute inset-0"></span>
                  ${element.heading}
                </a>
              </h3>
              <p class="mt-5 line-clamp-3 text-sm leading-6 text-gray-600">${element.content.substring(0, 250)}</p>
            </div>
            <div class="relative mt-8 flex items-center gap-x-4">
              <div class="text-sm leading-6">
                <p class="font-semibold text-gray-900">
                  <p>
                    <span class="absolute inset-0"></span>
                    Posted by - ${element.postedBy}
                  </p>
                </p>
              </div>
            </div>
          </article>`
        });
        htmls = htmls.replace("{ blogs }", posts);
        res.send(htmls);
    } catch (error) {
        res.send(error);
    }
});
app.get("/signup", (req, res) => {
    res.sendFile(__dirname + "/pages/signupPage.html");
});
app.get("/createBlog", isAuthenticated, (req, res) => {
    res.sendFile(__dirname + "/pages/createBlogPage.html");
});
app.get("/readmore/:id", isAuthenticated , async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await Blogs.findById(blogId);
        if (!blog) {
            return res.status(404).send("Blog not found");
        }
        const fs=require("fs");
        let html=fs.readFileSync(__dirname + '/pages/selectedBlog.html', 'utf8');
        let x= `<section>
        <div class=" flex flex-col items-center px-5 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div class="flex flex-col w-full max-w-3xl mx-auto prose text-left prose-blue">
                <div class="w-full mx-auto">
                    <h1 class="text-4xl font-bold mb-4">${blog.heading}.</h2>
                    <h3 class="text-2xl font-bold mb-4">Posted by - ${blog.postedBy}</h3>
                    <p>${blog.date} ${blog.time}</p>
                    <h4 class="text-xl mb-4">${blog.content}</h4>
                </div>
            </div>
        </div>
    </section>
    `
        html = html.replace('{ readmore }', x);
        html = html.replace('{ docname }', blog.heading);
        res.send(html)
    } catch (error) {
        res.status(500).send(error);
    }
});
app.get('/logout', isAuthenticated, (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error(err);
      }
      res.redirect('/');
    });
});
app.post("/signup", async (req, res) => {
    try {
        const { fname, lname, email, password } = req.body;
        const exists = await Users.findOne({ email: email });
        if (exists) {
            res.redirect("/");
        } else {
            const data = new Users({
                fname,
                lname,
                email,
                password,
            });
            await data.save();
            res.redirect("/home");
        }
    } catch (error) {
        res.redirect("/signup");
    }
});
app.post("/", async (req, res) => {
    try {
        const { email, password } = req.body;
        const exists = await Users.findOne({ email });

        if(!exists){
            res.redirect('/signup');
        }
        else if (exists && exists.password == password) {
            const name = exists.fname + " " + exists.lname;
            req.session.user = {userId: exists._id, email:exists.email, username: name};
            res.redirect("/home");
        } else {
            res.send("Invalid Password!");
        }
    } catch (error) {
        res.send(error);
    }
});
app.post("/createBlog",isAuthenticated, async (req, res) => {
    try {
        const { heading, content } = req.body;
        const currentDate = new Date();
        const time = currentDate.getHours() + ":" + currentDate.getMinutes();
        const date =
            currentDate.getDate() +
            "/" +
            (currentDate.getMonth() + 1) +
            "/" +
            currentDate.getFullYear();
        const postedBy = req.session.user.username;
        const data = new Blogs({
            postedBy,
            heading,
            time,
            date,
            content,
        });
        await data.save();
        res.redirect("/home");
    } catch (error) {
        res.send("Could not add blog");
    }
});
app.listen(PORT, () => {
    console.log(`App live on port http://localhost:${PORT}`);
});
