module.exports = {
    sendError: (res, detail = null, message = "Server error") => {
        res.send({ result: 'failure', detail: detail, message: message });
    },
    role: {
        admin: 4,
        student: 1,
        teacher: 2,
        staff: 3,
    },
    largePersonGroup: 'hcmus-test',
    faceApiKey: '18db52d47bc5483f92d687a957c40c98'
}