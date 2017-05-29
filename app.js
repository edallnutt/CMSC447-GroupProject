/****************************************************/
/*                Table of Contents                 */
/*                                                  */
/*      Node Modules                        41      */
/*      checkSubmissionStatus()             89      */
/*      getAdmins()                         108     */
/*      getStudents()                       121     */
/*      verifyAdmin()                       134     */
/*      verifyStudent()                     163     */
/*      view()                              192     */
/*      table_view()                        212     */
/*      isEmpty()                           339     */
/*                                                  */
/*      Login Page                          350     */
/*      Login Authentication                357     */
/*      Submit Number Page                  374     */
/*      Submit Number Authentication        449     */
/*      Submit Answer Page                  818     */
/*      Submit Answer Authentication        927     */
/*      Statistics Page                     1217    */
/*      Home Page                           1270    */
/*      Admin Page                          1404    */

/*      Open/Close Submissions              1426    */
/*      Publish/Un-publish Submissions      1447    */
/*      Student.txt Upload                  1467    */
/*      Delete Submission                   1538    */
/*      Download Submissions                1793    */
/*      Download CSV of Submissions         1822    */
/*      Retrieve Admin List                 1863    */
/*      Logout                              1872    */
/*      Catch 404                           1881    */
/*      Error Handler                       1890    */
/*                                                  */
/****************************************************/

/****************/
/* Node Modules */
/****************/
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
var formidable = require('formidable');
var json2csv = require('json2csv');

var app = express();

/***********************/
/*  View Engine Setup  */
/***********************/
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

/********************************************************************/
/*         uncomment after placing your favicon in /public          */
/* app.use(favicon(path.join(__dirname, 'public', 'favicon.ico'))); */
/********************************************************************/
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/************************/
/* app.use('/', index); */
/************************/
app.use('/users', users);

/****************************************/
/* Checks which phase the project is in */
/****************************************/
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

/***********************************************/
/* Retrieves a list of admins from config file */
/***********************************************/
function getAdmins(callback) {
    fs.readFile(path.join(__dirname,'config.json'),'utf-8',function(err,data) {
        if (err) {
            return console.log(err);
        }
        var config = JSON.parse(data);
        callback(config.adminEmails);
    });
}

/****************************************************************/
/* Retreves a list of student emails as defined in students.txt */
/****************************************************************/
function getStudents(callback) {
    fs.readFile(path.join(__dirname,'students.txt'),'utf-8',function(err,data) {
        if (err) {
            return console.log(err);
        }
        var list = data.split('\n');
        callback(list);
    });
}

/**********************************************************************************************************************/
/* Use this function along with a user id_token to check if they are an admin, callback ensures synchronous behaviour */
/**********************************************************************************************************************/
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

/****************************************************************************************/
/* Use this function to verify if the user is a valid student as defined in student.txt */
/****************************************************************************************/
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
                    if(list[i].trim() === email) {
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

/****************************************/
/* Displays html template to the screen */
/****************************************/
function view(templateName, values, res){

    /* Read from the template files */
    var fileContents = fs.readFileSync("./public/html/" + templateName + ".html", {encoding: "utf-8"});

    /* Insert values into the Content */
    for(var key in values){

        /* Replace all {{key}} with the value from the values object */
        fileContents = fileContents.replace("{{" + key + "}}", values[key]);
    }

    /* Write out the content to the response */
    res.write(fileContents);
}

/**********************************************************/
/* Displays html template with student data to the screen */
/* Converts emails to numbers to hide info on client side */
/**********************************************************/
function table_view(templateName, values, checkMsg, email, res, admins){

    var obj = JSON.parse(values);       // Parses student JSON data for processing
    var email_num;                      // Email number of active student
    var newObj = [];                    // Object for storing student data
    var i = 0;                          // Counter for storing student index

    /* Read from the template files */
    var fileContents = fs.readFileSync("./public/html/" + templateName + ".html", {encoding: "utf-8"});

    /* Changes email keys to number keys by looping through JSON data */
    for(var key in obj){

        var student_data;   // Student data to store converted data

        /* If email is not a student */
        if(admins.indexOf(key) === -1) {
            student_data = {
                type: "student",
                email: key,
                alias: obj[key][0].alias,
                num_submit: obj[key][0].num_submit,
                num_length: obj[key][0].num_length,
                num_prime: obj[key][0].num_prime,
                factor_count: obj[key][0].factor_count,
                first_factor_time: obj[key][0].first_factor_time,
                factorized_by_me: obj[key][0].factorized_by_me
            };
        }
        /* If email is an admin */
        else {
            student_data = {
                type: "admin",
                email: key,
                alias: obj[key][0].alias,
                nums: obj[key][0].nums,
                factorized_by_me: obj[key][0].factorized_by_me
            };
        }

        /* Stores number index of active user email to */
        /* identify active user on the client side     */
        if(key === email){
            email_num = i;
        }

        /* Stores converted student data */
        newObj[i] = [];
        newObj[i].push(student_data);

        /* Increment counter for next student/admin */
        i++;
    };

    /* Insert message to display to active user on client side    */
    /* Insert converted student data into the client side content */
    /* Insert email number to identify active user on client side */
    fileContents = fileContents.replace("{{check}}", checkMsg["check"]);
    fileContents = fileContents.replace("{{course.JSON}}", JSON.stringify(newObj));
    fileContents = fileContents.replace("{{student_num}}", email_num);

    /* Write out the content to the response */
    res.write(fileContents);
}

/********************************/
/* Checks if an object is empty */
/********************************/
function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

/***********************/
/* Displays login page */
/***********************/
app.get('/', function(req,res) {
    res.sendFile(path.join(__dirname,'public/html/login.html'));
});

/***********************/
/* Displays login page */
/***********************/
app.post('/login', function(req, res) {
    var token = req.query.token;
    var email = req.query.email;
    verifyAdmin(token, function(admin) {
        var path = "/";
        if(admin) {
            path += "admin?token="+token+"&email="+email;
        }
        else {
            path += "home?token="+token+"&email="+email;
        }
        res.send(path);
    });
});

/*******************************/
/* Displays submit number page */
/*******************************/
app.get('/submit-num', function(req, res) {

    var course = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));       // Parses student JSON data for processing
    var token = req.query.token;                                            // Token to verify if active user is student/admin
    var email = req.query.email;                                            // Email of active user
    var msg;                                                                // Message to send to client side

    /* Checks if active user is a student */
    verifyStudent(token, function(student) {

        /* If active user is a student */
        if(student) {

            /* If there is no student data for active user */
            if(isEmpty(course[email])){
                msg = "Currently no submission";
            }
            /* If active user already submitted a number */
            else if(course[email][0].submitted === "yes"){
                msg = "Number already submitted - Resubmit if necessary";
            }
            /* If active users submitted number was deleted by an admin */
            else if(course[email][0].submitted === "deleted"){
                msg = "Your submission was deleted by an admin, please resubmit";
            }

            /* Checks what phase project is in */
            checkSubmissionStatus(function (posted) {
                switch(posted){

                    /* Phase 1 - Displays submit number page */
                    case -1:    res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav", {}, res);
                        view("submit_num", {error: msg}, res);
                        view("footer", {}, res);
                        res.end();
                        break;

                    /* Phase 2 - Displays landing page */
                    case 0:     res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav", {}, res);
                        view("landing-page",  {description:"Submissions have been closed"}, res);
                        view("footer", {}, res);
                        res.end();
                        break;

                    /* Phase 2 - Displays landing page */
                    case 1:
                        view("header", {}, res);
                        view("nav-student-answer", {}, res);
                        view("landing-page",  {description:"Submissions have been closed"}, res);
                        view("footer", {}, res);
                        res.end();
                        break;
                }
            });
        }
        /* If active user is an admin */
        else {

            /* Checks if active user is an admin */
            verifyAdmin(token, function(admin) {

                /* If active user is an admin */
                if(admin) {

                    /* Checks what phase project is in */
                    checkSubmissionStatus(function (posted) {
                        switch(posted){

                            /* Phase 1 - Displays submit number page */
                            case -1:    res.writeHead(200, {'Content-Type': 'text/html'});
                                view("header", {}, res);
                                view("nav-admin", {}, res);
                                view("submit_num", {error:""}, res);
                                view("footer", {}, res);
                                res.end();
                                break;

                            /* Phase 2 - Displays landing page */
                            case 0:     res.writeHead(200, {'Content-Type': 'text/html'});
                                view("header", {}, res);
                                view("nav-admin", {}, res);
                                view("landing-page",  {description:"Submissions have been closed"}, res);
                                view("footer", {}, res);
                                res.end();
                                break;

                            /* Phase 2 - Displays landing page */
                            case 1:
                                view("header", {}, res);
                                view("nav-admin", {}, res);
                                view("landing-page",  {description:"Submissions have been closed"}, res);
                                view("footer", {}, res);
                                res.end();
                                break;
                        }
                    });
                }
                /* If active user is not and admin or student */
                else {

                    /* Displays invalid login page */
                    res.sendFile(path.join(__dirname,'public/html/invalid-login.html'));
                }
            });
        }
    });
});

