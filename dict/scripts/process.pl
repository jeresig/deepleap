#!/usr/bin/perl

my $out = "";

while ( <> ) {
	chomp;
	if ( length( $_ ) > 2 && length( $_ ) < 10 ) {
		$out .= ($out ? " " : "") . $_;
	}
}

print "dictLoaded('$out');";