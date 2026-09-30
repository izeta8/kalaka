#!/bin/bash

set -eu

dropdb --if-exists --force "$POSTGRES_TEST_DATABASE" -U "$POSTGRES_USER" > /dev/null
createdb "$POSTGRES_TEST_DATABASE" -U "$POSTGRES_USER" > /dev/null

# Iterate trough each .sql to execute  
for f in /docker-entrypoint-initdb.d/*.sql ; do
  psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$POSTGRES_TEST_DATABASE" -f "$f" > /dev/null
done