/************************************************************/
/* Creates and stores student object who submitted a number */
/************************************************************/
app.post('/submit-num', function(req, res) {

    var course = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));       // Parses student JSON data for processing
    var fruits = JSON.parse(fs.readFileSync('./fruit.json', 'utf-8'));      // Parses fruit JSON data for processing
    var student_number = req.body.submit_num.trim();                        // Submitted student number
    var student_email = req.body.user_email;                                // Email of student who submitted a number
    var token = req.body.user_token;                                        // Token to verify if active user is student/admin
    var factorized_by_me_list = {};                                         // List to store what numbers the student factored

    /* Check if submitted number is unique */
    var checkSameNumber = false;
    for(var key in course){
        if(isEmpty(course[key][0].nums)){
            if(course[key][0].num_submit === student_number) checkSameNumber = true;
        }
        else{
            for(var sub in course[key][0].nums){
                if(course[key][0].nums[sub].num_submit === student_number) checkSameNumber = true;
            }
        }
    }

    /* If submitted number is not unique */
    if(checkSameNumber){

        /* Displays submit number page with message */
        /* saying number submitted is not unique    */
        verifyAdmin(token, function(admin) {
            if(admin){
                res.writeHead(200, {'Content-Type': 'text/html'});
                view("header", {}, res);
                view("nav-admin", {}, res);
                view("submit_num",  {error:"That number was already submitted, please submit a new number"}, res);
                view("footer", {}, res);
                res.end();
            }
            else{
                res.writeHead(200, {'Content-Type': 'text/html'});
                view("header", {}, res);
                view("nav", {}, res);
                view("submit_num",  {error:"That number was already submitted, please submit a new number"}, res);
                view("footer", {}, res);
                res.end();
            }
        });
    }
    /* If submitted number is unique and is a number */
    else if(!isNaN(student_number) && student_number.length > 0){

        /* Get bit length of student number submission */
        var cmd = 'java -jar /home/ec2-user/CMSC447/CMSC447-GroupProject/public/Java/verify_numbers.jar check ' + student_number;
        var output = exec(cmd, function (error, stdout, stderr){

            var bit_length = parseInt(stdout);  // Bit length of student number submission

            /* If bit length is < 80 */
            if(parseInt(bit_length) < 80){

                /* Displays submit number page with error message        */
                /* saying the number submitted has an invalid bit length */
                verifyAdmin(token, function(admin) {
                    if(admin){
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav-admin", {}, res);
                        view("submit_num",  {error:"Invalid Bit length (< 80): " + bit_length}, res);
                        view("footer", {}, res);
                        res.end();
                    }
                    else{
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav", {}, res);
                        view("submit_num",  {error:"Invalid Bit length (< 80): " + bit_length}, res);
                        view("footer", {}, res);
                        res.end();
                    }
                });
            }
            /* If bit length is > 2000 */
            else if(parseInt(bit_length) > 2000){

                /* Displays submit number page with error message        */
                /* saying the number submitted has an invalid bit length */
                verifyAdmin(token, function(admin) {
                    if(admin){
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav-admin", {}, res);
                        view("submit_num",  {error:"Invalid Bit length (> 2000): " + bit_length}, res);
                        view("footer", {}, res);
                        res.end();
                    }
                    else{
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav", {}, res);
                        view("submit_num",  {error:"Invalid Bit length (> 2000): " + bit_length}, res);
                        view("footer", {}, res);
                        res.end();
                    }
                });
            }
            /* If 80 <= bit length <= 2000 */
            else{

                /* Check if student number submission is prime */
                var isPrimeCmd = "python /home/ec2-user/CMSC447/CMSC447-GroupProject/public/python/prime.py 10 " + student_number;
                var outputIsPrime = exec(isPrimeCmd, function (error, stdout, stderr){

                    var isPrime;    // Primality of student number submission

                    /* Sets primality of student number submission */
                    if(stdout === "True\n"){
                        isPrime = "Yes";
                    }
                    else{
                        isPrime = "No";
                    }

                    /* Checks if active user is an admin */
                    verifyAdmin(token, function(admin) {

                        var student_data;       // Student data object
                        var randomFruit;        // Fruit to assign to student data
                        var counter = 0;        // Counter to check if randomfruit was already assigned

                        /* If student data doesnt exist for active user */
                        /* Assigns random fruit to new submissions      */
                        if(isEmpty(course[student_email])){

                            /* Get random fruit from JSON fruit data */
                            randomFruit = fruits["fruits"][Math.floor((Math.random() * Object.keys(fruits["fruits"]).length))].name;

                            /* Checks if random fruit was already assigned */
                            while(counter != Object.keys(course).length){

                                /* Loop through each student in course */
                                for(var student in course){

                                    /* If random fruit already assigned to a student */
                                    if(course[student][0].alias === randomFruit){

                                        /* Get new random fruit */
                                        randomFruit = fruits["fruits"][Math.floor((Math.random() * Object.keys(fruits["fruits"]).length))].name;
                                    }
                                    /* If random fruit is not assigned to a student */
                                    else{

                                        /* Increment counter to check next student */
                                        counter++;
                                    }
                                }
                            }

                            /* Creates empty object to store student data */
                            course[student_email] = [];

                            /* If active user is an admin */
                            if(admin) {

                                /* Input data for first admin submission */
                                student_data = {
                                    alias: randomFruit,
                                    nums:[{
                                        alias: randomFruit+"_1",
                                        num_submit: student_number,
                                        num_length: bit_length,
                                        num_prime: isPrime,
                                        factor_count: 0,
                                        first_factor_time: ""}],
                                        factorized_by_me: factorized_by_me_list
                                };

                                /* Store first admin submission */
                                course[student_email].push(student_data);

                            }
                            /* If active user is a student */
                            else {

                                /* Input data for first student submission */
                                student_data = {
                                    alias: randomFruit,
                                    submitted: "yes",
                                    num_submit: student_number,
                                    num_length: bit_length,
                                    num_prime: isPrime,
                                    factor_count: 0,
                                    first_factor_time: "",
                                    factorized_by_me: factorized_by_me_list
                                };

                                /* Store first student submission */
                                course[student_email].push(student_data);
                            }
                        }
                        /* If student data exists for active user */
                        else{

                            /* If active user is an admin */
                            if(admin) {

                                /* Get root alias and submitted numbers for all admin submissions */
                                var aliasr = course[student_email][0].alias;
                                var oldNums = course[student_email][0].nums;

                                /* If admin deleted all their submissions */
                                if(oldNums.length === 0){
                                    var num_data = {
                                            alias: aliasr+"_1",
                                            num_submit: student_number,
                                            num_length: bit_length,
                                            num_prime: isPrime,
                                            factor_count: 0,
                                            first_factor_time: ""
                                    };
                                    course[student_email][0].nums.push(num_data);
                                }
                                /* If admin did not delete all their submissions */
                                else{

                                    /* Gets next label for next admin submission */
                                    var lastLabel = oldNums[oldNums.length-1].alias.split("_")[1];
                                    var nextLabel = parseInt(lastLabel) + 1;

                                    /* Input data for next admin submission */
                                    var num_data = {
                                            alias: aliasr+"_"+nextLabel,
                                            num_submit: student_number,
                                            num_length: bit_length,
                                            num_prime: isPrime,
                                            factor_count: 0,
                                            first_factor_time: ""
                                    };

                                    /* Store next admin submission */
                                    course[student_email][0].nums.push(num_data);
                                }

                            }
                            /* If active user is a student */
                            else {

                                /* Gets alias and factorized list of active user */
                                var objAlias = course[student_email][0].alias;
                                var objFactorizedList = course[student_email][0].factorized_by_me;

                                /* Creates empty object to store student data */
                                course[student_email] = [];

                                /* Input data for next student submission */
                                student_data = {
                                    alias: objAlias,
                                    submitted:  "yes",
                                    num_submit: student_number,
                                    num_length: bit_length,
                                    num_prime: isPrime,
                                    factor_count: 0,
                                    first_factor_time: "",
                                    factorized_by_me: objFactorizedList
                                };

                                /* Store next student submission */
                                course[student_email].push(student_data);
                            }
                        }

                        /* Write new JSON data to student data */
                        fs.writeFileSync('./data.json', JSON.stringify(course), 'utf-8');

                        /* Correct submission redirects to submit-num page   */
                        /* with message saying correct bit length submitted  */
                        verifyAdmin(token, function(admin) {
                            if(admin){
                                res.writeHead(200, {'Content-Type': 'text/html'});
                                view("header", {}, res);
                                view("nav-admin", {}, res);
                                view("submit_num",  {error:"Valid Bit length: " + bit_length + ", Prime: " + isPrime}, res);
                                view("footer", {}, res);
                                res.end();
                            }
                            else{
                                res.writeHead(200, {'Content-Type': 'text/html'});
                                view("header", {}, res);
                                view("nav", {}, res);
                                view("submit_num",  {error:"Valid Bit length: " + bit_length + ", Prime: " + isPrime}, res);
                                view("footer", {}, res);
                                res.end();
                            }
                        });
                    });
                    if(error !== null){
                      console.log("Error -> "+error);
                    }
                });
            }
            if(error !== null){
              console.log("Error -> "+error);
            }
        });
    }
    else {
        /* Invalid submission redirects to submit-num page */
        /* with message saying invalid number submitted    */
        verifyAdmin(token, function(admin) {
            if(admin){
                res.writeHead(200, {'Content-Type': 'text/html'});
                view("header", {}, res);
                view("nav-admin", {}, res);
                view("submit_num",  {error:"Invalid Submission"}, res);
                view("footer", {}, res);
                res.end();
            }
            else{
                res.writeHead(200, {'Content-Type': 'text/html'});
                view("header", {}, res);
                view("nav", {}, res);
                view("submit_num",  {error:"Invalid Submission"}, res);
                view("footer", {}, res);
                res.end();
            }
        });
    }
});

