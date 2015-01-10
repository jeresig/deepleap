/*
 * Tile/Word Game Engine
 *   by John Resig (ejohn.org)
 *
 * Copyright 2014 John Resig
 *
 * How to use:
 *   var game = new Game({dict: packedTrieString});
 *   game.start();
 */

// Instantiate a new Game object
var Game = Backbone.Model.extend({
    // Callbacks and Triggering
    // LettersReady, AddLetter(letter), RemoveLetters(pos)
    // FindWord(word), AddPoints(result), Swap(posA, posB), GameOver

    initialize: function(options) {
        for (var prop in options) {
            if (options.hasOwnProperty(prop)) {
                this[prop] = options[prop];
            }
        }

        // The random seed for the game (allows for re-playable games with
        // identical drops)
        // Be sure to intialize this before starting the game
        this.seed = options.seed || Math.round(Math.random() * 1000000);

        // Store settings for future configuration
        this.settings = {
            maxTiles: options.maxTiles,
            rackSize: options.rackSize,
            scaledScore: options.scaledScore,
            useMultiplier: options.useMultiplier,
            seed: this.seed
        };

        // A method for loading a string-based dictionary file
        // into the game engine.
        // Should be a properly-formatted PackedTrie string.
        // Cache the dictionary string for later lookups
        if (typeof options.dict === "string") {
            this.dict = new PackedTrie(options.dict);
        }

        // Initialize the data structures used by the game
        this.callbacks = {};

        // Build a full array of all possible letters from which to pull
        this.possibleLetters = [];

        // Build a cache of how many points each letter is worth
        this.letterPoints = {};
    
        for (var letter in this.data.letters) {
            var num = this.data.letters[letter];

            // We do this to make it easier to grab a random letter from a list
            for (var j = 0; j < num; j++) {
                this.possibleLetters.push(letter);
            }

            // Calculate the points for all the letters
            this.letterPoints[letter] = this.scaledScore ?
                Math.round((this.data.total / num) / 8.5) :
                1;
        }
    },

    // Letter data
    // Distribution of OSPD4 + OpenOffice en_US + Wiktionary English
    data: {
        letters: {
            a:77,
            d:38,
            h:23,
            e:111,
            i:75,
            n:58,
            g:27,
            s:85,
            k:13,
            l:53,
            m:27,
            b:21,
            o:61,
            r:68,
            v:9,
            w:10,
            f:14,
            t:57,
            z:4,
            c:36,
            u:34,
            p:28,
            y:17,
            j:2,
            x:3,
            q:2
        },
        total:953
    },

    // The random seed for the game, set on init
    seed: 0,
    seedOffset: 1000000,

    // The bonus multiplier for word length
    lengthBonuses: [0, 0, 1, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5],

    // The bonus multiplier for word streaks
    lengthMultipliers: [1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5],

    // The minimum word length required
    minWordLength: 3,

    // The number of tiles on the board
    rackSize: 9,

    // The total number of tiles that will drop
    maxTiles: 75,

    // Should the score be scaled to correlate with the frequency
    // of how often the letter appears in the dictionary
    scaledScore: true,

    // Are the moves in the game being logged?
    logging: true,

    // The rate at which tiles will be dropping
    // This is kept in the game logic to help verify scores
    updateRate: 2000,

    // Should a multiplier be used for streaks
    // (back-to-back word completions with no drops)
    useStreakMultiplier: false,

    // If a multiplier should be used for streaks of a certain
    // word length
    useLengthMultiplier: 4,

    // Should length bonus be applied
    useLengthBonus: false,

    // Start a new game running
    start: function() {
        // Reset the game to the start
        this.reset();

        // Log the start time for future logging
        this.lastTime = this.startTime = (new Date).getTime();

        // Start the updating process for the first time
        this.update();

        // Notify the UI that the game has started
        this.trigger("start");
    },

    // Stop and reset the game
    reset: function() {
        // Reset all the possible variables in the game
        this.rack = [];
        this.tileQueue = [];
        this.purityControl = [];

        this.score = 0;
        this.multiplier = 1;
        this.streak = 0;
        this.droppedTiles = 0;
        this.foundWord = "";

        clearInterval(this.timer);

        // Make sure the log is reset
        if (this.logging) {
            this._log = [];
        }

        // Notify the UI that the game has been reset
        this.trigger("reset");
    },

    getState: function() {
        // TODO:
        // - Get longest word
        // - Get # of dropped tiles
        // - Get longest streak
        return {
            results: {
                score: this.score
            },
            settings: this.state,
            log: this._log || []
        };
    },

    // One of the two actions that are taken by the UI
    // An update occurs after a specific amount of time (managed by a timer)
    // or when a user manually triggers an update
    // (double-click or submit, for example)
    update: function() {
        var self = this;

        // If no tiles are left then the game is over.
        if (this.maxTiles > 0 && this.rack.length === 0 && this.droppedTiles > 0) {
            return;
        }

        // Log that an update has occurred for a later playback
        this.log();

        // Check to see if we should be removing something
        // (Only happens if the board is full or if no more tiles will drop)
        if (this.rack.length &&
                (this.rack.length === this.rackSize ||
                    (this.maxTiles > 0 &&
                        this.droppedTiles >= this.maxTiles))) {
            if (!this.foundWord && this.maxTiles < 0) {
                this.trigger("gameover");
                return;
            } else {
                // Remove a word, if found, otherwise drop a tile
                this.removeWord(this.foundWord || this.rack[0]);
            }
        }

        // Figure out how many tiles need to drop and drop them in
        for (var i = 0, l = this.rackSize - this.rack.length; i < l; i++) {
            this.addTile();
            this.dropTile();
        }

        // Check to see if we've found a new word
        this.findWord();

        // Notify the UI that the updated tiles are ready to be displayed
        this.trigger("updateDone");

        // If no tiles are left then the game is over.
        if (this.rack.length === 0) {
            this.trigger("gameover");

        // Otherwise start a timer to call update a bit in the future
        // Make sure a timer exists and that we aren't in playback mode
        } else if (typeof setTimeout !== "undefined" && this.logging) {
            clearTimeout(this.timer);

            this.timer = setTimeout(function() {
                self.update();
            }, this.updateRate * this.rack.length);
        }
    },

    // The other one of the two actions taken by the UI
    // This occurs when a user taps two different tiles to make them
    // switch places
    swap: function(a, b) {
        // Make sure that we aren't swapping the same tile with itself
        if (a !== b) {
            // Log that a swap has occurred for a later playback
            this.log([a, b]);

            // Swap the tiles
            var old = this.rack[b];
            this.rack[b] = this.rack[a];
            this.rack[a] = old;

            // Notify the UI that a tile swap has occurred
            this.trigger("swap", a, b);

            // See if a new word exists after the swap
            this.findWord();
        }
    },

    // Internal function for dropping a tile into the player's rack
    dropTile: function() {
        if (!this.tileQueue.length) {
            return;
        }

        var tile = this.tileQueue.shift();

        // Take the tile off the queue and add it to the rack
        this.rack.push(tile);

        // Update the total letter used count
        this.droppedTiles++;

        // Notify anyone listening that a letter was dropped
        this.trigger("dropTile", tile);
    },

    // Internal function for adding tiles to the tile queue
    addTile: function(count) {
        // We need to make sure that there aren't too many vowels
        // (or consonants) being passed in to the game
        var letter;
        var letters = this.purityControl.join("");
        var vowelCheck = /[aeiou]/;
        var hasVowel = vowelCheck.test(letters);
        var hasConsonant = /[^aeiou]/.test(letters);

        // If the last letter dropped was a Q, make sure we drop a U next
        if (this.purityControl[0] === "q") {
            letter = "u";

        // Otherwise attempt to drop a random letter
        } else {
            letter = this.possibleLetters[
                Math.round(this.random() * this.possibleLetters.length)];
        }

        // Are we currently dealing with a vowel?
        var isVowel = vowelCheck.test(letter);

        // Check to see if we should be dropping this letter
        if (letter && (count > 20 ||
                // Make sure we don't drop duplicate letter tiles
                this.purityControl.indexOf(letter) < 0 && (

                    // Not enough tiles in the rack yet, don't care about letter
                    this.purityControl.length < 3 ||

                    // If there is already a good mix just drop anything
                    hasVowel && hasConsonant ||

                    // No vowel has dropped recently and a vowel is dropping
                    !hasVowel && isVowel ||

                    // No consonant has dropped and one is dropping now
                    !hasConsonant && !isVowel
               )
           )) {

            // Add the new letter onto the queue
            this.purityControl.unshift(letter);

            // Make sure the queue doesn't grow too long
            this.purityControl.splice(3);

            // Add the tile to the queue
            this.tileQueue.push(letter);

        // The letter didn't match the criteria so try again
        // We limit the number of recursions that can occur here
        } else {
            return this.addTile((count || 0) + 1);
        }
    },

    // Finding and extracting words
    findWord: function() {
        // Copy all the tiles
        var curRack = this.rack.slice(0),
            word = "";

        // Reset any previously found word
        this.foundWord = "";

        // We're going to keep going through the available letters
        // looking for a long-enough word
        while (curRack.length >= this.minWordLength) {
            // Find a "word" from the available tiles
            word = curRack.join("");

            // ... and see if it's in the dictionary
            if (this.dict.isWord(word)) {
                // If it is, then we've found the word and we can stop
                this.foundWord = word;
                break;
            }

            // ... otherwise we need to remove the last letter and continue
            curRack.pop();
        }

        // Notify the UI that a word was found (or "" if no word was found)
        this.trigger("foundWord", this.foundWord);
    },

    // Remove a set of tiles (holding a word, or a dropped tile, from the board)
    removeWord: function(word) {
        // Split it up to calculate the score
        var letters = word.split("");
        var num = 0;
        var total = 0;

        // Words must be a minimum length
        var state = letters.length >= this.minWordLength;

        // Give a bonus for longer words
        var lengthBonus = this.useLengthBonus ?
            this.lengthBonuses[word.length] :
            1;

        // Increase the streak of the word is long enough
        if (letters.length >= this.useLengthMultiplier) {
            this.streak = Math.min(this.streak + 1,
                this.lengthMultipliers.length - 1);

        // Reset the streak if the user failed to write a long-enough word
        } else {
            this.streak = 0;
        }

        // Get the current multiplier
        var multiplier = this.multiplier;

        // Only extract a word if a non-empty one was passed in
        if (!word) {
            return;
        }

        // Give a bonus for long word streaks
        var lengthMultiplier = this.useLengthMultiplier ?
            this.lengthMultipliers[this.streak] :
            1;

        // Remove the tiles from the collection
        this.rack.splice(0, word.length);

        // Notify the UI that the tiles were removed
        this.trigger("removeTiles", word.length);

        // Total up the points for the individual tiles
        for (var i = 0; i < letters.length; i++) {
            num += this.letterPoints[letters[i]];
        }

        // Factor in all the score modifiers
        total = Math.round(state ?
            num * multiplier * lengthBonus * lengthMultiplier :
            -1 * num);

        // Add the total to the running score
        this.score += total;

        // Update the streak multiplier
        if (this.useStreakMultiplier && state) {
            // Increase the multiplier, slowly
            this.multiplier += (1 / (Math.floor(this.multiplier) * 10));
        }

        // Return the results so that they can be used in the UI
        this.trigger("updateScore", {
            word: word,
            state: state,
            total: total,
            num: num,
            streak: this.streak,
            lengthMultiplier: lengthMultiplier,
            lengthBonus: lengthBonus,
            multiplier: multiplier
        });

        // Reset the word
        this.foundWord = "";
    },

    // Play back a previously-played game (based upon the logged actions)
    // Set instant to true to play the entire game back instantly (no delay)
    // Pass in some log data to use that instead of the current log
    playback: function(instant, data) {
        var lastTime = (new Date).getTime(),
            self = this,

            // Clone the log data as we'll be manipulating it
            log = (data || this._log).slice(0);

        // Disable logging before the game is played
        this.logging = false;

        // ... and immediately reset the game
        this.reset();

        // Provide a mechanism for playing back a game on the server-side
        if (instant) {
            // We're going to execute all the moves in order (disregard time!)
            while (log.length) {
                // Grab the first two tokens on the stack
                var first = log[0],
                    next = log[1];

                // The first token is always a time diff from the previous
                // action. Remove that time diff
                log.shift();

                // If the next token is an array then we're doing a swap
                if (next && typeof next === "object") {
                    self.swap(next[0], next[1]);
                    log.shift();

                // Otherwise it's just a regular update
                } else {
                    self.update();
                }
            }

        // If we're in a browser then we play it back in real-time
        } else if (typeof setInterval !== "undefined") {
            // The timer will keep looping and executing moves that need to
            // occur
            setInterval(function() {
                var curTime = (new Date).getTime();

                // We're going to execute all moves whose time diff has come up
                while (log.length) {
                    // All logged items use a time diff relative to the last
                    // action
                    var diffTime = curTime - lastTime,
                        first = log[0],
                        next = log[1];

                    // The first token is always a time diff from the previous
                    // action
                    if (first <= diffTime) {
                        // Remove that time diff
                        log.shift();

                        // If the next token is an array then we're doing a swap
                        if (next && typeof next === "object") {
                            self.swap(next[0], next[1]);
                            log.shift();

                        // Otherwise it's just a regular update
                        } else {
                            self.update();
                        }

                        // Make sure to remember the current time for later
                        // diffs
                        lastTime = curTime;

                    // No valid move was found so we can wait until the next
                    // timer
                    } else {
                        break;
                    }
                }
            }, 20);
        }
    },

    // Internal function for logging out update and swap actions
    log: function(val) {
        // Only if logging is turned on (which is the default)
        if (this.logging) {
            // We actually log a time diff (the difference between the
            // current action and the previous action)
            var curTime = (new Date).getTime();
            this._log.push(curTime - this.lastTime);

            // If a value was passed in then it was a swap
            if (val) {
                this._log.push(val);
            }

            // Remember the time for diffing the next action
            this.lastTime = curTime;
        }
    },

    // A seeded random number generator for dropping random,
    // but consistent, tiles
    random: function() {
        // Robert Jenkins' 32 bit integer hash function.
        // JS implementation from V8 benchmark
        var seed = this.seed = this.seed + this.seedOffset;

        seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
        seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
        seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
        seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
        seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
        seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
        seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;

        return (seed & 0xfffffff) / 0x10000000;
    }
});

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

// If we're using Node.js, export the Game
if (typeof exports !== "undefined") {
    exports.Game = Game;
    exports.Bot = Bot;
}
