var UI = function() {
	// Initialize a copy of the game
	var game = this.game = new Game();
	this.setSeed();
	
	// Attach to the callback hooks in the game
	this.attachGameEvent( "onLettersReady" );
	this.attachGameEvent( "onAddLetter" );
	this.attachGameEvent( "onRemoveLetters" );
	this.attachGameEvent( "onFindWord" );
	this.attachGameEvent( "onAddPoints" );
	
	// Get the initial context of the circle indicator canvas
	try {
		this.circle = jQuery("#drop")[0].getContext("2d");
	} catch( e ) {}
	
	// Attach event handlers to the document
	this.attachEvents();
	
	// Perform the rest of the initialization
	this.reset();
	
	// Load in the dictionary
	jQuery.get( "dict/dict.txt", function( txt ) {
		var words = txt.split( "\n" ), dict = {};

		for ( var i = 0, l = words.length; i < l; i++ ) {
			dict[ words[i] ] = true;
		}
		
		// Put the dictionary on all copies of the game
		Game.prototype.dict = dict;

		// Need to start the game
		game.update();
	});
};

UI.prototype = {
	
	reset: function() {
		// Empty out the tiles
		this.spanLetters = [];
		jQuery( "#letters" ).html( "" );
	},
	
	attachEvents: function() {
		var activeTile, self = this;

		// Handle tile swapping
		jQuery("#letters").delegate("span", "click", function() {
			// Make sure an old tile is no longer selected
			if ( activeTile && !activeTile.parentNode ) {
				activeTile = null;
			}

			// If a previous tile was already activated
			if ( activeTile ) {
				self.swap( activeTile, this );

				activeTile = null;

			} else {
				activeTile = this;
				jQuery(this).addClass( "active" );
			}

			return false;
		});
		
		// TODO: Should change this to a submit form or some such
		$("#letters").dblclick(function(){
			if ( self.game.foundWord ) {
				clearInterval( self.timer );
				self.game.submit();
			}
		});

		// Stop text selection
		$("#letters").mousedown(function(){
			return false;
		});
	},
	
	swap: function( a, b ) {
		var $a = jQuery( a ), $b = jQuery( b );
		
		// Deactivate the originally-selected tile
		$a.removeClass( "active" );

		// Make sure we aren't trying to swap with itself
		if ( a !== b ) {
			var thisLeft = $b.css( "left" ),
				activeLeft = $a.css( "left" ),
				thisPos = this.posFromLeft( thisLeft ),
				activePos = this.posFromLeft( activeLeft );

			// Move the current tile 
			$b.animate( { left: activeLeft }, 300 );

			// Finally move the originally selected tile
			$a.animate( { left: thisLeft }, 300 );
			
			var oldNode = this.spanLetters[ thisPos ];
			this.spanLetters[ thisPos ] = this.spanLetters[ activePos ];
			this.spanLetters[ activePos ] = oldNode;
			
			this.game.swap( thisPos, activePos );
		}	
	},
	
	updateRate: 2000,
	
	onLettersReady: function() {
		var totalTime = this.updateRate * this.game.letters.length,
			endWarning = totalTime / 4,
			count = 0,
			rate = 30,
			startTime = (new Date).getTime(),
			self = this;
		
		var timer = this.timer = setInterval(function() {
			var curTime = (new Date).getTime();

			self.updateCircle( count / rate, (totalTime - (curTime - startTime)) > endWarning );

			if ( count >= rate ) {
				clearInterval( self.timer );
				self.game.update();
			}
			
			count++;
		}, totalTime / rate);
	},
	
	// Updating circle canvas

	resetCircle: function() {
		if ( this.circle ) {
			this.circle.strokeWidth = "0px";
			this.circle.fillStyle = "rgb(255,255,255)";
			this.circle.fillRect( 0, 0, 20, 20 );

			this.circle.fillStyle = "rgb(210,210,210)";
			this.circle.beginPath();
			this.circle.arc(10, 10, 9, 0, Math.PI * 2, true);
			this.circle.closePath();
			this.circle.fill();
		}
	},

	updateCircle: function( amount, rate ) {
		if ( this.circle ) {
			this.resetCircle();
			this.circle.fillStyle = rate ? "rgb(0,255,0)" : "rgb(255,0,0)";
			this.circle.beginPath();
			this.circle.moveTo(10, 10);
			this.circle.arc(10, 10, 9, -0.5 * Math.PI, (amount * (Math.PI * 2)) - (0.5 * Math.PI), false);
			this.circle.moveTo(10, 10);
			this.circle.closePath();
			this.circle.fill();
		}
	},
	
	onAddPoints: function( result ) {
		jQuery("<li>")
			.addClass( result.state ? "pass" : "fail" )
			.html( "<b>" + (result.total >= 0 ? "+" : "" ) + result.total + ": " + result.word + ".</b> " + 
				( result.state ?
					result.total + " Points " +
						(result.lengthBonus > 1 ? "+" + result.lengthBonus.toFixed(1) + "x Word Length. " : "") +
						(result.multiplier > 1 ? "+" + result.multiplier.toFixed(1) + "x Multiplier. " : "") :
					"Letter not used." )
			).prependTo("#words");

		jQuery("#points").text( this.game.points );	
	},
	
	tileWidth: 90,
	tileMargin: 15,
	
	onAddLetter: function( letter ) {
		// Inject new letter into the UI
		var tileLeft = this.tileWidths( this.game.letters.length ),
			baseLeft = parseFloat( jQuery( this.spanLetters ).last().css( "left" ) || 0 ) + this.tileMargin + this.tileWidth;

		this.spanLetters.push( jQuery( "<span>" + letter + "</span>" )
			.css({
				backgroundPosition: Math.round( Math.random() * 1400 ) + "px",
				left: baseLeft
			})
			.appendTo("#letters")
			.animate( { left: tileLeft }, 500 )[0] );
	
		// Let the user know how many 
		jQuery("#tilesleft").text( this.game.maxLetters - this.game.numLetters > 0 ?
			this.game.maxLetters - this.game.numLetters :
			"No" );
	},
	
	onRemoveLetters: function( num ) {
		this.spanLetters = jQuery( this.spanLetters )
			.slice( 0, num )
				.addClass( "leaving" )
				.fadeOut( 300, function() {
					jQuery(this).remove();
				})
			.end()
			.slice( num )
				.animate( { left: "-=" + (this.tileWidths( num + 1 ) - this.tileMargin) }, 500 )
				.get();
	},
	
	onFindWord: function( word ) {
		jQuery( this.spanLetters )
			.removeClass( "found" )
			.slice( 0, word.length )
				.addClass( "found" );
	},
	
	tileWidths: function( num ) {
		return (num * this.tileMargin) + ((num - 1) * this.tileWidth);
	},

	posFromLeft: function( left ) {
		left = parseFloat( left );
		return (left - this.tileMargin) / (this.tileMargin + this.tileWidth);
	},
	
	setSeed: function() {
		this.game.setSeed( parseInt( /\d+$/.exec( location.search )[0] || 0 ) );
		
		jQuery("#game")
			.attr( "href", "?game=" + this.game.seed )
			.text( this.game.seed );
	},
	
	attachGameEvent: function( method ) {
		var self = this;
		
		this.game[ method ] = function() {
			return self[ method ].apply( self, arguments );
		};
	}
};


jQuery(function() {
	window.ui = new UI();
});