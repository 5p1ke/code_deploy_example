var _ = require('underscore');
var moment = require('./moment');


const OBJECT = "Object";


Parse.Cloud.define("testPush", function(request, response) {

    require("./push.js").sendPushToAll("Introducing new opportunity: Dallas Lofts", "222", "newOpportunity");
});

Parse.Cloud.define("updateInstallations", function(request, response) {
    Parse.Cloud.useMasterKey();
    var query = new Parse.Query(Parse.Installation);
    var user = new Parse.User();
    user.id = request.params.userId;

    query.equalTo('user', user);
    query.each(function (installation) {
        installation.set("newOpportunity", request.params.newOpportunity);
        installation.set("finish", request.params.finish);
        installation.set("funded", request.params.funded);
        installation.set("update", request.params.update);
        installation.set("newManager", request.params.newManager);
        installation.set("invest", request.params.invest);
        installation.set("investManager", request.params.investManager);
        return installation.save();
    }).then(function (results) {
        response.success(true);
    }, function (error) {
        response.error(error);
        console.log(error);
    });
});


Parse.Cloud.define("getInstallation", function(request, response) {
    Parse.Cloud.useMasterKey();
    var query = new Parse.Query(Parse.Installation);
    var user = new Parse.User();
    user.id = request.params.userId;

    query.equalTo('user', user);
    query.first().then(function (result) {
        var installation = {};
        if (_.isUndefined(result))  {
            response.success({})
        } else {
            installation.newOpportunity = result.get("newOpportunity");
            installation.finish = result.get("finish");
            installation.funded = result.get("funded");
            installation.update = result.get("update");
            installation.newManager = result.get("newManager");
            installation.invest = result.get("invest");
            installation.investManager = result.get("investManager");
            response.success(installation);
        }
    }, function (error) {
        response.error(error);
        console.log(error);
    });
});


module.exports.sendPushNewTransaction = function(dealInvestment, user, activityId, verb) {
    var deal = dealInvestment.get("deal");
    deal.fetch(function (dealResult) {
        var query = new Parse.Query(Parse.Installation);
        query.equalTo('user', user);
        var message = deal.get("name") + " just posted a new transaction. Check out your dashboard.";
        return require("./push.js").sendPushTo(query, message, activityId, verb);
    });
}


module.exports.sendPushDealUpdate = function(deal, update, activityId, verb) {
    var DealInvestment = Parse.Object.extend("DealInvestment");
    var dealInvestmentQuery = new Parse.Query(DealInvestment);
    dealInvestmentQuery.equalTo("deal", deal);

    var query = new Parse.Query(Parse.Installation);
    query.matchesKeyInQuery('user', 'user', dealInvestmentQuery);
    var message = deal.get("name") + " posted an update: " + update.get("updateTitle");
    return require("./push.js").sendPushTo(query, message, activityId, verb);
}


module.exports.sendPushNewManager = function(manager, activityId, verb) {
    return manager.fetch().then(function (result) {
        var message = "Introducing new manager: " + manager.get("name");
        return require("./push.js").sendPushToAll(message, activityId, verb);
    });
}

module.exports.sendPushInvestDeal = function(deal, user, amount , activityId, verb) {
    var Follower = Parse.Object.extend("Follower");
    var followerQuery = new Parse.Query(Follower);
    followerQuery.equalTo("to", user);

    var query = new Parse.Query(Parse.Installation);
    query.matchesKeyInQuery('user', 'from', followerQuery);
    query.notEqualTo('user', deal.get("manager"));

    var message = user.get("name") + " just invested in " + deal.get("name") + ".";
    if(deal.get("statusId") == 0) {
        return require("./push.js").sendPushTo(query, message, activityId, verb).then( function( pushResult ) {
            message = message + " Total raised so far is $"+ require("./utils.js").nFormatter(deal.get("fundedAmount"))  +" of $"+ require("./utils.js").nFormatter(deal.get("size")) + " goal.";
            var queryManager = new Parse.Query(Parse.Installation);
            queryManager.equalTo('user', deal.get("manager"));
            return require("./push.js").sendPushTo(queryManager, message, activityId, verb);
        });
    } else {
        message = message + " Total raised so far is $"+ require("./utils.js").nFormatter(deal.get("fundedAmount"))  +" of $"+ require("./utils.js").nFormatter(deal.get("size")) + " goal.";
        var queryManager = new Parse.Query(Parse.Installation);
        queryManager.equalTo('user', deal.get("manager"));
        return require("./push.js").sendPushTo(queryManager, message, activityId, verb);
    }
}

module.exports.sendPushDaysToFinish = function(deal, days , activityId, verb) {
    var Follower = Parse.Object.extend("DealFollower");
    var followerQuery = new Parse.Query(Follower);
    followerQuery.equalTo("deal", deal);

    var query = new Parse.Query(Parse.Installation);
    query.matchesKeyInQuery('user', 'user', followerQuery);
    if (days != 0) {
        if (days == 1)
            var message = "Only " + days + " day left to funding close for " + deal.get("name");
        else
            var message = "Only " + days + " day(s) left to funding close for " + deal.get("name");
    } else {
        var message = "Funding closes today for " + deal.get("name");
    }
    return require("./push.js").sendPushTo(query, message, activityId, verb);
}

module.exports.sendPushDealFunded = function(deal, percent , activityId, verb) {
    var message = "";
    if (percent < 100 ) {
        message = deal.get("name") + " reached " + percent.toFixed(0) + "% of $" + require("./utils.js").nFormatter(deal.get("size")) +   " funding goal."
    } else {
        message = deal.get("name") + " fully funded!";
    }
    var Follower = Parse.Object.extend("DealFollower");
    var followerQuery = new Parse.Query(Follower);
    followerQuery.equalTo("deal", deal);

    var query = new Parse.Query(Parse.Installation);
    query.matchesKeyInQuery('user', 'user', followerQuery);
    return require("./push.js").sendPushTo(query, message, activityId, verb);
}

module.exports.sendPushNewOpportunity = function(deal, activityId, verb) {
    return deal.fetch().then(function (result) {
        var message = "Introducing new opportunity: " + deal.get("name");
        return require("./push.js").sendPushToAll(message, activityId, verb);
    });
}

module.exports.sendPushTo = function(query, message, activityId, verb) {
    console.log(message);
    query.equalTo(verb, true);
    return Parse.Push.send({
        where: query, // Set our Installation query
        data: { alert: message, activityId: activityId, verb : verb }
    });
}


module.exports.sendPushToAll = function(message, activityId, verb) {
    console.log(message);
    var query = new Parse.Query(Parse.Installation);
    query.equalTo(verb, true);
    return Parse.Push.send({
        where: query, // Set our Installation query
        data: { alert: message, activityId: activityId, verb : verb }, useMasterKey: true
    });
}


