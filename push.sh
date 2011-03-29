#!/bin/sh

git push origin master
git push node master
ssh -t jeresig@cdn.deepleap.org "cd cdn.deepleap.org && git pull"
