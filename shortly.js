var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var Promise = require('bluebird');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');


var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(cookieParser("lol seriously"));
app.use(session());

function restrict(req, res, next) {
  if(req.session.user) {
    next();
  } else {
    req.session.error = "Access denied";
    res.redirect('/login');
  }
}

app.get('/',
function(req, res) {
  restrict(req, res, function() {
    console.log("GETTING REDIRECTED")
    res.render('index');
  })
  // res.render('index');
  // res.render('index');
});

app.get('/create',
function(req, res) {
  res.render('index');
});

app.get('/links',
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;
  console.log("getting here");

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          // console.log(newLink, "this is newLink");
          // console.log(newLink.url, "this is the link's URL");
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  // Parse request from /signup.
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username}).fetch().then(function(found) {
    // Creating new user model with attributes username and password. Fetch it. If found, then
    if (found) {
      // Tell the user to pick a different username
      console.log("FOUND USER!!!!!!!!!!!!!!!!!!!!!!!");
    }
    // Otherwise create/save that user in our db.
    // If signup is successful, render index otherwise throw error
    else {
      var user = new User({
        username: username,
        password: password
      });

      user.save().then(function(newUser) {
        console.log('NEW USER: ', newUser);
        Users.add(newUser);
        console.log(newUser, "After Users.add");
        // Give new user a session token/log user in
        // Redirect to user's home page
        res.redirect(200, 'index');
       // Users[0].fetch();
      });
    }
  });
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  // Potentially this could be refactored into a checkUser function
  // var checkUser = function(username, password, callback) {

  // };

  new User({username: username}).fetch().then(function(found) {
    if(found) {
      // Check the given password against the hashed password stored for username in database
      var hashedpassword = found.attributes.password;
      console.log(found, "this is the found object");
      Promise.promisify(bcrypt.compare)(req.body.password, hashedpassword).bind(this).then(function(result) {
        console.log(result, "this is result");
        if (result === true) {
          req.session.regenerate(function() {
            req.session.user = username;
            res.redirect('/index');
          });
        }
        else {
          res.redirect('/login');
        }
      });
      // bcrypt.hash(req.body.password, null, null, function(err, result) {
      //   if(err) { throw err; }
      //   console.log("FOUND PASSWORD: ", hashedpassword);
      //   if(result === hashedpassword) {
      //     console.log("this is only if result === found.password");
      //   }
      // });
      // console.log('FOUND USER: ',found);
      //checkUser(user, cb);
      // Where are we going to push the password to get hashed and then validate it in the db?

        // If password checks out,
          // Give the user a session token
        // Else, inform them their password was incorrect, let them try again
    } else {
      // Inform the user that the entered username was not found, let them try a different username
    }
  });
});

app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/login');
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', restrict, function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
