var GameUI = Backbone.View.extend({
    options: {
        rackSize: 7,
        maxTiles: -1,
        scaledScore: false,
        useLengthBonus: true,

        scale: 1.0
    },

    events: {
        "click .saveword": "submitWord"
    },

    initialize: function(options) {
        var self = this;

        this.updateTimer = new UpdateTimer({
            size: 100
        });

        this.rack = new Rack({
            rackSize: this.options.rackSize
        });

        // Remember the server to which scores are saved
        this.server = options.server;

        // Expand the rack to take up the full width
        this.options.maxWidth = Math.min($(window).width(), 1024);
        this.options.scale = this.options.maxWidth / this.rack.rackWidth();
        this.rack.options.scale = this.options.scale;

        this.initGame(options);

        this.render();
        this.bind();
    },

    initGame: function(options) {
        var self = this;

        options = options || {};

        if (this.game) {
            options.dict = this.game.dict;
        }

        // Initialize a copy of the game
        this.game = new Game({
            type: "infinite",
            lang: "en",
            maxTiles: this.options.maxTiles,
            rackSize: this.options.rackSize,
            scaledScore: this.options.scaledScore,
            useMultiplier: this.options.useMultiplier,
            useLengthBonus: this.options.useLengthBonus,
            seed: options.seed,
            dict: options.dict
        });

        this.scores = new Scores({
            type: "infinite",
            server: this.server
        });

        this.rack.off("swap");

        this.rack.on("swap", function(a, b) {
            self.game.swap(a, b);
        });

        // Attach all the game events
        for (var method in this.gameEvents) {
            this.game.on(method, _.bind(this.gameEvents[method], this));
        }

        this.resetHighScore();
    },

    setUser: function(user) {
        this.user = user;

        this.scores.setUser(user);
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

        if (typeof FastClick !== "undefined") {
            FastClick.attach(this.el);
        }
    },

    render: function() {
        var $pointsBar = $("<div>")
            .addClass("buttons")
            .html([
                // Render the update timer
                this.updateTimer.render().el,

                $("<div>")
                    .addClass("streak")
                    .html([
                        $("<span>")
                            .addClass("multiplier")
                            .text("1x"),
                        $("<div>")
                            .addClass("streak-bar")
                            .html([
                                $("<div>").addClass("bar")
                            ])
                    ]),

                // Render the points area
                $("<span>")
                    .addClass("score")
                    .html([
                        $("<span>")
                            .addClass("points")
                            .text("0"),
                        $("<span>")
                            .addClass("text")
                            .html([
                                $("<span>").text("High: "),
                                $("<span>").addClass("highscore").text("0")
                            ])
                    ])
            ]);

        var $buttons = $("<div>")
            .addClass("buttons")
            .html([
                // Render the save button
                $("<button>")
                    .addClass("saveword")
                    .prop("disabled", true)
                    .text("Save Word")
            ]);

        var $startGame = $("<div>")
            .addClass("startgame")
            .html([
                $("<button>")
                    .addClass("start")
                    .text("Play")
            ]);

        var $endGame = $("<div>")
            .addClass("endgame hidden")
            .hide()
            .html([
                $("<div>")
                    .addClass("points"),
                $("<button>")
                    .addClass("restart")
                    .text("Play Again")
            ]);

        var $overlay = $("<div>")
            .addClass("background overlay")
            .appendTo("body");

        var $board = $("<div>")
            .addClass("board")
            .html([
                // Insert the points bar
                $pointsBar,

                // Render the tile rack
                this.rack.render().el,

                // Insert the button bar
                $buttons
            ]);

        this.$el.html([
            // A background overlay
            $overlay,

            // Add the start of game overlay
            $startGame,

            // Add the end of game overlay
            $endGame,

            // The game board
            $board
        ]);

        this.$el.find(".board, .endgame, .startgame")
            .css({
                transform: "translateY(-50%) scale(" +
                    this.options.scale + ")",
                width: this.rack.rackWidth()
            });

        this.$el.width(this.options.maxWidth);

        this.resetHighScore();

        return this;
    },

    resetHighScore: function() {
        var self = this;

        this.scores.getHighScore(function(highScore) {
            self.updateHighScore(highScore);
        });
    },

    updateHighScore: function(score) {
        if (!score) {
            return;
        }

        var newHigh = this.curHighScore && score > this.curHighScore;

        if (newHigh || !this.curHighScore) {
            this.curHighScore = score;
            this.updateNumber(".score .highscore", this.curHighScore);
        }

        this.$el.find(".score .text").toggleClass("active", !!newHigh);
    },

    updateNumber: function(selector, number) {
        var comma = $.animateNumber.numberStepFactories.separator(",");

        this.$el.find(selector).animateNumber({
            number: number,
            numberStep: comma
        });
    },

    toggleOverlay: function(name, toggle) {
        var $elems = this.$el.find(".background, ." + name);

        if (toggle) {
            $elems.addClass("hidden").show();
        } else {
            $elems.removeClass("hidden").show();
        }

        requestAnimationFrame(function() {
            $elems.toggleClass("hidden", !toggle);

            if (!toggle) {
                setTimeout(function() {
                    $elems.hide();
                }, 300);
            }
        });
    },

    start: function() {
        this.game.start();
    },

    reset: function() {
        this.rack.reset();
        this.game.reset();
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

    submitWord: function() {
        // Don't allow submission if we're replaying the game
        if (!this.game.logging) {
            return;
        }

        if (this.game.foundWord) {
            this.game.update();
        }
    },

    gameEvents: {
        swap: function(activePos, thisPos) {
            this.rack.swap(activePos, thisPos);
        },

        updateDone: function() {
            var self = this;
            var totalTime = this.game.updateRate * this.game.rack.length;
            var startTime = (new Date).getTime();

            // Make sure any previous circle animations are stopped
            clearInterval(this.circleTimer);

            this.circleTimer = setInterval(function() {
                var timeDiff = (new Date).getTime() - startTime;
                var nearEnd = totalTime - timeDiff <= totalTime / 4;

                self.updateTimer.update(
                    Math.min(timeDiff / totalTime, 1),
                    nearEnd,
                    !!self.game.foundWord
                );

                if (!self.game.foundWord && nearEnd) {
                    self.rack.setCouldDrop(true);
                }

                if (timeDiff >= totalTime) {
                    clearInterval(self.circleTimer);
                }
            }, 13);
        },

        dropTile: function(letter) {
            this.rack.dropTile(letter);

            // Let the user know how many
            this.$el.find(".tilesleft")
                .text(this.game.maxTiles - this.game.droppedTiles > 0 ?
                    this.game.maxTiles - this.game.droppedTiles :
                    "No");
        },

        removeTiles: function(num) {
            this.rack.removeTiles(num);
        },

        foundWord: function(word) {
            this.rack.foundWord(word);

            this.$el.find(".saveword")
                .prop("disabled", !word.length);
        },

        updateScore: function(result) {
            $("<li>")
                .addClass(result.state ? "pass" : "fail")
                .html("<b>" + (result.total >= 0 ? "+" : "") + result.total +
                    ": " + result.word + ".</b> " +
                    (result.state ?
                        result.num + " Points " +
                            (result.lengthBonus > 1 ? "+" +
                                result.lengthBonus.toFixed(1) +
                                "x Word Length. " : "") +
                            (result.multiplier > 1 ? "+" +
                                result.multiplier.toFixed(1) +
                                "x Multiplier. " : "") :
                        "Letter not used.")
               ).prependTo(this.$el.find(".words"));

            this.$el.find(".multiplier")
                .text(Math.round(result.lengthMultiplier) + "x");
            this.$el.find(".streak-bar .bar")
                .css("width", (result.streak * 10) + "%");

            this.updateNumber(".points", this.game.score);
            this.updateHighScore(this.game.score);
        },

        reset: function() {
            // Reset the UI elements
            this.$el
                .find(".words").empty().end()
                .find(".tilesleft, .points").text("0");

            this.$el.find(".multiplier")
                .text("1x");
            this.$el.find(".streak-bar .bar")
                .css("width", "0%");

            // Return the update timer to its start position
            this.updateTimer.reset();

            // Reset the tile rack
            this.rack.reset();

            // Stop the circle from updating
            clearInterval(this.circleTimer);
        },

        gameover: function() {
            this.rack.removeTiles(this.options.rackSize);

            this.toggleOverlay("endgame", true);

            // TODO:
            // - Get longest word
            // - Get # of dropped tiles
            // - Get longest streak

            // Record the score
            this.scores.addGame(this.game.getState());

            // TODO: Store game state
            // TODO: Determine if a new high score was set
        }
    },

    autoAuth: function() {
        User.getCachedUser(function(err, user) {
            if (user) {
                User.setCurrentUser(user);
            }

            if (!User.hasGameCenter()) {
                // TODO: Defer the auth until later?
                return;
            }

            document.addEventListener("deviceready", function() {
                gamecenter.auth(function(auth) {
                    var curUser = User.getCurrentUser();

                    if (curUser && !curUser.verifyAuth(auth) || !curUser) {
                        User.createUserFromAuth(auth, function(err, user) {
                            User.setCurrentUser(user);
                        });
                    }
                }, function() {
                    // Failure.
                });
            }, false);
        });
    }
});
