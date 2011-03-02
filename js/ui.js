jQuery.widget( "ui.game", {
	options: {
		tileWidth: 90,
		tileMargin: 15
	},
	
	_create: function() {
		// Initialize a copy of the game
		this.game = new Game();
		this.setSeed();

		// Get the initial context of the circle indicator canvas
		try {
			this.circle = this.element.find(".drop")[0].getContext("2d");
		} catch( e ) {}

		// Attach the various UI events
		this.element.find(".letters").bind({
			click: jQuery.proxy( this.uiEvents.swap, this ),
			dblclick: jQuery.proxy( this.uiEvents.submit, this ),
			mousedown: false
		});

		// Attach all the game events
		for ( var method in this.gameEvents ) {
			this.game.bind( method, jQuery.proxy( this.gameEvents[ method ], this ) );
		}
		
		this.game.reset();
	},
	
	uiEvents: {
		swap: function( e ) {
			var tile = e.target;
			
			// Don't allow swapping if we're replaying the game
			if ( !this.game.logging || tile.nodeName.toLowerCase() !== "span" ) {
				return;
			}
	
			// Make sure an old tile is no longer selected
			if ( this.activeTile && !this.activeTile.parentNode ) {
				this.activeTile = null;
			}

			// If a previous tile was already activated
			if ( this.activeTile ) {
				// Deactivate the originally-selected tile
				jQuery(this.activeTile).removeClass( "active" );
		
				// Make sure we aren't trying to swap with itself
				if ( this.activeTile !== tile ) {
					this.game.swap(
						this.posFromLeft( this.activeTile ),
						this.posFromLeft( tile )
					);
				}

				this.activeTile = null;

			} else {
				this.activeTile = tile;
				jQuery(tile).addClass( "active" );
			}

			return false;
		},
		
		// TODO: Should change this to a submit form or some such
		submit: function(){
			// Don't allow submission if we're replaying the game
			if ( !this.game.logging ) {
				return;
			}
	
			if ( this.game.foundWord ) {
				clearInterval( this.timer );
				this.game.update();
			}
		}
	},
	
	gameEvents: {
		Swap: function( activePos, thisPos ) {
			var $a = jQuery( this.spanLetters[ activePos ] ),
				$b = jQuery( this.spanLetters[ thisPos ] ),
				activeLeft = $a.css( "left" ),
				thisLeft = $b.css( "left" );

			// Move the current tile 
			$b.stop().animate( { left: activeLeft }, 300 );

			// Finally move the originally selected tile
			$a.stop().animate( { left: thisLeft }, 300 );

			// Swap the position of the nodes in the store
			var oldNode = this.spanLetters[ thisPos ];
			this.spanLetters[ thisPos ] = this.spanLetters[ activePos ];
			this.spanLetters[ activePos ] = oldNode;
		},

		LettersReady: function() {
			var totalTime = this.game.updateRate * this.game.rack.length,
				endWarning = totalTime / 4,
				count = 0,
				rate = 30,
				startTime = (new Date).getTime(),
				self = this;

			// Make sure any previous timers are stopped
			if ( this.timer ) {
				clearInterval( this.timer );
			}

			var timer = this.timer = setInterval(function() {
				var curTime = (new Date).getTime();

				self.updateCircle( count / rate, (totalTime - (curTime - startTime)) > endWarning );

				if ( count >= rate ) {
					clearInterval( self.timer );

					// Don't force an update if we're replaying the game
					if ( self.game.logging ) {
						self.game.update();
					}
				}

				count++;
			}, totalTime / rate);
		},
	
		AddLetter: function( letter ) {
			// Inject new letter into the UI
			var tileLeft = this.tileWidths( this.game.rack.length ),
				baseLeft = parseFloat( jQuery( this.spanLetters ).last().css( "left" ) || 0 ) + this.options.tileMargin + this.options.tileWidth;

			this.spanLetters.push( jQuery( "<span>" + letter + "</span>" )
				.css({
					backgroundPosition: Math.round( Math.random() * 1400 ) + "px",
					left: baseLeft
				})
				.appendTo( this.element.find(".letters") )
				.animate( { left: tileLeft }, 500 )[0] );

			// Let the user know how many 
			this.element.find(".tilesleft").text( this.game.maxTiles - this.game.droppedTiles > 0 ?
				this.game.maxTiles - this.game.droppedTiles :
				"No" );
		},

		RemoveLetters: function( num ) {
			this.spanLetters = jQuery( this.spanLetters )
				.slice( 0, num )
					.addClass( "leaving" )
					.stop()
					.fadeOut( 300, function() {
						jQuery(this).remove();
					})
				.end()
				.slice( num )
					.stop()
					.animate( { left: "-=" + (this.tileWidths( num + 1 ) - this.options.tileMargin) }, 500 )
					.get();
		},

		FindWord: function( word ) {
			jQuery( this.spanLetters )
				.removeClass( "found" )
				.slice( 0, word.length )
					.addClass( "found" );
		},
	
		AddPoints: function( result ) {
			jQuery("<li>")
				.addClass( result.state ? "pass" : "fail" )
				.html( "<b>" + (result.total >= 0 ? "+" : "" ) + result.total + ": " + result.word + ".</b> " + 
					( result.state ?
						result.num + " Points " +
							(result.lengthBonus > 1 ? "+" + result.lengthBonus.toFixed(1) + "x Word Length. " : "") +
							(result.multiplier > 1 ? "+" + result.multiplier.toFixed(1) + "x Multiplier. " : "") :
						"Letter not used." )
				).prependTo( this.element.find(".words") );

			this.element.find(".points").text( this.game.points );	
		},
		
		Reset: function() {
			// Empty out the tiles
			this.spanLetters = [];
			this.element
				.find( ".letters, .words" ).html( "" ).end()
				.find( ".tilesleft, .points" ).text( "0" );

			this.resetCircle();

			clearInterval( this.timer );
		}
	},
	
	start: function() {
		this.game.start();
	},
	
	// Updating circle canvas
	resetCircle: function() {
		if ( this.circle ) {
			this.circle.clearRect( 0, 0, 20, 20 );

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
	
	tileWidths: function( num ) {
		return (num * this.options.tileMargin) + ((num - 1) * this.options.tileWidth);
	},

	posFromLeft: function( node ) {
		return (parseFloat( jQuery( node ).css( "left" ) ) - this.options.tileMargin) /
			(this.options.tileMargin + this.options.tileWidth);
	},
	
	setSeed: function() {
		this.game.setSeed( parseInt( (/game=(\d+)/.exec( location.search ) || [0,0])[1] ) );
		
		// TODO: This is global at the moment, should probably be changed
		jQuery("#game")
			.attr( "href", "?game=" + this.game.seed )
			.text( this.game.seed );
	}
});


jQuery(function() {
	/*
	var seed = parseInt( (/game=(\d+)/.exec( location.search ) || [0,0])[1] );
	this.game.setSeed( parseInt( (/game=(\d+)/.exec( location.search ) || [0,0])[1] ) );
	
	// TODO: This is global at the moment, should probably be changed
	jQuery("#game")
		.attr( "href", "?game=" + this.game.seed )
		.text( this.game.seed );
	*/
	
	// Load in the dictionary
	jQuery.get( "dict/dict.txt", function( txt ) {
		// Pass the dictionary into the game
		Game.loadDict( txt );

		// Need to start the game
		jQuery( "#main" ).game().game("start");
		
		// See if we're doing a VS match, or not
		if ( location.search && /&vs=([^&]+)/.test( location.search ) ) {
			var mini = jQuery( "#mini-main" ).game({ tileMargin: 5, tileWidth: 26 }).show(),
				game = mini.data("game").game;

			game._log = jQuery.parseJSON( /&vs=([^&]+)/.exec( location.search )[1] );
			game.playback();
		}
	});
});
