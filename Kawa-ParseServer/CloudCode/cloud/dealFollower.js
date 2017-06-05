var utils = require("./utils.js");
var _ = require('underscore');


module.exports.follow = function(user, deal, generateActivity){
    var Follower = Parse.Object.extend("DealFollower");
    var follower = new Follower();
    follower.set("user", user);
    follower.set("deal", deal);
    follower.set("activity", generateActivity);
    return follower.save();
};

Parse.Cloud.define("isDealFollowing", function(request, response) {
    var Deal = Parse.Object.extend("Deal");
    var deal = new Deal();
    var user = new Parse.User();
    user.id = request.params.userId;
    deal.id = request.params.dealId;

    require("./dealFollower.js").isFollowing(user, deal).then( function(result){
        response.success(result);
    }, function(error) {
        response.error(error);
    } );
});

Parse.Cloud.define("hadInvested", function(request, response) {
    var Deal = Parse.Object.extend("Deal");
    var deal = new Deal();
    var user = new Parse.User();
    user.id = request.params.userId;
    deal.id = request.params.dealId;

    require("./dealFollower.js").hadInvested(user, deal).then( function(result){
        response.success(result);
    }, function(error) {
        response.error(error);
    } );
});

module.exports.isFollowing = function(user, deal){
    var Follower = Parse.Object.extend("DealFollower");
    var followerQuery = new Parse.Query(Follower);
    followerQuery.equalTo("user", user);
    followerQuery.equalTo("deal", deal);

    return followerQuery.find().then(function(results){
        if(results.length > 0) {
            return Parse.Promise.as(true);
        } else {
            return Parse.Promise.as(false);
        }
    });
};

module.exports.hadInvested = function(user, deal){
    var Follower = Parse.Object.extend("DealInvestment");
    var investmentQuery = new Parse.Query(Follower);
    investmentQuery.equalTo("user", user);
    investmentQuery.equalTo("deal", deal);

    return investmentQuery.find().then(function(results){
        if(results.length > 0) {
            return Parse.Promise.as(true);
        } else {
            return Parse.Promise.as(false);
        }
    });
};


module.exports.applyRI = function(follower){
    var Follower = Parse.Object.extend("DealFollower");
    var followerQuery = new Parse.Query(Follower);
    followerQuery.equalTo("user", follower.get('user'));
    followerQuery.equalTo("deal", follower.get('deal'));

    return followerQuery.count().then(function(count){
        if(count > 0) {
            throw new Error("Follower already exists");
        } else {
            return true;
        }
    });
};

module.exports.setFollowerCount = function(increment, deal){
    var Deal = Parse.Object.extend("Deal");
    var dealQuery = new Parse.Query(Deal);
    dealQuery.equalTo("objectId", deal);
    console.log("deal ->" + deal);
    return dealQuery.first().then(function (dealObj) {
        console.log("before ->" + dealObj.get("followersCount") );
        var count = dealObj.get("followersCount") || 0;
        if (increment)
            count = count + 1;
        else
            count = count - 1;
        console.log("dealcount ->" + count);
        dealObj.set("followersCount", count);
        return dealObj.save();
    });
};
