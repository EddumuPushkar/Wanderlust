const express = require('express');
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require('../utils/wrapAsync');
const passport = require("passport");
const { saveRedirectUrl } = require('../middleware.js');
const userController = require('../controllers/users.js');



router.get("/signup", userController.renderSignupForm);
router.post("/signup", wrapAsync (userController.signup));
//OTP VERIFICATION
router.get("/verify", userController.renderOtpForm);
router.post("/verify-otp", wrapAsync(userController.verifyOtp));

// Resend OTP
// router.get("/resend-otp", wrapAsync(userController.getresendOtp));
//resend OTP
router.post("/resend-otp", wrapAsync(userController.resendOtp));


router.get("/login",userController.renderLoginForm)

router.post("/login",saveRedirectUrl,  passport.authenticate("local", {failureRedirect: "/login", failureFlash: true }),userController.login);
router.get("/logout",userController.logout);
module.exports = router;    
