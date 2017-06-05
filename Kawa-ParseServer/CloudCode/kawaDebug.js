//test keys
//change these with your app keys

var appId = "oTg0mKgmbsi3PNzMVKuGWfT5MkjYI2ondI1yjFhS";
var javaScriptKey = "Am7hZSUFn3qPdNHE9Aezk5eAMfbbK0l8cnxskRB9";
var mkey = "3QHyd44yhzIVEBiU82RVapklFclGF3vXEv2esFq0";
//local module
global.Parse = require("./../parse-cloud-debugger").Parse;

//npm module
//global.Parse = require("parse-cloud-debugger").Parse;

//init parse modules


Parse.initialize(appId, javaScriptKey, mkey );
global.Parse.useMasterKey = true;

process.nextTick(function () {
   //run cloud code
   require('./cloud/main.js');

   //run a test job
   //Parse.Cloud.run("blockUser", {"email":"thomas.ddelgado@gmail.com"}, {});
   //Parse.Cloud.run("loadFollowers", {"page":0, "userId":"25qCkUb4jP", "profileUserId":"25qCkUb4jP", "isFollowers":true}, {});
   //Parse.Cloud.run("investments", {"userId":"1ieF5vhA2m", "viewerId":"RUakVbV4Iu"}, {});
   //   Parse.Cloud.run("deals", {"userId":"4434KUO389", "profileUserId":"g5cQmAOOm8", "page": 1}, {});
   //Parse.Cloud.run("testPush", {"userId":"XKEM4jq9Hm", "profileUserId":"g5cQmAOOm8", "page": 0}, {});
   //Parse.Cloud.run("loadFollowers", {"isFollowers": true, "page":0, "profileUserId":"Tk2n8JzPLe", "userId": "W8NUaXc7jI"}, {});
   //Parse.Cloud.run("deleteTransactionsFromUser", {"dealId": "aVsVb438FA", "userId": "z898odPdmR", "amount":5555}, {});
   //Parse.Cloud.run("activityInsertNewManager", {"dealId": "JylGP6F1i3", "userId": "sWmUlD8slD", "amount":5555}, {});
   //Parse.Cloud.run("dashboardInvestments", {"userId":"4l3VEH9Bqd", "dealId":"luJDkItrGt", "amount":500000}, {});

   //Parse.Cloud.run("filteredInvestments", {"investorId":"dTrrdeUr9L", "dealId":"luJDkItrGt", "amount":500000}, {});
   //Parse.Cloud.run("dashboardInvestments", {"userId":"uOmkMjOouD", "dealId":"luJDkItrGt", "amount":500000}, {});

   //Parse.Cloud.run("activityInsertNewManager", {"userId":"4434KUO389", "dealId":"GJkO8FBsYD", "amount":20000}, {});
   //Parse.Cloud.run("addUpdateActivity", {"updateId":"6Xb3ilU08q", "amount":2000}, {});
   //Parse.Cloud.run("transactionsToApprove", {"userId":"DBfuNaLrSt", "userType":"employee", "sort":1}, {});
   //Parse.Cloud.run("transactions", {"investorId":"DBfuNaLrSt", "page":0, "sort":1}, {});
   //
   //Parse.Cloud.run("approveTransactions",
//       {"userId":"9mh2cb5lyp", employee: false,  "transactions":
//           [{"amount":2444, "id":"fSVIYjjW5x", "approved":true},
//            {"amount":45555, "id":"yYGhQZIFFR", "date":"2016-11-30", "approved":true},
//              {"id":"1WYzHNpb2X", "date":"2016-11-05", "approved":false}
   //        ]
   //    }, {});

   //Parse.Cloud.runJob("importTransactionsJob", {"transactions":[{"email":"fabio.barboza@kobe.io", "dealId": "luJDkItrGt", "type":"test", "date":"12/31/2015", "amount":50450, "investingEntity": "Thomas Invest"},
   //       {"email":"fabio.barboza@kobe.io", "dealId": "luJDkItrGt", "type":"TransactionTest", "date":"12/31/2015", "amount":777, "InvestingEntity": "Thomas Invest"},
   //       {"email":"fabio.barboza@kobe.io", "dealId": "luJDkItrGt", "type":"TransactionTest", "date":"12/31/2015", "amount":377830, "InvestingEntity": "Thomas Invest"}
   //]}
   //    , {});



   Parse.Cloud.run("testPush", {"username":"thomas.ddelgado@gmail.com", "oldPassword":"Thomas123", "newPassword":"Thomas123", "repeatPassword":"Thomas123"}, {});
   //Parse.Cloud.run("testIntallation", {"username":"thomas.ddelgado@gmail.com", "oldPassword":"Thomas123", "newPassword":"Thomas123", "repeatPassword":"Thomas123"}, {});

   //Parse.Cloud.run("isFollowing", {"fromId":"RUakVbV4Iu", "toId":"W8NUaXc7jI", "amount":200000}, {});
   //Parse.Cloud.run("changePassword", {"username": "steve@apple.com", "password": "123", "oldPassword": "1234"}, {});
   //Parse.Cloud.runJob("updateStatus", {"message": "testing push"}, {});
});
