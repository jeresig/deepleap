var fs = require("fs");

var async = require("async");
var restify = require("restify");
var redis = require("redis");
var Leaderboard = require("leaderboard");

var Game = require("../www/js/game.js").Game;
var PackedTrie = require("../www/js/ptrie.js").PackedTrie;

var client = redis.createClient();

var dicts = {};

var getDict = function(lang) {
    if (!(lang in dicts)) {
        var dict = fs.readFileSync("../dict/ptrie/" + lang + ".ptrie", {
            encoding: "utf8"
        });

        dicts[lang] = new PackedTrie(dict);
    }

    return dicts[lang];
};

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
    var games = req.body;

    // TODO: Get current max score

    // Work through an array of scores
    async.eachLimit(games, 1, function(game, callback) {
        // Get right dict from lang
        var dict = getDict(game.settings.lang);

        // Validate the score from the log
        var validResults = Game.validate(game, dict);

        var score = validResults.score;
        var user = game.user.playerID;

        //console.log(user, score, validResults);

        callback();
        /*
        board.add(user, score, function(err) {
            board.score(user, function(err, score) {
                // TODO: Return an array of objects showing if
                // the score was saved and if it was validated
                res.send(200, score);
                next();
            });
        });
        */
    }, function() {
        // TODO: Render results
        res.send(200, []);
        next();
    });
});

server.listen(process.env.PORT || 4000, function() {
    console.log('%s listening at %s', server.name, server.url);
});