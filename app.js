const express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    mongoose = require("mongoose"),
    flash = require("connect-flash"),
    passport = require("passport"),
    LocalStrategy = require("passport-local"),
    methodOverride = require("method-override"),
    Comment = require("./models/comment"),
    Campground = require("./models/campground"),
    User = require("./models/user"),
    seedDB = require("./seeds");

//REQUIRING ROUTES
var commentRoutes = require("./routes/comments"),
    campgroundRoutes = require("./routes/campgrounds"),
    indexRoutes = require("./routes/index");
var url = process.env.DATABASEURL || "mongodb://localhost/yelp_camp";
    mongoose.connect(url, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true
    }).then(() => {
        console.log('Connected to DB!');
    }).catch(err => {
        console.log('ERROR:', err.message);
    });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.set('view engine', 'ejs');
mongoose.set('useCreateIndex', true);
// seedDB();

//PASSPORT CONFIG
app.use(require("express-session")({
    secret: "This is secret",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    app.locals.moment = require('moment');
    next();
});

app.use(indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);


app.get('*', (req, res) => {
    res.redirect("/campgrounds");
});

if(process.env.PORT === undefined){
    process.env.PORT = 3000;
}
app.listen(process.env.PORT, (err)=>{
    if(err){
        console.log(`Error: ${err.message}`)
    }else{
        console.log(`App running on port ${process.env.PORT}`);
    }
});