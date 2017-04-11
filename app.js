var express = require('express');
var path = require('path');
var http = require('http');
var reload = require('reload');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var GoogleAuth = require('google-auth-library');
var exec = require("child_process").exec;
var util = require('util');
var querystring = require("querystring");

var index = require('./routes/index');
var users = require('./routes/users');

var config = require('./config.json');
var bodyParser = require('body-parser');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//app.use('/', index);
app.use('/users', users);

function checkSubmissionStatus(callback) {
    fs.readFile(path.join(__dirname,'config.json'),'utf-8',function(err,data) {
        if (err) {
            return console.log(err);
        }
        var config = JSON.parse(data);
        if(config.submissionsPublished) {
            callback(1);
        } else if(config.submissionsClosed) {
            callback(0);
        } else {
            callback(-1);
        }
    });
}

//retrieves a list of admins from config file
function getAdmins(callback) {
    fs.readFile(path.join(__dirname,'config.json'),'utf-8',function(err,data) {
        if (err) {
            return console.log(err);
        }
        var config = JSON.parse(data);
        callback(config.adminEmails);

    });
}

//Use this function along with a user id_token to check if they are an admin, callback ensures synchronous behaviour
function verifyAdmin(id, callback) {
    var url = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token='+id;
    exec(['curl '+url], function(err, out, code) {
        if (err instanceof Error)
            throw err;
        var data = JSON.parse(out);
        var email = data['email'];
        if(email != null) {
            getAdmins(function(data) {
                for(var i = 0;i < data.length;i++) {
                    if(data[i] === email) {
                        callback(true);
                        return;
                    }
                }
                callback(false);
                return;
            })
        } else {
            callback(false);
            return;
        }

    });
}

// Merges json values to dynamically display an html template
function mergeValues(values, content){
    // Cycle over the keys
    for(var key in values){
        // Replace all {{key}} with the value from the values object\
        content = content.replace("{{" + key + "}}", values[key]);
    }

    //return merged content
    return content;
}

// Displays html template to the screen
function view(templateName, values, res){
    // Read from the template files
    var fileContents = fs.readFileSync("./public/html/" + templateName + ".html", {encoding: "utf-8"});

    // Insert values into the Content
    fileContents = mergeValues(values, fileContents);

    // Write out the content to the response
    res.write(fileContents);
}

app.get('/', function(req,res) {

    res.sendFile(path.join(__dirname,'public/html/login.html'));

});

app.get('/login', function(req,res) {

    res.sendFile(path.join(__dirname,'public/html/login.html'));

});

app.get('/submit-num', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    view("header", {}, res);
    view("nav", {}, res);
    view("submit_num", {}, res);
    view("footer", {}, res);
    res.end();
});

app.post('/submit-num', function(req, res) {
    var number = req.body.submit_num;
    var email = req.body.user_email;
    console.log(email);
    if(!isNaN(number)){
        var object = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
        var key = email;
        object[key] = [];

        var data = {
            alias: 'orange',
            num_submit: number.trim()
        };

        object[key].push(data);
        fs.writeFileSync('./data.json', JSON.stringify(object), 'utf-8');
    }

    res.writeHead(303, {"Location": "/submit-num"});
    res.end();
});

app.get('/submit-answer', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    view("header", {}, res);
    view("nav", {}, res);
    var user = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
    view("table", user, res);
    view("footer", {}, res);
    res.end();
});

app.get('/statistics', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    view("header", {}, res);
    view("nav", {}, res);
    view("graph", {}, res);
    view("footer", {}, res);
    res.end();
});

app.get('/home', function(req,res) {

    checkSubmissionStatus(function(posted) {
        switch(posted) {
            case -1: res.writeHead(200, {'Content-Type': 'text/html'});
                     view("header", {}, res);
                     view("nav", {}, res);
                     view("landing-page", {username:"Landing Page", description:"Answers will be posted soon"}, res);
                     view("footer", {}, res);
                     res.end();
                     break;

            case 0:  res.writeHead(200, {'Content-Type': 'text/html'});
                     view("header", {}, res);
                     view("nav", {}, res);
                     view("landing-page",  {username:"Landing Page", description:"Submissions have been closed"}, res);
                     view("footer", {}, res);
                     res.end();
                     break;

            case 1:  res.writeHead(200, {'Content-Type': 'text/html'});
                     view("header", {}, res);
                     view("nav", {}, res);
                     view("footer", {}, res);
                     res.end();
                     break;

            default: res.writeHead(200, {'Content-Type': 'text/html'});
                     view("header", {}, res);
                     view("nav", {}, res);
                     view("footer", {}, res);
                     res.end();
                     break;
        }
    });
});

//Where /login redirects to and check for admin status from config.json
app.post('/admin', function(req, res) {
    var token = req.query.token;
    verifyAdmin(token, function(admin) {
        var path = "/";
        if(admin) {
            path += "admin?token="+token;
        } else {
            path += "home";
        }

        res.send(path);
    });
});

//TODO: Add admin html page
app.get('/admin', function(req,res) {

    var token = req.query.token;
    verifyAdmin(token, function(admin) {
        if(admin) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            view("header", {}, res);
            view("nav", {}, res);
            //view("admin", {}, res);
            view("footer", {}, res);
            res.end();
            res.send;
        } else {
            res.redirect("/home");
        }
    });

});


//link to /close?status=true to close submissions, everything else opens them back up
//redirects to admin page
app.get('/close', function(req,res) {
    var file = require('./config.json');
    var val = (req.query.status === "true");
    var token = req.query.token;
    verifyAdmin(token, function(data) {
        if(data) {
            file.submissionsClosed = val;
            fs.writeFile(path.join(__dirname, 'config.json'), JSON.stringify(file), function (err) {
                if (err) return console.log(err);
                res.redirect('/admin');
            });
        } else {
            res.redirect('/home');
        }
    });
});


//link to /publish?status=true to publish submissions, everything else hides them
//redirects to admin page
app.get('/publish', function(req,res) {
    var file = require('./config.json');
    var val = (req.query.status == "true");
    var token = req.query.token;
    verifyAdmin(token, function(data) {
        if(data) {
            file.submissionsClosed = val;
            fs.writeFile(path.join(__dirname, 'config.json'), JSON.stringify(file), function (err) {
                if (err) return console.log(err);
                res.redirect('/admin');
            });
        } else {
            res.redirect("/home");
        }
    });
});

//logs user out of google account
app.get('/logout', function(req,res) {

    res.redirect('https://accounts.google.com/logout');

});

app.get('/number-list', function(req, res) {
    var file = require('./data.json');
    //console.log(file);
    for(var email in file) {
        //console.log(file[email]);
        for(var sub in email) {
            console.log(sub);
        }
    }
    res.send();
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
