#!/bin/sh

git push node master
scp -r js css images dict jeresig@cdn.deepleap.org:~/cdn.deepleap.org/
