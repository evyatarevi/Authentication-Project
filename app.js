const path = require("path");
const express = require("express");
const session = require("express-session"); //Third party package
const mongodbStore = require('connect-mongodb-session');  //Third-party packages that will manage that storage for us so that we'll manage the database or a file access for us.
const db = require("./data/database");
const demoRoutes = require("./routes/demo");

const MongoDBStore = mongodbStore(session); //'MongoDBStore' - is now actually a class, a constructor function we can execute to create a new object. 'mongodbStore(session)' - that internally these two things (session & mongo) can connect.

const app = express();

const sessionStore = new MongoDBStore({
  uri: "mongodb://127.0.0.1:27017",  //path to database
  databaseName: 'auto-demo',  // define the database in which (in it) this collection for these sessions should be created. We choose the our db.
  collection: 'session'  //we define the collection in which our session entries will be stored.
})

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(   // session created for every request, even unauthenticated request.
  //Initialize and set up our session package:
  session({
    //accept object in parameter to configuration how to work.
    // key names are not up to you.
    secret: "super-secret", //'super-secret' - the string up to you. in reality we use in long and more secure string.
    resave: false, //This will simply influence that a session is only updated in the database if the data in it is really changed. 
    // If that would be set to true, a new session would be stored in the database for every incoming request even if nothing about the session data changed.
    saveUninitialized: false,  //so that a session is really only stored in the database or wherever we wanna save it. Because saveUninitialized was set to false, so an empty session with no data inside won't be stored to the database, and hence no session cookie will be generated.
    store: sessionStore  //The store setting controls where the session data actually should be stored. We use in third party package (mongodbStore) to configure to mongodb database. This  third party package manage the database for us.
  })
);


app.use( async (req, res, next) => {
  const user = req.session.user;
  const isAuth = req.session.isAuthenticated;
  console.log('user: '+user + ', isAuth: '+isAuth);

  console.log(
    'locals.userAuth: '+
    res.locals.userAuth + 
    ', locals.userAdmin: '+
    res.locals.userAdmin
  );

  if(!user || !isAuth){
    // app.locals.userAuth = false; 
    // app.locals.userAdmin = false;

    console.log('next() happen');
    return next();  
    /*
    'next()'- tells express that this request, for which this middleware is being executed here, should be forwarded to 
    the next middleware or route in line(in this case 'demoRoutes').
    */
  }
  
  res.locals.userAuth = true; //
  /*
  'locals' - set a global values tha will be available throughout this entire request response cycle and these variables are by default available
  in all your templates page and routes that become after without you passing it into them manually .
  Because we used in 'res.locals' rather 'app.locals' the variables available only in this request. 
  */

  const userDoc = await db.getDb().collection('users').findOne({_id: user.id});

  if(userDoc.isAdmin){
    res.locals.userAdmin = true;
  }

  next();
});


app.use(demoRoutes);


app.use(function (error, req, res, next) {
  console.log(error);
  res.render("500");
});


db.connectToDatabase().then(function () {
  app.listen(3000);
});
