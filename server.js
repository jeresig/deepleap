var fs = require("fs"),
	http = require("http"),
	sql = new (require("mysql").Client);

fs.readFile( "config/config.json", "utf8", function( err, config ) {
	config = JSON.parse( config );

	sql.user = config.sqlUser;
	sql.password = config.sqlPass;

	sql.connect(function() {
		sql.useDatabase( config.sqlDB, function() {

			fs.readFile( config.indexFile, "utf8", function( err, data ) {
				data = data.replace( /(src|href)="\/?(?!http)/ig, '$1="' + config.cdnURL );
	
				http.createServer(function( request, response ) {
					response.writeHead( 200, { "Content-type": "text/html" } );
					response.end( data );
		
					// TODO: Write logic for handling score submissions, score checking, etc.
				}).listen( config.serverPort );
			});

		});
	});
});
