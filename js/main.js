jQuery(function() {
	jQuery( "#overview-all" ).dialog({
		title: "DeepLeap",
		modal: true,
		draggable: false,
		resizable: false,
		width: 480
	}).parent().find(".ui-dialog-titlebar-close").remove();
	
	jQuery( "#play-random" ).click(function() {
		jQuery( "#overview-all" ).dialog( "close" );
		
		startGame();
		
		return false;
	});
	
	// Get the seed from the query string (if it exists)
	// and set the seed on the game
	Game.setSeed( parseInt( (/game=(\d+)/.exec( location.search ) || [0,0])[1] ) );
	
	// See if the property that we want is pre-cached in the localStorage
	if ( window.localStorage !== null && window.localStorage.gameDict ) {
		dictReady( window.localStorage.gameDict );
	
	// Load in the dictionary from the server
	} else {
		jQuery.ajax({
			url: cdnHREF + "dict/ptrie.js",
			dataType: "jsonp",
			jsonp: false,
			jsonpCallback: "dictLoaded",
			success: function( txt ) {
				// Cache the dictionary, if possible
				if ( window.localStorage !== null ) {
					window.localStorage.gameDict = txt;
				}

				dictReady( txt );
			}
			// TODO: Add error/timeout handling
		});
	}
});

function dictReady( txt ) {
	// Pass the dictionary into the game
	Game.loadDict( txt );
	
	// Create a sample game that will be played in the main menu
	jQuery( "#sample-game" )
		// The mini game is much smaller
		.game({ tileMargin: 3, tileWidth: 20, tileTopMargin: 3 })
		
		// Seed it with a sample game
		.game("playback", [0,2744,[1,0],928,1247,2408,[4,0],1401,847,3665,[3,0],1152,[3,1],1152,[4,3],2480,[8,4],1400,[6,5],792,6416,[4,0],1312,[4,3],1368,[7,4],1560,[8,4],920,6056,[4,0],1584,[5,1],1272,[3,2],1584,[6,3],1480,[7,4],2304,[5,3],1096,[5,4],912,5216,[4,0],1448,[6,1],2776,[7,4],824,11440,[3,0],1336,[6,1],2736,[5,2],832,7120,[7,0],1680,[6,1],1416,[4,2],4344,11529,[6,1],1832,[8,2],2072,[6,3],1304,4200,[8,1],2231,[6,2],1449,4071,[1,0],1729,[4,1],1168,[4,2],4024,[8,3],1176,14832,[4,0],800,[2,1],1664,3679,[3,0],1393,[3,1],2984,1784,[2,0],976,[2,1],760,[3,2],776,[4,3],840,11336,[1,0],1072,[3,1],1417,[7,2],799,8928,[2,0],1745,[5,1],1447,[3,2],1760,[7,2],1329,10345,8267,6224,4148,2066,167])
		
		// Reveal the mini game
		.show();
}

function startGame() {
	if ( !Game.dict ) {
		return;
	}
	
	// Need to start the game
	jQuery( "#main" ).game().game("start");
	
	// See if we're doing a VS match, or not
	if ( /&vs=([^&]+)/.test( location.search ) ) {
		// Create a smaller game that will be played back simultaneously
		jQuery( "#mini-main" )
			// The mini game is much smaller
			.game({ tileMargin: 5, tileWidth: 26, tileTopMargin: 3, showTiles: false })
			
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