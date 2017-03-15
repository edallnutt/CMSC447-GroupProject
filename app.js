var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

function checkSubmissionStatus() {
    //Check config file for status
    return 1;
}

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

app.get('/home', function(req,res) {
    var posted = checkSubmissionStatus();
    switch(posted) {
        case -1: res.sendFile(path.join(__dirname,'public/html/not-posted-landing.html'));
            break;
        case 0: res.sendFile(path.join(__dirname,'public/html/stop-submit-landing.html'));
            break;
        case 1: res.sendFile(path.join(__dirname,'public/html/index.html'));
            break;
        default: res.sendFile(path.join(__dirname,'public/html/index.html'));
            break;
    }
});


app.get('/', function(req,res) {

	res.sendFile(path.join(__dirname,'public/html/login.html'));

});

app.get('/logout', function(req,res) {

	res.redirect('https://accounts.google.com/logout');

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
