#!/usr/bin/env bash
# Upload staged mock-repo/ artifacts to Nexus hosted repository (lightwell-java-remediated-mock).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOCK_REPO="${ROOT}/mock-repo"
GROUP_PATH="org/springframework"

NEXUS_URL="${NEXUS_URL:-http://localhost:8081}"
NEXUS_REPO="${NEXUS_REPO:-lightwell-java-remediated-mock}"
NEXUS_USER="${NEXUS_USER:-admin}"
NEXUS_PASSWORD="${NEXUS_PASSWORD:-}"

if [[ -z "${NEXUS_PASSWORD}" ]]; then
  echo "Set NEXUS_PASSWORD (and optionally NEXUS_URL, NEXUS_REPO, NEXUS_USER)" >&2
  exit 1
fi

if [[ ! -d "${MOCK_REPO}/${GROUP_PATH}" ]]; then
  echo "Run ./scripts/build-mock-lightwell-repo.sh first" >&2
  exit 1
fi

auth=(-u "${NEXUS_USER}:${NEXUS_PASSWORD}")

echo "Uploading from ${MOCK_REPO} to ${NEXUS_URL}/repository/${NEXUS_REPO}/"

while IFS= read -r -d '' pom; do
  version_dir="$(dirname "${pom}")"
  artifact_id="$(basename "$(dirname "${version_dir}")")"
  version="$(basename "${version_dir}")"
  jar="${version_dir}/${artifact_id}-${version}.jar"

  if [[ -f "${jar}" ]]; then
    echo "  ${artifact_id}:${version}"
    curl -fsS "${auth[@]}" -X POST \
      "${NEXUS_URL}/service/rest/v1/components?repository=${NEXUS_REPO}" \
      -F "maven2.groupId=org.springframework" \
      -F "maven2.artifactId=${artifact_id}" \
      -F "maven2.version=${version}" \
      -F "maven2.asset1=@${jar}" \
      -F "maven2.asset1.extension=jar" \
      -F "maven2.asset2=@${pom}" \
      -F "maven2.asset2.extension=pom" \
      || echo "    (skip or already exists: ${artifact_id})"
  else
    echo "  pom-only ${artifact_id}:${version}"
    curl -fsS "${auth[@]}" -X POST \
      "${NEXUS_URL}/service/rest/v1/components?repository=${NEXUS_REPO}" \
      -F "maven2.groupId=org.springframework" \
      -F "maven2.artifactId=${artifact_id}" \
      -F "maven2.version=${version}" \
      -F "maven2.asset1=@${pom}" \
      -F "maven2.asset1.extension=pom" \
      || echo "    (skip or already exists: ${artifact_id})"
  fi
done < <(find "${MOCK_REPO}/${GROUP_PATH}" -name '*.pom' -print0)

echo "Upload complete."
