var _ = require('underscore');
var moment = require('./moment');

const OBJECT = "Object";


Parse.Cloud.define("timeline", function(request, response) {
    var Activity = Parse.Object.extend("Activity");
    var public = new Parse.Query(Activity);
    public.containedIn("verb", ["newOpportunity", "finish", "newManager"] );
    if (!_.isUndefined(request.params.userId)) {
        var user = new Parse.User();
        user.id = request.params.userId;
        var userActivity = new Parse.Query(Activity);
        var followingQuery = new Parse.Query(Parse.Object.extend("Follower"));
        followingQuery.equalTo("from", user);
        userActivity.matchesKeyInQuery("fromUser", "to", followingQuery);
        userActivity.containedIn("verb", ["invest", "follow"]);
        var subUserActivity = new Parse.Query(Activity);
        var managerDealsQuery = new Parse.Query(Parse.Object.extend("Deal"));
        managerDealsQuery.equalTo("manager", user);
        subUserActivity.matchesQuery("toDeal", managerDealsQuery);
        subUserActivity.equalTo("verb", "invest");
        userActivity.doesNotMatchKeyInQuery("objectId", "objectId", subUserActivity);

        var dealActivity = new Parse.Query(Activity);
        var dealInvestmentQuery = new Parse.Query(Parse.Object.extend("DealInvestment"));
        dealInvestmentQuery.equalTo("user", user);
        dealActivity.matchesKeyInQuery("fromDeal", "deal", dealInvestmentQuery);
        dealActivity.equalTo("verb", "update");

        var managerActivity = new Parse.Query(Activity);
        managerActivity.matchesQuery("toDeal", managerDealsQuery);
        managerActivity.containedIn("verb", ["investManager"]);

        var followUserActivity = new Parse.Query(Activity);
        followUserActivity.equalTo("verb", "followUser");
        followUserActivity.equalTo("toUser", user);

        var timeline = new Parse.Query.or(public, userActivity, dealActivity, managerActivity, followUserActivity);
    } else {
        var timeline = new Parse.Query.or(public);
    }


    timeline.include("toDeal");
    timeline.include("toDeal.files");
    timeline.include("toDeal.sector");
    timeline.include("toDeal.dealClass");
    timeline.include("toDeal.dealroom");
    timeline.include("toDeal.dealroom.files");
    timeline.include("toDeal.sponsor");
    timeline.include("toDeal.manager");
    timeline.include("toDeal.manager.manager");

    timeline.include("fromDeal");
    timeline.include("fromDeal.files");
    timeline.include("fromDeal.sector");
    timeline.include("fromDeal.dealClass");
    timeline.include("fromDeal.dealroom");
    timeline.include("fromDeal.dealroom.files");
    timeline.include("fromDeal.sponsor");
    timeline.include("fromDeal.manager");
    timeline.include("fromDeal.manager.manager");

    timeline.include("fromUser");
    timeline.include("fromUser.manager");
    timeline.include("toUser");
    timeline.include("toUser.manager");
    timeline.include("toUpdate");
    timeline.include("toUpdate.documents");
    timeline.include("toUpdate.files");
    timeline.descending("createdAt");
    timeline.skip(request.params.page * 20);
    timeline.limit(20);
    timeline.find().then(function (results) {
        var jresults = [];
        _.each(results, function (aResult) {
            var JSON = aResult.toJSON();
            JSON["__type"] = OBJECT;
            JSON["className"] = aResult.className;
            jresults.push(JSON);
        });
        console.log(jresults);
        response.success(jresults);
    }, function(error) {
        response.error(error);
    } );
});

Parse.Cloud.define("whatsnewImages", function(request, response) {
    var WhatsNew = Parse.Object.extend("WhatsNewImage");
    var query = new Parse.Query(WhatsNew);
    query.equalTo("order", request.params.order);
    query.first().then(function (result) {
        console.log(result);
        response.success(result);
    }, function(error) {
        response.error(error);
    } );
});

Parse.Cloud.define("activityInsertNewOpportunity", function(request, response) {
    var user = new Parse.User();
    user.id = request.params.userId;

    var Deal = Parse.Object.extend("Deal");
    var deal = new Deal();
    deal.id = request.params.dealId;
    return require("./activity.js").activityInsertNewOpportunity(deal, user).then(function (result) {
        require("./push.js").sendPushNewOpportunity(deal, result.id, result.get("verb")).then(function (result) {
            console.log("success");
            response.success(true);
        } );

    }, function(error){
        response.error(error);
    });
});

