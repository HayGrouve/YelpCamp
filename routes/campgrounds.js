var express = require("express"),
    router = express.Router(),
    Campground = require("../models/campground"),
    middleware = require("../middleware/");

// INDEX ROUTE
router.get('/', (req, res) => {
    if (req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        // Get some campgrounds from DB
        Campground.find({ name: regex }, (err, foundCampgrounds) => {
            if (err || foundCampgrounds.length < 1) {
                req.flash("error", "No campgrounds match that query, please try again.");
                res.redirect("/campgrounds");
            } else {
                res.render("campgrounds/index", { campgrounds: foundCampgrounds, page: "campgrounds" });
            }
        });
    } else {
        // Get all campgrounds from DB
        Campground.find({}, (err, allCampgrounds) => {
            if (err) {
                console.log(err);
            } else {
                res.render("campgrounds/index", { campgrounds: allCampgrounds, page: "campgrounds" });
            }
        });
    }
});
//CREATE ROUTE
router.post('/', middleware.isLoggedIn, (req, res) => {
    var name = req.body.name;
    var price = req.body.price;
    var image = req.body.image;
    var description = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    var newCampground = { name: name, price: price, image: image, description: description, author: author };
    Campground.create(newCampground, (err, campground) => {
        if (err) {
            console.log(err);
        } else {
            req.flash("success", "Campground Added!");
            res.redirect("/campgrounds")
        }
    });
});
//NEW ROUTE
router.get('/new', middleware.isLoggedIn, (req, res) => {
    res.render("campgrounds/new");
});
//SHOW ROUTE
router.get('/:id', (req, res) => {
    Campground.findById(req.params.id).populate("comments").exec((err, foundCampground) => {
        if (err) {
            console.log(err);
        } else {
            res.render("campgrounds/show", { campground: foundCampground });
        }
    });
});
//EDIT ROUTE
router.get('/:id/edit', middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findById(req.params.id, (err, foundCampground) => {
        res.render("campgrounds/edit", { campground: foundCampground });
    });
});
//UPDATE ROUTE
router.put('/:id', middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findByIdAndUpdate(req.params.id, req.body.campground, { useFindAndModify: false }, (err, updatedCampground) => {
        if (err) {
            console.log(err);
        } else {
            req.flash("success", "Campground Updated!");
            res.redirect("/campgrounds/" + req.params.id);
        }
    });
});
//DELETE ROUTE
router.delete('/:id', middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findByIdAndRemove(req.params.id, { useFindAndModify: false }, (err) => {
        if (err) {
            res.redirect("/campgrounds");
        } else {
            req.flash("error", "Campground Deleted!");
            res.redirect("/campgrounds");
        }
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;