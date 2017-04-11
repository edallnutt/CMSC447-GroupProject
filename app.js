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

function addAdminID(email,id, callback) {
    var admin = false;

    fs.readFile(path.join(__dirname,'config.json'),'utf-8',function(err,data) {
        if (err) {
            return console.log(err);
        }
        var config = JSON.parse(data);
        for(var i=0;i<config.adminEmails.length;i++) {
            if(config.adminEmails[i] == email) {
                admin = true;
                break;
            }
        }
        if(admin) {
            var found = false;
            for(var i=0;i<config.adminIDs.length;i++) {
                if (config.adminIDs[i] == id) {
                    found = true;
                    break;
                }
            }
            if(!found) {
                config.adminIDs.push(id);
                fs.writeFile(path.join(__dirname,'config.json'), JSON.stringify(config), function (err) {
                    if (err) return console.log(err);
                });
            }
        }

        callback(admin);

    });
}

function getAdmins(callback) {
    fs.readFile(path.join(__dirname,'config.json'),'utf-8',function(err,data) {
        if (err) {
            return console.log(err);
        }
        var config = JSON.parse(data);
        callback(config.adminEmails);

    });
}

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
                    }
                }
                callback(false);
            })
        }

    });
}

// Merges json values to dynamically display an html template
function mergeValues(values, content){
    // Cycle over the keys
    for(var key in values){
        // Replace all {{key}} with the value from the values object\
        content = content.replace("{{alias}}", values[key][0].alias);
        content = content.replace("{{num_submit}}", values[key][0].num_submit);
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

//checks is logged in user is currently an admin and redirects to specified page if they are
app.get('/checkadminstatus', function(req,res) {

    var email = req.query.email;
    var id = req.query.id;
    var redirect = req.query.redirect;
    addAdminID(email,id, function(admin) {
        if(admin) {
            res.send('/'+redirect);
        } else {
            res.send('/home');
        }
    });

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

    if(!isNaN(number)){
        var object = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
        var key = 'person@umbc.edu';
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

app.get('/getAdmins', function(req,res) {

    getAdmins(function(data) {
        res.send(data);
    });

});

app.get('/logout', function(req,res) {

	res.redirect('https://accounts.google.com/logout');

});

app.post('/padmin', function(req, res) {
    var token = req.query.token;
    verifyAdmin(token,function(data) {

        var path = "/";
        if(data) {
            path += "admin";
        } else {
            path += "home";
        }
        res.send(path);

    });

});

app.get('/admin', function(req,res) {

    res.send("HELLO");

});


//link to /close?status=true to close submissions, everything else opens them back up
//redirects to admin page
//TODO: Add in credential passing so only a logged in admin can do this
app.get('/close', function(req,res) {
    var file = require('./config.json');
    var val = (req.query.status == "true");
    file.submissionsClosed = val;
    fs.writeFile(path.join(__dirname,'config.json'), JSON.stringify(file), function (err) {
        if (err) return console.log(err);
        res.redirect('/admin');
    });
});


//link to /publish?status=true to publish submissions, everything else hides them
//redirects to admin page
//TODO: Add in credential passing so only a logged in admin can do this
app.get('/publish', function(req,res) {
    var file = require('./config.json');
    var val = (req.query.status == "true");
    file.submissionsClosed = val;
    fs.writeFile(path.join(__dirname,'config.json'), JSON.stringify(file), function (err) {
        if (err) return console.log(err);
        res.redirect('/admin');
    });
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
