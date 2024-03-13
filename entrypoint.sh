#!/bin/sh

ROOT_DIR=/usr/share/nginx/html

echo "Replacing env constants in JS"
for file in $ROOT_DIR/js/app.*.js* $ROOT_DIR/index.html $ROOT_DIR/precache-manifest*.js;
do
  echo "Processing $file ...";

  sed -i 's|'VUE_APP_SOLO_URL_PLACEHOLDER'|'${VUE_APP_SOLO_URL}'|g' $file

done

nginx -g 'daemon off;'
