var fs = require("fs"),
	http = require("http"),
	urlParser = require("url"),
	sql = new (require("mysql").Client),
	config,
	files = {};

fs.readFile( "config/config.json", "utf8", function( err, configData ) {
	config = JSON.parse( configData );
	configReady();
});

function configReady() {
	sql.user = config.sqlUser;
	sql.password = config.sqlPass;

	sql.connect(function() {
		sql.useDatabase( config.sqlDB, dbConnected );
	});
}

function dbConnected() {
	fs.readFile( config.indexFile, "utf8", function( err, data ) {
		data = data.replace( /(src|href)="\/?(?!http)/ig, '$1="' + config.cdnURL );
		
		files.indexFile = data;
		
		filesLoaded();
	});
}

function filesLoaded() {
	http.createServer(function( request, response ) {
		var url = urlParser.parse( request.url, true ),
			query = url.query;
		
		// Saving a replay
		if ( query && query.log ) {
			response.writeHead( 200, { "Content-type": "text/javascript" } );
			
			sql.query( "INSERT INTO replays (hash, email, seed, score, verified, start, date, log) " +
				"VALUES( SHA1(CONCAT(?,?,?,?)), ?, ?, 0, 1, ?, NOW(), ? );",
				// The values that comprise the contents of the SHA1
				[ query.email, query.seed, query.start, query.log,
					query.email, query.seed, query.start, query.log ], function( err ) {
			
				response.end( "gameSaved(" + (err ? "false" : "true") + ");" );
			});
		
		// Show the index file
		} else {
			response.writeHead( 200, { "Content-type": "text/html" } );
			response.end( files.indexFile );
		}

		// TODO: Write logic for handling score submissions, score checking, etc.
	}).listen( config.serverPort );
}