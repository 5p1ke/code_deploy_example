var _ = require('underscore');


// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("blockUser", function(request, response) {
    Parse.Cloud.useMasterKey();
    var query = new Parse.Query(Parse.User);
    query.equalTo("email", request.params.email);
    query.first().then(function(user){
        user.set("blocked", true);
        user.save().then(function () {
            response.success();
        });
    }, function(error){
        response.error(error);
    } );
});

Parse.Cloud.define("checkEmail", function(request, response) {
    Parse.Cloud.useMasterKey();
    var query = new Parse.Query(Parse.User);
    query.equalTo("email", request.params.email);
    query.first().then(function(user){
        if (_.isUndefined(user)) {
            response.success(false);
        } else {
            response.success(true);
        }
    }, function(error){
        response.error(error);
    } );
});

Parse.Cloud.define("changePassword", function(request, response) {
    //1 wrong password
    //2 password doesn't match
    //3 wrong password and password doesn't match
    var repeatFailed = false;
    if (request.params.newPassword != request.params.repeatPassword)
        repeatFailed = true;

    Parse.User.logIn(request.params.username, request.params.oldPassword).then(function(user){
        if (repeatFailed) {
            console.log({"kawaError": 2, "errorDescription": "Passwords does not match." });
            response.success({"kawaError": 2, "errorDescription": "Passwords does not match." });
        } else {
            console.log(user.toJSON());
            user.set("password", request.params.newPassword);
            user.save().then(function (result) {
                response.success(true);
            });
        }
    }, function(error){
        if (repeatFailed) {
            console.log({"kawaError": 3, "errorDescription": "Wrong password & passwords does not match." });
            response.success({"kawaError": 3, "errorDescription": "Wrong password & passwords does not match." });
        } else {
            console.log({"kawaError": 1, "errorDescription": "Wrong password." });
            response.success({"kawaError": 1, "errorDescription": "Wrong password." });
        }
    } );
});

