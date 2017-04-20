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

//Returns a list of student emails as defined in students.txt
function getStudents(callback) {
    fs.readFile(path.join(__dirname,'students.txt'),'utf-8',function(err,data) {
        if (err) {
            return console.log(err);
        }
        var list = data.split('\n');
        callback(list);
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

//Use this function to verify if the user is a valid student as defined in student.txt
function verifyStudent(id, callback) {
    var url = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token='+id;
    exec(['curl '+url], function(err, out, code) {
        if (err instanceof Error)
            throw err;
        var data = JSON.parse(out);
        var email = data['email'];
        if(email != null) {
            getStudents(function(list) {
                for(var i = 0;i < list.length;i++) {
                    if(list[i] === email) {
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

/* Displays html template to the screen */
function view(templateName, values, res){
    // Read from the template files
    var fileContents = fs.readFileSync("./public/html/" + templateName + ".html", {encoding: "utf-8"});

    // Insert values into the Content
    for(var key in values){
        // Replace all {{key}} with the value from the values object
        fileContents = fileContents.replace("{{" + key + "}}", values[key]);
    }

    // Write out the content to the response
    res.write(fileContents);
}

/* Displays html template with student data to the screen */
function table_view(templateName, values, res){
    // Read from the template files
    var fileContents = fs.readFileSync("./public/html/" + templateName + ".html", {encoding: "utf-8"});

    // Insert course JSON object into the Content
    fileContents = fileContents.replace("{{course.JSON}}", values);

    // Write out the content to the response
    res.write(fileContents);
}

/* Checks if an object is empty */
function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

app.get('/', function(req,res) {
    res.sendFile(path.join(__dirname,'public/html/login.html'));
});

app.get('/submit-num', function(req, res) {
    var token = req.query.token;
    verifyStudent(token, function(student) {
        if(student) {
            checkSubmissionStatus(function (posted) {
                switch(posted){
                    case -1:    res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav", {}, res);
                        view("submit_num", {}, res);
                        view("footer", {}, res);
                        res.end();
                        break;
                    case 0:     res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav", {}, res);
                        view("landing-page",  {username:"Landing Page", description:"Submissions have been closed"}, res);
                        view("footer", {}, res);
                        res.end();
                        break;
                }
            });
        } else {
            verifyAdmin(token, function(admin) {
                if(admin) {
                    checkSubmissionStatus(function (posted) {
                        switch(posted){
                            case -1:    res.writeHead(200, {'Content-Type': 'text/html'});
                                view("header", {}, res);
                                view("nav", {}, res);
                                view("submit_num", {}, res);
                                view("footer", {}, res);
                                res.end();
                                break;
                            case 0:     res.writeHead(200, {'Content-Type': 'text/html'});
                                view("header", {}, res);
                                view("nav", {}, res);
                                view("landing-page",  {username:"Landing Page", description:"Submissions have been closed"}, res);
                                view("footer", {}, res);
                                res.end();
                                break;
                        }
                    });
                } else {
                    res.sendFile(path.join(__dirname,'public/html/invalid-login.html'));
                }
            });
        }
    });
});

/* Creates and stores student object who submitted a number */
app.post('/submit-num', function(req, res) {
    var student_number = req.body.submit_num.trim();
    var student_email = req.body.user_email;
    var token = req.body.user_token;

    // check bit length

    if(!isNaN(student_number) && student_number.length > 0){
        var course = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
        var fruits = JSON.parse(fs.readFileSync('./fruit.json', 'utf-8'));

        var randomFruit;
        var counter = 0;
        if(isEmpty(course[student_email])){
            randomFruit = fruits["fruits"][Math.floor((Math.random() * Object.keys(fruits["fruits"]).length))].name;
            while(counter != Object.keys(course).length){
                counter = 0;
                for(var student in course){
                    if(course[student][0].alias === randomFruit){
                        randomFruit = fruits["fruits"][Math.floor((Math.random() * Object.keys(fruits["fruits"]).length))].name;
                    }
                    else{
                        counter++;
                        console.log(counter);
                    }
                }
            }
            course[student_email] = [];

            var student_data = {
                alias: randomFruit,
                num_submit: student_number,
                num_length: student_number.length,
                factor_count: 0,
                first_factor_time: ""
            };
        }
        else{
            var objAlias = course[student_email][0].alias;
            course[student_email] = [];

            var student_data = {
                alias: objAlias,
                num_submit: student_number,
                num_length: student_number.length,
                factor_count: 0,
                first_factor_time: ""
            };
        }

        course[student_email].push(student_data);
        fs.writeFileSync('./data.json', JSON.stringify(course), 'utf-8');
    }

    res.writeHead(303, {"Location": "/submit-num?token="+token});
    res.end();

});

app.get('/submit-answer', function(req, res) {
    var token = req.query.token;
    verifyStudent(token, function(student) {
        if(student) {
            checkSubmissionStatus(function(posted) {
                switch(posted){
                    case -1:    res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav", {}, res);
                        table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), res);
                        view("footer", {}, res);
                        res.end();
                        /* BELOW IS THE ACTUAL CODE FOR THIS SECTION, ABOVE IS FOR TESTING */
                        /*res.writeHead(200, {'Content-Type': 'text/html'});
                         view("header", {}, res);
                         view("nav", {}, res);
                         view("landing-page", {username:"Landing Page", description:"Answers will be posted soon"}, res);
                         view("footer", {}, res);
                         res.end();*/
                        break;
                    case 1:     res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav", {}, res);
                        table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), res);
                        view("footer", {}, res);
                        res.end();
                        break;
                }
            });
        } else {
            verifyAdmin(token, function(admin) {
                if(admin) {
                    checkSubmissionStatus(function(posted) {
                        switch(posted){
                            case -1:    res.writeHead(200, {'Content-Type': 'text/html'});
                                view("header", {}, res);
                                view("nav", {}, res);
                                table_view("table-test", fs.readFileSync('./data.json', 'utf-8'), res);
                                view("footer", {}, res);
                                res.end();
                                /* BELOW IS THE ACTUAL CODE FOR THIS SECTION, ABOVE IS FOR TESTING */
                                /*res.writeHead(200, {'Content-Type': 'text/html'});
                                 view("header", {}, res);
                                 view("nav", {}, res);
                                 view("landing-page", {username:"Landing Page", description:"Answers will be posted soon"}, res);
                                 view("footer", {}, res);
                                 res.end();*/
                                break;
                            case 1:     res.writeHead(200, {'Content-Type': 'text/html'});
                                view("header", {}, res);
                                view("nav", {}, res);
                                table_view("table-test", fs.readFileSync('./data.json', 'utf-8'), res);
                                view("footer", {}, res);
                                res.end();
                                break;
                        }
                    });
                } else {
                    res.sendFile(path.join(__dirname,'public/html/invalid-login.html'));
                }
            });
        }
    });
});

/* Creates and stores student object who submitted an answer */
// still working on it 
app.post('/submit-answer', function(req, res) {
    var token = req.query.token;
    verifyStudent(token, function(student) {
        if(!student) break;
        var answer_alias  = req.body.alias
        var num1          = RegExp("[0-9]*").exec(str)
        var num2          = RegExp("[0-9]*$").exec(str)
        var course = JSON.parse(fs.readFileSync('./data.json', 'utf-8'))
        for(var email in course)
            for(var index in course[email])
                if(course[email][index].alias == answer_alias){
                    if(num1 != "1" && num2 != "1" && /*verify num1 * num2 == course[email][alias].number*/true)
                        course[email][index].factorized_by[student] = true
                    break
                }
        fs.writeFileSync('./data.json', JSON.stringify(course), 'utf-8');
    });
    res.writeHead(303, {"Location": "/submit-answer?token="+token});
    res.end();
});

app.get('/statistics', function(req, res) {
    var token = req.query.token;
    verifyStudent(token, function(student) {
        if(student) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            view("header", {}, res);
            view("nav", {}, res);
            view("graph", {}, res);
            view("footer", {}, res);
            res.end();
        } else {
            verifyAdmin(token, function(admin) {
                if(admin) {
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    view("header", {}, res);
                    view("nav", {}, res);
                    view("graph", {}, res);
                    view("footer", {}, res);
                    res.end();
                } else {
                    res.sendFile(path.join(__dirname,'public/html/invalid-login.html'));
                }
            });
        }
    });
});

app.get('/test-java', function(req, res){

    // var i = exec

    // console.log(i)
    res.send(i);
});

app.get('/home', function(req,res) {
    var token = req.query.token;
    verifyStudent(token, function(student) {
        if(student) {
            checkSubmissionStatus(function(posted) {
                switch(posted) {
                    case -1: res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav", {}, res);
                        view("submit_num", {}, res);
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
                        table_view("table", fs.readFileSync('./data.json', 'utf-8'), res);
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
        } else {
            verifyAdmin(token, function(admin) {
                if(admin) {
                    checkSubmissionStatus(function(posted) {
                        switch(posted) {
                            case -1: res.writeHead(200, {'Content-Type': 'text/html'});
                                view("header", {}, res);
                                view("nav", {}, res);
                                view("submit_num", {}, res);
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
                                table_view("table", fs.readFileSync('./data.json', 'utf-8'), res);
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
                } else {
                    res.sendFile(path.join(__dirname,'public/html/invalid-login.html'));
                }
            });
        }
    });


});


app.post('/login', function(req, res) {
    var token = req.query.token;
    verifyAdmin(token, function(admin) {
        var path = "/";
        if(admin) {
            path += "admin?token="+token;
        } else {
            path += "home?token="+token;
        }
        res.send(path);
    });
});

app.get('/admin', function(req,res) {
    var token = req.query.token;
    verifyAdmin(token, function(admin) {
        if(admin) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            view("header", {}, res);
            view("nav", {}, res);
            table_view("admin", fs.readFileSync('./data.json', 'utf-8'), res);
            view("footer", {}, res);
            res.end();
        } else {
            res.redirect("/home?token="+token);
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
                res.redirect('/admin?token='+token);
            });
        } else {
            res.redirect('/home?token='+token);
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
                res.redirect('/admin?token='+token);
            });
        } else {
            res.redirect("/home?token="+token);
        }
    });
});

//logs user out of google account
app.get('/logout', function(req,res) {

    res.redirect('https://accounts.google.com/logout');

});

app.get('/number-list', function(req, res) {
    var file = require('./data.json');
    var list = [];
    var body = '';
    for(var email in file) {
        for(var sub in file[email]) {
            var str = file[email][sub].alias+' : '+file[email][sub].num_submit;
            list.push(str);
        }
    }
    for(var str in list) {
        body += list[str] + '\n';
    }
    fs.writeFile(path.join(__dirname, 'nums.txt'), body, function (err) {
        if (err) return console.log(err);
        res.download(path.join(__dirname, 'nums.txt'));
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
