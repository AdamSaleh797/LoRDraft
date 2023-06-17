#!/bin/sh
script_dir="$(dirname "$(realpath "$0")")"

set -e

cd $script_dir && /usr/bin/npm install

cd $script_dir && /usr/bin/npm run build-prod

cd $script_dir && /usr/bin/npm run start-prod-ec2
