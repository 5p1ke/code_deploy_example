/**
 * Created by Thomas on 4/22/16.
 */


Parse.Cloud.define("faqMenu", function(request, response) {
    var FAQ = Parse.Object.extend("FAQ");
    var query = new Parse.Query(FAQ);
    query.equalTo("type", "menu");
    query.include("items");
    query.include("items.items");
    query.include("items.related");
    query.include("items.files");
    query.find().then(function(results){
        response.success(results);
    }, function(error){
        response.error(error);
    } );
});

Parse.Cloud.define("faq", function(request, response) {
    var FAQ = Parse.Object.extend("FAQ");
    var query = new Parse.Query(FAQ);
    query.equalTo("objectId", request.params.faqId);
    query.include("items");
    query.include("related");
    query.include("files");
    query.find().then(function(results){
        console.log(results);
        response.success(results);
    }, function(error){
        response.error(error);
    } );
});


