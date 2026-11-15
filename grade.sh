#!/usr/bin/env bash
# Instructor solution:  ./grade.sh
# Student repo (run from their root, with .env present):  DC="docker compose" ENV_FILE=.env ./grade.sh
DC="${DC:-docker compose -f solution/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-solution/.env}"
set -a; . "$ENV_FILE"; set +a
BASE="http://localhost:${GATEWAY_PORT:-8080}"
PASS=0; FAIL=0
check() { if eval "$2" >/dev/null 2>&1; then echo "PASS  $1"; PASS=$((PASS+1)); else echo "FAIL  $1"; FAIL=$((FAIL+1)); fi; }

$DC down -v >/dev/null 2>&1
check "compose up --build --wait (all healthy)"   "$DC up -d --build --wait --wait-timeout 300"
check "exactly 9 containers running"              "[ \"\$($DC ps -q | wc -l)\" -eq 9 ]"
check "health endpoint through gateway"           "curl -fs $BASE/api/health"
check "frontend served at / through gateway"      "curl -fs $BASE/ | grep -qi '<div id=\"root\">'"
check "events list (Postgres seed)"               "curl -fs $BASE/api/events | grep -q 'Hack Night'"
check "Redis cache: second call is a HIT"         "curl -fs -o /dev/null $BASE/api/events; curl -fsI $BASE/api/events | grep -qi 'x-cache: HIT'"
check "register accepted (202)"                   "[ \"\$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/api/events/1/register -H 'Content-Type: application/json' -d '{\"name\":\"Asha\",\"email\":\"asha@example.com\"}')\" = 202 ]"
sleep 4
check "RabbitMQ queue exists"                     "curl -fs -u $RABBITMQ_USER:$RABBITMQ_PASS http://127.0.0.1:15672/api/queues | grep -q registration_emails"
check "worker delivered email to MailHog"         "curl -fs http://127.0.0.1:8025/api/v2/messages | grep -q 'asha@example.com'"
printf 'fake-image-bytes' > /tmp/ch-test.png
URL=$(curl -fs -X POST $BASE/api/events/1/image -F "image=@/tmp/ch-test.png;type=image/png" | sed -E 's/.*"url":"([^"]+)".*/\1/')
check "upload stored in MinIO, served at /storage" "curl -fs $BASE$URL | grep -q fake-image-bytes"
$DC down >/dev/null 2>&1; $DC up -d --wait --wait-timeout 300 >/dev/null 2>&1
check "Postgres data survives down/up"            "curl -fs $BASE/api/events | grep -q '\"registrations\":1'"
for s in api worker frontend gateway; do
  check "$s runs as non-root" "[ \"\$($DC exec -T $s id -u)\" != 0 ]"
done
check "only one port published on all interfaces" "[ \"\$(docker ps --format '{{.Ports}}' | grep -o '0.0.0.0:[0-9]*' | sort -u | wc -l)\" -eq 1 ]"
API_IMG=$($DC images api -q 2>/dev/null | head -1)
check "api image under 250 MB"                    "[ \"\$(docker image inspect $API_IMG --format '{{.Size}}')\" -lt 262144000 ]"
check "no secrets hardcoded in compose file"      "! $DC config --no-interpolate 2>/dev/null | grep -Eiq '(PASSWORD|PASS|SECRET_KEY|ACCESS_KEY): [^\$]'"
echo; echo "Score: $PASS passed, $FAIL failed"
