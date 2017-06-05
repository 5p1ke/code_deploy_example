var utils = require("./utils.js");
var _ = require('underscore');

const TYPE = "Object";

Parse.Cloud.define("loadFollowers", function(request, response) {
	var Follower = Parse.Object.extend("Follower");
	var profileUserQuery = new Parse.Query(Follower);
	var user = new Parse.User();
	var profileUser = new Parse.User();

	// request params	
	var page = request.params.page;
	var loadKey = "";
	var compareKey = "";
	profileUser.id = request.params.profileUserId;
	if(request.params.isFollowers){
		loadKey = "from";
		compareKey = "to";
	}
	else {
		loadKey = "to";
		compareKey = "from";
	}

	// building query
	profileUserQuery.equalTo(compareKey, profileUser);
	profileUserQuery.include(loadKey);
	profileUserQuery.include(loadKey + ".manager");
	profileUserQuery.include(loadKey + ".investor");
	profileUserQuery.descending("createdAt");
	profileUserQuery.limit(1000);
	//profileUserQuery.skip(page * 20);

	profileUserQuery.find().then(function(followers){				
		var userList = new Array(followers.length);
		var jsonList = new Array(followers.length);
		for(var f in followers){									
			var followUser = followers[f].get(loadKey)
			var json = followUser.toJSON();
			userList[f] = followUser;
			
			json["className"] = followUser.className; 
			json["__type"] = TYPE;
			json["youFollow"] = false;
			jsonList[f] = json;
		}

		if ( _.isUndefined(request.params.userId) ) {
			var userQuery = new Parse.Query(Parse.User);
			userQuery.equalTo("objectId", profileUser.id);
			userQuery.select("followerCount", "followingCount");
			userQuery.first().then( function(count) {
				if (!_.isUndefined(count)) {
					jsonList.push(count.toJSON());
				}
				console.log(jsonList);
				response.success(jsonList);
			});
		} else {
			user.id = request.params.userId;
			var followToQuery = new Parse.Query(Follower);
			followToQuery.equalTo("from", user);
			followToQuery.containedIn("to", userList);
			followToQuery.include("to");
			followToQuery.descending("createdAt");
			followToQuery.find().then(function(followersTo){
				var resultList = new Array(followers.length);
				for(var x in followersTo){
					for(var y in userList){
						var userY = userList[y];
						var follower = followersTo[x];
						if(follower.get("to").id === userY.id){
							var json = jsonList[y];
							json["youFollow"] = true;
							jsonList[y] = json;
							break;
						}
					}
				}
				var userQuery = new Parse.Query(Parse.User);
				userQuery.equalTo("objectId", profileUser.id);
				userQuery.select("followerCount", "followingCount");
				userQuery.first().then( function(count) {
					if (!_.isUndefined(count)) {
						jsonList.push(count.toJSON());
					}
					console.log(jsonList);
					response.success(jsonList);
				});
			});
		}
	}, function(error) {
	   	response.error(error);
	});

});

module.exports.applyRI = function(follower){
	var Follower = Parse.Object.extend("Follower");
	var followerQuery = new Parse.Query(Follower);

	var from = follower.get('from');
	var to = follower.get('to');

	followerQuery.equalTo("from", from);
	followerQuery.equalTo("to", to);
		
	return followerQuery.count().then(function(count){
		if(count > 0) {
        	throw new Error("Follower already exists");
    	}
    	else {
        	return true;
    	}
	});
};

module.exports.setFollowCount = function(follow, fromId, toId){
	Parse.Cloud.useMasterKey();
	
    var toQuery = new Parse.Query(Parse.User);
    var fromQuery = new Parse.Query(Parse.User);   

	return Parse.Promise.when([fromQuery.get(fromId), toQuery.get(toId)]).then(function(from, to){		
		if(follow){
			from.increment('followingCount');
			to.increment('followerCount');
		}
		else {
			from.increment('followingCount', -1);
			to.increment('followerCount', -1);
		}

		return Parse.Promise.when([from.save(), to.save()]);
	});

};

Parse.Cloud.define("isFollowing", function(request, response) {
	var from = new Parse.User();
	var to = new Parse.User();
	from.id = request.params.fromId;
	to.id = request.params.toId;

	require("./follower.js").isFollowing(from, to).then( function(result){
		response.success(result);
	}, function(error) {
		response.error(error);
	} );
});

module.exports.isFollowing = function(from, to){
	var Follower = Parse.Object.extend("Follower");
	var followerQuery = new Parse.Query(Follower);
	followerQuery.equalTo("from", from);
	followerQuery.equalTo("to", to);

	return followerQuery.find().then(function(results){
		if(results.length > 0) {
			return Parse.Promise.as(true);
		} else {
			return Parse.Promise.as(false);
		}
	});
};
