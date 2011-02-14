#!/usr/bin/perl

use CGI;
use Data::Dumper;

my %words = map { $_, 1 } split(/\n/, `cat dict/dict.txt`);

use base qw(Net::Server::HTTP);
__PACKAGE__->run( port => 8338 );

sub process_http_request {
	my $cgi = CGI->new;

	my $word = $cgi->param( "word" );
	$word =~ s/\W//g;

	my $callback = $cgi->param( "callback" );
	$callback =~ s/\W//g;

	print "Content-type: text/javascript\n\n";

	if ( $word && $callback ) {
		print $callback . '({"word":"' . $word .
			'","pass":' . (defined $words{ $word } ? 'true' : 'false') . '})';
	}
}
