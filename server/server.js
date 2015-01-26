var restify = require("restify");
var redis = require("redis");
var Leaderboard = require("leaderboard");
var Game = require("../www/js/game.js").Game;

var client = redis.createClient();

// TODO: Load all necessary dictionaries

var boards = {};

var getHighScoreBoard = function(type) {
    if (!(type in boards)) {
        boards[type] = new Leaderboard("snp-highscores-" + type,
            {pageSize: 20}, redis);
    }

    return boards[type];
};

var server = restify.createServer();

server.use(restify.CORS());
server.use(restify.bodyParser());

server.get("/leaderboard", function(req, res, next) {
    board.list(0, function(err, list) {
        res.send(list);
        next();
    });
});

server.post("/scores", function(req, res, next) {
    var user = req.params.name;
    var games;

    try {
        games = JSON.parse(req.body);
    } catch(e) {
        return next(new Error("Malformed request object."));
    }

    // TODO: Work on an array of scores
    async.eachLimit(games, 1, function(game, callback) {
        // TODO: Get the board from the result type
        // TODO: Get right dict from lang
        Game.validate(game, dict);

        // TODO: Validate the score from the log

        var score = results.score;
        var user = results.user.playerID;

        board.add(user, score, function(err) {
            board.score(user, function(err, score) {
                // TODO: Return an array of objects showing if
                // the score was saved and if it was validated
                res.send(200, score);
                next();
            });
        });
    }, function() {
        
    });
});

server.listen(process.env.PORT || 4000, function() {
    console.log('%s listening at %s', server.name, server.url);
});