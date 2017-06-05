var _ = require('underscore');

const TYPE = "Object";

Parse.Cloud.define("managers", function(request, response){
    var Manager = Parse.Object.extend("Manager");
    var managerQuery;

    if (request.params.sort == 3) {
        managerQuery = new Parse.Query(Parse.User);
        var innerQuery = new Parse.Query(Manager);
        innerQuery.limit(1000);
        innerQuery.exists("manager");

        managerQuery.doesNotMatchQuery("manager", innerQuery);
        managerQuery.exists("manager");
        managerQuery.include("manager");
        managerQuery.equalTo("locked", false);
        managerQuery.equalTo("privateProfile", false);
        managerQuery.descending("followerCount");
    } else {
        managerQuery = new Parse.Query(Manager);
        var lockedQuery = new Parse.Query(Parse.User);
        var privateQuery = new Parse.Query(Parse.User);
        privateQuery.equalTo("privateProfile", true);
        privateQuery.limit(1000);
        privateQuery.exists("manager");
        lockedQuery.equalTo("locked", true);
        lockedQuery.limit(1000);
        lockedQuery.exists("manager");

        var innerQuery = new Parse.Query.or(lockedQuery, privateQuery);

        managerQuery.doesNotMatchQuery("user", innerQuery);
        managerQuery.include("user");
        if (request.params.sort == 2)
            managerQuery.descending("amountRaised");
        else
            managerQuery.descending("dealsPlaced");
    }

    managerQuery.skip(request.params.page * 20);
    managerQuery.limit(20);

    managerQuery.find().then(function(results) {
        if ( _.isUndefined(request.params.userId) ) {
            response.success(results);
        } else {
            var jresults = [];
            var userList = [];
            //getting results and tranforming in JSON
            _.each(results, function (aResult) {
                var JSON = aResult.toJSON();
                JSON["__type"] = TYPE;
                JSON["className"] = aResult.className;
                JSON["youFollow"] = false;
                if (request.params.sort == 3)
                    userList.push(aResult);
                else
                    userList.push(aResult.get("user"));
                jresults.push(JSON);
            });

            var user = new Parse.User();
            user.id = request.params.userId;
            var Follower = Parse.Object.extend("Follower");
            var followingQuery = new Parse.Query(Follower);
            followingQuery.equalTo("from", user);
            followingQuery.containedIn("to", userList);
            followingQuery.descending("createdAt");
            followingQuery.find().then(function (followers) {
                //setting people which user follows
                _.each(jresults, function (JSON) {
                    for (var i = 0; i < followers.length; i++) {
                        var follower = followers[i];
                        if (request.params.sort == 3)
                            var objectId = JSON["objectId"];
                        else
                            var objectId = JSON.user.objectId;
                        if (follower.get("to").id == objectId) {
                            JSON["youFollow"] = true;
                            break;
                        }
                    }
                });

                console.log(jresults);
                response.success(jresults);
            });
        }
    }, function(error) {
        response.error(error);
    });

});

module.exports.incrementManagerData = function(user) {
    var Manager = Parse.Object.extend("Manager");
    var managerQuery = new Parse.Query(Manager);
    managerQuery.equalTo("user", user);
    return managerQuery.first().then(function(result) {
        var dealsPlaced = result.get("dealsPlaced") || 0;
        dealsPlaced = dealsPlaced + 1;
        result.set("dealsPlaced", dealsPlaced );
        return result.save();
    }, function(error){
        return error;
    });
}

module.exports.decrementManagerData = function(user) {
    var Manager = Parse.Object.extend("Manager");
    var managerQuery = new Parse.Query(Manager);
    managerQuery.equalTo("user", user);
    return managerQuery.first().then(function(result) {
        var dealsPlaced = result.get("dealsPlaced") || 0;
        result.set("dealsPlaced", dealsPlaced - 1);
        return result.save();
    }, function(error){
        return error;
    });
}