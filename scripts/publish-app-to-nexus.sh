#!/usr/bin/env bash
# Publish the ACME Order Hub JAR to a Nexus hosted repository (default: acme-releases).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JAR="${ROOT}/target/lightwell-app-1.0.0-SNAPSHOT.jar"
POM="${ROOT}/pom.xml"

NEXUS_URL="${NEXUS_URL:-http://localhost:8081}"
NEXUS_REPO="${NEXUS_REPO:-acme-releases}"
NEXUS_USER="${NEXUS_USER:-admin}"
NEXUS_PASSWORD="${NEXUS_PASSWORD:-}"

GROUP_ID="com.acme"
ARTIFACT_ID="lightwell-app"
VERSION="1.0.0-SNAPSHOT"

if [[ -z "${NEXUS_PASSWORD}" ]]; then
  echo "Set NEXUS_PASSWORD (and optionally NEXUS_URL, NEXUS_REPO, NEXUS_USER)" >&2
  exit 1
fi

if [[ ! -f "${JAR}" ]]; then
  echo "Missing ${JAR}. Build first: ./mvnw -Pcommunity package" >&2
  exit 1
fi

echo "Publishing ${ARTIFACT_ID}:${VERSION} → ${NEXUS_URL}/repository/${NEXUS_REPO}/"

curl -fsS -u "${NEXUS_USER}:${NEXUS_PASSWORD}" -X POST \
  "${NEXUS_URL}/service/rest/v1/components?repository=${NEXUS_REPO}" \
  -F "maven2.groupId=${GROUP_ID}" \
  -F "maven2.artifactId=${ARTIFACT_ID}" \
  -F "maven2.version=${VERSION}" \
  -F "maven2.asset1=@${JAR}" \
  -F "maven2.asset1.extension=jar" \
  -F "maven2.asset2=@${POM}" \
  -F "maven2.asset2.extension=pom"

echo "Published. Browse: ${NEXUS_URL}/#browse/browse:${NEXUS_REPO}"
