#!/bin/bash

set -eu

createdb "$POSTGRES_TEST_DATABASE" -U "$POSTGRES_USER"

# Iterate trough each .sql to execute  
for f in /docker-entrypoint-initdb.d/*.sql ; do
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_TEST_DATABASE" -f $f
done
