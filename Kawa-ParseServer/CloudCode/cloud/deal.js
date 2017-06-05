var _ = require('underscore');
var moment = require('./moment');
var activityModule = require("./activity.js");

const OBJECT = "Object";

Parse.Cloud.define("deals", function(request, response) {
	var Deal = Parse.Object.extend("Deal");
	var dealsResult = [];
	var deals = [];
	var statuses = ["fundraising", "invested", "unsuccessful", "returned"];
	var dealQuery = new Parse.Query(Deal);
	dealQuery.ascending("fundraisingEnd");
	if (!_.isUndefined(request.params.managerId)) {
		var manager = new Parse.User();
		manager.id = request.params.managerId;
		dealQuery.equalTo("manager", manager );
	}
	dealQuery.equalTo("statusId", 0);
	dealQuery.include("files");
	dealQuery.include("sector");
	dealQuery.include("dealClass");
	dealQuery.include("manager");
	dealQuery.include("sponsor");
	dealQuery.include("dealroom");
	dealQuery.include("dealroom.files");

	dealQuery.find().then(function(results) {
		_.each(results, function(deal) {
			jsonDeal = deal.toJSON();
			jsonDeal['__type'] = OBJECT;
			jsonDeal['className'] = deal.className;
			jsonDeal['status'] = statuses[jsonDeal.statusId];
			jsonDeal["youFollow"] = false;
			dealsResult.push(jsonDeal);
			deals.push(deal);
		});

		var subQuery = new Parse.Query(Deal);
		subQuery.ascending("statusId,-investmentDate");
		subQuery.containedIn("statusId", [1, 3]);
		if (!_.isUndefined(request.params.managerId)) {
			var manager = new Parse.User();
			manager.id = request.params.managerId;
			subQuery.equalTo("manager", manager );
		}
		subQuery.include("files");
		subQuery.include("sector");
		subQuery.include("dealClass");
		subQuery.include("manager");
		subQuery.include("sponsor");
		subQuery.include("dealroom");
		subQuery.include("dealroom.files");

		subQuery.find().then(function(subResults) {
			_.each(subResults, function (deal) {
				jsonDeal = deal.toJSON();
				jsonDeal['__type'] = OBJECT;
				jsonDeal['className'] = deal.className;
				jsonDeal['status'] = statuses[jsonDeal.statusId];
				jsonDeal["youFollow"] = false;
				dealsResult.push(jsonDeal);
				deals.push(deal);
			});
			if (_.isUndefined(request.params.userId) ) {
				console.log(dealsResult);
				response.success(dealsResult);
			} else {
				var user = new Parse.User();
				user.id = request.params.userId;
				var Follower = Parse.Object.extend("DealFollower");
				var followingQuery = new Parse.Query(Follower);
				followingQuery.equalTo("user", user);
				followingQuery.containedIn("deal", deals);
				followingQuery.find().then(function(followers){
					//setting people which user follows
					_.each(dealsResult, function(JSON) {
						for(var i = 0; i < followers.length; i++) {
							var follower = followers[i];
							if (follower.get("deal").id == JSON["objectId"]) {
								JSON["youFollow"] = true;
								break;
							}
						}
					});

					console.log(dealsResult);
					response.success(dealsResult);
				});
			}
		});
	}, function(error) {
		response.error(error);
	});
});

Parse.Cloud.define("dealUpdates", function(request, response) {
	var DealUpdate = Parse.Object.extend("DealUpdate");
	var dealQuery = new Parse.Query(DealUpdate);
	var Deal = Parse.Object.extend("Deal");
	var deal = new Deal();
	deal.id = request.params.dealId;
	dealQuery.equalTo("deal", deal);
	dealQuery.include("files");
	dealQuery.include("documents");
	dealQuery.include("documents.files");
	dealQuery.descending("createdAt");
	dealQuery.find().then( function(results) {
		console.log(results);
		response.success(results);
	}, function (error) {
		response.error(error);
	});
});

