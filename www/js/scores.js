var Scores = Backbone.Model.extend({
    initialize: function(options) {
        this.type = options.type;
        this.prefix = "snp-" + options.type + "-";
    },

    setUser: function(user) {
        this.user = user;
    },

    setKey: function(key, value, callback) {
        localforage.setItem(key, value, callback);
    },

    getKey: function(key, callback) {
        localforage.getItem(key, callback);
    },

    setHighScore: function(highScore, callback) {
        var scoreKey = this.prefix + "highscore";
        this.setKey(scoreKey, highScore, function() {
            if (callback) {
                callback(highScore);
            }
        });
    },

    getHighScore: function(callback) {
        // Update the high score
        var scoreKey = this.prefix + "highscore";
        this.getKey(scoreKey, function(err, highScore) {
            if (callback) {
                callback(highScore);
            }
        });
    },

    addGame: function(game) {
        var self = this;
        var gamesKey = this.prefix + "games";

        // Update the high score
        this.getHighScore(function(highScore) {
            if (!highScore || game.results.score > highScore) {
                self.setHighScore(game.results.score);
            }
        });

        // Save new game
        this.getKey(gamesKey, function(err, games) {
            games = games || [];

            // Add the user data to the game state
            game.user = self.user;

            // Add the game to the to-save score list
            games.push(game);

            self.setKey(gamesKey, games, function() {
                // Attempt to sync the results to the server
                self.syncServer();
            });
        });
    },

    // Sync local games with the server
    syncServer: function() {
        // Only sync if the user has logged in
        if (!this.user) {
            return;
        }

        var self = this;

        this.getKey(this.prefix + "games", function(err, games) {
            // Fill in any missing user details
            // (in case the user wasn't logged in at the time)
            games = games.map(function(game) {
                game.user = game.user || self.user;
            });

            $.ajax({
                type: "POST",
                url: self.server + "/scores",
                contentType: "application/json",
                data: JSON.stringify(games),
                dataType: "json",
                success: function(results) {
                    // TODO: Only reset if verified successfully
                    // Wipe out saved games
                    self.setKey(gamesKey, [], function() {
                        // Scores saved
                    });
                }
            });
        });
    }
});