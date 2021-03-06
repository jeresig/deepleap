var GameUI = Backbone.View.extend({
    rackSize: 7,
    scale: 1.0,

    initialize: function(options) {
        var self = this;

        this.lang = options.lang;
        this.dict = options.dict;

        // Remember the server to which scores are saved
        this.server = options.server;

        // Expand the rack to take up the full width
        this.maxWidth = Math.min($(window).width(), 1024);
        this.scale = this.maxWidth / Rack.width(this.rackSize);

        this.board = new Board({
            scale: this.scale,
            rackSize: this.rackSize
        });

        this.board.on("gameover", _.bind(this.gameover, this));

        this.autoAuth(function(err, user) {
            if (user) {
                self.setUser(user);
            }

            self.render();
        });
    },

    setUser: function(user) {
        this.user = user;

        this.board.setUser(user);
    },

    getUser: function() {
        return this.user;
    },

    bind: function() {
        var self = this;

        this.$el.on("click", ".restart", function() {
            self.toggleOverlay("endgame", false);
            self.board.restart();
        });

        this.$el.on("click", ".start", function() {
            self.toggleOverlay("startgame", false);

            self.curType = "infinite";

            self.board.start({
                type: self.curType,
                lang: self.lang,
                dict: self.dict
            });
        });

        this.$el.on("click", ".showchallenges", function() {
            self.hideCurOverlay();

            self.renderChallenges();

            setTimeout(function() {
                self.toggleOverlay("challenges", true);
            }, 350);
        });

        this.$el.on("click", ".showleaderboard", function() {
            self.hideCurOverlay();

            self.renderLeaderboard();

            setTimeout(function() {
                self.toggleOverlay("leaderboard", true);
            }, 350);
        });

        this.$el.on("click", ".leaderboard-back", function() {
            self.renderLeaderboard(this.curType, this.curPos - 50);
        });

        this.$el.on("click", ".leaderboard-forward", function() {
            self.renderLeaderboard(this.curType, this.curPos + 50);
        });

        this.$el.on("click", ".home", function() {
            self.toggleOverlay("endgame", false);

            self.curType = null;

            setTimeout(function() {
                self.toggleOverlay("startgame", true);
            }, 350);
        });

        this.$el.on("click", ".showchallenge", function() {
            self.toggleOverlay("challenges", false);

            var id = $(this).data("challenge");

            self.curType = "challenge";

            // Start a challenge-style game
            self.board.start({
                id: "challenge-" + id,
                type: self.curType,
                seed: 1000 + id,
                lang: self.lang,
                dict: self.dict
            });
        });

        if (typeof FastClick !== "undefined") {
            FastClick.attach(this.el);
        }
    },

    render: function() {
        var $startGame = $("<div>")
            .addClass("startgame full-overlay")
            .html([
                $("<button>")
                    .addClass("start")
                    .text("Play"),
                $("<button>")
                    .addClass("showchallenges")
                    .text("Challenges"),
                $("<button>")
                    .addClass("showleaderboard")
                    .text("Leaderboard")
            ]);

        var $endGame = $("<div>")
            .addClass("endgame full-overlay hidden")
            .hide()
            .html([
                $("<div>")
                    .addClass("points"),
                $("<button>")
                    .addClass("restart")
                    .text("Play Again"),
                $("<button>")
                    .addClass("showchallenges")
                    .text("New Challenge"),
                $("<button>")
                    .addClass("home")
                    .text("Home")
            ]);

        var $challenges = $("<div>")
            .addClass("challenges full-overlay hidden")
            .hide()
            .html([
                $("<div>")
                    .addClass("challenge-list")
            ]);

        var $leaderboard = $("<div>")
            .addClass("leaderboard full-overlay hidden")
            .hide()
            .html([
                $("<div>")
                    .addClass("leaderboard-list"),
                $("<div>")
                    .addClass("leaderboard-loading")
                    .text("Loading..."),
                $("<button>")
                    .addClass("leaderboard-back")
                    .html("&laquo; Back"),
                $("<button>")
                    .addClass("leaderboard-forward")
                    .html("More &raquo;")
            ]);

        var $overlay = $("<div>")
            .addClass("background overlay")
            .appendTo("body");

        this.$el
            .width(this.maxWidth)
            .html([
                // A background overlay
                $overlay,

                // Add the start of game overlay
                $startGame,

                // Add the end of game overlay
                $endGame,

                // Add the challenges overlay
                $challenges,

                // Add the leaderboard overlay
                $leaderboard,

                // The game board
                this.board.render().el
            ]);

        this.$el.find(".full-overlay")
            .css({
                transform: "translateY(-50%) scale(" + this.scale + ")",
                width: Rack.width(this.rackSize)
            });

        this.bind();

        return this;
    },

    gameover: function(state) {
        // TODO:
        // - Get longest word
        // - Get # of dropped tiles
        // - Get longest streak
        this.$el.find(".endgame .points").text(state.results.score);

        this.toggleOverlay("endgame", true);
    },

    renderLeaderboard: function(type, pos) {
        type = type || this.curType || "infinite";
        pos = pos || this.curPos || 0;

        var $list = this.$el.find(".leaderboard-list").empty();

        // TODO: Show loading indicator

        // Ajax request to get leaderboard data for current game type
        $.ajax({
            type: "GET",
            url: this.server + "/leaderboard/" + type + "/all_time?pos=" + pos,
            dataType: "json",
            success: function(games) {
                this.$el.find(".leaderboard-back")
                    .toggleClass("disabled", pos === 0);

                this.$el.find(".leaderboard-forward")
                    .toggleClass("disabled", games.length < 50);

                $list.html(_.map(games, function(data) {
                    return $("<div>").html([
                        "<span class='rank'>" + data.rank + "</span>",
                        "<span class='user'>" + data.user + "</span>",
                        "<span class='score'>" + data.score + "</span>"
                    ]);
                }));
            }
        });

        // Disable pagination nav
        this.$el.find(".leaderboard-back .leaderboard-forward")
            .addClass("disabled");
    },

    renderChallenges: function() {
        var challenges = [];

        for (var i = 1; i <= 25; i++) {
            challenges.push(
                $("<button>")
                    .addClass("showchallenge")
                    .data("challenge", i)
                    .text("Challenge #" + i)
            );
        }

        this.$el.find(".challenge-list").html(challenges);
    },

    toggleOverlay: function(name, toggle) {
        var $elems = this.$el.find(".background, ." + name);

        if (toggle) {
            $elems.addClass("hidden").show();
        } else {
            $elems.removeClass("hidden").show();
        }

        setTimeout(function() {
            $elems.toggleClass("hidden", !toggle);

            if (!toggle) {
                setTimeout(function() {
                    $elems.hide();
                }, 300);
            }
        }, 13);
    },

    hideCurOverlay: function() {
        var className = $(".full-overlay:not(.hidden)").first().attr("class");
        var curName = className.replace(/\s.*$/, "");
        this.toggleOverlay(curName, false);
    },

    autoAuth: function(callback) {
        var self = this;

        User.getCachedUser(function(err, user) {
            if (user) {
                callback(err, user);
            }

            if (!User.hasGameCenter()) {
                // TODO: Defer the auth until later?
                if (!user) {
                    User.createAnonUser(callback);
                }

                return;
            }

            document.addEventListener("deviceready", function() {
                gamecenter.auth(function(auth) {
                    var curUser = self.getUser();

                    if (curUser && !curUser.verifyAuth(auth) || !curUser) {
                        User.createUserFromAuth(auth, callback);
                    }
                }, function() {
                    // Failure.
                });
            }, false);
        });
    }
});
