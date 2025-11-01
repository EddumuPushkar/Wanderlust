require("dotenv").config();
const User = require("../models/user");
const OTP = require("../models/otpModel"); // your OTP schema
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

module.exports.renderSignupForm = (req, res) => {
  if (req.isAuthenticated()) {
    req.flash("error", "You are already logged in!");
    return res.redirect("/listings");
  }
  res.render("users/signup.ejs");
};

module.exports.signup = async (req, res) => {
  try {
    let { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already registered. Please log in.");
      return res.redirect("/login");
    }

    const newUser = new User({
      username,
      email,
      isVerified: false,
    });
    const registeredUser = await User.register(newUser, password);

    const otp = generateOTP();
    const otpDoc = await OTP.create({ email, otp });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify your Wanderlust account",
        text: `Your OTP is ${otp}. It expires in 5 minutes.`,
      });
      return res.redirect(`/verify?email=${email}`);
    } catch (err) {
      console.error("Error sending OTP email:", err);
      // deleting use data if email fails
      await OTP.deleteOne({ _id: otpDoc._id });
      await User.deleteOne({ _id: registeredUser._id });

      req.flash(
        "error",
        "Could not send verification email. Please try again."
      );
      return res.redirect("/signup");
    }
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/signup");
  }
};

module.exports.renderOtpForm = (req, res) => {
  const { email } = req.query;
  // render the existing verify OTP view
  res.render("users/verifyOtp.ejs", { email });
};

// module.exports.getresendOtp = async (req, res) => {
//   try {
//     const { email } = req.query; // email passed in query string
//     res.render("resendOtp", { email });
//     // "resendOtp.ejs" is your view file
//     // you can pass email so the form knows which account to resend to
//   } catch (err) {
//     console.error("Error rendering resend OTP page:", err);
//     req.flash("error", "Could not load resend OTP page.");
//     return res.redirect("/signup");
//   }
// };
// module.exports.resendOtp = async (req, res, next) => {
//   try {
//     const { email } = req.query;
//     if (!email) {
//       req.flash("error", "Email missing. Please try signing up again.");
//       return res.redirect("/signup");
//     }

//     // ensure the user exists
//     const user = await User.findOne({ email });
//     if (!user) {
//       req.flash("error", "User not found. Please sign up first.");
//       return res.redirect("/signup");
//     }

//     // generate and store new OTP (overwrite existing)
//     const otp = generateOTP();
//     await OTP.findOneAndUpdate(
//       { email },
//       { email, otp },
//       { upsert: true, new: true }
//     );

//     // send email
//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: "Your new Wanderlust OTP",
//       text: `Your new OTP is ${otp}. It expires in 5 minutes.`,
//     });

//     req.flash("success", "A new OTP has been sent to your email.");
//     return res.redirect(`/verify?email=${email}`);
//   } catch (err) {
//     console.error("Error resending OTP:", err);
//     req.flash(
//       "error",
//       "Could not resend OTP. Please try again later or contact support."
//     );
//     return res.redirect("/signup");
//   }
// };

module.exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // 1. Find OTP record
    const record = await OTP.findOne({ email });

    if (!record) {
      req.flash("error", "Invalid or expired OTP");
      return res.redirect(`/verify?email=${email}`); // let them retry
    }
    // if otp is incorrect
    if (record.otp !== otp) {
      req.flash("error", "Invalid OTP. Please try again.");
      return res.redirect(`/verify?email=${email}`);
    }

    // 2. Mark user as verified
    const user = await User.findOneAndUpdate({ email }, { isVerified: true });

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/signup");
    }

    // 3. Delete OTP record
    await OTP.deleteOne({ email });

    req.flash("success", "Account verified! you can now login!");
    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      req.flash("success", "User registered successfully!");
      res.redirect("/listings");
    });
  } catch (err) {
    // small fix: use req.flash and redirect back to the verify page
    req.flash(
      "error",
      "An error occurred during verification. Please try again."
    );
    const email = req.body?.email || req.query?.email || "";
    return res.redirect(`/verify?email=${email}`);
  }
};

module.exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error", "No account found with that email.");
      return res.redirect("/signup");
    }

    if (user.isVerified) {
      req.flash("error", "Account already verified. Please log in.");
      return res.redirect("/login");
    }

    // 2. Generate new OTP
    const otp = generateOTP();

    // 3. Update or create OTP record
    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: Date.now() },
      { upsert: true, new: true } //update + insert if exists otherwise will not update
    );

    // 4. Send OTP email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify your Wanderlust account",
        text: `Your OTP is ${otp}. It expires in 5 minutes.`,
      });

      req.flash("success", "A new OTP has been sent to your email.");
      return res.redirect(`/verify?email=${email}`);
    } catch (err) {
      console.error("Error sending OTP email:", err);
      req.flash(
        "error",
        "Could not send verification email. Please try again."
      );
      return res.redirect("/signup");
    }
  } catch (err) {
    console.error("Resend OTP error:", err);
    req.flash(
      "error",
      "An error occurred while resending OTP. Please try again."
    );
    return res.redirect(`/verify?email=${req.body.email}`);
  }
};
module.exports.renderLoginForm = (req, res) => {
  if (req.isAuthenticated()) {
    req.flash("error", "You are already logged in!");
    return res.redirect("/listings");
  }
  res.render("users/login.ejs");
};
module.exports.login = async (req, res, next) => {
  try{
      if (req.user && !req.user.isVerified) {
      const email = req.user.email;
      const username = req.user.username;
      const otp = generateOTP();
      await OTP.findOneAndDelete({ email });
      // 3. Update or create OTP record
      await OTP.findOneAndUpdate(
        { email },
        { otp, createdAt: Date.now() },
        { upsert: true, new: true } //update + insert if exists otherwise will not update
      );
      req.logout(async(err) => {
        if (err) return next(err);
        try{
          await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Verify your Wanderlust account",
          text: `Your OTP is ${otp}. It expires in 5 minutes.`,
        });
        req.flash("success", "A new OTP has been sent to your email.");
        return res.redirect(`/verify?email=${email}`);
        }
        catch(err){
          console.log("Error sending OTP email:", err);
          req.flash(
          "error",
          "Could not send verification email. Please try again."
        );
        return res.redirect("/login");
        }
      });
    } else {
      req.flash("success", "Logged In");
      let redirectUrl = res.locals.redirectUrl || "/listings";
      res.redirect(redirectUrl);
    }
  }
  catch(err){
    console.error("Login error:", err);
    req.flash("error", "Something went wrong during login.");
    return res.redirect("/login")
  }
};

module.exports.logout = (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash("success", "Logged Out");
    res.redirect("/listings");
  });
};
