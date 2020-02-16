
var Campground = require("../models/campground"),
    User = require("../models/user"),
    Comment = require("../models/comment");

var middlewareObj = {};

middlewareObj.checkCampgroundOwnership = function (req, res, next) {
    // is someone logged in
    if (req.isAuthenticated()) {
        Campground.findById(req.params.id, (err, foundCampground) => {
            if (err) {
                req.flash("error", "Campground not found !");
                console.log(err);
                res.redirect("back");
            }
            else {
                //does the user own the campground
                if (foundCampground.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else {
                    req.flash("error", "Permission denied !");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "Please Login First !");
        res.redirect("back");
    }
}

middlewareObj.checkCommentOwnership = function (req, res, next) {
    // is someone logged in
    if (req.isAuthenticated()) {
        Comment.findById(req.params.comment_id, (err, foundComment) => {
            if (err) {
                console.log(err);
                res.redirect("back");
            }
            else {
                //does the user own the comment
                if (foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else {
                    req.flash("error", "Permission denied !");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "Please Login First !");
        res.redirect("back");
    }
}

middlewareObj.checkUserOwnership = function (req, res, next) {
    // is someone logged in
    if (req.isAuthenticated()) {
        User.findById(req.user.id, (err, foundUser) => {
            if (err) {
                console.log(err);
                res.redirect("back");
            }
            else {
                //does the user own the comment
                if (foundUser._id.equals(req.params.id) || req.user.isAdmin) {
                    next();
                } else {
                    req.flash("error", "Permission denied !");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "Please Login First !");
        res.redirect("back");
    }
}

middlewareObj.isLoggedIn = function (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "Please Login First !");
    res.redirect("/login");
}

module.exports = middlewareObj;