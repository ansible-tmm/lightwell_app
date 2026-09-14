#!/usr/bin/env bash
# Populates mock-repo/ with Spring Framework jars republished as 5.3.18.rhlw-00010.
# JAR bytes match Maven Central upstream (demo simulation only; production uses Red Hat builds).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOCK_REPO="${ROOT}/mock-repo"
UPSTREAM_VERSION="5.3.18"
LIGHTWELL_VERSION="5.3.18.rhlw-00010"
GROUP_PATH="org/springframework"
CENTRAL="https://repo1.maven.org/maven2"

# Modules visible in console.redhat.com plus those required by spring-boot-starter-web
ARTIFACTS=(
  spring-aop
  spring-beans
  spring-context
  spring-core
  spring-expression
  spring-jcl
  spring-web
  spring-webmvc
  spring-test
)

POM_ONLY=(
  spring-framework-bom
)

mkdir -p "${MOCK_REPO}"

install_artifact() {
  local artifact="$1"
  local upstream_dir="${MOCK_REPO}/${GROUP_PATH}/${artifact}/${LIGHTWELL_VERSION}"
  mkdir -p "${upstream_dir}"

  local jar_name="${artifact}-${UPSTREAM_VERSION}.jar"
  local pom_name="${artifact}-${UPSTREAM_VERSION}.pom"
  local base_url="${CENTRAL}/${GROUP_PATH}/${artifact}/${UPSTREAM_VERSION}"

  curl -fsSL "${base_url}/${jar_name}" -o "${upstream_dir}/${artifact}-${LIGHTWELL_VERSION}.jar"
  curl -fsSL "${base_url}/${pom_name}" -o "${upstream_dir}/${artifact}-${LIGHTWELL_VERSION}.pom.orig"

  # Rewrite version in POM (minimal sed for demo layout)
  sed "s|${UPSTREAM_VERSION}|${LIGHTWELL_VERSION}|g" "${upstream_dir}/${artifact}-${LIGHTWELL_VERSION}.pom.orig" \
    > "${upstream_dir}/${artifact}-${LIGHTWELL_VERSION}.pom"
  rm -f "${upstream_dir}/${artifact}-${LIGHTWELL_VERSION}.pom.orig"
}

echo "Building mock Lightwell repo at ${MOCK_REPO}"
echo "Upstream ${UPSTREAM_VERSION} -> ${LIGHTWELL_VERSION}"

install_pom_only() {
  local artifact="$1"
  local upstream_dir="${MOCK_REPO}/${GROUP_PATH}/${artifact}/${LIGHTWELL_VERSION}"
  mkdir -p "${upstream_dir}"
  local pom_name="${artifact}-${UPSTREAM_VERSION}.pom"
  local base_url="${CENTRAL}/${GROUP_PATH}/${artifact}/${UPSTREAM_VERSION}"
  curl -fsSL "${base_url}/${pom_name}" -o "${upstream_dir}/${artifact}-${LIGHTWELL_VERSION}.pom.orig"
  sed "s|${UPSTREAM_VERSION}|${LIGHTWELL_VERSION}|g" "${upstream_dir}/${artifact}-${LIGHTWELL_VERSION}.pom.orig" \
    > "${upstream_dir}/${artifact}-${LIGHTWELL_VERSION}.pom"
  rm -f "${upstream_dir}/${artifact}-${LIGHTWELL_VERSION}.pom.orig"
}

for a in "${ARTIFACTS[@]}"; do
  echo "  ${a}"
  install_artifact "${a}"
done

for a in "${POM_ONLY[@]}"; do
  echo "  ${a} (pom)"
  install_pom_only "${a}"
done

echo "Done. ${#ARTIFACTS[@]} jars + ${#POM_ONLY[@]} pom-only artifacts installed."
