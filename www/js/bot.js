var Bot = function(game, level) {
    var self = this;

    this.game = game;
    this.level = level;

    game.on("updateDone", function() {
        clearInterval(self.timer);
        self.solve();
    });

    game.on("gameover", function() {
        clearInterval(self.timer);
    });

    if (game.rack.length) {
        self.solve();
    }
};

Bot.prototype = {
    findWords: function() {
        if (!this.game.rack.length) {
            return [];
        }

        var letters = this.game.rack.slice(0).sort(),
            done = {},
            check = new RegExp("^[" + letters.join("") + "]*$"),
            check2 = new RegExp("^" + letters.join("?") + "?$"),
            words = [];

        for (var i = 0, il = letters.length; i < il; i++) {
            for (var j = 0, jl = letters.length; j < jl; j++) {
                if (i !== j) {
                    var pair = letters[i] + letters[j];

                    if (!done[pair]) {
                        var possible = this.dict.words(pair);

                        for (var p = 0, pl = possible.length; p < pl; p++) {
                            var word = possible[p];

                            if (check.test(word) &&
                                check2.test(word.split("").sort().join(""))) {
                                words.push(word);
                            }
                        }

                        done[pair] = true;
                    }
                }
            }
        }

        return words.sort(function(a, b) {
            return b.length - a.length;
        });
    },

    solve: function() {
        var level = this.levels[this.level],
            words = level.words(this.findWords(), this.game),
            word = words[Math.floor(words.length * Math.random())],
            game = this.game,
            rack = game.rack,
            pos = 0,
            self = this;

        if (!word) {
            return;
        }

        // Do an initial pause to "think" of a solution
        // Start swapping tiles to solve
        this.timer = setTimeout(swapTile,
            level.startTime + (level.startTime * Math.random()) +
            level.swapTime + (level.swapTime * Math.random()));

        function swapTile() {
            if (pos >= word.length) {
                if (game.foundWord) {
                    game.update();
                }
                return;
            }

            while (rack[pos] === word[pos] && pos < word.length) {
                pos++;
            }

            var letter = word[pos];

            if (rack[pos] !== letter) {
                for (var i = pos + 1; i < rack.length; i++) {
                    if (rack[i] === letter) {
                        game.swap(pos, i);
                        break;
                    }
                }
            }

            pos++;

            self.timer = setTimeout(swapTile,
                level.swapTime + (level.swapTime * Math.random()));
        }
    },

    levels: {
        hard: {
            words: function(words) {
                return words.slice(0, 10);
            },
            startTime: 3000,
            swapTime: 1000
        },
        easy: {
            words: function(words, game) {
                var words = words.reverse().slice(0, 5);

                // If a word was already spelled, just use that
                return game.foundWord ?
                    [game.foundWord] :
                        // Every couple plays, really mess up
                        Math.random() * 5 < 1 && words.length ?
                            [words[0].split("").sort().join("")] :
                            words;
            },
            startTime: 5000,
            swapTime: 1500
        }
    }
};

// If we're using Node.js, export the Bot
if (typeof exports !== "undefined") {
    exports.Bot = Bot;
}