/***********************************/
/* Displays answer submission page */
/***********************************/
app.get('/submit-answer', function(req, res) {
    var token = req.query.token;        // Token to verify if active user is student/admin
    var email = req.query.email;        // Email of active user

    /* Get list of admins */
    getAdmins(function(adminList) {

        /* Checks if active user is a student */
        verifyStudent(token, function (student) {

            /* If active user is a student */
            if (student) {

                /* Checks what phase project is in */
                checkSubmissionStatus(function (posted) {
                    switch (posted) {

                        /* Phase 1 - Displays landing page */
                        case -1:
                            res.writeHead(200, {'Content-Type': 'text/html'});
                             view("header", {}, res);
                             view("nav", {}, res);
                             view("landing-page", {description:"Submissions will be posted soon"}, res);
                             view("footer", {}, res);
                             res.end();
                            break;

                        /* Phase 1 - Displays landing page */
                        case 0:
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            view("header", {}, res);
                            view("nav", {}, res);
                            view("landing-page",  {description:"Submissions will be posted soon"}, res);
                            view("footer", {}, res);
                            res.end();
                            break;

                        /* Phase 2 - Displays submit answer page */
                        case 1:
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            view("header", {}, res);
                            view("nav-student-answer", {}, res);
                            table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:""}, email, res, adminList);
                            view("footer", {}, res);
                            res.end();
                            break;
                    }
                });
            }
            /* If active user is an admin */
            else {

                /* Checks if active user is an admin */
                verifyAdmin(token, function (admin) {

                    /* If active user is an admin */
                    if (admin) {

                        /* Checks what phase project is in */
                        checkSubmissionStatus(function (posted) {
                            switch (posted) {

                                /* Phase 1 - Displays landing page */
                                case -1:
                                    res.writeHead(200, {'Content-Type': 'text/html'});
                                     view("header", {}, res);
                                     view("nav-admin", {}, res);
                                     view("landing-page", {description:"Submissions will be posted soon"}, res);
                                     view("footer", {}, res);
                                     res.end();
                                    break;

                                /* Phase 1 - Displays landing page */
                                case 0:
                                    res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-admin", {}, res);
                                    view("landing-page",  {description:"Submissions will be posted soon"}, res);
                                    view("footer", {}, res);
                                    res.end();
                                    break;

                                /* Phase 2 - Displays submit answer page */
                                case 1:
                                    res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-admin", {}, res);
                                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:""}, email, res, adminList);
                                    view("footer", {}, res);
                                    res.end();
                                    break;
                            }
                        });
                    }
                    /* If active user is not and admin or student */
                    else {

                        /* Displays invalid login page */
                        res.sendFile(path.join(__dirname, 'public/html/invalid-login.html'));
                    }
                });
            }
        });
    });
});

