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
function table_view(templateName, values, checkMsg, email, res, admins){
    // Read from the template files
        var fileContents = fs.readFileSync("./public/html/" + templateName + ".html", {encoding: "utf-8"});
        var obj = JSON.parse(values);
        var email_num;
        var newObj = [];
        var i = 0;
        if(email === 'admin') {

            /*      Changes email keys to number keys to        */
            /*      hide student emails except the user email   */

            for(var key in obj){
                var student_data;
                if(admins.indexOf(key) === -1) {
                    console.log(key);
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
                } else {
                    student_data = {
                        type: "admin",
                        email: key,
                        alias: obj[key][0].alias,
                        nums: obj[key][0].nums,
                        factorized_by_me: obj[key][0].factorized_by_me
                    };
                }

                if(key === email){
                    email_num = i;
                }

                newObj[i] = [];
                newObj[i].push(student_data);
                i++;
            };

            // Insert course JSON object into the Content
            fileContents = fileContents.replace("{{check}}", checkMsg["check"]);
            fileContents = fileContents.replace("{{course.JSON}}", JSON.stringify(newObj));
            fileContents = fileContents.replace("{{student_num}}", email_num);

            // Write out the content to the response
            res.write(fileContents);
        } else {


            /*      Changes email keys to number keys to        */
            /*      hide student emails except the user email   */
            for(var key in obj){
                var student_data;
                if(admins.indexOf(key) === -1) {
                    console.log(key);
                    student_data = {
                        type: "student",
                        alias: obj[key][0].alias,
                        num_submit: obj[key][0].num_submit,
                        num_length: obj[key][0].num_length,
                        num_prime: obj[key][0].num_prime,
                        factor_count: obj[key][0].factor_count,
                        first_factor_time: obj[key][0].first_factor_time,
                        factorized_by_me: obj[key][0].factorized_by_me
                    };
                } else {
                    student_data = {
                        type: "admin",
                        alias: obj[key][0].alias,
                        nums: obj[key][0].nums,
                        factorized_by_me: obj[key][0].factorized_by_me
                    };
                }

                if(key === email){
                    email_num = i;
                }

                newObj[i] = [];
                newObj[i].push(student_data);
                i++;
            };

            // Insert course JSON object into the Content
            fileContents = fileContents.replace("{{check}}", checkMsg["check"]);
            fileContents = fileContents.replace("{{course.JSON}}", JSON.stringify(newObj));
            fileContents = fileContents.replace("{{student_num}}", email_num);

            // Write out the content to the response
            res.write(fileContents);
        }
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

// Displays number submission page
app.get('/submit-num', function(req, res) {
    var token = req.query.token;
    verifyStudent(token, function(student) {
        if(student) {
            checkSubmissionStatus(function (posted) {
                switch(posted){
                    case -1:    res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav", {}, res);
                        view("submit_num", {error:""}, res);
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
                    case 1:
                        view("header", {}, res);
                        view("nav-student-answer", {}, res);
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
                                view("nav-admin", {}, res);
                                view("submit_num", {error:""}, res);
                                view("footer", {}, res);
                                res.end();
                                break;
                            case 0:     res.writeHead(200, {'Content-Type': 'text/html'});
                                view("header", {}, res);
                                view("nav-admin", {}, res);
                                view("landing-page",  {username:"Landing Page", description:"Submissions have been closed"}, res);
                                view("footer", {}, res);
                                res.end();
                                break;
                            case 1:
                                view("header", {}, res);
                                view("nav-admin", {}, res);
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
    var factorized_by_me_list = {};

    if(!isNaN(student_number) && student_number.length > 0){
        // Get bit length of student number submission
        var cmd = 'java -jar /home/ec2-user/CMSC447/CMSC447-GroupProject/public/Java/verify_numbers.jar check ' + student_number;
        var output = exec(cmd, function (error, stdout, stderr){
            var bit_length = parseInt(stdout);
            if(parseInt(bit_length) < 2){
                verifyAdmin(token, function(admin) {
                    if(admin){
                        // Incorrect submission redirects to submit-num page with navigation
                        // corresponding to admin or student
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
            else if(parseInt(bit_length) > 2000){
                // Incorrect submission redirects to submit-num page with navigation
                // corresponding to admin or student
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
            else{
                // Check if submission is a prime number
                var isPrimeCmd = "python /home/ec2-user/CMSC447/CMSC447-GroupProject/public/python/prime.py 10 " + student_number;
                var outputIsPrime = exec(isPrimeCmd, function (error, stdout, stderr){
                    var isPrime;
                    if(stdout === "True\n"){
                        isPrime = "Yes";
                    }
                    else{
                        isPrime = "No";
                    }
                    verifyAdmin(token, function(admin) {
                        var course = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
                        var fruits = JSON.parse(fs.readFileSync('./fruit.json', 'utf-8'));
                        var student_data;
                        var randomFruit;
                        var counter = 0;

                        // Assigns random fruit to new submissions
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
                                    }
                                }
                            }
                            course[student_email] = [];

                            if(admin) {
                                // Inputs data for first admin submissions
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
                                course[student_email].push(student_data);

                            } else {
                                // Inputs data for first student submissions
                                student_data = {
                                    alias: randomFruit,
                                    num_submit: student_number,
                                    num_length: bit_length,
                                    num_prime: isPrime,
                                    factor_count: 0,
                                    first_factor_time: "",
                                    factorized_by_me: factorized_by_me_list
                                };
                                course[student_email].push(student_data);
                            }
                        }
                        else{

                            if(admin) {
                                // Inputs data for admin submissions
                                var aliasr = course[student_email][0].alias;
                                var oldNums = course[student_email][0].nums;

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
                                else{
                                    var lastLabel = oldNums[oldNums.length-1].alias.split("_")[1];
                                    var nextLabel = parseInt(lastLabel) + 1;

                                    var num_data = {
                                            alias: aliasr+"_"+nextLabel,
                                            num_submit: student_number,
                                            num_length: bit_length,
                                            num_prime: isPrime,
                                            factor_count: 0,
                                            first_factor_time: ""
                                    };
                                    course[student_email][0].nums.push(num_data);
                                }

                            } else {
                                // Inputs data for student admin submissions
                                var objAlias = course[student_email][0].alias;
                                var objFactorizedList = course[student_email][0].factorized_by_me;
                                course[student_email] = [];
                                student_data = {
                                    alias: objAlias,
                                    num_submit: student_number,
                                    num_length: bit_length,
                                    num_prime: isPrime,
                                    factor_count: 0,
                                    first_factor_time: "",
                                    factorized_by_me: objFactorizedList
                                };

                                course[student_email].push(student_data);
                            }
                        }

                        fs.writeFileSync('./data.json', JSON.stringify(course), 'utf-8');

                        // Correct submission redirects to submit-num page with navigation
                        // corresponding to admin or student
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
        // Invalid submission redirects to submit-num page with navigation
        // corresponding to admin or student
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

// Displays answer submission page
app.get('/submit-answer', function(req, res) {
    var token = req.query.token;
    var email = req.query.email;

    getAdmins(function(adminList) {
        verifyStudent(token, function (student) {
            if (student) {
                checkSubmissionStatus(function (posted) {
                    switch (posted) {
                        case -1:
                            res.writeHead(200, {'Content-Type': 'text/html'});
                             view("header", {}, res);
                             view("nav", {}, res);
                             view("landing-page", {username:"Landing Page", description:"Submissions will be posted soon"}, res);
                             view("footer", {}, res);
                             res.end();
                            break;
                        case 0:
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            view("header", {}, res);
                            view("nav", {}, res);
                            view("landing-page",  {username:"Landing Page", description:"Submissions will be posted soon"}, res);
                            view("footer", {}, res);
                            res.end();
                            break;
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
            } else {
                verifyAdmin(token, function (admin) {
                    if (admin) {
                        checkSubmissionStatus(function (posted) {
                            switch (posted) {
                                case -1:
                                    res.writeHead(200, {'Content-Type': 'text/html'});
                                     view("header", {}, res);
                                     view("nav-admin", {}, res);
                                     view("landing-page", {username:"Landing Page", description:"Submissions will be posted soon"}, res);
                                     view("footer", {}, res);
                                     res.end();
                                    break;
                                case 0:
                                    res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-admin", {}, res);
                                    view("landing-page",  {username:"Landing Page", description:"Submissions will be posted soon"}, res);
                                    view("footer", {}, res);
                                    res.end();
                                    break;
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
                    } else {
                        res.sendFile(path.join(__dirname, 'public/html/invalid-login.html'));
                    }
                });
            }
        });
    });
});

/* Creates and stores student object who submitted an answer */
app.post('/submit-answer', function(req, res) {
    var token = req.body.user_token;
    var email = req.body.user_email;
    var student_answer = req.body.submit_answer;
    var number_to_answer = req.body.num_to_answer;
    var number_to_answer_alias = req.body.num_to_answer_alias;
    var course = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));

    // This Comment block initializes the arguments for the java program to check the
    // answer the student submits and the primality
    var two_nums = student_answer.split(" ");
    var cmd = 'java -jar /home/ec2-user/CMSC447/CMSC447-GroupProject/public/Java/verify_numbers.jar answer ' + number_to_answer + ' ';
    var isPrimeCmd = 'python /home/ec2-user/CMSC447/CMSC447-GroupProject/public/python/prime.py 10 ';
    for (var i = 0; i < two_nums.length; i ++){
        cmd += two_nums[i] + ' ';
        isPrimeCmd += two_nums[i] + ' ';
    }

    // Checks if alias was answers already
    if(course[email][0].factorized_by_me[number_to_answer_alias] !== true){

        // Check primality of submitted answers
        var isPrimeOutput = exec(isPrimeCmd, function(error, stdout, stderr){
            if(stdout === "True\n"){

                // If prime, checks if the factors are correct
                var output = exec(cmd, function (error, stdout, stderr){
                    var correctFactor = stdout;

                    // If correct
                    if(correctFactor === '1'){
                        for(var key in course){

                            // If current key is an admin key
                            if(!isEmpty(course[key][0].nums)){
                                for(var sub in course[key][0].nums){

                                    // Locates admin alias being answered
                                    if(course[key][0].nums[sub].alias === number_to_answer_alias){

                                        // Updates time of factoring if first time factored
                                        if(course[key][0].nums[sub].first_factor_time === ""){
                                            var currentdate = new Date();
                                            var dayTime = "AM";
                                            var hours = currentdate.getHours() - 4;
                                            if(hours > 12){
                                                hours = hours - 12;
                                                dayTime = "PM";
                                            }
                                            var datetime =  (currentdate.getMonth() + 1) + "/"
                                                            + currentdate.getDate() + "/"
                                                            + currentdate.getFullYear() + " @ "
                                                            + hours + ":"
                                                            + currentdate.getMinutes() + ":"
                                                            + currentdate.getSeconds() + " "
                                                            + dayTime;
                                            course[key][0].nums[sub].first_factor_time = datetime;
                                        }

                                        // Updates factor count of admin alias being answered
                                        course[key][0].nums[sub].factor_count++;
                                    }
                                }
                            }
                            else{
                                // If not admin, locates student alias being answered
                                if(course[key][0].alias === number_to_answer_alias){

                                    // Updates time of factoring if first time factored
                                    if(course[key][0].first_factor_time === ""){
                                        var currentdate = new Date();
                                        var dayTime = "AM";
                                        var hours = currentdate.getHours() - 4;
                                        if(hours > 12){
                                            hours = hours - 12;
                                            dayTime = "PM";
                                        }
                                        var datetime =  (currentdate.getMonth() + 1) + "/"
                                                        + currentdate.getDate() + "/"
                                                        + currentdate.getFullYear() + " @ "
                                                        + hours + ":"
                                                        + currentdate.getMinutes() + ":"
                                                        + currentdate.getSeconds() + " "
                                                        + dayTime;
                                        course[key][0].first_factor_time = datetime;
                                    }

                                    // Updates factor count of student alias being answered
                                    course[key][0].factor_count++;
                                }
                            }
                        }

                        // Updates factorized_by_me list of user submitting an answer
                        course[email][0].factorized_by_me[number_to_answer_alias] = true;
                        fs.writeFileSync('./data.json', JSON.stringify(course), 'utf-8');

                        // Displays answer submission page alerting that the submitted factors are correct
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
                    else{
                        // Displays answer submission page alerting that the submitted factors are incorrect
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
            else{
                // Displays answer submission page alerting that the submitted factors are not prime
                getAdmins(function(adminList) {
                    verifyAdmin(token, function(admin) {
                        if(admin){
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            view("header", {}, res);
                            view("nav-admin", {}, res);
                            table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Invalid Factors: Not Prime"}, email, res, adminList);
                            view("footer", {}, res);
                            res.end();
                        }
                        else{
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            view("header", {}, res);
                            view("nav-student-answer", {}, res);
                            table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Invalid Factors: Not Prime"}, email, res, adminList);
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
    else{
        // Displays answer submission page alerting that the alias
        // being answered was already answered
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
                    view("nav", {}, res);
                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Already answered: " + number_to_answer_alias}, email, res, adminList);
                    view("footer", {}, res);
                    res.end();
                }
            });
        });
    }
});

app.get('/statistics', function(req, res) {
    var token = req.query.token;
    var email = req.query.email;

    getAdmins(function(adminList) {
        verifyStudent(token, function(student) {
            if(student) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                view("header", {}, res);
                view("nav-student-answer", {}, res);
                table_view("graph", fs.readFileSync('./data.json', 'utf-8'), {}, email, res, adminList);
                view("footer", {}, res);
                res.end();
            } else {
                verifyAdmin(token, function(admin) {
                    if(admin) {
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav-admin", {}, res);
                        table_view("graph", fs.readFileSync('./data.json', 'utf-8'), {}, email, res, adminList);
                        view("footer", {}, res);
                        res.end();
                    } else {
                        res.sendFile(path.join(__dirname,'public/html/invalid-login.html'));
                    }
                });
            }
        });
    });
});

app.get('/home', function(req,res) {
    var token = req.query.token;
    var email = req.query.email;
    getAdmins(function(adminList) {
        verifyStudent(token, function(student) {
            if(student) {
                checkSubmissionStatus(function(posted) {
                    switch(posted) {
                        case -1: res.writeHead(200, {'Content-Type': 'text/html'});
                            view("header", {}, res);
                            view("nav", {}, res);
                            view("submit_num", {error:""}, res);
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
                            view("nav-student-answer", {}, res);
                            table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:""}, email, res, adminList);
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
                                    view("nav-admin", {}, res);
                                    view("submit_num", {error:""}, res);
                                    view("footer", {}, res);
                                    res.end();
                                    break;

                                case 0:  res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-admin", {}, res);
                                    view("landing-page",  {username:"Landing Page", description:"Submissions have been closed"}, res);
                                    view("footer", {}, res);
                                    res.end();
                                    break;

                                case 1:  res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-admin", {}, res);
                                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:""}, email, res, adminList);
                                    view("footer", {}, res);
                                    res.end();
                                    break;

                                default: res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav-admin", {}, res);
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
});


app.post('/login', function(req, res) {
    var token = req.query.token;
    var email = req.query.email;
    verifyAdmin(token, function(admin) {
        var path = "/";
        if(admin) {
            path += "admin?token="+token+"&email="+email;
        } else {
            path += "home?token="+token+"&email="+email;
        }
        res.send(path);
    });
});

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


// link to /close?status=true to close submissions, everything else opens them back up
// redirects to admin page
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


// link to /publish?status=true to publish submissions, everything else hides them
// redirects to admin page
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

// Uploads student.txt file for student authentication
app.post('/fileupload', function(req, res){

    // Gets form of uploaded file
    var form = new formidable.IncomingForm();

    // Parses form for the txt file
    form.parse(req, function (err, fields, files) {

        // If file is not named "students.txt"
        if(files.filetoupload.name !== 'students.txt'){
            // Displays admin page alerting admin of unsuccesful upload
            getAdmins(function(adminList) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                view("header", {}, res);
                view("nav-admin", {}, res);
                table_view("admin", fs.readFileSync('./data.json', 'utf-8'), {check:"Unsuccesful Upload"}, 'admin', res, adminList);
                view("footer", {}, res);
                res.end();
            });
        }
        else{
            // Path is updated for student.txt
            var oldpath = files.filetoupload.path;
            var newpath = '/home/ec2-user/CMSC447/CMSC447-GroupProject/' + files.filetoupload.name;
            fs.rename(oldpath, newpath, function (err) {

                // If an error occurs
                if (err){
                    // Displays admin page alerting admin of unsuccesful upload
                    getAdmins(function(adminList) {
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        view("header", {}, res);
                        view("nav-admin", {}, res);
                        table_view("admin", fs.readFileSync('./data.json', 'utf-8'), {check:"Unsuccesful Upload"}, 'admin', res, adminList);
                        view("footer", {}, res);
                        res.end();
                    });
                }
                else{
                    // Displays admin page alerting admin of successful upload
                    getAdmins(function(adminList) {
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

// Admin function for deleting submissions
app.get('/delete-num', function(req, res) {
    var token = req.query.token;
    var email = req.query.email;
    var alias = req.query.alias;
    var num = req.query.num;
    var file = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));

    verifyAdmin(token, function(admin) {
       if(admin) {
            getAdmins(function(admins) {
                getStudents(function(students) {
                    var json = {};

                    // If email is an admin email
                    if(admins.indexOf(email) !== -1) {
                        for (var i = 0; i < admins.length; i++) {
                            var newNums = [];
                            var newFactorizedList = {};
                            for(var n in file[admins[i]][0].nums) {

                                // Creates new json data for everything but deleted submission
                                if(file[admins[i]][0].nums[n].num_submit.slice(-10) != num && file[admins[i]][0].nums[n].alias != alias) {
                                    newNums.push(file[admins[i]][0].nums[n]);

                                    // Updates factorized_by_me list of admin data
                                    if(file[admins[i]][0].factorized_by_me[file[admins[i]][0].nums[n].alias] === true){
                                        newFactorizedList[file[admins[i]][0].nums[n].alias] = true;
                                    }
                                }
                            }

                            // Pushes new admin data without deleted submissions
                            json[admins[i]] = [];
                            var newObj = {
                                alias : file[admins[i]][0].alias,
                                nums : newNums,
                                factorized_by_me : newFactorizedList
                            };
                            json[admins[i]].push(newObj);
                        }

                        for (var i = 0; i < students.length; i++) {
                            if (!isEmpty(file[students[i].trim()])) {
                                json[students[i].trim()] = file[students[i].trim()];
                            }
                        }

                        fs.writeFileSync('./data.json', JSON.stringify(json), 'utf-8');
                        res.send();
                    } else {

                        // Creates new json data for everything but deleted submission
                        var newFactorizedList = {};
                        for (var i = 0; i < students.length; i++) {

                            var newStudent = students[i].trim();
                            if (newStudent !== email && !isEmpty(file[newStudent])) {

                                // Updates factorized_by_me list of student data
                                for(var key in file[newStudent][0].factorized_by_me){
                                    if(key !== alias){
                                        newFactorizedList[key] = true;
                                    }
                                }

                                // Pushes new student data without deleted submissions
                                json[newStudent] = [];
                                var newObj = {
                                    alias : file[newStudent][0].alias,
                                    num_submit: file[newStudent][0].num_submit,
                                    num_length: file[newStudent][0].num_length,
                                    num_prime: file[newStudent][0].num_prime,
                                    factor_count: file[newStudent][0].factor_count,
                                    first_factor_time: file[newStudent][0].first_factor_time,
                                    factorized_by_me : newFactorizedList
                                };
                                json[newStudent].push(newObj);
                            }
                        }

                        // Creates new json data for everything but deleted submission
                        var newFactorizedListAdmin = {};
                        for (var i = 0; i < admins.length; i++) {
                            if (!isEmpty(file[admins[i]])) {

                                // Updates factorized_by_me list of student data
                                for(var key in file[admins[i]][0].factorized_by_me){
                                    if(key !== alias){
                                        newFactorizedListAdmin[key] = true;
                                    }
                                }

                                // Pushes new admin data without deleted submissions
                                json[admins[i]] = [];
                                var newObj = {
                                    alias : file[admins[i]][0].alias,
                                    nums : file[admins[i]][0].nums,
                                    factorized_by_me : newFactorizedListAdmin
                                };
                                json[admins[i]].push(newObj);
                            }
                        }

                        fs.writeFileSync('./data.json', JSON.stringify(json), 'utf-8');
                        res.send();
                    }
                });
            });
       }
       res.send();
    });
});

// logs user out of google account
app.get('/logout', function(req,res) {

    res.redirect('https://accounts.google.com/logout');

});

app.get('/number-list', function(req, res) {
    var file = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
    var list = [];
    var body = '';

    for(var email in file) {
        if(isEmpty(file[email][0].nums)){
            var str = file[email][0].alias+': '+file[email][0].num_submit;
            list.push(str);
        }
        else{
            for(var sub in file[email][0].nums){
                var str = file[email][0].nums[sub].alias+': '+file[email][0].nums[sub].num_submit;
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

app.get('/get-admins', function(req, res) {
   getAdmins(function(data) {
       res.send(data);
   })
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
