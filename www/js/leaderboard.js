var Leaderboard = Backbone.Model.extend({
    initialize: function(options) {
        this.type = options.type;
        this.prefix = "dl-" + options.type + "-";
    },

    setUser: function(user) {
        this.user = user;
    },

    addGame: function(state) {
        // TODO: Add in more identifying info
        var gameID = (new Date).getTime();

        // Update the high score
        this.getHighScore(_.bind(function(highScore) {
            if (!highScore || state.results.score > highScore) {
                this.setHighScore(state.results.score);
            }
        }, this));

        // Save scores
        localforage.getItem(this.prefix + "scores", _.bind(function(err, scores) {
            scores = scores || [];

            scores.push({
                id: gameID,
                user: this.user,
                type: this.type,
                results: state.results,
                saved: false,
                verified: false
            });

            localforage.setItem(this.prefix + "scores", scores, _.bind(function() {
                localforage.setItem(this.prefix + "score-" + gameID, state, _.bind(function() {
                    this.syncServer();
                }, this));
            }, this));
        }, this));
    },

    setHighScore: function(highScore, callback) {
        localforage.setItem(this.prefix + "highscore", highScore, function() {
            if (callback) {
                callback(highScore);
            }
        });
    },

    getHighScore: function(callback) {
        // Update the high score
        localforage.getItem(this.prefix + "highscore", function(err, highScore) {
            if (callback) {
                callback(highScore);
            }
        });
    },

    syncServer: function() {
        // Sync local scores with the server
        // TODO: Only sync if the user has logged in
        // TODO: Send user details to the server

        localforage.getItem(this.prefix + "scores", _.bind(function(err, scores) {
            var toSave = scores.filter(function(score) {
                return !score.saved;
            });

            async.mapLimit(toSave, _.bind(function(score, callback) {
                localforage.getItem(this.prefix + "score-" + gameID, _.bind(function(err, data) {
                    score.log = data.log;
                    score.settings = data.settings;
                    callback(null, score);
                });
            }, this), function(err, toSave) {
                $.ajax({
                    url: "/scores",
                    data: toSave,
                    success: function(results) {
                        var done = {};

                        results.forEach(function(result) {
                            done[result.id] = result;
                        });

                        scores.forEach(function(score) {
                            if (score.id in done) {
                                var result = done[score.id];

                                score.saved = result.saved;
                                score.verified = result.verified;
                            }
                        });

                        localforage.setItem(this.prefix + "scores", scores, function() {
                            // Scores saved
                        });
                    }
                });
            });
        }, this));
    }
});