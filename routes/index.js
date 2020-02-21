var express = require("express"),
    router = express.Router(),
    passport = require("passport"),
    Campground = require("../models/campground"),
    User = require("../models/user"),
    Comment = require("../models/comment"),
    async = require("async"),
    nodemailer = require("nodemailer"),
    crypto = require("crypto"),
    middleware = require("../middleware/");

//INDEX ROUTE
router.get('/', (req, res) => {
    res.render("landing");
});

//SHOW REGISTER FORM
router.get('/register', (req, res) => {
    res.render("register", { page: "register" });
});
//SIGN UP LOGIC
router.post('/register', (req, res) => {
    if (req.body.avatar === "") {
        req.body.avatar = "https://iupac.org/wp-content/uploads/2018/05/default-avatar.png"
    }
    var newUser = new User({
        username: req.body.username,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        age: req.body.age,
        avatar: req.body.avatar,
        description: req.body.description
    });
    User.register(newUser, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            return res.render("register", { error: err.message });
        }
        passport.authenticate("local")(req, res, () => {
            req.flash("success", "Welcome to YelpCamp ! " + user.username);
            res.redirect("/campgrounds");
        });
    });
});
//SHOW LOGIN FORM
router.get('/login', (req, res) => {
    res.render("login", { page: "login" });
});
//LOGIN LOGIC
router.post('/login', passport.authenticate("local",
    {
        successRedirect: "/campgrounds",
        failureRedirect: "/login"
    }), (req, res) => {

    });
//LOGOUT ROUTE
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect("/campgrounds");
});

//USER PROFILE
router.get('/users/:id', (req, res) => {
    User.findById(req.params.id, (err, foundUser) => {
        if (err || !foundUser) {
            req.flash("error", "User not found!");
            res.redirect("/campgrounds");
        } else {
            Campground.find().where('author.id').equals(foundUser._id).exec((err, foundCampgrounds) => {
                if (err) {
                    req.flash("error", "Something went wrong!");
                    res.redirect("/campgrounds");
                } else {
                    res.render("profile", { user: foundUser, campgrounds: foundCampgrounds });
                }
            });
        }
    });
});

//EDIT PROFILE
router.get('/users/:id/edit', middleware.checkUserOwnership, (req, res) => {
    User.findById(req.params.id, (err, foundUser) => {
        if(err || !foundUser){
            req.flash("error", "User not found!");
            res.redirect("/campgrounds");
        }
        res.render("edit", { user: foundUser });
    });
});

//UPDATE PROFILE
router.put('/users/:id', middleware.checkUserOwnership, (req, res) => {
    if (req.body.user.avatar === "") {
        req.body.user.avatar = "https://iupac.org/wp-content/uploads/2018/05/default-avatar.png"
    }
    User.findByIdAndUpdate(req.params.id, req.body.user, { useFindAndModify: false }, (err, updatedUser) => {
        if (err) {
            console.log(err);
        } else {
            req.flash("success", "User Updated!");
            res.redirect("/users/" + req.params.id);
        }
    });
});

//DELETE PROFILE
router.delete('/users/:id', middleware.checkUserOwnership, (req, res) => {
    User.findById(req.params.id, { useFindAndModify: false }, (err, foundUser) => {
        if (err) {
            req.flash("error", "No User Profile Found!");
            res.redirect("/campgrounds");
        } else {
            Campground.find().where('author.id').equals(foundUser._id).exec((err, foundCampgrounds) => {
                if (err) {
                    req.flash("error", "Something went wrong!");
                    res.redirect("/campgrounds");
                } else {
                    foundCampgrounds.forEach(campground => {
                        Comment.deleteMany({
                            "_id": { $in: campground.comments }
                        }, (err) => {
                            if (err) {
                                console.log(err);
                            } else {
                                campground.deleteOne();
                            }
                        });
                    });
                }
            });
            foundUser.deleteOne();
            req.flash("error", "User Profile And Campgrounds Deleted!");
            res.redirect("/campgrounds");
        }
    });
});

// FORGOT PASSWORD
router.get('/forgot', function (req, res) {
    res.render('forgot');
});

router.post('/forgot', function (req, res, next) {
    async.waterfall([
        function (done) {
            crypto.randomBytes(20, function (err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function (token, done) {
            User.findOne({ email: req.body.email }, function (err, user) {
                if (!user) {
                    req.flash('error', 'No account with that email address exists.');
                    return res.redirect('/forgot');
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                user.save(function (err) {
                    done(err, token, user);
                });
            });
        },
        function (token, user, done) {
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'learningtocodecekov@gmail.com',
                    pass: process.env.GMAILPW
                }
            });
            var mailOptions = {
                to: user.email,
                from: 'learningtocodecekov@gmail.com',
                subject: 'Node.js Password Reset',
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                    'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };
            smtpTransport.sendMail(mailOptions, function (err) {
                console.log('mail sent');
                req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
                done(err, 'done');
            });
        }
    ], function (err) {
        if (err) return next(err);
        res.redirect('/forgot');
    });
});

router.get('/reset/:token', function (req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot');
        }
        res.render('reset', { token: req.params.token });
    });
});

router.post('/reset/:token', function (req, res) {
    async.waterfall([
        function (done) {
            User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
                if (!user) {
                    req.flash('error', 'Password reset token is invalid or has expired.');
                    return res.redirect('back');
                }
                if (req.body.password === req.body.confirm) {
                    user.setPassword(req.body.password, function (err) {
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save(function (err) {
                            req.logIn(user, function (err) {
                                done(err, user);
                            });
                        });
                    })
                } else {
                    req.flash("error", "Passwords do not match.");
                    return res.redirect('back');
                }
            });
        },
        function (user, done) {
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'learningtocodecekov@gmail.com',
                    pass: process.env.GMAILPW
                }
            });
            var mailOptions = {
                to: user.email,
                from: 'learntocodeinfo@mail.com',
                subject: 'Your password has been changed',
                text: 'Hello,\n\n' +
                    'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
            };
            smtpTransport.sendMail(mailOptions, function (err) {
                req.flash('success', 'Success! Your password has been changed.');
                done(err);
            });
        }
    ], function (err) {
        res.redirect('/campgrounds');
    });
});
module.exports = router;