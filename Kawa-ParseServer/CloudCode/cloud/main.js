var dealModule = require("./deal.js");
var userModule = require("./user.js");
var investorModule = require("./investor.js");
var managerModule = require("./managerU.js");
var followerModule = require("./follower.js");
var utils = require("./utils.js");
var dealFollowerModule = require("./dealFollower.js");
var activityModule = require("./activity.js");
var push = require("./push.js");
var faqModule = require("./FAQ.js");
var transactionModule = require("./transaction.js");

//DEAL_INVESTMENT TRIGGERS BEGIN

Parse.Cloud.beforeSave("DealInvestment", function(request, response) {
	if (request.object.isNew()) {
		//dealModule.incrementFundedAmount(request.object.get("amount"), request.object.get("deal").id).then( function(result) {
		investorModule.incrementInvestorData(request.object.get("amount"), request.object.get("user") ).then( function(result) {
			response.success();
			//});
		}, function (error) {
			response.error(error);
		});
	} else {
		response.success();
	}
});


Parse.Cloud.afterDelete("DealInvestment", function(request, response) {
	//dealModule.decrementFundedAmount(request.object.get("amount"), request.object.get("deal").id);
	investorModule.decrementInvestorData(request.object.get("amount"), request.object.get("user"));
});

//DEAL_INVESTMENT TRIGGERS END

//FOLLOWER TRIGGERS BEGIN
Parse.Cloud.beforeSave("Follower", function(request, response) {
	if(request.object.isNew()){
		followerModule.applyRI(request.object).then(function(){
			response.success();
		}, function(error){
			response.error(error);
		});
	}
	else {
		response.success();
	}

});

Parse.Cloud.afterSave("Follower", function(request, response) {
	if(utils.isNew(request.object)) {
		followerModule.setFollowCount(true, request.object.get("from").id, request.object.get("to").id);
		activityModule.activityInsertFollowUser(request.object.get("from"), request.object.get("to"));
	}

});

Parse.Cloud.afterDelete("Follower", function(request, response) {
	followerModule.setFollowCount(false, request.object.get("from").id, request.object.get("to").id);
	activityModule.activityDeleteFollowUser(request.object.get("from"), request.object.get("to"));
});

//FOLLOWER TRIGGERS END

Parse.Cloud.beforeSave("Deal", function(request, response) {
	if (request.object.isNew()) {
		managerModule.incrementManagerData(request.object.get("manager")).then( function(result) {
			response.success();
		}, function (error) {
			response.error(error);
		});
	} else {
		response.success();
	}
});

Parse.Cloud.afterDelete("Deal", function(request, response) {
	managerModule.decrementManagerData(request.object.get("manager"));
});


//DEALFOllower TRIGGERS BEGIN
Parse.Cloud.beforeSave("DealFollower", function(request, response) {
	if(request.object.isNew()){
		dealFollowerModule.applyRI(request.object).then(function(){
			response.success();
		}, function(error){
			response.error(error);
		});
	}
	else {
		response.success();
	}

});

Parse.Cloud.afterSave("DealFollower", function(request, response) {
	if(utils.isNew(request.object)) {
		dealFollowerModule.setFollowerCount(true, request.object.get("deal").id);
		var generateActivity = request.object.get("activity") || true;
		if (generateActivity)
			activityModule.activityInsertDealFollow(request.object.get("user"), request.object.get("deal"))
	}

});

Parse.Cloud.afterDelete("DealFollower", function(request, response) {
	dealFollowerModule.setFollowerCount(false, request.object.get("deal").id);
	activityModule.deleteActivity(request.object.get("user").id, "follow",  request.object.get("deal").id).then(function (result) {
		console.log("deleted with success");
	}, function (error) {
		console.log(error);
	} );
});

Parse.Cloud.define("sendPushToAll", function(request, response) {
	push.sendPushNewOpportunity(request.params.message).then(function(result) {
	    console.log("message sent");
	    response.success(true);
	}, function(error){
		console.log(error);
	    response.error(error);
	});
});

//FOLLOWER TRIGGERS END