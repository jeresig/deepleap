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
    // Clean up the lang string
    lang = lang.replace(/[^a-z]/g, "");

    if (!(lang in dicts)) {
        try {
            var dict = fs.readFileSync("../dict/ptrie/" + lang + ".ptrie", {
                encoding: "utf8"
            });

            dicts[lang] = new PackedTrie(dict);
        } catch(e) {
            return;
        }
    }

    return dicts[lang];
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

    addGame: function(game, callback) {
        if (!game.settings) {
            return callback(new Error("Malformed game object."));
        }

        // Get right dict from lang
        var dict = getDict(game.settings.lang);

        if (!dict) {
            return callback(new Error("No valid game language."));
        }

        // Validate the score from the log
        var validResults = Game.validate(game, dict);

        // Set the right date on the results
        validResults.startTime = game.results.startTime;
        validResults.endTime = game.results.endTime;

        // Override any erroneous results
        game.results = validResults;

        var ret = {
            gid: game.gid,
            validated: !!validResults
        };

        if (!validResults) {
            return callback(null, ret);
        }

        var score = validResults.score;
        var type = game.settings.type;

        if (!this.data.state) {
            this.data.state = {};
        }

        if (!this.data.state.scores) {
            this.data.state.scores = {};
        }

        if (score > this.data.state.scores[type]) {
            this.data.state.scores[type] = score;
        }

        if (!this.data.state.playCount) {
            this.data.state.playCount = {};
        }

        this.data.state.playCount[type] =
            (this.data.state.playCount[type] || 0) + 1;

        game.userID = this.id;

        r.table("games").insert(game).run(conn, function(err, result) {
            callback(err, ret);
        });
    },

    addGames: function(games, callback) {
        // Work through an array of games
        async.eachLimit(games, 1, this.addGame.bind(this), callback);
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
            if (results.length === 1) {
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

server.get("/user/auth/gamecenter", function(req, res, next) {
    var auth = req.body;

    User.loginUsingGameCenter(auth, function(err, user) {
        res.send(200, user.toJSON());
        next();
    });
});

server.get("/user/:userID", function(req, res, next) {
    var userID = req.params.userID;

    User.getByID(userID, function(err, user) {
        if (!user) {
            res.send(400, {error: "User not found."});
            return;
        }

        res.send(200, user.toJSON());
        next();
    });
});

server.post("/user/games", function(req, res, next) {
    var data = req.body;
    var userID = data.userID;
    var games = data.games;

    User.getById(userID, function(err, user) {
        if (!user) {
            res.send(400, {error: "User not found."});
            return next();
        }

        user.addGames(function(err, results) {
            user.save(function() {
                // Render results
                res.send(200, {
                    user: user.toJSON(),
                    games: results
                });
                next();
            });
        });
    });
});

server.get("/leaderboard/:type/:duration", function(req, res, next) {
    var type = req.params.type;
    var startPos = parseFloat(req.query.pos) || 0;
    var startTime = 0;

    if (req.params.duration === "last_week") {
        startTime = (new Date).getTime() - (7 * 24 * 3600);
    }

    t.table("games")
        .filter(
            r.row("settings")("type").eq(type).and(
                r.row("results")("startTime").gt(startTime))
        )
        .without("log")
        .eqJoin("userID", r.table("users"))
        .orderBy({index: r.desc("results")("score")})
        .skip(startPos)
        .limit(50)
        .run(conn, function(err, pairs) {
            res.send(pairs.map(function(pair, i) {
                type: type,
                rank: startPos + i + 1,
                game: pair.left.results,
                user: pair.right.data
            }));
            next();
        });
});

r.connect({host: "localhost"}, function(err, _conn) {
    conn = _conn;

    server.listen(process.env.PORT || 4000, function() {
        console.log('%s listening at %s', server.name, server.url);
    });
});