/*************************************************************/
/* Creates and stores student object who submitted an answer */
/*************************************************************/
app.post('/submit-answer', function(req, res) {
    var token = req.body.user_token;                                        // Token to verify if active user is student/admin
    var email = req.body.user_email;                                        // Email of active user
    var student_answer = req.body.submit_answer;                            // Student answer to a submission
    var number_to_answer;                                                   // Number submission being answered
    var number_to_answer_alias = req.body.num_to_answer_alias;              // Number submission alias being answered
    var course = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));       // Parses student JSON data for processing

    /* Gets full number being answered from course data */
    for(var key in course){
        if(isEmpty(course[key][0].nums)){
            if(course[key][0].alias === number_to_answer_alias){
                number_to_answer = course[key][0].num_submit;
            }
        }
        else{
            for(var sub in course[key][0].nums){
                if(course[key][0].nums[sub].alias === number_to_answer_alias){
                    number_to_answer = course[key][0].nums[sub].num_submit;
                }
            }
        }
    }

    /* This Comment block initializes the arguments for the java/python  */
    /* program to check the answer the student submits and the primality */
    var checkForOne = false;
    var two_nums = student_answer.split(" ");
    var cmd = 'java -jar /home/ec2-user/CMSC447/CMSC447-GroupProject/public/Java/verify_numbers.jar answer ' + number_to_answer + ' ';
    var isPrimeCmd = 'python /home/ec2-user/CMSC447/CMSC447-GroupProject/public/python/prime.py 10 ';

    /* Parses student answer submission and checks if "1" is submitted  */
    /* Adds parsed answer numbers to cmd to check correctness/primality */
    for (var i = 0; i < two_nums.length; i ++){
        if(two_nums[i] === "1") checkForOne = true;
        cmd += two_nums[i] + ' ';
        isPrimeCmd += two_nums[i] + ' ';
    }

    /* If the number "1" was submitted */
    if(checkForOne){

        /* Displays answer submission page alerting */
        /* that the factors submitted contains 1    */
        getAdmins(function(adminList) {
            verifyAdmin(token, function(admin) {
                if(admin){
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    view("header", {}, res);
                    view("nav-admin", {}, res);
                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Invalid: Cannot Submit 1 as a factor"}, email, res, adminList);
                    view("footer", {}, res);
                    res.end();
                }
                else{
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    view("header", {}, res);
                    view("nav-student-answer", {}, res);
                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Invalid: Cannot Submit 1 as a factor"}, email, res, adminList);
                    view("footer", {}, res);
                    res.end();
                }
            });
        });
    }
    /* If the alias being answered has not been answered by the active user */
    else if(isNaN(course[email][0].factorized_by_me[number_to_answer_alias])){

        /* Check primality of submitted answers */
        var isPrimeOutput = exec(isPrimeCmd, function(error, stdout, stderr){
            if(stdout === "True\n"){

                /* If factors are prime, check if the factors are correct */
                var output = exec(cmd, function (error, stdout, stderr){
                    var correctFactor = stdout;

                    /* If factors correct */
                    if(correctFactor === '1'){

                        /* Loop through students in the course */
                        for(var key in course){

                            /* If current key is an admin key */
                            if(!isEmpty(course[key][0].nums)){

                                /* Loop through admin submissions */
                                for(var sub in course[key][0].nums){

                                    /* If admin submission alias is the alias of the submission being answered */
                                    if(course[key][0].nums[sub].alias === number_to_answer_alias){

                                        /* Update time of factoring if first time factored */
                                        if(course[key][0].nums[sub].first_factor_time === ""){
                                            var currentdate = new Date();
                                            var dayTime = "AM";
                                            var hours = currentdate.getHours() - 4;
                                            if(hours >= 12){
                                                if(hours !== 12){
                                                    hours = hours - 12;
                                                }
                                                dayTime = "PM";
                                            }
                                            else if(hours <= 0){
                                                if(hours === 0){
                                                    hours = 12;
                                                }
                                                else{
                                                    hours = 12 + hours;
                                                    dayTime = "PM"
                                                }
                                            }
                                            var datetime =  (currentdate.getMonth() + 1) + "/"
                                                            + (currentdate.getDate()) + "/"
                                                            + currentdate.getFullYear() + " @ "
                                                            + hours + ":"
                                                            + currentdate.getMinutes() + ":"
                                                            + currentdate.getSeconds() + " "
                                                            + dayTime;
                                            course[key][0].nums[sub].first_factor_time = datetime;
                                        }

                                        /* Update factor count of admin alias being answered */
                                        course[key][0].nums[sub].factor_count++;
                                    }
                                }
                            }
                            /* If current key is a student key */
                            else{

                                /* If student submission alias is the alias of the submission being answered */
                                if(course[key][0].alias === number_to_answer_alias){

                                    /* Update time of factoring if first time factored */
                                    if(course[key][0].first_factor_time === ""){
                                        var currentdate = new Date();
                                        var dayTime = "AM";
                                        var hours = currentdate.getHours() - 4;
                                        if(hours >= 12){
                                            if(hours !== 12){
                                                hours = hours - 12;
                                            }
                                            dayTime = "PM";
                                        }
                                        else if(hours <= 0){
                                            if(hours === 0){
                                                hours = 12;
                                            }
                                            else{
                                                hours = 12 + hours;
                                                dayTime = "PM"
                                            }
                                        }
                                        var datetime =  (currentdate.getMonth() + 1) + "/"
                                                        + (currentdate.getDate()) + "/"
                                                        + currentdate.getFullYear() + " @ "
                                                        + hours + ":"
                                                        + currentdate.getMinutes() + ":"
                                                        + currentdate.getSeconds() + " "
                                                        + dayTime;
                                        course[key][0].first_factor_time = datetime;
                                    }

                                    /* Update factor count of student alias being answered */
                                    course[key][0].factor_count++;
                                }
                            }
                        }

                        /* Updates factorized_by_me list of user submitting an answer */
                        course[email][0].factorized_by_me[number_to_answer_alias] = two_nums.length;

                        /* Write new JSON data to student data */
                        fs.writeFileSync('./data.json', JSON.stringify(course), 'utf-8');

                        /* Displays answer submission page alerting that the submitted factors are correct */
                        getAdmins(function(adminList) {
                            verifyAdmin(token, function(admin) {
                                if(admin){
                                    res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-admin", {}, res);
                                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Correct"}, email, res, adminList);
                                    view("footer", {}, res);
                                    res.end();
                                }
                                else{
                                    res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-student-answer", {}, res);
                                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Correct"}, email, res, adminList);
                                    view("footer", {}, res);
                                    res.end();
                                }
                            });
                        });
                    }
                    /* If factors are not correct */
                    else{

                        /* Displays answer submission page alerting that the submitted factors are incorrect */
                        getAdmins(function(adminList) {
                            verifyAdmin(token, function(admin) {
                                if(admin){
                                    res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-admin", {}, res);
                                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Incorrect Factors"}, email, res, adminList);
                                    view("footer", {}, res);
                                    res.end();
                                }
                                else{
                                    res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-student-answer", {}, res);
                                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Incorrect Factors"}, email, res, adminList);
                                    view("footer", {}, res);
                                    res.end();
                                }
                            });
                        });
                    }

                    if(error !== null){
                        console.log("Error -> "+error);
                    }
                });
            }

            /* If factors are not prime */
            else{

                /* Displays answer submission page alerting that the submitted factors are not prime */
                getAdmins(function(adminList) {
                    verifyAdmin(token, function(admin) {
                        if(admin){
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            view("header", {}, res);
                            view("nav-admin", {}, res);
                            table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Invalid: One of the factors entered was not prime"}, email, res, adminList);
                            view("footer", {}, res);
                            res.end();
                        }
                        else{
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            view("header", {}, res);
                            view("nav-student-answer", {}, res);
                            table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Invalid: One of the factors entered was not prime"}, email, res, adminList);
                            view("footer", {}, res);
                            res.end();
                        }
                    });
                });
            }

            if(error !== null){
                console.log("Error -> "+error);
            }
        });
    }

    /* If the alias being answered was answered by the active user */
    else{

        /* Displays answer submission page alerting that the alias being answered was already answered */
        getAdmins(function(adminList) {
            verifyAdmin(token, function(admin) {
                if(admin){
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    view("header", {}, res);
                    view("nav-admin", {}, res);
                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Already answered: " + number_to_answer_alias}, email, res, adminList);
                    view("footer", {}, res);
                    res.end();
                }
                else{
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    view("header", {}, res);
                    view("nav-student-answer", {}, res);
                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Already answered: " + number_to_answer_alias}, email, res, adminList);
                    view("footer", {}, res);
                    res.end();
                }
            });
        });
    }
});

