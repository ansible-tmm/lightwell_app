# Maven setup

## Prerequisites

- **JDK 11**
- **Maven Wrapper** (`./mvnw`)
- **Nexus** reachable — see [nexus.md](nexus.md)

## Settings

Primary: **`maven/settings-nexus.xml`** (from `settings-nexus.xml.example`).

Fallback (no Nexus): **`maven/settings-lightwell.xml`** from example for direct `packages.redhat.com` access.

## Profiles

| Profile | Spring version | Resolution |
|---------|----------------|------------|
| `community` | `5.3.18` | Nexus → `maven-central` proxy |
| `lightwell` | `5.3.18.rhlw-00010` | Nexus → `lightwell-java-remediated-mock` (or RH proxy) |

Repositories are **not** declared in `pom.xml` for `lightwell`; Nexus URLs live in `settings-nexus.xml`.

## Commands

```bash
./mvnw -Pcommunity -s maven/settings-nexus.xml package
./mvnw -Plightwell -s maven/settings-nexus.xml -U -DskipTests package
```

## Ansible build

```bash
./mvnw -P{{ maven_profile }} -s {{ app_root }}/maven/settings-nexus.xml -DskipTests -U package
```

Artifact: `target/lightwell-app-1.0.0-SNAPSHOT.jar`
