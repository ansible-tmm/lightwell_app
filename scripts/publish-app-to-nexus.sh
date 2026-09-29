#!/usr/bin/env bash
# Publish the ACME Order Hub JAR to a Nexus hosted repository.
# - SNAPSHOT versions use mvn deploy:deploy-file (Nexus REST API doesn't support snapshot uploads)
# - Release versions use the Nexus REST Components API
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
POM="${ROOT}/pom.xml"

GROUP_ID="com.acme"
ARTIFACT_ID="lightwell-app"
VERSION="1.0.0-SNAPSHOT"

JAR="${ROOT}/target/${ARTIFACT_ID}-${VERSION}.jar"

NEXUS_URL="${NEXUS_URL:-http://localhost:8081}"
if [[ "${VERSION}" == *-SNAPSHOT ]]; then
  NEXUS_REPO="${NEXUS_REPO:-maven-snapshots}"
else
  NEXUS_REPO="${NEXUS_REPO:-maven-releases}"
fi
NEXUS_USER="${NEXUS_USER:-admin}"
NEXUS_PASSWORD="${NEXUS_PASSWORD:-}"

if [[ -z "${NEXUS_PASSWORD}" ]]; then
  echo "Set NEXUS_PASSWORD (and optionally NEXUS_URL, NEXUS_REPO, NEXUS_USER)" >&2
  exit 1
fi

if [[ ! -f "${JAR}" ]]; then
  echo "Missing ${JAR}. Build first: ./mvnw -Pcommunity package" >&2
  exit 1
fi

REPO_URL="${NEXUS_URL}/repository/${NEXUS_REPO}/"
echo "Publishing ${ARTIFACT_ID}:${VERSION} → ${REPO_URL}"

if [[ "${VERSION}" == *-SNAPSHOT ]]; then
  # Nexus REST API does not support snapshot uploads — use Maven deploy plugin.
  # Generate a temporary settings.xml with the server credentials.
  TMP_SETTINGS=$(mktemp "${TMPDIR:-/tmp}/nexus-settings-XXXXXX.xml")
  trap 'rm -f "${TMP_SETTINGS}"' EXIT
  cat > "${TMP_SETTINGS}" <<EOF
<settings>
  <servers>
    <server>
      <id>nexus-deploy</id>
      <username>${NEXUS_USER}</username>
      <password>${NEXUS_PASSWORD}</password>
    </server>
  </servers>
</settings>
EOF

  "${ROOT}/mvnw" -s "${TMP_SETTINGS}" deploy:deploy-file \
    -DgroupId="${GROUP_ID}" \
    -DartifactId="${ARTIFACT_ID}" \
    -Dversion="${VERSION}" \
    -Dpackaging=jar \
    -Dfile="${JAR}" \
    -DpomFile="${POM}" \
    -DrepositoryId=nexus-deploy \
    -Durl="${REPO_URL}"
else
  # Release uploads work fine via the Nexus REST Components API.
  HTTP_CODE=$(curl -sS -o /tmp/nexus-response.txt -w "%{http_code}" \
    -u "${NEXUS_USER}:${NEXUS_PASSWORD}" -X POST \
    "${NEXUS_URL}/service/rest/v1/components?repository=${NEXUS_REPO}" \
    -F "maven2.groupId=${GROUP_ID}" \
    -F "maven2.artifactId=${ARTIFACT_ID}" \
    -F "maven2.version=${VERSION}" \
    -F "maven2.asset1=@${JAR}" \
    -F "maven2.asset1.extension=jar" \
    -F "maven2.asset2=@${POM}" \
    -F "maven2.asset2.extension=pom")

  if [[ "${HTTP_CODE}" -ge 400 ]]; then
    echo "ERROR: Nexus returned HTTP ${HTTP_CODE}" >&2
    cat /tmp/nexus-response.txt >&2
    echo >&2
    exit 1
  fi
fi

echo "Published. Browse: ${NEXUS_URL}/#browse/browse:${NEXUS_REPO}"
