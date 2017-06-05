var express = require('express');
var path = require('path');
var app = express();

app.use(express.bodyParser());
app.set('view engine', 'jade');
app.set('views', 'cloud/views');

app.get('/', function (req, res) {
    res.render('index', {title: 'Parse JS Debug Demo'});
});

if (process.env && process.env['DEV']) {
    app.use(express.static(path.resolve(__dirname + '/../public')));
    app.listen(3000);
    console.log("Try demo at : http://localhost:3000. Use this link for DEMO PAGE!");

} else {
    app.listen();
}
//test
