jQuery(function() {
	// Get the seed from the query string (if it exists)
	// and set the seed on the game
	Game.setSeed( parseInt( (/game=(\d+)/.exec( location.search ) || [0,0])[1] ) );
	
	// Show which game we're playing to the user
	jQuery("#game")
		.attr( "href", "?game=" + Game.seed )
		.text( Game.seed );
	
	// See if the property that we want is pre-cached in the localStorage
	if ( window.localStorage !== null && window.localStorage.gameDict ) {
		dictReady( window.localStorage.gameDict );
	
	// Load in the dictionary from the server
	} else {
		jQuery.ajax({
			url: cdnHREF + "dict/dict.js",
			dataType: "jsonp",
			jsonp: false,
			jsonpCallback: "dictLoaded",
			success: function( txt ) {
				// Cache the dictionary, if possible
				if ( window.localStorage !== null ) {
					window.localStorage.gameDict = txt;
				}

				dictReady( txt )
			}
			// TODO: Add error/timeout handling
		});
	}
});

function dictReady( txt ) {
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
}

// Google Analytics
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-8245545-1']);
_gaq.push(['_trackPageview']);

(function() {
	var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
	ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
	var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();