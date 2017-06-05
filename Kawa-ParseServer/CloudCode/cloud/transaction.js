/**
 * Created by Thomas on 5/16/16.
 */
var _ = require('underscore');
var moment = require('./moment');

const OBJECT = "Object";

const SUBSCRIPTION = "Subscription"
const ACCRUED_INTEREST_BALANCE = "Interest Accrued to Principal Balance";
const ACCRUED_INTEREST = "Accrued Interest";
const LOAN_PAYABLE = "Loan Payable";
const MARK_PROFITS = "Mark to Market Profits";
const NET_CURRENT = "Net Current Assets";
const PROFIT_LOSS = "Profit & Loss";
const REDEMPTION = "Redemption";
const REQUIRED_TAX = "Required Tax Withholding";
const RETURN_PRINCIPAL = "Return of Principal";
const DISTRIBUTIONS_PAYABLE = "Distributions Payable";
const INTEREST_DIVIDEND = "Interest/Dividend";
const PROFITS = "Profits";

const ESTIMATED = "Estimated Future Tax Withholding";



const currentValueTypes = [REDEMPTION, SUBSCRIPTION, RETURN_PRINCIPAL, ACCRUED_INTEREST, ACCRUED_INTEREST_BALANCE, LOAN_PAYABLE,
                             MARK_PROFITS, NET_CURRENT, PROFIT_LOSS, REQUIRED_TAX,
                                DISTRIBUTIONS_PAYABLE, REQUIRED_TAX];
const distributionTypes = [INTEREST_DIVIDEND, REDEMPTION, RETURN_PRINCIPAL, PROFITS];

const visibleTransactions = [SUBSCRIPTION, REDEMPTION, RETURN_PRINCIPAL, INTEREST_DIVIDEND, PROFITS];
const visiblePositions = [SUBSCRIPTION, REDEMPTION, RETURN_PRINCIPAL, INTEREST_DIVIDEND, ACCRUED_INTEREST_BALANCE, REQUIRED_TAX, PROFITS];

Parse.Cloud.define("transactions", function(request, response) {
    var Transaction = Parse.Object.extend("Transaction");
    var query = new Parse.Query(Transaction);
    if (!_.isUndefined(request.params.userId) ) {
        var user = new Parse.User();
        user.id = request.params.userId;
        query.equalTo("investor", user);
        query.skip(request.params.page * 20);
        query.limit(20);
    } else {
        var DealInvestment = Parse.Object.extend("DealInvestment");
        var dealInvestment = new DealInvestment();
        dealInvestment.id = request.params.dealInvestmentId;
        query.equalTo("dealInvestment", dealInvestment);
        query.skip(request.params.page * 1000);
        query.limit(1000);
    }
    query.equalTo("stage", 3);
    query.include("dealInvestment.deal");
    query.descending("date");
    query.find().then(function(results){
        var jsons = [];
        _.each(results, function(transaction) {
            jsonDeal = transaction.toJSON();
            jsonDeal["__type"] = OBJECT;
            jsonDeal["className"] = transaction.className;
            if (visibleTransactions.indexOf(transaction.get("type")) > -1 )
                jsons.push(jsonDeal);
        });
        console.log(jsons);
        response.success(jsons);
    }, function(error){
        response.error(error);
    } );
});


Parse.Cloud.define("dashboardInvestments", function(request, response){
    var DealInvestment = Parse.Object.extend("DealInvestment");
    var dealQuery = new Parse.Query(DealInvestment);
    var user = new Parse.User();
    user.id = request.params.userId;

    dealQuery.equalTo("user", user);
    dealQuery.include("deal");
    dealQuery.include("deal.dealClass");
    dealQuery.include("deal.sector");
    dealQuery.include("deal.dealroom");
    dealQuery.include("deal.dealroom.files");

    dealQuery.find().then( function(results) {
        var jsons = [];
        var promises = [];
        _.each(results, function(aResult) {
            var JSON = aResult.toJSON();
            JSON["__type"] = OBJECT;
            JSON["className"] = aResult.className;
            promises.push( require('./transaction.js').calculateCurrentValue(aResult).then( function(data){
                JSON["currentValue"] = data.currentValue;
                JSON["lastUpdate"] = data.lastUpdate;
                if (data.lastUpdate == undefined)
                    return Parse.Promise.as(true);
                return require('./transaction.js').calculateDistributions(aResult).then( function(distribution) {
                    JSON["distribution"] = distribution;
                    return jsons.push(JSON);
                });
            }) );
        });
        Parse.Promise.when(promises).then(function (pResult) {
            console.log(jsons);
            response.success(jsons);
        });
    }, function(error){
        response.error(error);
    } );
});


