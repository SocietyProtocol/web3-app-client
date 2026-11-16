#!/usr/bin/env bash
# Upload this repo (or CONTEXT) and rebuild one outpost image on AWS.
set -euo pipefail

INSTANCE_ID="${INSTANCE_ID:-i-02994d9540a69390d}"
BUCKET="${BUCKET:-society-migrate-019141478782}"
REGION="${AWS_REGION:-us-east-1}"
: "${IMAGE:?set IMAGE}"
: "${SERVICE:?set SERVICE}"
: "${GITHUB_SHA:?set GITHUB_SHA}"
: "${GITHUB_REPOSITORY:?set GITHUB_REPOSITORY}"

CONTEXT="${CONTEXT:-.}"
ENVFILE="${ENVFILE:-}"
BUILD_ARGS="${BUILD_ARGS:-}"
REPO="${GITHUB_REPOSITORY##*/}"
PREFIX="deploy/${REPO}/${GITHUB_SHA}-${SERVICE}"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

tar --exclude-vcs -C "$CONTEXT" -czf "$WORKDIR/src.tgz" .
aws s3 cp "$WORKDIR/src.tgz" "s3://${BUCKET}/${PREFIX}.tgz" --region "$REGION"

# Deploys of different branches (staging, prod) may run at the same time: each
# works in a directory of its own, and the builds take turns on the box's lock.
SRC="/tmp/society-src-${SERVICE}"
cat > "$WORKDIR/remote.sh" <<EOF
set -eu
exec 9>/tmp/society-deploy.lock
echo "waiting for the deploy lock"
flock 9
rm -rf "${SRC}"
mkdir -p "${SRC}"
aws s3 cp "s3://${BUCKET}/${PREFIX}.tgz" "${SRC}.tgz"
tar -xzf "${SRC}.tgz" -C "${SRC}"
if [ -n "${ENVFILE}" ]; then
  cp "${ENVFILE}" "${SRC}/.env.production"
fi
docker build --network=host ${BUILD_ARGS} -t "${IMAGE}" "${SRC}"
rm -rf "${SRC}" "${SRC}.tgz"
cd /opt/society
docker compose -f apps.yml up -d --no-deps --force-recreate ${SERVICE}
echo DEPLOY_OK ${SERVICE}
EOF
aws s3 cp "$WORKDIR/remote.sh" "s3://${BUCKET}/${PREFIX}.sh" --region "$REGION"

PARAMS="$WORKDIR/params.json"
python3 - "$BUCKET" "$PREFIX" "$WORKDIR/params.json" <<'PY'
import json, sys
bucket, prefix, path = sys.argv[1:]
script = "/tmp/society-deploy-" + prefix.rsplit("/", 1)[-1] + ".sh"
cmd = f"aws s3 cp s3://{bucket}/{prefix}.sh {script} && bash {script} && rm -f {script}"
json.dump({"commands": [cmd]}, open(path, "w"))
PY

COMMAND_ID="$(aws ssm send-command \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --timeout-seconds 3600 \
  --comment "deploy ${REPO} ${SERVICE}" \
  --parameters "file://${PARAMS}" \
  --query Command.CommandId --output text)"
echo "command ${COMMAND_ID}"

# Up to an hour, the command's own timeout: a build may first wait for the other
# branch's build to finish.
for _ in $(seq 1 240); do
  STATUS="$(aws ssm get-command-invocation \
    --region "$REGION" \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --query Status --output text 2>/dev/null || echo Pending)"
  echo "status ${STATUS}"
  case "$STATUS" in
    Success)
      aws ssm get-command-invocation --region "$REGION" --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" --query StandardOutputContent --output text
      exit 0
      ;;
    Failed|Cancelled|TimedOut)
      aws ssm get-command-invocation --region "$REGION" --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" --query StandardErrorContent --output text
      exit 1
      ;;
  esac
  sleep 15
done
echo "timed out waiting for ${COMMAND_ID}"
exit 1
