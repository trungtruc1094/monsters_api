const { Router } = require('express');
var _global = require('./global.js');
var bcrypt = require('bcrypt');
var async = require('async');
var format = require('pg-format');
const requestAPI = require("./predefined-modules/requestAPI")

const pool = require('../db');

const router = Router();

// Face Verification - Face to Person
router.post('/verifyFace', function(req, res, next) {
    if (req.body.faceId == undefined || req.body.faceId == '') {
        _global.sendError(res, null, "Face ID is required");
        return;
    }
    if (req.body.personId == undefined || req.body.personId == '') {
        _global.sendError(res, null, "Person ID is required");
        return;
    }
    if (req.body.largePersonGroupId == undefined || req.body.largePersonGroupId == '') {
        _global.sendError(res, null, "Large Person Group ID is required");
        return;
    }

    var faceId = req.body.faceId;
    var personId = req.body.personId;

    var dataAPI = {
        baseUrl: 'https://westcentralus.api.cognitive.microsoft.com',
        uri: '/face/v1.0/verify',
        headers: {
            'Content-Type':'application/json',
            'Ocp-Apim-Subscription-Key':'18db52d47bc5483f92d687a957c40c98'
        },
        method: 'POST',
        body: {
            "faceId": faceId,
            "personId": personId,
            "largePersonGroupId": _global.largePersonGroup
        }
    }  

    function verifyFace(isIdentical, confidence){
        var identical = isIdentical;
        var confidenceIndex = confidence;
        var verification = {
            identical: identical,
            confidenceIndex: confidenceIndex
        };
        console.log('Success identified');
        res.send({ result: verification, message: 'Successfully identified' });
    }

    requestAPI(dataAPI, function(error, result) {
        if (error) {
            _global.sendError(res, null, "Unknown Error");
            return;
        }
        var isIdentical = result['isIdentical'];
        var confidence = result['confidence'];
        if (isIdentical == undefined || isIdentical == '') {
            _global.sendError(res, null, "Cannot get is Identical");
            return;
        } 
        if (confidence == undefined || confidence == '') {
            _global.sendError(res, null, "Cannot get Confidence");
            return;
        } 
        verifyFace(isIdentical, confidence);
    }); 
});

module.exports = router;



