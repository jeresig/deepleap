var Game = require('../js/game.js').Game,
	fs = require('fs');

fs.readFile( "dict/dict.txt", "utf8", function( err, data ) {
	var words = data.split( "\n" ), dict = {};

	for ( var i = 0, l = words.length; i < l; i++ ) {
		dict[ words[i] ] = true;
	}

	Game.prototype.dict = dict;

	console.log( "Running Game..." );

	var game = new Game();
	game.setSeed( 558 );
	game._log = [0,14744,[1,0],928,1247,2408,[4,0],1401,847,3665,[3,0],1152,[3,1],1152,[4,3],2480,[8,4],1400,[6,5],792,6416,[4,0],1312,[4,3],1368,[7,4],1560,[8,4],920,6056,[4,0],1584,[5,1],1272,[3,2],1584,[6,3],1480,[7,4],2304,[5,3],1096,[5,4],912,5216,[4,0],1448,[6,1],2776,[7,4],824,11440,[3,0],1336,[6,1],2736,[5,2],832,7120,[7,0],1680,[6,1],1416,[4,2],4344,11529,[6,1],1832,[8,2],2072,[6,3],1304,4200,[8,1],2231,[6,2],1449,4071,[1,0],1729,[4,1],1168,[4,2],4024,[8,3],1176,14832,[4,0],800,[2,1],1664,3679,[3,0],1393,[3,1],2984,1784,[2,0],976,[2,1],760,[3,2],776,[4,3],840,11336,[1,0],1072,[3,1],1417,[7,2],799,8928,[2,0],1745,[5,1],1447,[3,2],1760,[7,2],1329,10345,8267,6224,4148,2066,167];

	game.bind( "LettersReady", function() {
		console.log( game.letters );
	});

	game.bind( "Swap", function() {
		console.log( game.letters );
	});

	game.bind( "AddPoints", function( data ) {
		console.log( "  " + data.word + " (" + data.total + ")" );
	});

	game.playback();

	console.log( "Score: " + game.points );
});