Parse.Cloud.define("dealInvestors", function(request, response){
	var DealInvestment = Parse.Object.extend("DealInvestment");
	var dealQuery = new Parse.Query(DealInvestment);
	var Deal = Parse.Object.extend("Deal");
	var deal = new Deal();
	deal.id = request.params.dealId;
	dealQuery.equalTo("deal", deal);
	dealQuery.include("user");
	dealQuery.include("user.investor");
	dealQuery.descending("amount");

	dealQuery.limit(1000);

	dealQuery.find().then( function(results) {
		if (_.isUndefined(request.params.userId)) {
			console.log(results);
			response.success(results);
		} else {
			var jresults = [];
			var userList = [];
			_.each(results, function (aResult) {
				var JSON = aResult.toJSON();
				JSON["__type"] = OBJECT;
				JSON["className"] = aResult.className;
				JSON["youFollow"] = false;
				jresults.push(JSON);
				userList.push(aResult.get("user"));
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
						console.log(JSON);
						if (follower.get("to").id == JSON.user.objectId) {
							JSON["youFollow"] = true;
							break;
						}
					}
				});

				console.log(jresults);
				response.success(jresults);
			});
		}
	}, function (error) {
		response.error(error);
	});
});

Parse.Cloud.define("dealFollowers", function(request, response){
	var DealFollower = Parse.Object.extend("DealFollower");
	var dealQuery = new Parse.Query(DealFollower);
	var Deal = Parse.Object.extend("Deal");
	var deal = new Deal();
	deal.id = request.params.dealId;
	dealQuery.equalTo("deal", deal);
	dealQuery.include("user");
	dealQuery.include("user.investor");
	dealQuery.include("user.manager");
	dealQuery.descending("createdAt");
	dealQuery.limit(1000);

	dealQuery.find().then( function(results) {
		if (_.isUndefined(request.params.userId)) {
			console.log(results);
			response.success(results);
		} else {
			var jresults = [];
			var userList = [];
			_.each(results, function(aResult) {
				var JSON = aResult.toJSON();
				JSON["__type"] = OBJECT;
				JSON["className"] = aResult.className;
				JSON["youFollow"] = false;
				jresults.push(JSON);
				userList.push(aResult.get("user"));
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
						if (follower.get("to").id == JSON.user.objectId) {
							JSON["youFollow"] = true;
							break;
						}
					}
				});

				console.log(jresults);
				response.success(jresults);
			});
		}
	}, function (error) {
		response.error(error);
	});
});


Parse.Cloud.define("showInterest", function(request, response) {
	var _apiKey = "key-03cd5e3f2ccbb69513de9ff918993d4c";
	var _domainName = "mg.clubkawa.com";
	var subject = request.params.userName + " is interested in a Deal!";
	var text =  request.params.userName + "(" + request.params.userId + ") is interested in " + request.params.deal + "(" + request.params.dealId + ").";
	Parse.Cloud.httpRequest({
		method: "POST",
		url: "https://api:" + _apiKey + "@api.mailgun.net/v3/" + _domainName + "/messages",
		body: {
			to: "lando@kawa.com, thomas.ddelgado@gmail.com, info@clubkawa.com",
			from: "Club Kawa <no-reply@mg.clubkawa.com>",
			subject: subject,
			text: "Hi Lando, \n" + text
		}
	}).then(function(httpResponse) {
		console.log(httpResponse);
		response.success(true);
	}, function(error) {
		response.error(error);
	});

});



Parse.Cloud.define("addInvestment", function(request, response) {
	require("./deal.js").addInvestment(request.params.userId, request.params.dealId, request.params.amount, undefined).then(function (result) {
		console.log(result);
		response.success(result);
	}, function (error) {
		console.log(error);
		response.error(error);
	});
});

module.exports.addInvestment = function(userId, dealId, amount, dealInvestment) {

	var Deal = Parse.Object.extend("Deal");
	var deal = new Deal();
	var DI = Parse.Object.extend("DealInvestment");
	var di = new DI();

	var user = new Parse.User();
	user.id = userId;
	deal.id = dealId;

	if (dealInvestment == undefined) {
		di.set("deal", deal);
		di.set("amount", amount);
		di.set("user", user);
	} else {
		di = dealInvestment;
		di.set("amount", di.get("amount") + amount);
	}


	var pushes = [];
	return di.save().then(function (object) {
		return deal.fetch().then(function (dealResult) {
			var funded =  deal.get("fundedAmount") / deal.get("size");
			return user.fetch().then(function (userResult) {
				return activityModule.activityInsertUserInvested(user, deal, amount).then(function (aUserResult) {
					pushes.push(require("./push.js").sendPushInvestDeal(deal, user, amount, aUserResult.id, "invest") );
					//return activityModule.activityInsertDealFunded(deal, funded).then( function( aFundedResult) {
						//if (!_.isUndefined(aFundedResult))
							//pushes.push(require("./push.js").sendPushDealFunded(deal, funded * 100, aFundedResult.id, "funded"));
					return require("./dealFollower.js").isFollowing(user, deal).then(function (followingResult) {
						if (followingResult == false) {
							return require("./dealFollower.js").follow(user, deal, false).then(function (followResult) {
								return Parse.Promise.when(pushes).then(function (pResult) {
									return Parse.Promise.as(true);
								});
							});
						} else {
							return Parse.Promise.when(pushes).then(function (pResult) {
								return Parse.Promise.as(true);
							});
						}
					});
					//});
				});
			});
		});
	});
}

