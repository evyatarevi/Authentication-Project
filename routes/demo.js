const express = require("express");
const bcryptjs = require("bcryptjs");

const db = require("../data/database");

const router = express.Router();

router.get("/", function (req, res) {
  res.render("welcome");
});

router.get("/signup", function (req, res) {
  res.render("signup");
});

router.get("/login", function (req, res) {
  res.render("login");
});

//POST signup
router.post("/signup", async function (req, res) {
  const userData = req.body;
  const email = userData.email;
  const confirmEmail = userData["confirm-email"]; //because dash (-) not allowed as a property name with dot notation, you have to use this alternative notation.
  const password = userData.password;

  if (
    !email ||
    !confirmEmail ||
    !password ||
    !email.include("@") ||
    password.trim() < 6 ||
    email !== confirmEmail
  ) {
    console("Please check your details again, something went wrong");
    return res.redirect("/signup");
  }

  const userExist = db.getDb().collection("users").findOne({ email: email });

  if (userExist) {
    console.log("The user exist, try signup with another");
    return res.redirect("/signup");
  }

  //We need to hash the password before save it, for case that our database is hacked. We need that the hash password can't decoded back but can verify the password.
  const hashedPassword = await bcryptjs.hash(password, 12);

  const user = {
    email: email,
    password: hashedPassword,
  };

  await db.getDb().collection("users").insertOne(user);
  res.redirect("/login");
});

//POST login - we validation the user in the server side
router.post("/login", async function (req, res) {
  const userInput = req.body;
  const emailInput = userInput.email;
  const passwordInput = userInput.password;

  const user = await db
    .getDb()
    .collection("users")
    .findOne({ email: emailInput }); //if doesn't exist it will return 'null'.
  if (!user) {
    console.log("User doesn't exist");
    return res.status(401).render("401");
  }

  const equalPasswords = await bcryptjs.compare(passwordInput, user.password); //return true or false.

  if (!equalPasswords) {
    console.log("Wrong password");
    return res.status(401).render("401");
  }

  // if succeed:
  //store data in the session (to see that we have a logged in user):
  req.session.user = { id: user._id, email: user.email };
  req.session.isAuthenticated = true; //Not necessarily.
  /*
  The 'session' property is provided by the express-session package which manages the session for us.
  Every request has a session. '.user' - is new property, we could add that.
  The value of 'user' up to you, we choose object.
  The object saved in 'session' collection that configure up.

  When response is sent, express-session package will automatically save the session to database.
  But if you redirect to route that will soon be protected, there is a danger of this redirection being finished before
  the session data in the database was updated, because saving to the database, as you'll learned, is an asynchronous task
  that can take a couple of seconds or milliseconds.
  for this exact use case here, we wanna manually call session.save - a built-in method on this session object which will 
  force that data to be saved to the database.
  It takes a callback function which will only be executed by this session package after saving finished.
  */
  req.session.save(() => {
    res.redirect("/admin");
  });
});

router.get("/admin", function (req, res) {
  if (!req.session.isAuthenticated) {
    //if falsy. Another option: if(!req.session.user)
    return res.status(401).render("401");
  }
  res.render("admin");
});

router.post("/logout", function (req, res) {
  /* 
  We could also delete the entire session object from the database and therefore clear to cookie, but you should think 
  twice about because sessions can also be used for storing other data. for example shopping cart, which you might want to
  store even for unauthenticated users.
  In our case the session still save in the database, but the values change (also in the database): user = null, isAuthenticated = false.
*/
  req.session.user = null;  //falsy in if login
  req.session.isAuthenticated = false;
  res.redirect('/');  //we didn't need to use in req.session.save because we use that when we need to access to page that need the session. here we froward to home page that doesn't need authentication.
});

module.exports = router;

//cookie - form of automatically-managed data storage in the browser
