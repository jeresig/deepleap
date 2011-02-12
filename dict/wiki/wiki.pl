#!/usr/bin/perl

use Data::Dumper;

my $curWord = "";
my %types = ();
my %ttypes = ();

while (<>) {
	if ( /<title>(.*?)</i ) {
		$curWord = $1;

		if ( $curWord =~ /[^a-z]/ ) {
			$curWord = "";
		}

	} elsif ( $curWord && !/<comment/ && !/&lt;!--/ && /{en-(.*?)}/ ) {
		if ( $type !~ /proper/i ) {
			print "$curWord\n";
			$curWord = "";
		}
		next;

		my $info = $1;
		my @args = split(/\|/, $info);
		shift @args;
		my $num = $#args + 1;

		$info =~ /^([a-z-]+)/;
		my $type = $1;

		if ( $type !~ /proper/i && $type !~ /note/i && $type !~ /usage/i && $type !~ /^noun-/ && $type ne "term" ) {
			#$types{"$type$num"} = "$curWord $info";

			print $curWord . "\n";

			if ( $type eq "noun" || $type eq "infl-noun" ) {
				if ( $info !~ /-/ ) {
					print $curWord . "s\n";
				}
			} elsif ( $type =~ /plural/i ) {
				# Word is already displayed.
			} elsif ( $type =~ /^adj/ ) {
				#print "WORD: $curWord\n";
				if ( $info !~ /[^a-z|]/ ) {
					if ( $num == 2 ) {
						if ( length($args[1]) < length($curWord) ) {
							print $args[0] . $args[1] . "\n";
							print $args[0] . "est\n";
						} else {
							print $args[0] . "\n";
							print $args[1] . "\n";
						}
					} else {
						# Word is already displayed.
					}
				}
			} elsif ( $type =~ /^int/ ) {
				# Word is already displayed.
			} elsif ( $type =~ /^adv/ ) {
				if ( $info !~ /[^a-z|]/ && $num >= 2 ) {
					if ( length($args[1]) <= 3 ) {
						print $args[0] . $args[1] . "\n";
						print $args[0] . "st\n";
					} else {
						print $args[0] . "\n";
						print $args[1] . "\n";
					}
				}
			} elsif ( $type eq "conj" ) {
				# Word is already displayed.
			} elsif ( $type =~ /^prep/ ) {
				# Word is already displayed.
			} elsif ( $type eq "part" ) {
				# Word is already displayed.
			} elsif ( $type eq "det" ) {
				# Word is already displayed.
			} elsif ( $type eq "cont" ) {
				# Word is already displayed.
			} elsif ( $type eq "verb" || $type eq "infl-verb" ) {
				#print "WORD: $curWord $info\n";

				# Past Participle
				if ( $args[1] eq "d" || $args[1] eq "ed" || $args[2] eq "d" || $args[2] eq "ed" ) {
					print $args[0] . $args[1] . $args[2] . "\n";
				} elsif ( $args[1] eq "es" || $args[1] eq "ing" ) {
					print $args[0] . "ed\n";
				} elsif ( $args[2] eq "es" || $args[2] eq "ing" ) {
					print $args[0] . $args[1] . "ed\n";
				} elsif ( $args[1] . $args[2] eq "ying" ) {
					print $curWord . "d\n";
				} elsif ( $num >= 3 ) {
					if ( $num == 4 ) {
						print $args[3] . "\n";
					} else {
						print $args[2] . "\n";
					}
				} else {
					print $curWord . "ed\n";
				}

				# Simple Past
				if ( $args[1] eq "d" || $args[1] eq "ed" || $args[2] eq "d" || $args[2] eq "ed" ) {
					print $args[0] . $args[1] . $args[2] . "\n";
				} elsif ( $args[1] eq "es" || $args[1] eq "ing" ) {
					print $args[0] . "ed\n";
				} elsif ( $args[2] eq "es" || $args[2] eq "ing" ) {
					print $args[0] . $args[1] . "ed\n";
				} elsif ( $args[1] . $args[2] eq "ying" ) {
					print $curWord . "d\n";
				} elsif ( $num >= 3 ) {
					print $args[2] . "\n";
				} else {
					print $curWord . "ed\n";
				}
			} else {
				#$ttypes{$type} = "$curWord $info";
			}
			#print "$curWord $type $num\n";
		}
	}
}

#print Dumper(\%ttypes);
