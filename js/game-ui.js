var GameUI = Backbone.View.extend({
    options: {
        // How tall and wide a tile should be
        tileWidth: 90,

        // How much space there should be between tiles
        tileMargin: 13,
        tileTopMargin: 6,

        rackSize: 7,
        maxTiles: -1,
        scaledScore: false,
        useMultiplier: false,

        scale: 1.0,

        // TODO: Disabled for now, need to figure out a good result for this
        longLetters: "gjpqy",

        showTiles: true
    },

    initialize: function() {
        var self = this;

        // Initialize a copy of the game
        this.game = new Game({
            maxTiles: this.options.maxTiles,
            rackSize: this.options.rackSize,
            scaledScore: this.options.scaledScore,
            useMultiplier: this.options.useMultiplier
        });

        this.updateTimer = new UpdateTimer();

        // Attach all the game events
        for (var method in this.gameEvents) {
            this.game.on(method, $.proxy(this.gameEvents[method], this));
        }

        this.game.reset();

        this.bind();
        this.render();
    },

    bind: function() {
        var self = this;
        var $letters = this.$el.find(".letters");
        var maxLeft = this.tileWidths(this.options.rackSize);

        this.$el.find(".saveword")
            .on("click", $.proxy(this.uiEvents.submit, this));

        $letters.on("mousedown", ".tile", function(e) {
            if (self.curDrag) {
                return;
            }

            var $this = $(this);
            var offset = $letters.offset();
            var scale = self.options.scale;

            self.curDrag = {
                x: e.offsetX * scale,
                y: e.offsetY * scale,
                offsetX: offset.left,
                offsetY: offset.top,
                $elem: $this,
                pos: self.posFromLeft((e.pageX - offset.left) / scale)
            };

            var x = (e.pageX - self.curDrag.offsetX - self.curDrag.x);
            x /= scale;
            x = Math.min(Math.max(x, self.options.tileMargin), maxLeft);

            self.curDrag.$elem.css("transform",
                "translateX(" + x + "px) scale(1.1)");

            $this.addClass("active");
        });

        $(document).on("mousemove", function(e) {
            if (!self.curDrag) {
                return;
            }

            var x = (e.pageX - self.curDrag.offsetX - self.curDrag.x);
            x /= self.options.scale;
            x = Math.min(Math.max(x, self.options.tileMargin), maxLeft);

            self.curDrag.$elem.css("transform",
                "translateX(" + x + "px) scale(1.1)");

            var targetPos = self.posFromLeft(x +
                (self.options.tileWidth / 2));

            // Make sure we aren't trying to swap with itself
            if (self.curDrag.pos !== targetPos) {
                self.curDrag.$elem.removeClass("found dropsoonA dropsoonB");
                self.game.swap(self.curDrag.pos, targetPos);
                self.curDrag.pos = targetPos;
            }

            e.preventDefault();
        });

        $(document).on("mouseup", function() {
            if (!self.curDrag) {
                return;
            }

            self.curDrag.$elem
                .removeClass("active")
                .css("transform", "translateX(" +
                    self.tileWidths(self.curDrag.pos + 1) + "px) scale(1.0)");

            self.curDrag = null;
        });
    },

    render: function() {
        var rackWidth = this.rackWidth();
        var rackHeight = this.rackHeight();

        this.$el.find(".letters-group").css("transform",
            "scale(" + this.options.scale + ")");

        this.$el.find(".letters").css({
            width: rackWidth,
            height: rackHeight,
            fontSize: this.options.tileWidth,
            borderRadius: this.options.tileTopMargin
        });

        this.$el.find(".letters-extra").css({
            width: rackWidth,
            height: rackHeight / 4,
            borderRadius: this.options.tileTopMargin,
            top: -1 * (this.options.tileTopMargin + 1)
        });

        this.$el.find(".letters-extra-before").css({
            width: rackWidth
        });

        this.$el.find(".drop").html(this.updateTimer.render().el);
    },

    start: function() {
        this.game.start();
    },

    reset: function() {
        this.game.reset();
    },

    playback: function(data) {
        if (typeof data === "string") {
            data = $.parseJSON(data)
        }

        this.game.playback(false, data);
    },

    uiEvents: {
        submit: function() {
            // Don't allow submission if we're replaying the game
            if (!this.game.logging) {
                return;
            }

            if (this.game.foundWord) {
                this.game.update();
            }
        }
    },

    gameEvents: {
        swap: function(activePos, thisPos) {
            $(this.spanLetters[0]).removeClass("dropsoonA dropsoonB");

            var $a = $(this.spanLetters[activePos]),
                $b = $(this.spanLetters[thisPos]),
                activeLeft = Math.max(this.tileWidths(activePos + 1), 0),
                thisLeft = Math.max(this.tileWidths(thisPos + 1), 0);

            // Move the current tile
            $b.css("transform", "translateX(" + activeLeft + "px) scale(1.0)");

            // Finally move the originally selected tile
            if (!$a.hasClass("active")) {
                $a.css("transform", "translateX(" + thisLeft + "px) scale(1.0)");
            }

            // Swap the position of the nodes in the store
            var oldNode = this.spanLetters[thisPos];
            this.spanLetters[thisPos] = this.spanLetters[activePos];
            this.spanLetters[activePos] = oldNode;
        },

        updateDone: function() {
            var totalTime = this.game.updateRate * this.game.rack.length;
            var startTime = (new Date).getTime();

            // Make sure any previous circle animations are stopped
            clearInterval(this.circleTimer);

            this.circleTimer = setInterval(function() {
                var timeDiff = (new Date).getTime() - startTime;
                var nearEnd = totalTime - timeDiff <= totalTime / 4;

                this.updateTimer.update(
                    Math.min(timeDiff / totalTime, 1),
                    nearEnd
                );

                if (!this.game.foundWord && nearEnd) {
                    var firstTile = $(this.spanLetters[0]);

                    if (firstTile.hasClass("dropsoonA")) {
                        firstTile.removeClass("dropsoonA")
                            .addClass("dropsoonB");

                    } else {
                        firstTile.removeClass("dropsoonB")
                            .addClass("dropsoonA");
                    }
                }

                if (timeDiff >= totalTime) {
                    clearInterval(this.circleTimer);
                }
            }.bind(this), totalTime / 200);
        },

        dropTile: function(letter) {
            var self = this;
            var $letters = this.$el.find(".letters");

            // Inject new letter into the UI
            var tileLeft = this.tileWidths(this.game.rack.length);
            var tileWidth = this.options.tileWidth;

            var $tile = $("<span>")
                .addClass("tile")
                .text(this.options.showTiles ? letter : "")
                .css({
                    backgroundPosition: Math.round(Math.random() * 1400) + "px",
                    width: tileWidth,
                    height: tileWidth,
                    lineHeight: (tileWidth -
                        (this.options.longLetters.indexOf(letter) > -1 ?
                            this.options.tileWidth / 4 : 0)) + "px",
                    transform: "translateX(" +
                        (this.rackWidth() + tileLeft) + "px) scale(1.0)"
                })
                .appendTo($letters);

            this.spanLetters.push($tile[0]);

            setTimeout(function() {
                $tile.css("transform", "translateX(" + tileLeft +
                    "px) scale(1.0)");
            }, 0);

            // Let the user know how many
            this.$el.find(".tilesleft")
                .text(this.game.maxTiles - this.game.droppedTiles > 0 ?
                    this.game.maxTiles - this.game.droppedTiles :
                    "No");
        },

        removeTiles: function(num) {
            var self = this;
            var $spanLetters = $(this.spanLetters);

            // Stop the drag if the item being dragged is about to be
            // removed from the page
            if (this.curDrag) {
                var pos = this.spanLetters.indexOf(this.curDrag.$elem[0]);
                if (pos >= 0 && pos < num) {
                    this.curDrag = null;
                }
            }

            var $leaving = $spanLetters.slice(0, num).addClass("leaving");

            setTimeout(function() {
                $leaving.remove();
            }, 300);

            this.spanLetters = $spanLetters.slice(num)
                .css("transform", function(i) {
                    return "translateX(" + self.tileWidths(i + 1) + "px) scale(1.0)";
                })
                .toArray();
        },

        foundWord: function(word) {
            $(this.spanLetters)
                .removeClass("found")
                .slice(0, word.length)
                    .addClass("found");

            this.$el.find(".saveword")
                .toggleClass("ui-disabled", !word.length);
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

            this.$el.find(".points").text(this.game.score);
            this.$el.find(".multiplier")
                .text(this.game.multiplier.toFixed(1));
        },

        reset: function() {
            // Empty out the tiles
            this.spanLetters = [];
            this.$el
                .find(".letters, .words").empty().end()
                .find(".tilesleft, .points").text("0");

            // Return the update timer to its start position
            this.updateTimer.reset();

            // Stop the circle from updating
            clearInterval(this.circleTimer);
        },

        gameover: function() {
            console.log("Game Over");
        }
    },

    rackWidth: function() {
        return this.options.tileMargin +
            ((this.options.tileMargin + this.options.tileWidth) *
            this.options.rackSize);
    },

    rackHeight: function() {
        return this.options.tileWidth +
            (this.options.tileTopMargin * 2);
    },

    tileWidths: function(num) {
        return (num * this.options.tileMargin) +
            ((num - 1) * this.options.tileWidth);
    },

    posFromLeft: function(left) {
        return Math.floor((left - this.options.tileMargin) /
            (this.options.tileMargin + this.options.tileWidth));
    }
});
