var fs = require("fs");

var async = require("async");
var restify = require("restify");
var r = require("rethinkdb");

var Game = require("../www/js/game.js").Game;
var PackedTrie = require("../www/js/ptrie.js").PackedTrie;

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

var User = function(options) {
    this.data = options.data;
    this.auth = options.auth;
};

User.prototype = {
    toJSON: function() {
        return this.data;
    },

    addGame: function(game) {
        // Get right dict from lang
        var dict = getDict(game.settings.lang);

        // Validate the score from the log
        var validResults = Game.validate(game, dict);

        // Override any erroneous results
        game.results = validResults;

        var ret = {
            id: game.gid,
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
    }
};

User.createFromGameCenter = function(auth, callback) {
    r.table("users").insert({
        email: "",
        name: auth.displayName,
        state: {
            scores: {}
        }
    }).run(conn, function(err, result) {
        var id = result.generated_keys[0];

        r.table("auth_gamecenter").insert({
            userID: id,
            playerID: auth.playerID,
            displayName: auth.displayName
        }).run(conn, function() {
            User.loginUsingGameCenter(auth, callback);
        });
    });
};

User.getByID = function(id, callback) {
    r.table("users").get(id).run(err, data) {
        if (err || !data) {
            return callback(err);
        }

        callback(null, new User({data: data}));
    });
};

User.loginUsingGameCenter = function(auth, callback) {
    r.table("auth_gamecenter")
        .filter({playerID: auth.playerID})
        .eqJoin("userID", r.table("users"))
        .run(conn).then(function(err, cursor) {
            return cursor.toArray();
        }).then(function(results) {
            if (results.length === 0) {
                callback(null, new User({
                    data: results[0].right,
                    auth: results[0].left
                }));
            } else {
                // Let's hope this doesn't go into a never-ending loop!
                User.createFromGameCenter(auth, callback);
            }
        });
};

server.get("/auth/gamecenter", function(req, res, next) {
    var auth = req.body;

    User.loginUsingGameCenter(auth, function(err, user) {
        res.send(200, user.toJSON());
        next();
    });
});

server.get("/leaderboard/:type", function(req, res, next) {
    var board = getHighScoreBoard(req.params.type);

    board.list(0, function(err, list) {
        res.send(list);
        next();
    });
});

server.get("/scores/:userID", function(req, res, next) {
    var userID = req.params.userID;

    User.getByID(userID, function(err, user) {
        if (!user) {
            res.send(400, {error: "User not found."});
            return;
        }

        user.
    });

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

server.post("/games", function(req, res, next) {
    var data = req.body;
    var userID = data.userID;
    var games = data.games;

    User.getById(userID, function(err, user) {
        if (!user) {
            res.send(400, {error: "User not found."});
            return next();
        }

        // Work through an array of scores
        async.eachLimit(games, 1, function(game, callback) {
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
            res.send(200, {
                user: user.toJSON(),
                games: results
            });
            next();
        });
    });
});

r.connect({host: "localhost"}, function(err, _conn) {
    conn = _conn;

    server.listen(process.env.PORT || 4000, function() {
        console.log('%s listening at %s', server.name, server.url);
    });
});