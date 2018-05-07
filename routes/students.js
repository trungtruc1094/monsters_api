const { Router } = require('express');
var _global = require('./global.js');
var bcrypt = require('bcrypt');
var async = require('async');
var format = require('pg-format');
const requestAPI = require("./predefined-modules/requestAPI")

const pool = require('../db');

const router = Router();

// Get person id for upload face
router.get('/detail/:id', function(req, res, next) {
    var id = req.params['id'];
    pool.connect(function(error, connection, done) {
        if(connection == undefined){
            _global.sendError(res, null, "Can't connect to database");
            done();
            return console.log("Can't connect to database");
        }
        connection.query(format(`SELECT users.*,students.stud_id AS code, students.person_id,students.status,classes.id AS class_id ,classes.name AS class_name
            FROM users,students,classes
            WHERE users.id = %L AND users.id = students.id AND students.class_id = classes.id  LIMIT 1`, id), function(error, result, fields) {
            if (error) {
                _global.sendError(res, error.message);
                done();
                return console.log(error);
            }
            var student = result.rows[0];
            connection.query(format(`SELECT courses.id, code, name, attendance_status, enrollment_status,
                                (SELECT array_to_string(array_agg(CONCAT(users.first_name,' ',users.last_name)), E'\r\n')
                                FROM teacher_teach_course,users
                                WHERE users.id = teacher_teach_course.teacher_id AND
                                    courses.id = teacher_teach_course.course_id AND
                                    teacher_teach_course.teacher_role = 0) as lecturers,
                                (SELECT COUNT(attendance_detail.attendance_id)
                                FROM attendance,attendance_detail
                                WHERE attendance_detail.student_id = student_enroll_course.student_id AND attendance_detail.attendance_type = 0 AND attendance.course_id = courses.id AND attendance.id = attendance_detail.attendance_id ) as absence_count
                FROM student_enroll_course,courses,class_has_course
                WHERE student_enroll_course.class_has_course_id = class_has_course.id AND class_has_course.course_id = courses.id AND student_enroll_course.student_id = %L`, id), function(error, result, fields) {
                if (error) {
                    _global.sendError(res, error.message);
                    done();
                    return console.log(error);
                }
                res.send({ result: 'success', student: student, current_courses: result.rows });
                done();
            });
        });
    });
});

router.post('/add', (req, res, next) => {
    if (req.body.program_id == undefined || req.body.program_id == 0) {
        _global.sendError(res, null, "Program is required");
        return;
    }
    if (req.body.class_id == undefined || req.body.class_id == 0) {
        _global.sendError(res, null, "Class is required");
        return;
    }
    if (req.body.code == undefined || req.body.code == '') {
        _global.sendError(res, null, "Student code is required");
        return;
    }
    if (req.body.first_name == undefined || req.body.first_name == '') {
        _global.sendError(res, null, "First name is required");
        return;
    }
    if (req.body.last_name == undefined || req.body.last_name == '') {
        _global.sendError(res, null, "Last name is required");
        return;
    }
    if (req.body.email == undefined || req.body.email == '') {
        _global.sendError(res, null, "Email is required");
        return;
    }
    if (req.body.email.indexOf('@') == -1) {
        _global.sendError(res, null, "Invalid Email");
        return;
    }
    if (req.body.phone == undefined || isNaN(req.body.phone)) {
        _global.sendError(res, null, "Invalid Phone Number");
        return;
    }

    var new_class_id = req.body.class_id;
    var new_program_id = req.body.program_id;
    var new_code = req.body.code;
    var new_first_name = req.body.first_name;
    var new_last_name = req.body.last_name;
    var new_email = req.body.email;
    var new_phone = req.body.phone;
    var new_note = req.body.note;
    var new_person_id;
    // console.log('Here');
    var dataAPI = {
        baseUrl: 'https://westcentralus.api.cognitive.microsoft.com',
        uri: '/face/v1.0/persongroups/hcmus-test/persons',
        headers: {
            'Content-Type':'application/json',
            'Ocp-Apim-Subscription-Key':'18db52d47bc5483f92d687a957c40c98'
        },
        method: 'POST',
        body: {
            "name": new_code,
            "userData": new_first_name
        }
    }
    function addStudent(personId){
        new_person_id = personId;
        pool.connect(function(error, connection, done) {
            // console.log('Here');
            if (error) {
                _global.sendError(res, error.message);
                done();
                return console.log(error);
            }
    
            connection.query(format(`SELECT stud_id FROM students WHERE stud_id = %L LIMIT 1`, new_code), function(error, result, fields) {
                if (error) {
                    _global.sendError(res, error.message);
                    done();
                    return console.log(error);
                }
                //check email exist
                if (result.rowCount > 0) {
                    _global.sendError(res, null, "Student code already existed");
                    done();
                    return console.log("Student code already existed");
                }
                connection.query(format(`SELECT email FROM users WHERE email = %L LIMIT 1`, new_email), function(error, result, fields) {
                    if (error) {
                        _global.sendError(res, error.message);
                        done();
                        return console.log(error);
                    }
                    //check email exist
                    if (result.rowCount > 0) {
                        _global.sendError(res, "Email already existed");
                        done();
                        return console.log("Email already existed");
                    }
                    //new data to users table
                    var new_password = new_email.split('@')[0];
                    var new_user = [[
                        new_first_name,
                        new_last_name,
                        new_email,
                        new_phone,
                        bcrypt.hashSync(new_password, 10),
                        _global.role.student
                    ]];
                    var new_student = [];
                    async.series([
                        //Start transaction
                        function(callback) {
                            connection.query('BEGIN', (error) => {
                                if (error) callback(error);
                                else callback();
                            });
                        },
                        //add data to user table
                        function(callback) {
                            connection.query(format('INSERT INTO users (first_name,last_name,email,phone,password,role_id) VALUES %L RETURNING id', new_user), function(error, result, fields) {
                                if (error) {
                                    callback(error);
                                }else{
                                    new_student = [[
                                        result.rows[0].id,
                                        new_code,
                                        new_class_id,
                                        new_note,
                                        new_person_id
                                    ]];
                                    callback();
                                }
                            });
                        },
                        //insert student
                        function(callback) {
                            connection.query(format('INSERT INTO students (id,stud_id,class_id,note,person_id) VALUES %L', new_student), function(error, result, fields) {
                                if (error) {
                                    callback(error);
                                }else{
                                    callback();
                                }
                            });
                        },
                        //Commit transaction
                        function(callback) {
                            connection.query('COMMIT', (error) => {
                                if (error) callback(error);
                                else callback();
                            });
                        },
                    ], function(error) {
                        if (error) {
                            _global.sendError(res, error.message);
                            connection.query('ROLLBACK', (error) => {
                                if (error) return console.log(error);
                            });
                            done();
                            return console.log(error);
                        } else {
                            // var token = jwt.sign({ email: new_email }, _global.jwt_secret_key, { expiresIn: _global.jwt_register_expire_time });
                            // var link = _global.host + '/register;token=' + token;
                            // _global.sendMail(
                            //     '"Giáo vụ"',
                            //     new_email,
                            //     'Register your account',
                            //     'Hi,'+ new_first_name + '\r\n' +
                            //     'Your account has been created.To setup your account for the first time, please go to the following web address: \r\n\r\n' +
                            //     link +
                            //     '\r\n(This link is valid for 7 days from the time you received this email)\r\n\r\n' +
                            //     'If you need help, please contact the site administrator,\r\n' +
                            //     'Admin User \r\n\r\n' +
                            //     'admin@fit.hcmus.edu.vn'
                            // );
                            console.log('success adding student!');
                            res.send({ result: 'success', message: 'Student Added Successfully' });
                            done();
                        }
                    });
                });
            });
        });
    }
    requestAPI(dataAPI, function(error, result) {
        if (error) {
            _global.sendError(res, null, "Unknown Error");
            return;
        }
        var person_id = result['personId'];
        if (person_id == undefined || person_id == '') {
            _global.sendError(res, null, "Cannot get Person Id");
            return;
        } else {
            addStudent(person_id);
        }
    });
});

