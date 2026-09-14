# Maven setup

## Prerequisites

- **JDK 11** (`java-11-openjdk-devel` on RHEL)
- **Maven 3.8+** or use **`./mvnw`** from this repository

## Environment

```bash
# macOS
export JAVA_HOME=$(/usr/libexec/java-home -v 11)

# RHEL / Fedora
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk
```

## Build profiles

| Profile | Spring version | Repository |
|---------|----------------|------------|
| `community` (default) | `5.3.18` | Maven Central |
| `lightwell` | `5.3.18.rhlw-00010` | `mock-repo/` (local) or real Lightwell remediated URL |

### Community (before)

```bash
./mvnw -Pcommunity package
java -jar target/lightwell-app-*.jar
```

### Lightwell mock (after, offline)

```bash
./scripts/build-mock-lightwell-repo.sh
./mvnw -Plightwell -s maven/settings-mock.xml package
java -jar target/lightwell-app-*.jar
```

### Real Lightwell remediated repository

1. Copy `maven/settings-lightwell.xml.example` to `maven/settings-lightwell.xml` (gitignored).
2. Set service account username and token from [console.redhat.com](https://console.redhat.com).
3. Build:

```bash
./mvnw -Plightwell -s maven/settings-lightwell.xml package
```

## Demo CVE script

```bash
./scripts/cve-status.sh community
./scripts/cve-status.sh lightwell
```

## Canonical Ansible build command

```bash
cd /opt/acme/lightwell_app
./scripts/build-mock-lightwell-repo.sh   # when build_mock_lightwell_repo=true
./mvnw -P"${maven_profile}" -s "${maven_settings_file}" -DskipTests package
```

Artifact: `target/lightwell-app-1.0.0-SNAPSHOT.jar`