Parse.Cloud.define("addUpdateActivity", function(request, response) {
	var DealUpdate = Parse.Object.extend("DealUpdate");
	var update = new DealUpdate();

	update.id = request.params.updateId;
	update.fetch().then(function(updateResult) {
		activityModule.activityDealUpdate(update.get("deal"), update).then(function(activityResult) {
			update.get("deal").fetch().then(function(updateResult) {
				require("./push.js").sendPushDealUpdate(update.get("deal"), update, activityResult.id, 'update').then(function(result){
					response.success(true);
				});
			});

		});
	}, function (error) {
		response.error(error);
	});

});


Parse.Cloud.define("updateStatus", function(request, status) {
	updateStatus(request, status)
});


function updateStatus(request, status) {
	var stringDate = new Date().toJSON().slice(0,10);
	var today =  moment(moment(stringDate).format('YYYY-MM-DD')).toDate();
	var count = 0;
	var Deal = Parse.Object.extend("Deal");
	var dealQuery = new Parse.Query(Deal);
	dealQuery.equalTo("statusId", 0);
	console.log(today);
	var pushes = [];
	dealQuery.each( function(deal) {
		var todayM = moment(today);
		var end = moment(deal.get("fundraisingEnd"));
		if (deal.get("fundraisingEnd") < today) {
			if (deal.get("fundedAmount") < deal.get("size")) {
				deal.set("statusId", 2);
				console.log("deal " + deal.get("name") + " updated to unsucessful.");
			} else {
				deal.set("statusId", 1);
				console.log("deal " + deal.get("name") + " updated to funded.");
			}
			count++;
			return deal.save();
		} else {
			var diff =  end.diff(todayM, "days");
			if ([5, 2, 1].indexOf(diff) > -1) {
				pushes.push(activityModule.activityInsertDaysToFinish(deal, diff).then(function (aResult) {
					return require("./push.js").sendPushDaysToFinish(deal, diff, aResult.id, aResult.get("verb")).then(function (pResult) {
						console.log("success");
					});
				}));
			}
		}
	}).then(function (results) {
		Parse.Promise.when(pushes).then(function () {
			status.success(count + " deal(s) were updated to unsuccessful.");
		});
	}, function (error) {
		status.error("Uh oh, something went wrong.");
	});
}

module.exports.incrementFundedAmount = function(amount, deal) {
	var Deal = Parse.Object.extend("Deal");
	var dealQuery = new Parse.Query(Deal);
	dealQuery.equalTo("objectId", deal);
	return dealQuery.first().then(function(deal) {
		var amountUpdated = deal.get("fundedAmount") || 0;
		var manager = deal.get("manager");
		amountUpdated = amountUpdated + amount;
		deal.set("fundedAmount", amountUpdated );
		return deal.save().then(function (result) {
			var Manager = Parse.Object.extend("Manager");
			var managerQuery = new Parse.Query(Manager);
			managerQuery.equalTo("user", manager);
			return managerQuery.first().then(function (managerR) {
					var raisedUpdated = managerR.get("amountRaised") || 0;
				raisedUpdated = raisedUpdated + amount;
				managerR.set("amountRaised", raisedUpdated);
				return managerR.save();
			});
		});
	}, function(error){
		return error;
	});
}

module.exports.decrementFundedAmount = function(amount, deal) {
	var Deal = Parse.Object.extend("Deal");
	var dealQuery = new Parse.Query(Deal);
	dealQuery.equalTo("objectId", deal);
	return dealQuery.first().then(function(deal) {
		deal.set("fundedAmount", deal.get("fundedAmount") - amount );
		var manager = deal.get("manager");
		return deal.save().then(function (result) {
			var Manager = Parse.Object.extend("Manager");
			var managerQuery = new Parse.Query(Manager);
			managerQuery.equalTo("user", manager);
			return managerQuery.first().then(function (managerR) {
				managerR.set("amountRaised", managerR.get("amountRaised") - amount);
				return managerR.save();
			});
		});
	}, function(error){
		response.error(error);
	});
}