/****************************/
/* Displays statistics page */
/****************************/
app.get('/statistics', function(req, res) {
    var token = req.query.token;        // Token to verify if active user is student/admin
    var email = req.query.email;        // Email of active user

    /* Get list of admins */
    getAdmins(function(adminList) {

        /* Checks if active user is a student */
        verifyStudent(token, function(student) {

            /* If active user is a student */
            if(student) {

                /* Phase 2 - Displays Graph of student data student navigation */
                res.writeHead(200, {'Content-Type': 'text/html'});
                view("header", {}, res);
                view("nav-student-answer", {}, res);
                table_view("graph", fs.readFileSync('./data.json', 'utf-8'), {}, email, res, adminList);
                view("footer", {}, res);
                res.end();
            }
            /* If active user is an admin */
            else {

                /* Checks if active user is an admin */
                verifyAdmin(token, function(admin) {

                    /* If active user is an admin */
                    if(admin) {

                        /* Phase 2 - Displays Graph of student data with admin navigation */
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav-admin", {}, res);
                        table_view("graph", fs.readFileSync('./data.json', 'utf-8'), {}, email, res, adminList);
                        view("footer", {}, res);
                        res.end();
                    }
                    /* If active user is not and admin or student */
                    else {

                        /* Displays invalid login page */
                        res.sendFile(path.join(__dirname,'public/html/invalid-login.html'));
                    }
                });
            }
        });
    });
});

