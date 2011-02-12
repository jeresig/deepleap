#!/bin/sh
# http://ftp.osuosl.org/pub/openoffice/contrib/dictionaries/
./unmunch $1.dic $1.aff | grep -v "'" | grep -v -e "[0-9A-Z]" | grep -v ".........." | sort | uniq > $1.txt
