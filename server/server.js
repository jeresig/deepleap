var restify = require("restify");
var redis = require("redis");
var Leaderboard = require("leaderboard");

var client = redis.createClient();

var board = new Leaderboard("deepleap", {pageSize: 20}, redis);

var server = restify.createServer();

server.use(restify.bodyParser());

server.get("/leaderboard", function(req, res, next) {
    board.list(0, function(err, list) {
        res.send(list);
        next();
    });
});

server.post("/scores/:name", function(req, res, next) {
    var user = req.params.name;
    var score;

    try {
        score = JSON.parse(req.body).score
    } catch(e) {
        return next(new Error("Malformed request object."));
    }

    board.add(user, score, function(err) {
        board.score(user, function(err, score) {
            res.send(200, score);
            next();
        });
    });
});

server.listen(process.env.PORT || 4000, function() {
    console.log('%s listening at %s', server.name, server.url);
});