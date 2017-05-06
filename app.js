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
        var output = exec(cmd,
            function (error, stdout, stderr){
                var bit_length = stdout;
                if(parseInt(stdout) < 2){
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
                else if(parseInt(stdout) > 2000){
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
                    var isPrimeCmd = "python /home/ec2-user/CMSC447/CMSC447-GroupProject/public/python/prime.py 10 " + student_number;
                    var outputIsPrime = exec(isPrimeCmd,
                        function (error, stdout, stderr){
                            var isPrime;
                            console.log(stdout);
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

                                    /*for(var key in fruits["fruits"]){
                                        var name = fruits["fruits"][key].name;
                                        factorized_by_me_list[name] = false;
                                    }*/
                                    //factorized_by_me_list = [];
                                    if(admin) {

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

                                verifyAdmin(token, function(admin) {
                                    if(admin){
                                        res.writeHead(200, {'Content-Type': 'text/html'});
                                        view("header", {}, res);
                                        view("nav-admin", {}, res);
                                        view("submit_num",  {error:"Valid Bit length: " + bit_length}, res);
                                        view("footer", {}, res);
                                        res.end();
                                    }
                                    else{
                                        res.writeHead(200, {'Content-Type': 'text/html'});
                                        view("header", {}, res);
                                        view("nav", {}, res);
                                        view("submit_num",  {error:"Valid Bit length: " + bit_length}, res);
                                        view("footer", {}, res);
                                        res.end();
                                    }
                                });
                                /*res.writeHead(303, {"Location": "/submit-num?token=" + token});
                                res.end();*/
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
        verifyAdmin(token, function(admin) {
            if(admin){
                res.writeHead(200, {'Content-Type': 'text/html'});
                view("header", {}, res);
                view("nav-admin", {}, res);
                view("submit_num",  {error:"Invalid Submission" + bit_length}, res);
                view("footer", {}, res);
                res.end();
            }
            else{
                res.writeHead(200, {'Content-Type': 'text/html'});
                view("header", {}, res);
                view("nav", {}, res);
                view("submit_num",  {error:"Invalid Submission" + bit_length}, res);
                view("footer", {}, res);
                res.end();
            }
        });
    }
});

app.get('/submit-answer', function(req, res) {
    var token = req.query.token;
    var email = req.query.email;

    getAdmins(function(adminList) {
        verifyStudent(token, function (student) {
            if (student) {
                checkSubmissionStatus(function (posted) {
                    switch (posted) {
                        case -1:
                            /*res.writeHead(200, {'Content-Type': 'text/html'});
                            view("header", {}, res);
                            view("nav", {}, res);
                            table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), email, res, adminList);
                            view("footer", {}, res);
                            res.end();*/
                            /* BELOW IS THE ACTUAL CODE FOR THIS SECTION, ABOVE IS FOR TESTING */
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
                                    /*res.writeHead(200, {'Content-Type': 'text/html'});
                                    view("header", {}, res);
                                    view("nav", {}, res);
                                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), email, res, adminList);
                                    view("footer", {}, res);
                                    res.end();*/
                                    /* BELOW IS THE ACTUAL CODE FOR THIS SECTION, ABOVE IS FOR TESTING */
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
    console.log( req.body.user_email + '\n'
				+req.body.submit_answer + '\n'
				+req.body.num_to_answer + '\n'
                +req.body.num_to_answer_alias + '\n');
    // This Comment block initializes the arguments for the java program to check the
    // Answer the student submits. *CHANGE VARIABLE TO GET THE VARIABLE student_answer*
    var two_nums = student_answer.split(" ");
    var cmd = 'java -jar /home/ec2-user/CMSC447/CMSC447-GroupProject/public/Java/verify_numbers.jar answer ' + number_to_answer + ' ';
    var isPrimeCmd = 'python /home/ec2-user/CMSC447/CMSC447-GroupProject/public/python/prime.py 10 ';
    for (var i = 0; i < two_nums.length; i ++){
        cmd += two_nums[i] + ' ';
        isPrimeCmd += two_nums[i] + ' ';
        //args.push(two_nums[i]);
    }

    if(course[email][0].factorized_by_me[number_to_answer_alias] !== true){
        // This comment block runs the java program to check the factorization
        var isPrimeOutput = exec(isPrimeCmd, function(error, stdout, stderr){
            if(stdout === "True\n"){
                var output = exec(cmd, function (error, stdout, stderr){
                    var correctFactor = stdout;
                    if(correctFactor === '1'){
                        for(var key in course){
                            if(!isEmpty(course[key][0].nums)){
                                for(var sub in course[key][0].nums){
                                    if(course[key][0].nums[sub].alias === number_to_answer_alias){
                                        if(course[key][0].nums[sub].first_factor_time === ""){
                                            var currentdate = new Date();
                                            var hours = currentdate.getHours() - 4;
                                            if(hours > 12){
                                                hours = hours - 12;
                                            }
                                            var datetime =  (currentdate.getMonth() + 1) + "/"
                                                            + currentdate.getDate() + "/"
                                                            + currentdate.getFullYear() + " @ "
                                                            + hours + ":"
                                                            + currentdate.getMinutes() + ":"
                                                            + currentdate.getSeconds();
                                            course[key][0].nums[sub].first_factor_time = datetime;
                                        }
                                        course[key][0].nums[sub].factor_count++;
                                    }
                                }
                            }
                            else{
                                if(course[key][0].alias === number_to_answer_alias){
                                    if(course[key][0].first_factor_time === ""){
                                        var currentdate = new Date();
                                        var hours = currentdate.getHours() - 4;
                                        if(hours > 12){
                                            hours = hours - 12;
                                        }
                                        var datetime =  (currentdate.getMonth() + 1) + "/"
                                                        + currentdate.getDate() + "/"
                                                        + currentdate.getFullYear() + " @ "
                                                        + hours + ":"
                                                        + currentdate.getMinutes() + ":"
                                                        + currentdate.getSeconds();
                                        course[key][0].first_factor_time = datetime;
                                    }
                                    course[key][0].factor_count++;
                                }
                            }
                        }
                        course[email][0].factorized_by_me[number_to_answer_alias] = true;
                        fs.writeFileSync('./data.json', JSON.stringify(course), 'utf-8');

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
                                    view("nav", {}, res);
                                    table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:"Correct"}, email, res, adminList);
                                    view("footer", {}, res);
                                    res.end();
                                }
                            });
                        });
                    }
                    else{
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
                                    view("nav", {}, res);
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
                            view("nav", {}, res);
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



    /*getAdmins(function(adminList) {
        verifyAdmin(token, function(admin) {
            if(admin){
                res.writeHead(200, {'Content-Type': 'text/html'});
                view("header", {}, res);
                view("nav-admin", {}, res);
                table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:""}, email, res, adminList);
                view("footer", {}, res);
                res.end();
            }
            else{
                res.writeHead(200, {'Content-Type': 'text/html'});
                view("header", {}, res);
                view("nav", {}, res);
                table_view("submit-answer", fs.readFileSync('./data.json', 'utf-8'), {check:""}, email, res, adminList);
                view("footer", {}, res);
                res.end();
            }
        });
    });
    res.writeHead(303, {"Location": "/submit-answer?token=" + token + "&email=" + email});
    res.end();*/
});

app.get('/statistics', function(req, res) {
    var token = req.query.token;
    verifyStudent(token, function(student) {
        if(student) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            view("header", {}, res);
            view("nav-student-answer", {}, res);
            view("graph", {}, res);
            view("footer", {}, res);
            res.end();
        } else {
            verifyAdmin(token, function(admin) {
                if(admin) {
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    view("header", {}, res);
                    view("nav-admin", {}, res);
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

/*app.get('/upload', function(req, res){

});*/

//Admin function for deleting submissions
app.get('/delete-num', function(req, res) {
    //fs.writeFileSync('./data.json', JSON.stringify(file), 'utf-8');
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
                    if(admins.indexOf(email) !== -1) {
                        for (var i = 0; i < admins.length; i++) {
                            if (admins[i] !== email && !isEmpty(file[admins[i]])) {
                                json[admins[i]] = file[admins[i]];
                            } else {
                                var newNums = [];
                                for(var n in file[admins[i]][0].nums) {
                                    if(file[admins[i]][0].nums[n].num_submit.slice(-10) != num && file[admins[i]][0].nums[n].alias != alias) {
                                        newNums.push(file[admins[i]][0].nums[n]);
                                    }
                                }
                                json[admins[i]] = [];
                                var newObj = {
                                    alias : file[admins[i]][0].alias,
                                    nums : newNums,
                                    factorized_by_me : file[admins[i]][0].factorized_by_me
                                };
                                json[admins[i]].push(newObj);
                            }
                        }

                        for (var i = 0; i < students.length; i++) {
                            if (!isEmpty(file[students[i]])) {
                                json[students[i]] = file[students[i]];
                            }
                        }

                        fs.writeFileSync('./data.json', JSON.stringify(json), 'utf-8');
                        res.send();
                    } else {

                        for (var i = 0; i < students.length; i++) {
                            if (students[i] !== email && !isEmpty(file[students[i]])) {
                                json[students[i]] = file[students[i]];
                            }
                        }

                        for (var i = 0; i < admins.length; i++) {
                            if (!isEmpty(file[admins[i]])) {
                                json[admins[i]] = file[admins[i]];
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

//logs user out of google account
app.get('/logout', function(req,res) {

    res.redirect('https://accounts.google.com/logout');

});

app.get('/number-list', function(req, res) {
    var file = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
    //var file = require('./data.json');
    var list = [];
    var body = '';

    for(var email in file) {
        if(isEmpty(file[email][0].nums)){
            var str = file[email][0].alias+' : '+file[email][0].num_submit;
            list.push(str);
        }
        else{
            for(var sub in file[email][0].nums){
                var str = file[email][0].nums[sub].alias+' : '+file[email][0].nums[sub].num_submit;
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
