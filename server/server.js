var fs = require("fs");

var async = require("async");
var restify = require("restify");
var redis = require("redis");
var Leaderboard = require("leaderboard");

var Game = require("../www/js/game.js").Game;
var PackedTrie = require("../www/js/ptrie.js").PackedTrie;

var client = redis.createClient();
var server = restify.createServer();

var dicts = {};
var boards = {};

var getDict = function(lang) {
    if (!(lang in dicts)) {
        var dict = fs.readFileSync("../dict/ptrie/" + lang + ".ptrie", {
            encoding: "utf8"
        });

        dicts[lang] = new PackedTrie(dict);
    }

    return dicts[lang];
};

var getHighScoreBoard = function(type) {
    if (!(type in boards)) {
        boards[type] = new Leaderboard("snp-highscores-" + type,
            {pageSize: 50}, redis);
    }

    return boards[type];
};

server.use(restify.CORS());
server.use(restify.bodyParser());

server.get("/leaderboard/:type", function(req, res, next) {
    var board = getHighScoreBoard(req.params.type);

    board.list(0, function(err, list) {
        res.send(list);
        next();
    });
});

server.get("/scores/:user", function(req, res, next) {
    var user = req.params.user;

    var types = Object.keys(boards);
    var results = {};

    async.each(types, function(type, callback) {
        var board = getHighScoreBoard(type);

        board.score(user, function(err, curHighScore) {
            results[type] = curHighScore || 0;
            callback();
        });
    }, function() {
        res.send(200, results);
        next();
    });
});

server.post("/scores", function(req, res, next) {
    var games = req.body;

    // Work through an array of scores
    async.mapLimit(games, 4, function(game, callback) {
        // Get right dict from lang
        var dict = getDict(game.settings.lang);

        // Validate the score from the log
        var validResults = Game.validate(game, dict);

        var ret = {
            id: game.id,
            validated: !!validResults
        };

        if (!validResults) {
            return callback(null, ret);
        }

        var score = validResults.score;
        var user = game.user.playerID;

        var board = getHighScoreBoard(game.settings.type);

        // TODO: Save game state, as well

        // Get current max score
        board.score(user, function(err, curHighScore) {
            if (!curHighScore || score > curHighScore) {
                board.add(user, score, function() {
                    callback(err, ret);
                });
            } else {
                callback(err, ret);
            }
        });
    }, function(err, results) {
        // Render results
        res.send(200, results);
        next();
    });
});

server.listen(process.env.PORT || 4000, function() {
    console.log('%s listening at %s', server.name, server.url);
});