Parse.Cloud.define("investmentsSummary", function(request, response){
    var Transaction = Parse.Object.extend("Transaction");
    var query = new Parse.Query(Transaction);
    var user = new Parse.User();
    user.id = request.params.userId;
    query.equalTo("investor", user);
    query.notEqualTo("type", ESTIMATED);
    query.equalTo("stage", 3);
    var currentValue = 0;
    var distribution = 0;
    var investments = 0;
    var lastUpdate = undefined;
    return query.each( function(transaction) {
        if (_.isUndefined(lastUpdate))
            lastUpdate = transaction.get("date");
        if (lastUpdate < transaction.get("date"))
            lastUpdate = transaction.get("date");
        if (transaction.get("type") == SUBSCRIPTION) {
            investments = investments + transaction.get("amount");
            currentValue = currentValue + transaction.get("amount");
        } else {
            if (currentValueTypes.indexOf(transaction.get("type")) > -1 ) {
                currentValue = currentValue + transaction.get("amount");
            }
            if (distributionTypes.indexOf(transaction.get("type")) > -1 ) {
                distribution = distribution + ( transaction.get("amount") * -1 );
            }
        }
    }).then(function(results) {
        console.log({"investments":investments, "currentValue":currentValue, "distribution":distribution, "lastUpdate":lastUpdate});
        return response.success({"investments":investments, "currentValue":currentValue, "distribution":distribution, "lastUpdate":lastUpdate});
    }, function(error){
        return response.error(f);
    });
});

Parse.Cloud.define("filteredInvestments", function(request, response){
    var Transaction = Parse.Object.extend("Transaction");
    var query = new Parse.Query(Transaction);
    var user = new Parse.User();
    if (!_.isUndefined(request.params.investorId) ) {
        user.id = request.params.investorId;
        query.equalTo("investor", user);
    } else {
        user.id = request.params.managerId;
        query.equalTo("manager", user);
    }
    query.equalTo("stage", 3);
    query.containedIn("type", currentValueTypes);
    query.include("dealInvestment.deal.sector");
    query.include("dealInvestment.deal.dealClass");
    var bySector = {};
    var byClass = {};
    var lastUpdate = undefined;
    return query.each( function(transaction) {
        if (_.isUndefined(lastUpdate))
            lastUpdate = transaction.get("date");
        if (lastUpdate < transaction.get("date"))
            lastUpdate = transaction.get("date");
        sectorKey = transaction.get("dealInvestment").get("deal").get("sector").get("sector");
        console.log(transaction.get("dealInvestment").get("deal").id);
        classKey = transaction.get("dealInvestment").get("deal").get("dealClass").get("subClass");
        if (_.isUndefined(bySector[sectorKey])) {
            bySector[sectorKey] = 0;
        }
        if (_.isUndefined(byClass[classKey])) {
            byClass[classKey] = 0;
        }
        byClass[classKey] = byClass[classKey] + transaction.get("amount");
        bySector[sectorKey] = bySector[sectorKey] + transaction.get("amount") ;
    }).then(function(results) {
        console.log({"bySector":bySector, "byClass":byClass, "lastUpdate":lastUpdate});
        return response.success({"bySector":bySector, "byClass":byClass, "lastUpdate":lastUpdate});
    }, function(error){
        return response.error(f);
    });
});

module.exports.calculateCurrentValue = function(dealInvestment) {
    var Transaction = Parse.Object.extend("Transaction");
    var query = new Parse.Query(    Transaction);
    query.equalTo("dealInvestment", dealInvestment);
    query.equalTo("stage", 3);
    var currentValue = 0;
    var lastUpdate = undefined;
    return query.each( function(transaction) {
        if (_.isUndefined(lastUpdate))
            lastUpdate = transaction.get("date");
        if (lastUpdate < transaction.get("date"))
            lastUpdate = transaction.get("date");
        if (currentValueTypes.indexOf(transaction.get("type")) > -1 )
            currentValue = currentValue + transaction.get("amount") ;
    }).then(function(results) {
        return Parse.Promise.as({"currentValue":currentValue, "lastUpdate":lastUpdate });
    }, function(error){
        return Parse.Promise.as(false);
    });
}

module.exports.calculateDistributions = function(dealInvestment) {
    var Transaction = Parse.Object.extend("Transaction");
    var query = new Parse.Query(    Transaction);
    query.equalTo("dealInvestment", dealInvestment);
    query.equalTo("stage", 3);
    query.containedIn("type", distributionTypes);
    var distribution = 0;
    return query.each( function(transaction) {
        distribution = distribution + ( transaction.get("amount") * -1 );
    }).then(function(results) {
        return Parse.Promise.as(distribution);
    }, function(error){
        return Parse.Promise.as(false);
    });
}


//MANAGER FUNCTIONS

