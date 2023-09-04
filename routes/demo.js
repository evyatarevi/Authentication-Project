const express = require('express');
const bcryptjs = require('bcryptjs');

const db = require('../data/database');

const router = express.Router();

router.get('/', function (req, res) {
  res.render('welcome');
});


router.get('/signup', function (req, res) {
  res.render('signup');
});


router.get('/login', function (req, res) {
  res.render('login');
});


//POST signup
router.post('/signup', async function (req, res) {
  const userData = req.body;
  const email = userData.email;
  const confirmEmail = userData['confirm-email']; //because dash (-) not allowed as a property name with dot notation, you have to use this alternative notation.
  const password = userData.password;

  if(!email || !confirmEmail || !password || !email.include('@') || password.trim() < 6 || email !== confirmEmail){
    console('Please check your details again, something went wrong')
    return res.redirect('/signup')
  }

  const userExist = db.getDb().collection('users').findOne({email: email});

  if(userExist){
    console.log('The user exist, try signup with another');
    return res.redirect('/signup');
  }

  //We need to hash the password before save it, for case that our database is hacked. We need that the hash password can't decoded back but can verify the password.
  const hashedPassword = await bcryptjs.hash(password, 12);

  const user = {
    email: email,
    password: hashedPassword
  }

  await db.getDb().collection('users').insertOne(user);
  res.redirect('/login');
});


//POST login - we validation the user in the server side
router.post('/login', async function (req, res) {
  const userInput = req.body;
  const emailInput = userInput.email;
  const passwordInput = userInput.password;

  const user = await db.getDb().collection('users').findOne({email: emailInput});  //if doesn't exist it will return 'null'.
  if(!user){
    console.log("User doesn't exist");
    return res.status(401).render('401');
  }

  const equalPasswords = await bcryptjs.compare(passwordInput, user.password); //return true or false.

  if(!equalPasswords){
    console.log("Wrong password");
    return res.status(401).render('401');
  }

  // if succeed:
  res.status(200).render('welcome');
  });



router.get('/admin', function (req, res) {
  res.render('admin');
});

router.post('/logout', function (req, res) {});

module.exports = router;



//cookie - form of automatically-managed data storage in the browser