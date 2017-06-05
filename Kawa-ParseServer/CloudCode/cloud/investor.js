var _ = require('underscore');

const TYPE = "Object";
const OBJECT = "Object";

Parse.Cloud.define("investors", function(request, response){
    var invQuery;
    if (request.params.sort == 3) {
        invQuery = new Parse.Query(Parse.User);
        invQuery.exists("investor");
        invQuery.include("investor");
        invQuery.equalTo("privateProfile", false);
        invQuery.descending("followerCount");
    } else {
        var Investor = Parse.Object.extend("Investor");
        invQuery = new Parse.Query(Investor);
        var innerQuery = new Parse.Query(Parse.User);
        innerQuery.equalTo("privateProfile", true);
        innerQuery.limit(1000);
        innerQuery.exists("investor");

        invQuery.doesNotMatchQuery("user", innerQuery);
        invQuery.include("user");
        if (request.params.sort == 2)
            invQuery.descending("investmentAmount");
        else
            invQuery.descending("investmentCount");
    }

    invQuery.skip(request.params.page * 20);
    invQuery.limit(20);
    invQuery.find().then(function(results) {
        if ( _.isUndefined(request.params.userId) ) {
            console.log(results);
            response.success(results);
        } else {
            var jresults = [];
            var userList = [];
            //getting results and tranforming in JSON
            _.each(results, function(aResult) {
                var JSON = aResult.toJSON();
                JSON["__type"] = TYPE;
                JSON["className"] = aResult.className;
                JSON["youFollow"] = false;
                if (request.params.sort == 3)
                    userList.push(aResult);
                else
                    userList.push(aResult.get("user") );
                jresults.push(JSON);
            });

            var user = new Parse.User();
            user.id = request.params.userId;
            var Follower = Parse.Object.extend("Follower");
            var followingQuery = new Parse.Query(Follower);
            followingQuery.equalTo("from", user);
            followingQuery.containedIn("to", userList);
            followingQuery.descending("createdAt");
            followingQuery.find().then(function(followers){
                //setting people which user follows
                _.each(jresults, function(JSON) {
                    for(var i = 0; i < followers.length; i++) {
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

Parse.Cloud.define("investments", function(request, response){
    var DealInvestment = Parse.Object.extend("DealInvestment");
    var dealQuery = new Parse.Query(DealInvestment);
    var user = new Parse.User();
    user.id = request.params.userId;

    dealQuery.equalTo("user", user);
    dealQuery.include("deal");
    dealQuery.include("deal.files");
    dealQuery.include("deal.sector");
    dealQuery.include("deal.dealClass");
    dealQuery.include("deal.manager");
    dealQuery.include("deal.sponsor");
    dealQuery.include("deal.dealroom");
    dealQuery.include("deal.dealroom.files");

    dealQuery.find().then( function(results) {
        if (_.isUndefined(request.params.viewerId) ) {
            //console.log(results);
            response.success(results);
        } else {
            var dealsResult = [];
            var deals = [];
            _.each(results, function(investment) {
                jsonDeal = investment.toJSON();
                jsonDeal['__type'] = OBJECT;
                jsonDeal['className'] = investment.className;
                jsonDeal["youFollow"] = false;
                dealsResult.push(jsonDeal);
                deals.push(investment.get("deal"));
            });

            var viewer = new Parse.User();
            viewer.id = request.params.viewerId;
            var Follower = Parse.Object.extend("DealFollower");
            var followingQuery = new Parse.Query(Follower);
            followingQuery.equalTo("user", viewer);
            followingQuery.containedIn("deal", deals);
            followingQuery.find().then(function(followers){
                //setting people which user follows
                _.each(dealsResult, function(JSON) {
                    for(var i = 0; i < followers.length; i++) {
                        var follower = followers[i];
                        if (follower.get("deal").id == JSON.deal.objectId) {
                            JSON["youFollow"] = true;
                            break;
                        }
                    }
                });

                //console.log(dealsResult);
                response.success(dealsResult);
            });
        }
    }, function (error) {
        response.error(error);
    });

});

module.exports.incrementInvestorData = function(amount, user) {
    var Investor = Parse.Object.extend("Investor");
    var invQuery = new Parse.Query(Investor);
    invQuery.equalTo("user", user);
    return invQuery.first().then(function(investor) {
        var countUpdated = investor.get("investmentCount") || 0;
        var amountUpdated = investor.get("investmentAmount") || 0;

        countUpdated = countUpdated + 1;
        amountUpdated = amountUpdated + amount;

        investor.set("investmentAmount", amountUpdated );
        investor.set("investmentCount", countUpdated );
        return investor.save();
    }, function(error){
        return error;
    });
}

module.exports.decrementInvestorData = function(amount, user) {
    var Investor = Parse.Object.extend("Investor");
    var invQuery = new Parse.Query(Investor);
    invQuery.equalTo("user", user);
    return invQuery.first().then(function(investor) {
        investor.set("investmentAmount", investor.get("investmentAmount") - amount );
        investor.set("investmentCount", investor.get("investmentCount") - 1 );
        return investor.save();
    }, function(error){
        response.error(error);
    });
}