router.post('/uploadFace', function(req, res, next) {
    if (req.body.person_id == undefined || req.body.person_id == '') {
        _global.sendError(res, null, "PersonId is required");
        return;
    }
    if (req.body.face_image == undefined || req.body.face_image == '') {
        _global.sendError(res, null, "Face Image URL is required");
        return;
    }
    
    var person_id = req.body.person_id;
    var face_image = req.body.face_image;

    var dataAPI = {
        baseUrl: 'https://westcentralus.api.cognitive.microsoft.com',
        uri: `/face/v1.0/persongroups/hcmus-test/persons/${person_id}/persistedFaces`,
        headers: {
            'Content-Type':'application/json',
            'Ocp-Apim-Subscription-Key':'18db52d47bc5483f92d687a957c40c98'
        },
        method: 'POST',
        body: {
            "url": face_image
        }
    }   
    function addFace(face_id){
        // console.log('HERE');
        pool.connect(function(error, connection, done) {
            if (error) {
                _global.sendError(res, error.message);
                done();
                return console.log(error);
            }
    
            var new_student_has_face = [[
                person_id,
                face_id,
                face_image,
            ]];
    
            async.series([
                //Start transaction
                function(callback) {
                    connection.query('BEGIN', (error) => {
                        if (error) callback(error);
                        else callback();
                    });
                },
                //add data to student_has_faces table
                function(callback) {
                    connection.query(format('INSERT INTO student_has_faces (person_id, face_id, face_image) VALUES %L', new_student_has_face), function(error, result, fields) {
                        if (error) {
                            callback(error);
                        }else{
                            callback();
                        }
                    });
                },
                //Commit transaction
                function(callback) {
                    connection.query('COMMIT', (error) => {
                        if (error) callback(error);
                        else callback();
                    });
                },
            ], function(error) {
                if (error) {
                    _global.sendError(res, error.message);
                    connection.query('ROLLBACK', (error) => {
                        if (error) return console.log(error);
                    });
                    done(error);
                    return console.log(error);
                } else {
                    console.log('Success adding face to student!---------------------------------------');
                    res.send({ result: 'success', message: 'Face Added Successfully' });
                    done();
                }
            });
        });
    }
    requestAPI(dataAPI, function(error, result) {
        if (error) {
            _global.sendError(res, null, "Unknown Error");
            return;
        }
        var face_id = result['persistedFaceId'];
        if (face_id == undefined || face_id == '') {
            _global.sendError(res, null, "Cannot get Face Id");
            return;
        } else {
            addFace(face_id);
        }
    });
    
});

module.exports = router;



