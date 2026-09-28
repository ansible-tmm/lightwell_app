# lightwell_app

**ACME Order Hub** — demo for [Red Hat Lightwell Network](https://www.redhat.com/en/technologies/cloud/lightwell-network). Show a normal Spring Boot build first, then Stage 2: resolve a **fake Lightwell** Spring version (`5.3.18.rhlw-00010`) through **Sonatype Nexus**.

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Stage 1 — Build the app normally](#stage-1--build-the-app-normally)
3. [Already have Nexus?](#already-have-nexus)
4. [Stage 2 — Lightwell through Nexus (fake package)](#stage-2--lightwell-through-nexus-fake-package)
5. [Optional: provision Nexus with Ansible](#optional-provision-nexus-with-ansible)
6. [Story libraries](#story-libraries)
7. [Docs](#docs)

## Prerequisites

| Need | Stage 1 | Stage 2 / publish |
|------|---------|-------------------|
| JDK 11 | yes | yes |
| `./mvnw` (wrapper in repo) | yes | yes |
| Sonatype Nexus (existing or Ansible) | no | yes |
| Nexus admin password | no | yes |

## Stage 1 — Build the app normally

Community Spring Framework `5.3.18` from public Central. No Nexus required.

```bash
./scripts/cve-status.sh community
./mvnw -Pcommunity package
java -jar target/lightwell-app-1.0.0-SNAPSHOT.jar
```

Open http://localhost:8080

## Already have Nexus?

Use this path when Nexus is already running. You do **not** need Ansible provisioning.

### A. Create repositories (Nexus UI)

Admin → **Repositories** → **Create repository**:

| Name | Format / type | Notes |
|------|---------------|--------|
| `maven-central` | maven2 **proxy** | Remote URL: `https://repo1.maven.org/maven2/` |
| `lightwell-java-remediated-mock` | maven2 **hosted** | Version policy: Release; write: Allow |
| `acme-releases` | maven2 **hosted** | Holds the ACME Order Hub JAR |
| `maven-public` | maven2 **group** | Members (order matters): `lightwell-java-remediated-mock`, then `maven-central` |

Skip any row that already exists. Adjust names only if you also update the scripts / settings below.

### B. Publish the app JAR into Nexus

```bash
./mvnw -Pcommunity package

export NEXUS_URL='http://<your-nexus-host>:8081'
export NEXUS_USER='admin'
export NEXUS_PASSWORD='...'
export NEXUS_REPO='acme-releases'   # optional; this is the default

./scripts/publish-app-to-nexus.sh
```

Browse: `http://<nexus-host>:8081` → **Browse** → `acme-releases` → `com/acme/lightwell-app`.

### C. Point builds at Nexus (optional for Stage 1)

```bash
cp maven/settings-nexus.xml.example maven/settings-nexus.xml
# Set <url> to http://<nexus-host>:8081/repository/maven-public/
# Set <password> to your Nexus admin (or deploy user) password
```

Then:

```bash
./mvnw -Pcommunity -s maven/settings-nexus.xml package
```

## Stage 2 — Lightwell through Nexus (fake package)

Demo simulation: republish Central Spring `5.3.18` jars as `5.3.18.rhlw-00010` into the Nexus **hosted** mock repo. Same idea as real Lightwell, without packages.redhat.com.

### 1. Stage and upload the fake Lightwell artifacts

```bash
./scripts/build-mock-lightwell-repo.sh

export NEXUS_URL='http://<your-nexus-host>:8081'
export NEXUS_USER='admin'
export NEXUS_PASSWORD='...'
# default repo: lightwell-java-remediated-mock
./scripts/upload-mock-to-nexus.sh
```

Confirm in Nexus **Browse** → `lightwell-java-remediated-mock` → `org/springframework/.../5.3.18.rhlw-00010/`.

### 2. Build with the Lightwell profile (resolves via Nexus)

Requires `maven/settings-nexus.xml` from [Already have Nexus? §C](#c-point-builds-at-nexus-optional-for-stage-1).

```bash
./scripts/cve-status.sh lightwell
./mvnw -Plightwell -s maven/settings-nexus.xml -U -DskipTests package
java -jar target/lightwell-app-1.0.0-SNAPSHOT.jar
```

Only the Spring version property changes (`5.3.18` → `5.3.18.rhlw-00010`). Application code is unchanged.

### 3. Re-publish the remediated build (optional)

```bash
NEXUS_REPO=acme-releases ./scripts/publish-app-to-nexus.sh
```

## Optional: provision Nexus with Ansible

If you do **not** already have Nexus:

```bash
cd ansible
ansible-galaxy collection install -r requirements.yml
cp inventory/hosts.example.yml inventory/hosts.yml
# Edit nexus host IP / SSH user
ansible-vault create inventory/group_vars/nexus/vault.yml
# vault.yml → nexus_admin_password: <secure-password>

ansible-playbook -i inventory/hosts.yml playbooks/provision_nexus.yml
```

Creates Podman Nexus, the repo layout above (except `acme-releases` — create that in UI or extend the role), and uploads the fake Lightwell artifacts.

### Real Lightwell proxy (later)

When you have Red Hat credentials for `packages.redhat.com`:

```yaml
configure_lightwell_proxy: true
lightwell_repo_user: <service-account>
lightwell_repo_token: <token>
```

Store those in vault; Nexus holds them on the proxy remote — not on developer laptops.

## Story libraries

| Library | Stage 1 (`community`) | Stage 2 (`lightwell` + Nexus mock) |
|---------|----------------------|-------------------------------------|
| Spring Framework | `5.3.18` | `5.3.18.rhlw-00010` (fake hosted) |
| Jackson Databind | `2.13.4.2` | unchanged |
| Apache Commons Text | `1.9` | unchanged |

## Docs

- [docs/nexus.md](docs/nexus.md) — repo layout, existing Nexus, variables
- [docs/maven.md](docs/maven.md) — profiles and wrapper
- [ansible/README.md](ansible/README.md) — Ansible provision details
