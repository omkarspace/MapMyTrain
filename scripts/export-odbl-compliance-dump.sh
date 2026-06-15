#!/bin/bash
# Location: public-repo/scripts/export-odbl-compliance-dump.sh
# Scheduled via GitHub Actions to export clean snapshots every Sunday morning

set -e

echo "Exporting ODbL Compliant Railway Network Tracks..."
docker exec -t mmt-postgis-db pg_dump -U mmt_admin -t tracks -t stations mapmytrain > ./public/data/odbl_export_latest.sql

echo "Compiling flat GeoJSON vector geometries..."
ogr2ogr -f "GeoJSON" ./public/data/railway_tracks.geojson PG:"host=localhost user=mmt_admin dbname=mapmytrain password=secure_spatial_pwd" "tracks"

echo "Compliance export successful. Assets publicly accessible via HTTP access blocks."
