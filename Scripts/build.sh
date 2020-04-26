#!/bin/sh

# compile counter.ts to counter.js
tsc

# remove exports line, incompatible with TTP environment
sed -i.bak 's/^\(exports\.__esModule = true;\)$/\/\/ \1/g' counter.js
rm counter.js.bak

