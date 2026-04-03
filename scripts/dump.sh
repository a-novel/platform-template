#!/bin/bash

set -e

dumpCmd="pg_dump -U postgres --clean --if-exists --role=postgres postgres"
clearCmd="psql -U postgres -d public -c 'DELETE FROM public.activity_describing_entity; DELETE FROM public.activity_modified_entity; DELETE FROM public.activity_revision;'"

APP_NAME="auth-translations"

if [ "$IS_CI" == "true" ]
then
    docker exec "${APP_NAME}"-tolgee-db-1 $clearCmd
    docker exec "${APP_NAME}"-tolgee-db-1 $dumpCmd > builds/tolgee.database.dump
else
    podman exec "${APP_NAME}"_tolgee-db_1 $clearCmd
    podman exec "${APP_NAME}"_tolgee-db_1 $dumpCmd > builds/tolgee.database.dump
fi
