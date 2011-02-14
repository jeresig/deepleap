#!/usr/bin/perl

use CGI;
use Data::Dumper;

my %words = map { $_, 1 } split(/\n/, `cat dict/dict.txt`);

use base qw(Net::Server::HTTP);
__PACKAGE__->run( port => 8338 );

sub process_http_request {
	print "Content-type: text/javascript\n\n";

	my $cgi = CGI->new;

	my $word = $cgi->param( "word" );
	$word =~ s/\W//g;

	my $orig = $word;

	my $callback = $cgi->param( "callback" );
	$callback =~ s/\W//g;

	# Find the word that we're looking for
	while ( $word ) {
		if ( defined $words{ $word } ) {
			last;
		}

		chop $word;
	}

	if ( $word && $callback ) {
		print $callback . '({"word":"' . ($word || $orig) .
			'","pass":' . ($word ? 'true' : 'false') . '})';
	}
}