Parse.Cloud.define("transactionsToApprove", function(request, response){
    var Transaction = Parse.Object.extend("Transaction");
    var query = new Parse.Query(Transaction);
    query.include("investor");
        query.include("dealInvestment.deal");
    query.include("transactionsLog");
    if (request.params.userType == 'employee' ) {
        query.equalTo("stage", 1);
    } else {
        query.equalTo("stage", 2);
    }
    var users = {};
    return query.each( function(transaction) {
        key = transaction.get("investor").id;
        if (_.isUndefined(users[key])) {
            users[key] = {"user":transaction.get("investor"), "transactions":[]};
        }
        users[key].transactions.push(transaction);
    }).then(function(results) {
        console.log(users);
        return response.success(users);
    }, function(error){
        return response.error(f);
    });
});


Parse.Cloud.define("approveTransactions", function(request, response){
    var Transaction = Parse.Object.extend("Transaction");
    var TransactionLog = Parse.Object.extend("TransactionLog");
    var employee = request.params.employee;
    var transactions = request.params.transactions;
    var rollbacks = [];
    var promises = [];
    var reproved = [];
    var pushes = [];
    _.each(transactions, function(transaction) {
        var updatedTransaction = new Transaction();
        updatedTransaction.id = transaction.id;
        promises.push( updatedTransaction.fetch().then(function (fetchResult) {
            user = new Parse.User();
            user.id = request.params.userId;
            var transactionLog = undefined;
            if (employee) {
                transactionLog = new TransactionLog();
                transactionLog.set("auditedBy", user);
                transactionLog.set("amount", transaction.amount);
                if (!_.isUndefined(transaction.amount)) {
                    transactionLog.set("amount", updatedTransaction.get("amount"));
                    updatedTransaction.set("amount", transaction.amount );
                }
                if (!_.isUndefined(transaction.date)) {
                    transactionLog.set("date", updatedTransaction.get("date"));
                    updatedTransaction.set("date", toDate(transaction.date));
                }
                updatedTransaction.add("transactionsLog", transactionLog);
                updatedTransaction.set("stage", 2);
            } else {
                updatedTransaction.set("stage", 3);
            }

            updatedTransaction.set("approved", transaction.approved);
            return updatedTransaction.save().then(function (result) {
                console.log(updatedTransaction.id);
                if (!employee) {
                    if (updatedTransaction.get("approved")) {
                        pushes.push( require('./push.js').sendPushNewTransaction(transaction.get("dealInvestment"), transaction.get("investor"), 0, "transaction"));
                    } else {
                        reproved.push( updatedTransaction.destroy());
                    }
                }
                return rollbacks.push({"transaction":updatedTransaction, "log":transactionLog});
            });
        }) );
    });
    Parse.Promise.when(promises).then(function (pResult) {
        Parse.Promise.when(reproved).then(function (rResult) {
            if (!employee) {
                Parse.Promise.when(pushes).then(function (pushesResult) {
                    console.log(true);
                    response.success(true);
                });
            }
            console.log(true);
            response.success(true);
        });
    }, function(error){
        console.error(error);
        console.log(rollbacks);
        var removes = [];
        _.each(rollbacks, function(rollback) {
            transaction = rollback.transaction;
            log = rollback.log;
            if (employee) {
                if (!_.isUndefined(log.get("amount"))) {
                    transaction.set("amount", log.get("amount"));
                }
                if (!_.isUndefined(log.get("date"))) {
                    transaction.set("date", log.get("date"));
                }
                transaction.remove("transactionsLog", log);
                transaction.set("stage", 1);
            } else {
                transaction.set("stage", 2);
            }

            removes.push( transaction.save().then( function(result) {
                if (employee) {
                    return log.destroy();
                } else {
                    return Parse.Promise.as(true);
                }
            }));
        });
        Parse.Promise.when(removes).then(function (pResult) {
            console.log("rollback successfuly");
            response.success(false);
        }, function(error){
            console.log(error);
            return response.error(error);
        });
    });
});

Parse.Cloud.define("rejectTransactions", function(request, response) {
    var Transaction = Parse.Object.extend("Transaction");
    var transactions = request.params.transactions;
    var promises = [];
    _.each(transactions, function(transaction) {
        var tr = new Transaction();
        tr.id = transaction.id;
        promises.push(
            tr.fetch().then(function (fetchResult) {
                tr.set("stage", 2);
                return tr.save();
            })
        );
    });

    Parse.Promise.when(promises).then(function (pResult) {
        console.log(true);
        response.success(true);
    }, function(error) {
        console.error(error);
        response.error(error);
    });

});

