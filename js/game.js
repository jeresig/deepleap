var Game = function() {
	// Initialize the data structures used by the game
	this.callbacks = {};
	
	// Build a full array of all possible letters from which to pull
	this.possible = [];

	// We do this to make it easier to grab a random letter from a list
	for ( var i in this.data.letters ) {
		var num = this.data.letters[i];
		for ( var j = 0; j < num; j++ ) {
			this.possible.push( i );
		}
	}
};

Game.prototype = {
	// Letter data
	// Distribution of OSPD4 + OpenOffice en_US + Wiktionary English
	data: {letters:{a:77,d:38,h:23,e:111,i:75,n:58,g:27,s:85,k:13,l:53,m:27,b:21,o:61,r:68,v:9,w:10,f:14,t:57,z:4,c:36,u:34,p:28,y:17,j:2,x:3,q:2},total:953},
	
	// The game dictionary (will be populated by the UI on load)
	dict: {},
	
	// The random seed for the game, set using .setSeed()
	seed: 0,
	seedOffset: 1000000,
	
	// The bonus multiplier for word length
	lengths: [ 0, 0, 1, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5 ],
	
	// The minimum word length required
	minWordLength: 3,
	
	// The number of tiles on the board
	max: 9,
	
	// The total number of tiles that will drop
	maxLetters: 75,
	
	// Are the moves in the game being logged?
	logging: true,
	
	// The rate at which tiles will be dropping
	// This is kept in the game logic to help verify scores
	updateRate: 2000,
	
	// The random seed for the game (allows for re-playable games with identical drops)
	// Be sure to intialize this before starting the game
	setSeed: function( seed ) {
		this.firstSeed = this.seed = seed || Math.round(Math.random() * 1000);
	},
	
	// Start a new game running
	start: function() {
		// Reset the game to the start
		this.reset();
		
		// Log the start time for future logging
		this.lastTime = this.startTime = (new Date).getTime();
		
		// Start the updating process for the first time
		this.update();
		
		// Notify the UI that the game has started
		this.trigger( "Start" );
	},
	
	// Stop and reset the game
	reset: function() {
		// Reset all the possible variables in the game
		this.seed = this.firstSeed;
		
		this.letters = [];
		this.purityControl = [];
		
		this.points = 0;
		this.multiplier = 1;
		this.numLetters = 0;
		this.foundWord = "";
		
		// Make sure the log is reset
		if ( this.logging ) {
			this._log = [];
		}

		// Notify the UI that the game has been reset
		this.trigger( "Reset" );
	},

	// One of the two actions that are taken by the UI
	// An update occurs after a specific amount of time (managed by a timer)
	// or when a user manually triggers an update (double-click or submit, for example)
	update: function() {
		// If no letters are left then the game is over.
		if ( this.letters.length === 0 && this.numLetters > 0 ) {
			return;
		}
		
		// Log that an update has occurred for a later playback
		this.log();
		
		// Check to see if we should be removing something
		// (Only happens if the board is full or if no more tiles will drop)
		if ( this.letters.length &&
				(this.letters.length === this.max || this.numLetters >= this.maxLetters) ) {
			// Remove a word, if found, otherwise drop a tile
			this.removeWord( this.foundWord || this.letters[0] );
		}
			
		// Figure out how many letters need to drop and drop them in
		for ( var i = 0, l = this.max - this.letters.length; i < l; i++ ) {
			this.dropTile();
		}

		// Check to see if we've found a new word
		this.findWord();
		
		// Notify the UI that the updated letters are ready to be displayed
		this.trigger( "LettersReady" );
		
		// If no letters are left then the game is over.
		if ( this.letters.length === 0 ) {
			this.trigger( "GameOver" );
		}
	},
	
	// The other one of the two actions taken by the UI
	// This occurs when a user taps two different tiles to make them switch places
	swap: function( a, b ) {
		// Make sure that we aren't swapping the same tile with itself
		if ( a !== b ) {
			// Log that a swap has occurred for a later playback
			this.log( [ a, b ] );
			
			// Swap the letters
			var old = this.letters[ b ];
			this.letters[ b ] = this.letters[ a ];
			this.letters[ a ] = old;
		
			// Notify the UI that a tile swap has occurred
			this.trigger( "Swap", a, b );

			// See if a new word exists after the swap
			this.findWord();
		}
	},
	
	// Internal function for dropping a tile
	// (count argument is only used internally)
	dropTile: function( count ) {
		// We need to make sure that there aren't too many vowels
		// (or consonants) being passed in to the game
		var vowelCheck = /[aeiou]/,
			notVowelCheck = /[^aeiou]/;
		
		// Don't add any more letters if we've already hit the max
		if ( this.numLetters + 1 <= this.maxLetters ) {
			var letter, isVowel,
				hasVowel = vowelCheck.test( this.purityControl ),
				hasConsonant = notVowelCheck.test( this.purityControl );

			// If the last letter dropped was a Q, make sure we drop a U next
			if ( this.purityControl[ 0 ] === "q" ) {
				letter = "u";
			
			// Otherwise attempt to drop a random letter
			} else {
				letter = this.possible[Math.round((this.random() * this.possible.length))];
			}
			
			// Are we currently dealing with a vowel?
			isVowel = vowelCheck.test(letter);

			// Check to see if we should be dropping this letter
			if ( letter && (count > 20 ||
					// Make sure we don't drop duplicate letters
					this.purityControl[0] !== letter && (
						
						// Not enough letters in the queue yet, don't care about letter
						this.purityControl.length < 4 ||
					
						// No vowel has dropped recently and a vowel is dropping
						!hasVowel && isVowel ||
					
						// No consonant has dropped and one is dropping now
						!hasConsonant && !isVowel
					)
				)) {
				
				// Add the new letter onto the queue
				this.purityControl.unshift( letter );
				
				// Make sure the queue doesn't grow too long
				this.purityControl.splice( 4 );
				
				// Add the letter to the board
				this.letters.push( letter );
				
				// Update the total letter used count
				this.numLetters++;
				
				// Notify anyone listening that a letter was dropped
				this.trigger( "AddLetter", letter );
			
			// The letter didn't match the criteria so try again
			// We limit the number of recursions that can occur here
			} else {
				return this.dropTile( (count || 0) + 1 );
			}
		}
	},
	
	// Finding and extracting words
	findWord: function() {
		// Copy all the letters
		var curLetters = this.letters.slice( 0 ),
			word = "";

		// Reset any previously found word
		this.foundWord = "";

		// We're going to keep going through the available letters
		// looking for a long-enough word
		while ( curLetters.length >= this.minWordLength ) {
			// Find a "word" from the available letters
			word = curLetters.join("");
			
			// ... and see if it's in the dictionary
			if ( this.dict[ word ] ) {
				// If it is, then we've found the word and we can stop
				this.foundWord = word;
				break;
			}

			// ... otherwise we need to remove the last letter and continue
			curLetters.pop();
		}
		
		// Notify the UI that a word was found (or "" if no word was found)
		this.trigger( "FindWord", this.foundWord );
	},

	// Remove a set of tiles (holding a word, or a dropped tile, from the board)
	removeWord: function( word ) {
		// Split it up to calculate the score
		var letters = word.split(""),
			num = 0,
			total = 0,

			// Words must be a minimum length
			state = letters.length >= this.minWordLength,

			// Give a bonus for longer words
			lengthBonus = this.lengths[ word.length ],

			// Get the current multiplier
			multiplier = this.multiplier;
		
		// Only extract a word if a non-empty one was passed in
		if ( word ) {
			// Remove the letters from the collection
			this.letters.splice( 0, word.length );

			// Notify the UI that the letters were removed
			this.trigger( "RemoveLetters", word.length );
			
			// Total up the points for the individual letters
			for ( var i = 0; i < letters.length; i++ ) {
				num += Math.round((this.data.total / this.data.letters[ letters[i] ]) / 8.5);
			}

			// Factor in all the score modifiers
			total = Math.round( state ?
				num * multiplier * lengthBonus :
				-1 * num );

			// Add the total to the running score
			this.points += total;

			// Update the multiplier
			this.multiplier = state ?
				// Increase the multiplier, slowly
				this.multiplier + (1 / (Math.floor(this.multiplier) * 10)) :
				
				// Reset the multiplier if a letter was dropped
				1;

			// Return the results so that they can be used in the UI
			this.trigger( "AddPoints", {
				word: word,
				state: state,
				total: total,
				num: num,
				lengthBonus: lengthBonus,
				multiplier: multiplier
			});

			// Reset the word
			this.foundWord = "";
		}
	},
	
	// Play back a previously-played game (based upon the logged actions)
	playback: function() {
		var lastTime = (new Date).getTime(),
			self = this,
			log = this._log.slice(0);

		// Disable logging before the game is played
		this.logging = false;
		
		// ... and immediately reset the game
		this.reset();

		// Provide a mechanism for playing back a game on the server-side
		if ( typeof exports !== "undefined" ) {
			// We're going to execute all the moves in order (disregard time!)
			while ( log.length ) {
				// Grab the first two tokens on the stack
				var first = log[0],
					next = log[1];

				// The first token is always a time diff from the previous action
				// Remove that time diff
				log.shift();
					
				// If the next token is an array then we're doing a swap
				if ( next && typeof next === "object" ) {
					self.swap( next[0], next[1] );
					log.shift();

				// Otherwise it's just a regular update
				} else {
					self.update();
				}
			}

		// If we're in a browser then we play it back in real-time
		} else if ( typeof setInterval !== "undefined" ) {
			// The timer will keep looping and executing moves that need to occur
			setInterval(function() {
				var curTime = (new Date).getTime();

				// We're going to execute all moves whose time diff has come up
				while ( log.length ) {
					// All logged items use a time diff relative to the last action
					var diffTime = curTime - lastTime,
						first = log[0],
						next = log[1];

					// The first token is always a time diff from the previous action
					if ( first <= diffTime ) {
						// Remove that time diff
						log.shift();
						
						// If the next token is an array then we're doing a swap
						if ( next && typeof next === "object" ) {
							self.swap( next[0], next[1] );
							log.shift();

						// Otherwise it's just a regular update
						} else {
							self.update();
						}
						
						// Make sure to remember the current time for later diffs
						lastTime = curTime;
					
					// No valid move was found so we can wait until the next timer
					} else {
						break;
					}
				}
			}, 20);
		}
	},

	// Internal function for logging out update and swap actions
	log: function( val ) {
		// Only if logging is turned on (which is the default)
		if ( this.logging ) {
			// We actually log a time diff (the difference between the
			// current action and the previous action)
			var curTime = (new Date).getTime();
			this._log.push( curTime - this.lastTime );

			// If a value was passed in then it was a swap
			if ( val ) {
				this._log.push( val );
			}

			// Remember the time for diffing the next action
			this.lastTime = curTime;
		}
	},
	
	// Callbacks and Triggering
	// LettersReady, AddLetter( letter ), RemoveLetters( pos )
	// FindWord( word ), AddPoints( result ), Swap( posA, posB ), GameOver
	
	// Watch for a particular event published by the game
	// Good for updating a UI corresponding to the actions in the game
	bind: function( name, fn ) {
		if ( !this.callbacks[ name ] ) {
			this.callbacks[ name ] = [];
		}
		
		this.callbacks[ name ].push( fn );
	},
	
	// Publish an event (used internally in the game)
	trigger: function( name ) {
		var callbacks = this.callbacks[ name ],
			args = Array.prototype.slice.call( arguments, 1 );
		
		if ( callbacks ) {
			for ( var i = 0, l = callbacks.length; i < l; i++ ) {
				callbacks[ i ].apply( this, args );
			}
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
};

// If we're using Node.js, export the Game
if ( typeof exports !== "undefined" ) {
	exports.Game = Game;
}
