jQuery(function() {
	// Get the seed from the query string (if it exists)
	// and set the seed on the game
	Game.setSeed( parseInt( (/game=(\d+)/.exec( location.search ) || [0,0])[1] ) );
	
	// Show which game we're playing to the user
	jQuery("#game")
		.attr( "href", "?game=" + Game.seed )
		.text( Game.seed );
	
	// Load in the dictionary
	jQuery.get( "dict/dict.txt", function( txt ) {
		// Pass the dictionary into the game
		Game.loadDict( txt );

		// Need to start the game
		jQuery( "#main" ).game().game("start");
		
		// See if we're doing a VS match, or not
		if ( /&vs=([^&]+)/.test( location.search ) ) {
			// Create a smaller game that will be played back simultaneously
			jQuery( "#mini-main" )
				// The mini game is much smaller
				.game({ tileMargin: 5, tileWidth: 26 })
				
				// Extract the game data from the URL
				// TODO: Grab this from the server instead
				.game("playback", /&vs=([^&]+)/.exec( location.search )[1])
				
				// Reveal the mini game
				.show();
		}
	});
});