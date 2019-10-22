#!/bin/sh
npm version --no-git-tag-version $1 $2
cd src
npm version --no-git-tag-version $1 $2
