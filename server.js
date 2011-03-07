var fs = require("fs"),
	http = require("http");

fs.readFile( "config/config.json", "utf8", function( err, config ) {
	config = JSON.parse( config );
	
	fs.readFile( config.indexFile, "utf8", function( err, data ) {
		data = data.replace( /(src|href)="\/?(?!http)/ig, '$1="' + config.cdnURL );
	
		http.createServer(function( request, response ) {
			response.writeHead( 200, { "Content-type": "text/html" } );
			response.end( data );
		
			// TODO: Write logic for handling score submissions, score checking, etc.
		}).listen( config.serverPort );
	});
});