/*************************************************/
/* Displays home page depending on project phase */
/*************************************************/
app.get('/home', function(req,res) {
    var course = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));       // Parses student JSON data for processing
    var token = req.query.token;                                            // Token to verify if active user is student/admin
    var email = req.query.email;                                            // Email of active user
    var msg;                                                                // Message to send to client side

    /* Get list of admins */
    getAdmins(function(adminList) {

        /* Checks if active user is a student */
        verifyStudent(token, function(student) {

            /* If active user is a student */
            if(student) {

                /* If there is no student data for active user */
                if(isEmpty(course[email])){
                    msg = "Currently no submission";
                }
                /* If active user already submitted a number */
                else if(course[email][0].submitted === "yes"){
                    msg = "Number already submitted - Resubmit if necessary";
                }
                /* If active users submitted number was deleted by an admin */
                else if(course[email][0].submitted === "deleted"){
                    msg = "Your submission was deleted by an admin, please resubmit";
                }

                /* Checks what phase project is in */
                checkSubmissionStatus(function(posted) {
                    switch(posted) {

                        /* Phase 1 - Displays submit number page */
                        case -1: res.writeHead(200, {'Content-Type': 'text/html'});
                            view("header", {}, res);
                            view("nav", {}, res);
                            view("submit_num", {error: msg}, res);
                            view("footer", {}, res);
                            res.end();
                            break;

                        /* Phase 2 - Displays landing page */
                        case 0:  res.writeHead(200, {'Content-Type': 'text/html'});
                            view("header", {}, res);
                            view("nav", {}, res);
                            view("landing-page",  {description:"Submissions have been closed"}, res);
                            view("footer", {}, res);
                            res.end();
                            break;

                        /* Phase 2 - Displays submit answer page */
                        case 1:  res.writeHead(200, {'Content-Type': 'text/html'});
                            view("header", {}, res);
                            view("nav-student-answer", {}, res);
                            table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:""}, email, res, adminList);
                            view("footer", {}, res);
                            res.end();
                            break;

                        /* Default */
                        default: res.writeHead(200, {'Content-Type': 'text/html'});
                            view("header", {}, res);
                            view("nav", {}, res);
                            view("footer", {}, res);
                            res.end();
                            break;
                    }
                });
            }
            /* If active user is an admin */
            else {

                /* Checks if active user is an admin */
                verifyAdmin(token, function(admin) {

                    /* If active user is an admin */
                    if(admin) {

                        /* Checks what phase project is in */
                        checkSubmissionStatus(function(posted) {
                            switch(posted) {

                                /* Phase 1 - Displays submit number page */
                                case -1: res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-admin", {}, res);
                                    view("submit_num", {error:""}, res);
                                    view("footer", {}, res);
                                    res.end();
                                    break;

                                /* Phase 2 - Displays landing page */
                                case 0:  res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-admin", {}, res);
                                    view("landing-page",  {description:"Submissions have been closed"}, res);
                                    view("footer", {}, res);
                                    res.end();
                                    break;

                                /* Phase 2 - Displays submit answer page */
                                case 1:  res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-admin", {}, res);
                                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:""}, email, res, adminList);
                                    view("footer", {}, res);
                                    res.end();
                                    break;

                                /* Default */
                                default: res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-admin", {}, res);
                                    view("footer", {}, res);
                                    res.end();
                                    break;
                            }
                        });
                    }
                    /* If active user is not and admin or student */
                    else {

                        /* Displays invalid login page */
                        res.sendFile(path.join(__dirname,'public/html/invalid-login.html'));
                    }
                });
            }
        });
    });
});

/***********************/
/* Displays admin page */
/***********************/
app.get('/admin', function(req,res) {
    var token = req.query.token;
    getAdmins(function(adminList) {
        verifyAdmin(token, function (admin) {
            if (admin) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                view("header", {}, res);
                view("nav-admin", {}, res);
                table_view("admin", fs.readFileSync('./data.json', 'utf-8'), {check:""}, 'admin', res, adminList);
                view("footer", {}, res);
                res.end();
            } else {
                res.redirect("/home?token=" + token);
            }
        });
    });
});

/******************************************************/
/* link to /close?status=true to close submissions,   */
/* everything else opens them redirects to admin page */
/******************************************************/
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

/********************************************************/
/* link to /publish?status=true to publish submissions, */
/* everything else hides them redirects to admin page   */
/********************************************************/
app.get('/publish', function(req,res) {
    var file = require('./config.json');
    var val = (req.query.status == "true");
    var token = req.query.token;
    verifyAdmin(token, function(data) {
        if(data) {
            file.submissionsPublished = val;
            fs.writeFile(path.join(__dirname, 'config.json'), JSON.stringify(file), function (err) {
                if (err) return console.log(err);
                res.redirect('/admin?token='+token);
            });
        } else {
            res.redirect("/home?token="+token);
        }
    });
});

