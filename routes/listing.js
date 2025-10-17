const express = require('express');
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing} = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer  = require('multer');
const { storage } = require("../cloudConfig.js");
const upload = multer({storage });

//Index Route 
router.get('/', wrapAsync(listingController.index));

//New Rout
router.get('/new', isLoggedIn, (listingController.renderNewForm));

//show Route
router.get('/:id', wrapAsync(listingController.showListing));

//Create Route
 router.post('/',isLoggedIn, validateListing, upload.single('listing[image]'), wrapAsync(listingController.createListing));


// Edit Route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync (listingController.renderEditForm));

// Update Route
router.put("/:id",isLoggedIn,isOwner,  validateListing, upload.single('listing[image]'), wrapAsync (listingController.updateListing));

// delete Route
router.delete("/:id",isLoggedIn, isOwner, wrapAsync  (listingController.destroyListing));


module.exports = router;