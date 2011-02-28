var Game = function() {
	this.callbacks = {};
	this._log = [];
	
	// Build a full array of all possible letters from which to pull
	this.possible = [];

	for ( var i in this.data.letters ) {
		var num = this.data.letters[i];
		for ( var j = 0; j < num; j++ ) {
			this.possible.push( i );
		}
	}

	this.reset();
};

Game.prototype = {
	// Letter data
	// Distribution of OSPD4 + OpenOffice en_US + Wiktionary English
	data: {letters:{a:77,d:38,h:23,e:111,i:75,n:58,g:27,s:85,k:13,l:53,m:27,b:21,o:61,r:68,v:9,w:10,f:14,t:57,z:4,c:36,u:34,p:28,y:17,j:2,x:3,q:2},total:953},
	
	dict: {},
	
	reset: function() {
		this.letters = [];
		this.purityControl = [];
		this.seed = this.firstSeed;

		this.trigger( "Reset" );
	},
	
	start: function() {
		// Log the start time for future logging
		this.lastTime = this.startTime = (new Date).getTime();
		
		// Start the updating process for the first time
		this.update();
	},

	playback: function() {
		var lastTime = (new Date).getTime(),
			self = this;

		this.logging = false;
		this.reset();

		if ( typeof setInterval !== "undefined" ) {
			setInterval(function() {
				var curTime = (new Date).getTime();

				while ( self._log.length ) {
					var diffTime = curTime - lastTime,
						first = self._log[0],
						next = self._log[1];

					if ( first <= diffTime ) {
						self._log.shift();
						
						if ( next && typeof next === "object" ) {
							self.swap( next[0], next[1] );
							self._log.shift();

						} else {
							self.update();
						}
						
						lastTime = curTime;
					} else {
						break;
					}
				}
			}, 20);
		}
	},

	log: function( val ) {
		if ( this.logging ) {
			var curTime = (new Date).getTime();
			this._log.push( curTime - this.lastTime );

			if ( val ) {
				this._log.push( val );
			}

			this.lastTime = curTime;
		}
	},
	
	// Callbacks and Triggering
	// LettersReady, AddLetter( letter ), RemoveLetters( pos )
	// FindWord( word ), AddPoints( result ), Swap( posA, posB ), GameOver
	on: function( name, fn ) {
		if ( !this.callbacks[ name ] ) {
			this.callbacks[ name ] = [];
		}
		
		this.callbacks[ name ].push( fn );
	},
	
	trigger: function( name ) {
		var callbacks = this.callbacks[ name ],
			args = Array.prototype.slice.call( arguments, 1 );
		
		if ( callbacks ) {
			for ( var i = 0, l = callbacks.length; i < l; i++ ) {
				callbacks[ i ].apply( this, args );
			}
		}
	},
	
	logging: true,
	
	// The rate at which tiles will be dropping
	// This is kept in the game logic to help verify scores
	updateRate: 2000,

	update: function() {
		var allDropped = this.numLetters >= this.maxLetters,
			lettersLength = this.letters.length;
		
		this.log();
		
		// If no letters are left and there are no more letters to
		// pull from then the game is over.
		if ( lettersLength === 0 && allDropped ) {
			this.trigger( "GameOver" );
			return;
		}
		
		// Check to see if we should be removing something
		// (Only happens if the board is full or if no more tiles will drop)
		if ( lettersLength === this.max || allDropped ) {
			// If the user has found a word
			if ( this.foundWord ) {
				// Extract the word
				this.extractWord( this.foundWord );
		
			// Otherwise we need to drop a tile
			} else if ( lettersLength ) {
				this.extractWord( this.letters[0] );
			}
		}
			
		// Figure out how many letters need to drop and drop them in
		for ( var i = 0, l = this.max - this.letters.length; i < l; i++ ) {
			this.addLetter();
		}

		// Check to see if we've found a new word
		this.findWord();
		
		// Notify the UI that the updated letters are ready to be displayed
		this.trigger( "LettersReady" );
	},
	
	swap: function( a, b ) {
		// Make sure that we aren't swapping the same tile with itself
		if ( a !== b ) {
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
	
	max: 9,
	numLetters: 0,
	maxLetters: 75,
	
	addLetter: function( count ) {
		var vowelCheck = /[aeiou]/, notVowelCheck = /[^aeiou]/;
		
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
				return this.addLetter( (count || 0) + 1 );
			}
		}
	},
	
	removeLetters: function( num ) {
		this.letters.splice( 0, num );
		
		this.trigger( "RemoveLetters", num );
	},
	
	// Finding and extracting words
	foundWord: "",
	
	findWord: function() {
		var curLetters = this.letters.slice( 0 ),
			word = "";

		this.foundWord = "";

		while ( curLetters.length > 2 ) {
			word = curLetters.join("");
			
			if ( this.dict[ word ] ) {
				this.foundWord = word;
				break;
			}

			curLetters.pop();
		}
		
		this.trigger( "FindWord", this.foundWord );
	},

	extractWord: function( word ) {
		if ( word ) {
			// Extract the word
			this.removeLetters( word.length );
			
			// Add the points into the display
			this.addPoints( word );

			// Reset the word
			this.foundWord = "";
		}
	},
	
	// Point calculation
	multiplier: 1,
	lengths: [ 0, 0, 1, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5 ],
	points: 0,
	minWordLength: 3,

	addPoints: function( word )  {
		// Split it up to calculate the score
		var letters = word.split(""),
			num = 0,
			
			// Words must be a minimum length
			state = letters.length >= this.minWordLength,
			
			// Give a bonus for longer words
			lengthBonus = this.lengths[ word.length ],
			
			// Get the current multiplier
			multiplier = this.multiplier;

		// Total up the points for the individual letters
		for ( var i = 0; i < letters.length; i++ ) {
			num += this.getPoint( letters[i] );
		}
		
		// Factor in all the score modifiers
		var total = Math.round( state ?
			num * multiplier * lengthBonus :
			-1 * num );

		// Add the total to the running score
		this.points += total;
		
		// Update the multiplier
		if ( state ) {
			// Increase the multiplier
			this.multiplier += 1 / (Math.floor(this.multiplier) * 10);
			
		} else {
			// Reset the multiplier if a letter was dropped
			this.multiplier = 1;
		}
		
		// Return the results so that they can be used in the UI
		this.trigger( "AddPoints", {
			word: word,
			state: state,
			total: total,
			num: num,
			lengthBonus: lengthBonus,
			multiplier: multiplier
		});
	},
	
	getPoint: function( letter ) {
		return Math.round((this.data.total / this.data.letters[ letter ]) / 8.5);
	},
	
	seed: 0,
	seedOffset: 1000000,
	
	setSeed: function( seed ) {
		this.firstSeed = this.seed = seed || Math.round(Math.random() * 1000);
	},
	
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