function toDate(dateStr) {
    var parts = dateStr.split("-");
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function toDateSlash(dateStr) {
    var parts = dateStr.split("/");
    return new Date(parts[2], parts[0] - 1, parts[1]);
}

Parse.Cloud.define("deleteTransactionsFromUser", function(request, response){
    var Transaction = Parse.Object.extend("Transaction");
    var user = new Parse.User();
    user.id = request.params.userId;
    var transactionQuery = new Parse.Query(Transaction);
    transactionQuery.equalTo("investor", user);
    transactionQuery.each(function(transaction){
        return transaction.destroy();
    }).then(function(results){
        console.log(true);
        response.success(true);
    }, function(error) {
        console.log(error);
        response.error(error);
    });
});

Parse.Cloud.define("importTransactions", function(request, response){
    Parse.Cloud.httpRequest({
        method: "POST",
        url: "https://api.parse.com/1/jobs/importTransactionsJob",
        headers: {
            "X-Parse-Application-Id": "qAx8QRX09cKxy8q2gHCuc3B0NPZXtWTkNamo8N9v",
            "X-Parse-Master-Key": "SEGEVrVraDOluyXNn881H46zNI9ORv6Lh0WMtCUs",
            "Content-Type": "application/json"
        },
        body: {
            "transactions":request.params.transactions
        },
        success: function(httpResponse) {
            console.log(httpResponse);
            response.success(httpResponse);
        },
        error: function(error) {
            console.log(error);
            response.error(error);
        }
    });
});

//import
Parse.Cloud.define("importTransactionsJob", function(request, status){
    var Transaction = Parse.Object.extend("Transaction");
    var Deal = Parse.Object.extend("Deal");
    var imported = 0;
    var transactions = request.params.transactions;
    var promise = Parse.Promise.as();
    _.each(transactions, function(transaction) {
        // 1 - find user
        var query = new Parse.Query(Parse.User);
        query.equalTo("email", transaction.email);
        promise = promise.then(function() {
            return query.first().then(function (user) {
                //2 - find deal
                var dealQuery = new Parse.Query(Deal);
                dealQuery.equalTo("objectId", transaction.dealId);
                return dealQuery.first().then(function (deal) {
                    console.log(user);
                    console.log(deal);
                    //3 - find dealInvestment
                    if (transaction.type == SUBSCRIPTION) {
                        //add investment
                        return findDealInvestment(user, deal).then(function(dealInvestmentResult){
                            return require("./deal.js").addInvestment(user.id, deal.id, transaction.amount, dealInvestmentResult).then(function (result) {
                                console.log(result);
                                return addTransaction(deal, user, transaction).then(function(){
                                    imported++;
                                    return Parse.Promise.as(true);
                                } );
                            });
                        });
                    } else {
                        return addTransaction(deal, user, transaction).then(function(){
                            imported++;
                            return Parse.Promise.as(true);
                        });
                    }
                });
            }, function (error) {
                console.log(error);
                response.error(error);
            });
        });
    });

    promise.then(function (result) {
        console.log("success " + imported);
        console.log({"success":true, "result":"Transactions imported successfuly."});
        status.success(imported + " Transactions imported successfuly.");
    }, function (error) {
        console.log({"success":false, "result":"Transactions imported successfuly."});
        console.log({"success":false, "imported": imported, "result":"Only " + imported+  " transactions were."});
        status.error({"success":false, "imported": imported, "result":"Only " + imported+  " transactions were imported.", "error":error });
    });
});

function findDealInvestment(user, deal) {
    var Deal = Parse.Object.extend("Deal");
    var DealInvestment = Parse.Object.extend("DealInvestment");

    var dealInvestmentQuery = new Parse.Query(DealInvestment);
    dealInvestmentQuery.equalTo("deal", deal);
    dealInvestmentQuery.equalTo("user", user);
    return dealInvestmentQuery.first().then(function (dealInvestment) {
       return dealInvestment;
    });
}

function addTransaction(deal, user, transaction) {
    var Transaction = Parse.Object.extend("Transaction");
    var Deal = Parse.Object.extend("Deal");
    var DealInvestment = Parse.Object.extend("DealInvestment");

    var dealInvestmentQuery = new Parse.Query(DealInvestment);
    dealInvestmentQuery.equalTo("deal", deal);
    dealInvestmentQuery.equalTo("user", user);
    return dealInvestmentQuery.first().then(function (dealInvestment) {
        var newTr = new Transaction();
        newTr.set("type", transaction.type);
        newTr.set("amount", transaction.amount);
        newTr.set("investingEntity", transaction.investingEntity);
        newTr.set("date", toDateSlash(transaction.date));
        newTr.set("dealInvestment", dealInvestment);
        newTr.set("investor", user);
        newTr.set("manager", deal.get("manager"));
        newTr.set("stage", 3);
        newTr.set("approved", false);
        console.log("saving");
        return newTr.save();
    });
}