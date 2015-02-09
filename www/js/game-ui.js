var GameUI = Backbone.View.extend({
    rackSize: 7,
    scale: 1.0,

    initialize: function(options) {
        var self = this;

        // Remember the server to which scores are saved
        this.server = options.server;

        // Expand the rack to take up the full width
        this.maxWidth = Math.min($(window).width(), 1024);
        this.scale = this.maxWidth / Rack.width();
        this.rack.options.scale = this.scale;

        this.board = new Board({
            scale: this.scale,
            rackSize: this.rackSize
        });

        this.autoAuth(function(err, user) {
            if (user) {
                self.setUser(user);
            }

            self.initGame(options);

            self.render();
            self.bind();
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
            self.restart();
        });

        this.$el.on("click", ".start", function() {
            self.toggleOverlay("startgame", false);
            self.start();
        });

        this.$el.on("click", ".showchallenges", function() {
            self.toggleOverlay("startgame", false);

            self.renderChallenges();

            setTimeout(function() {
                self.toggleOverlay("challenges", true);
            }, 350);
        });

        this.$el.on("click", ".showchallenge", function() {
            self.toggleOverlay("challenges", false);

            // TODO: Start a challenge-style game
            self.start();
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
                    .text("Challenges")
            ]);

        var $endGame = $("<div>")
            .addClass("endgame full-overlay hidden")
            .hide()
            .html([
                $("<div>")
                    .addClass("points"),
                $("<button>")
                    .addClass("restart")
                    .text("Play Again")
            ]);

        var $challenges = $("<div>")
            .addClass("challenges full-overlay hidden")
            .hide()
            .html([
                $("<div>")
                    .addClass("challenge-list")
            ]);

        var $overlay = $("<div>")
            .addClass("background overlay")
            .appendTo("body");

        this.$el.html([
            // A background overlay
            $overlay,

            // Add the start of game overlay
            $startGame,

            // Add the end of game overlay
            $endGame,

            // Add the challenges overlay
            $challenges,

            // The game board
            this.board.render().el
        ]);

        this.$el.find(".board, .full-overlay")
            .css({
                transform: "translateY(-50%) scale(" +
                    this.scale + ")",
                width: Rack.width()
            });

        this.$el.width(this.maxWidth);

        return this;
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

    start: function() {
        this.game.start();
    },

    reset: function() {
        this.rack.reset();
        this.game.reset();
        this.resetHighScore();
    },

    restart: function() {
        this.reset();
        this.initGame();
        this.start();
    },

    playback: function(data) {
        if (typeof data === "string") {
            data = $.parseJSON(data)
        }

        this.game.playback(false, data);
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
