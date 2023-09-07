const express = require("express");
const bcryptjs = require("bcryptjs");

const db = require("../data/database");
const { ObjectId } = require("mongodb");

const router = express.Router();


//GET home
router.get("/", function (req, res) {
  res.render("welcome");
});



//GET signup
router.get("/signup", function (req, res) {
  let sessionInputData = req.session.inputData; 

  if(!sessionInputData){  //Checks if this is the first login to the signup page or after an invalid error occurred.
    sessionInputData = {
      hasError: false,
      message: '',
      email: '',
      confirmEmail: '',
      password: ''
    }
  }  

  /*
  After we have used the session we can delete it, and this is because we do not want the wrong details will remain forever.
  We want it for one request. If, for example, the visitor goes to another page and returns to the signup form - 
  we want nothing to be written:
  */
  req.session.inputData = null;

  res.render("signup", { sessionInputData: sessionInputData });
});


//GET login
router.get("/login", function (req, res) {
  let userInput = req.session.inputData;
  if(!userInput){
    userInput = {
      hasError: false,
      message: "",
      email: '',
      password:''
    };
  }
  req.session.inputData = null;
  res.render("login", {userInput: userInput});
});


//GET profile
router.get("/profile", function (req, res) {
  if (!req.session.isAuthenticated) {  //Another option: if(!req.local.userAuth)
    //if falsy. Another option: if(!req.session.user)
    return res.status(401).render("401");
  }
  res.render("profile");
});



//GET admin page
router.get("/admin", async function (req, res) {
  if (!req.session.isAuthenticated) {  //if falsy. Another option: if(!req.session.user). Another option: if(!req.local.userAuth)
    return res.status(401).render("401");
  }

  const user = await db.getDb().collection('users').findOne({_id: ObjectId(req.session.user.id)});

  if(!user || !user.isAdmin){  //Another option: if(!req.local.userAdmin)
    return res.status(403).render('403');
  }
  res.render("admin");
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
    !email.includes("@") ||
    password.trim() < 6 ||
    email !== confirmEmail
  ) {
    /*
    In POST requests, you should redirect to the page rout and not render the page, because if we renders the page and the client refreshes 
    the page, a message will pop up asking him to resend a POST request or send a form again. we wan't this.
    The problem is that all the data that the client entered is deleted and he need enter again. We prefer that in case the input data are not 
    valid, the client will be returned to the signup page again with the data he entered and change it. We will use session for that as well.
    */
    req.session.inputData = {
      hasError: true,  //error happened
      message: 'Invalid input - please check your data.',
      email: email,
      confirmEmail: confirmEmail,
      password: password
    };
    req.session.save(()=>{
      res.redirect("/signup");
    });
    return;  // the code of the route will not continue execute
  }

  const userExist = await db.getDb().collection("users").findOne({ email: email });

  if (userExist) {
    req.session.inputData = {
      hasError: true, 
      message: 'The user exist, try signup with another email',
      email: email,
      confirmEmail: confirmEmail,
      password: password
    };
    req.session.save(() => {
      res.redirect("/signup");
    });
    return;
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

  const invalid = {
    hasError: true,  //error happened
    message: "Could not log you in.",
    email: emailInput,
    password: passwordInput
  };

  const user = await db
    .getDb()
    .collection("users")
    .findOne({ email: emailInput }); //if doesn't exist it will return 'null'.
  
  if (!user) {
    req.session.inputData = invalid;
    req.session.save(()=>{
      res.redirect("/login");
    });
    return;  // the code of the route will not continue execute
  }
   

  const equalPasswords = await bcryptjs.compare(passwordInput, user.password); //return true or false.

  if (!equalPasswords) {
    req.session.inputData = invalid;
    req.session.save(()=>{
      res.redirect("/login");
    });
    return; 
  }

  // if succeed to login:

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
  force that data to be saved on the database.
  It takes a callback function which will only be executed by this session package after saving finished.
  */
 req.session.save(() => {
   res.redirect("/"); 
   
  });
});



//POST logout
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