/*******************************************************/
/* Uploads student.txt file for student authentication */
/*******************************************************/
app.post('/fileupload', function(req, res){

    var form = new formidable.IncomingForm();       // Form of uploaded file

    /* Parses form for the txt file */
    form.parse(req, function (err, fields, files) {

        /* If file is not named "students.txt" */
        if(files.filetoupload.name !== 'students.txt'){

            /* Get admin list */
            getAdmins(function(adminList) {

                /* Displays admin page alerting admin of unsuccesful upload */
                res.writeHead(200, {'Content-Type': 'text/html'});
                view("header", {}, res);
                view("nav-admin", {}, res);
                table_view("admin", fs.readFileSync('./data.json', 'utf-8'), {check:"Unsuccesful Upload"}, 'admin', res, adminList);
                view("footer", {}, res);
                res.end();
            });
        }
        /* If file is named "students.txt" */
        else{

            var oldpath = files.filetoupload.path;      // Old file path for students.txt

            /* New file path for student.txt */
            var newpath = '/home/ec2-user/CMSC447/CMSC447-GroupProject/' + files.filetoupload.name;

            /* Update file path */
            fs.rename(oldpath, newpath, function (err) {

                /* If an error occurs */
                if (err){

                    /* Get admin list */
                    getAdmins(function(adminList) {

                        /* Displays admin page alerting admin of unsuccesful upload */
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav-admin", {}, res);
                        table_view("admin", fs.readFileSync('./data.json', 'utf-8'), {check:"Unsuccesful Upload"}, 'admin', res, adminList);
                        view("footer", {}, res);
                        res.end();
                    });
                }
                /* If an error does not occur */
                else{

                    /* Get admin list */
                    getAdmins(function(adminList) {

                        /* Displays admin page alerting admin of successful upload */
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav-admin", {}, res);
                        table_view("admin", fs.readFileSync('./data.json', 'utf-8'), {check:"Successful Upload"}, 'admin', res, adminList);
                        view("footer", {}, res);
                        res.end();
                    });
                }
            });
        }
    });
});