Parse.Cloud.define("activityInsertNewManager", function(request, response) {
    var user = new Parse.User();
    user.id = request.params.userId;


    return require("./activity.js").activityNewManager(user).then(function (result) {
        require("./push.js").sendPushNewManager(user, result.id, result.get("verb")).then(function (result) {
            console.log("success");
            response.success(true);
        } );

    }, function(error){
        response.error(error);
    });
});

module.exports.checkShouldInsertFundedActivity = function(deal, percent) {
    var pushCount = deal.get("pushCount") || 0;
    var shouldPush = false;
    if (percent >= 100 && pushCount < 4  ) {
        pushCount = 4;
        shouldPush = true;
    } else if (percent >= 75 && pushCount < 3  ) {
        pushCount = 3;
        shouldPush = true;
    } else if (percent >= 50 && pushCount < 2  ) {
        pushCount = 2;
        shouldPush = true;
    } else if (percent >= 25 && pushCount < 1 ) {
        pushCount = 1;
        shouldPush = true;
    }
    if (shouldPush) {
        deal.set("pushCount", pushCount);
        return deal.save().then( function(result){
            return Parse.Promise.as(true);
        });
    } else {
        return Parse.Promise.as(false);
    }
}

module.exports.activityInsertFollowUser = function(from, to) {
    return this.insertPublicActivity(from, undefined, 'followUser', to,  undefined, undefined);
}

module.exports.activityDeleteFollowUser = function(from, to) {
    return this.deleteActivity(from.id,'followUser', to.id);
}

module.exports.activityNewManager = function(manager) {
    return this.insertPublicActivity(manager, undefined, 'newManager', undefined,  undefined, undefined);
}

module.exports.activityInsertDealFollow = function(user, deal) {
    return this.insertPublicActivity(user, undefined, 'follow', undefined, deal, undefined);
}

module.exports.activityInsertUserInvested = function(user, deal, amount) {
    if (deal.get("statusId") == 0) {
        return this.insertPublicActivity(user, undefined, 'investManager', undefined,  deal, amount).then(function (result) {
            return require("./activity.js").insertPublicActivity(user, undefined, 'invest', undefined, deal, amount);
        });
    } else {
        return Parse.Promise.as({"id":"0"});
    }

}

module.exports.activityInsertDealFunded = function(deal, amount) {
    return this.checkShouldInsertFundedActivity(deal, amount * 100).then(function(result){
        if (result == true)
            return require("./activity.js").insertPublicActivity(undefined, deal, 'funded', undefined, undefined, amount);
        else
            return Parse.Promise.as(undefined);
    });
}

module.exports.activityInsertNewOpportunity = function(deal, user) {
    return this.insertPublicActivity(user, undefined, 'newOpportunity', undefined, deal, undefined);
}

module.exports.activityInsertDaysToFinish = function(deal, days) {
    return this.insertPublicActivity(undefined, deal, 'finish', undefined, undefined, days);
}

module.exports.activityDealUpdate = function(deal, update) {
    return this.insertActivity(deal.id, 'update', update.id, deal, undefined, undefined, undefined, update, undefined, undefined);
}

module.exports.insertPublicActivity = function(fromUser, fromDeal, verb, toUser, toDeal, dataNumber) {
    var from = undefined;
    var to = undefined;
    if (!_.isUndefined(fromUser))
        from = fromUser.id;
    if (!_.isUndefined(fromDeal))
        from = fromDeal.id;
    if (!_.isUndefined(toDeal))
        to = toDeal.id;
    if (!_.isUndefined(toUser))
        to = toUser.id;

    return this.insertActivity(from, verb, to, fromDeal, toDeal, fromUser, toUser, undefined, undefined, dataNumber);
}

module.exports.insertActivity = function(from, verb, to, fromDeal, toDeal, fromUser, toUser, toUpdate, data, dataNumber) {
    var Activity = Parse.Object.extend("Activity");
    var activity = new Activity();
    activity.set("from", from);
    activity.set("verb", verb);
    activity.set("to", to);
    activity.set("fromDeal", fromDeal);
    activity.set("toDeal", toDeal);
    activity.set("fromUser", fromUser);
    activity.set("toUser", toUser);
    activity.set("toUpdate", toUpdate);
    activity.set("data", data);
    activity.set("dataNumber", dataNumber);
    return activity.save();
}

module.exports.deleteActivity = function(from, verb, to) {
    var Activity = Parse.Object.extend("Activity");
    var activityQuery = new Parse.Query(Activity);
    activityQuery.equalTo("from", from);
    activityQuery.equalTo("verb", verb);
    activityQuery.equalTo("to", to)
    return activityQuery.first().then(function (result) {
        return result.destroy();
    });
}
