#!/usr/bin/env bash
set -Eeuo pipefail
cd /opt/goods-island
exec 9>.deploy.lock
flock -n 9 || { echo 'Another deployment is running'; exit 1; }
image="${1:?Expected immutable image reference}"
[[ "$image" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]] || { echo 'Invalid image'; exit 1; }
[[ -f .env ]] || { echo 'Configure /opt/goods-island/.env first'; exit 1; }
chmod 600 .env
previous=$(cat .current-image 2>/dev/null || true)
export APP_IMAGE="$image"
compose() { docker compose --env-file .env -f compose.yaml "$@"; }
compose config --quiet
compose pull web worker
compose up -d --wait db
recover() {
  echo 'Deployment failed; database backup retained. Never auto-reverse migrations.'
  if [[ -n "$previous" ]]; then
    export APP_IMAGE="$previous"
    compose up -d --wait web worker || true
    echo 'Attempted previous application image; inspect schema compatibility and logs.'
  fi
}
trap recover ERR
# Pause writers before backup so the backup covers all pre-deploy writes.
compose stop web worker
mkdir -p backups
chmod 700 backups
backup="backups/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).dump"
compose exec -T db pg_dump -U guzi -Fc guzi > "$backup"
chmod 600 "$backup"
compose run --rm --no-deps web sh -c 'if [ "$STORAGE_DRIVER" = filesystem ]; then tar -C "$STORAGE_LOCAL_DIR" -czf - .; fi' > "$backup.images.tar.gz"
chmod 600 "$backup.images.tar.gz"
compose run --rm --no-deps web node node_modules/prisma/build/index.js migrate deploy
compose run --rm --no-deps web node --import tsx prisma/seed.ts
compose up -d --wait web worker proxy
curl --fail --silent --show-error http://127.0.0.1:3000/api/health >/dev/null
printf '%s\n' "$image" > .current-image
sed -i '/^APP_IMAGE=/d' .env
printf 'APP_IMAGE=%s\n' "$image" >> .env
trap - ERR
echo "Deployed $image"