/*******************************************/
/* Admin function for deleting submissions */
/*******************************************/
app.get('/delete-num', function(req, res) {
    var file = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));         // Parses student JSON data for processing
    var token = req.query.token;                                            // Token to verify if active user is student/admin
    var email = req.query.email;                                            // Email of active user
    var alias = req.query.alias;                                            // Alias of submission being deleted
    var num = req.query.num;                                                // Number of submission being deleted

    /* Checks if active user is an admin */
    verifyAdmin(token, function(admin) {

        /* If active user is an admin */
       if(admin) {

           /* Get list of admins */
            getAdmins(function(admins) {

                /* Get list of students */
                getStudents(function(students) {

                    var json = {};      // New JSON data

                    /* If email is an admin email */
                    if(admins.indexOf(email) !== -1) {

                        /* Loop through admins - just 1 iteration */
                        for (var i = 0; i < admins.length; i++) {

                            /* If admin data exists */
                            if(!isEmpty(file[admins[i]])){

                                var newNums = [];                   // New admin number submission array
                                var newFactorizedList = {};         // New factorized list

                                /* Loop through admin number submissions */
                                for(var n in file[admins[i]][0].nums) {

                                    /* If admin number submission and alias are not equal to the alias/number being deleted */
                                    if(file[admins[i]][0].nums[n].num_submit.slice(-10) != num && file[admins[i]][0].nums[n].alias != alias) {

                                        /* Store the admin number submission in new number submission array */
                                        newNums.push(file[admins[i]][0].nums[n]);
                                    }
                                }

                                /* Loop Through admins factorized_by_me list */
                                for(var key in file[admins[i]][0].factorized_by_me){

                                    /* If factored alias isn't the alias being deleted */
                                    if(key !== alias){

                                        /* Leave the factored alias in the list */
                                        newFactorizedList[key] = file[admins[i]][0].factorized_by_me[key];
                                    }
                                }

                                /* Creates empty object to store new admin data */
                                json[admins[i]] = [];

                                /* Input new admin data */
                                var newObj = {
                                    alias : file[admins[i]][0].alias,
                                    nums : newNums,
                                    factorized_by_me : newFactorizedList
                                };

                                /* Store new admin data */
                                json[admins[i]].push(newObj);
                            }
                        }

                        /* Loop through student number sumbissions */
                        for (var i = 0; i < students.length; i++) {

                            var newFactorizedList = {};                 // New factorized list
                            var newStudent = students[i].trim();        // Student email

                            /* If student data exists */
                            if (!isEmpty(file[newStudent])) {

                                /* Loop Through students factorized_by_me list */
                                for(var key in file[newStudent][0].factorized_by_me){

                                    /* If factored alias isn't the alias being deleted */
                                    if(key !== alias){

                                        /* Leave the factored alias in the list */
                                        newFactorizedList[key] = file[newStudent][0].factorized_by_me[key];
                                    }
                                }

                                /* If student data is not be deleted and wasn't deleted before */
                                if(newStudent !== email && file[newStudent][0].submitted !== "deleted"){

                                    /* Creates empty object to store new admin data */
                                    json[newStudent] = [];

                                    /* Input new student data */
                                    var newObj = {
                                        alias : file[newStudent][0].alias,
                                        submitted: "yes",
                                        num_submit: file[newStudent][0].num_submit,
                                        num_length: file[newStudent][0].num_length,
                                        num_prime: file[newStudent][0].num_prime,
                                        factor_count: file[newStudent][0].factor_count,
                                        first_factor_time: file[newStudent][0].first_factor_time,
                                        factorized_by_me : newFactorizedList
                                    };

                                    /* Store new student data */
                                    json[newStudent].push(newObj);
                                }
                                /* If student data is being deleted */
                                else{

                                    /* Creates empty object to store new admin data */
                                    json[newStudent] = [];

                                    /* Input new student data */
                                    var newObj = {
                                        alias : file[newStudent][0].alias,
                                        submitted: "deleted",
                                        num_submit: "0",
                                        num_length: 0,
                                        num_prime: "No",
                                        factor_count: 0,
                                        first_factor_time: "",
                                        factorized_by_me : newFactorizedList
                                    };

                                    /* Store new student data */
                                    json[newStudent].push(newObj);
                                }
                            }
                        }

                        /* Write new JSON data to student data */
                        fs.writeFileSync('./data.json', JSON.stringify(json), 'utf-8');
                        res.send();
                    }
                    /* If email is a student email */
                    else {

                        /* Loop through student number sumbissions */
                        for (var i = 0; i < students.length; i++) {

                            var newFactorizedList = {};                 // New factorized list
                            var newStudent = students[i].trim();        // Student email

                            /* If student data exists */
                            if (!isEmpty(file[newStudent])) {

                                /* Loop Through students factorized_by_me list */
                                for(var key in file[newStudent][0].factorized_by_me){

                                    /* If factored alias isn't the alias being deleted */
                                    if(key !== alias){

                                        /* Leave the factored alias in the list */
                                        newFactorizedList[key] = file[newStudent][0].factorized_by_me[key];
                                    }
                                }

                                /* If student data is not be deleted and wasn't deleted before */
                                if(newStudent !== email && file[newStudent][0].submitted !== "deleted"){

                                    /* Creates empty object to store new student data */
                                    json[newStudent] = [];

                                    /* Input new student data */
                                    var newObj = {
                                        alias : file[newStudent][0].alias,
                                        submitted: "yes",
                                        num_submit: file[newStudent][0].num_submit,
                                        num_length: file[newStudent][0].num_length,
                                        num_prime: file[newStudent][0].num_prime,
                                        factor_count: file[newStudent][0].factor_count,
                                        first_factor_time: file[newStudent][0].first_factor_time,
                                        factorized_by_me : newFactorizedList
                                    };

                                    /* Store new student data */
                                    json[newStudent].push(newObj);
                                }
                                /* If student data is being deleted */
                                else{

                                    /* Creates empty object to store new student data */
                                    json[newStudent] = [];

                                    /* Input new student data */
                                    var newObj = {
                                        alias : file[newStudent][0].alias,
                                        submitted: "deleted",
                                        num_submit: "0",
                                        num_length: 0,
                                        num_prime: "No",
                                        factor_count: 0,
                                        first_factor_time: "",
                                        factorized_by_me : newFactorizedList
                                    };

                                    /* Store new student data */
                                    json[newStudent].push(newObj);
                                }
                            }
                        }

                        var newFactorizedListAdmin = {};        // New admin factorized list

                        /* Loop through admin list - just 1 iteration */
                        for (var i = 0; i < admins.length; i++) {

                            /* If admin data exists */
                            if (!isEmpty(file[admins[i]])) {

                                /* Loop through factorized_by_me list of admin data */
                                for(var key in file[admins[i]][0].factorized_by_me){

                                    /* If factored alias isn't the alias being deleted */
                                    if(key !== alias){

                                        /* Leave the factored alias in the list */
                                        newFactorizedListAdmin[key] = file[admins[i]][0].factorized_by_me[key];
                                    }
                                }

                                /* Creates empty object to store new admin data */
                                json[admins[i]] = [];

                                /* Input new admin data */
                                var newObj = {
                                    alias : file[admins[i]][0].alias,
                                    nums : file[admins[i]][0].nums,
                                    factorized_by_me : newFactorizedListAdmin
                                };

                                /* Store new admin data */
                                json[admins[i]].push(newObj);
                            }
                        }

                        /* Write new JSON data to student data */
                        fs.writeFileSync('./data.json', JSON.stringify(json), 'utf-8');
                        res.send();
                    }
                });
            });
       }
       res.send();
    });
});

/*************************************/
/* Downloads list of student numbers */
/*************************************/
app.get('/number-list', function(req, res) {
    var file = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
    var list = [];
    var body = '';

    for(var email in file) {
        if(isEmpty(file[email][0].nums)){
            var str = file[email][0].alias+': '+file[email][0].num_submit+'\r\n';
            list.push(str);
        }
        else{
            for(var sub in file[email][0].nums){
                var str = file[email][0].nums[sub].alias+': '+file[email][0].nums[sub].num_submit+'\r\n';
                list.push(str);
            }
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

/*********************************/
/* Downloads csv of student data */
/*********************************/
app.get('/download-csv', function(req, res){
    var file = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));         // Parses student JSON data for processing
    var json = [];                                                          // New data to display on excel sheet

    /* Fields for excel sheet */
    var fields = ["Email", "Alias", "Submitted", "Number_Submitted", "Bit_Length", "Prime", "Factor_Count", "Factored_By_Me"];

    /* Loop through student submissions */
    for(var key in file){

        /* If key is a student submission */
        if(isEmpty(file[key][0].nums)){

            /* Input new student data */
            var data = {
                Email: key,
                Alias: file[key][0].alias,
                Submitted: file[key][0].submitted,
                Number_Submitted: file[key][0].num_submit,
                Bit_Length: file[key][0].num_length,
                Prime: file[key][0].num_prime,
                Factor_Count: file[key][0].factor_count,
                Factored_By_Me: file[key][0].factorized_by_me
            };

            /* Store new student data */
            json.push(data);
        }
    }

    /* Write out csv file with new student data */
    var csv = json2csv({ data: json, fields: fields });
    fs.writeFile('student-data.csv', csv, function(err) {
        if (err) throw err;
        res.download(path.join(__dirname, 'student-data.csv'));
    });
});

/***********************/
/* Gets list of admins */
/***********************/
app.get('/get-admins', function(req, res) {
   getAdmins(function(data) {
       res.send(data);
   })
});

/***********************************/
/* logs user out of google account */
/***********************************/
app.get('/logout', function(req,res) {

    res.redirect('https://accounts.google.com/logout');

});

/******************************************/
/* Catch 404 and forward to error handler */
/******************************************/
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/*****************/
/* Error handler */
/*****************/
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
