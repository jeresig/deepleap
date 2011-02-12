#!/usr/bin/perl


foreach my $l ( a .. z ) {
  `grep "^$l" ospd3.txt > words/$l.txt`
}
