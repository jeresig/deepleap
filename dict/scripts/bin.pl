#!/usr/bin/perl

foreach my $l ( a .. z ) {
  `grep "^$l" dict.txt > words/$l.txt`
}
