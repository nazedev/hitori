#!/usr/bin/bash

pkg install git nodejs ffmpeg imagemagick yarn
yarn install
npm start

echo "Installation complete. To start the script, run: npm start"
