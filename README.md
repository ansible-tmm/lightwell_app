# lightwell_app

**ACME Order Hub** — demo webapp for [Red Hat Lightwell Network](https://www.redhat.com/en/technologies/cloud/lightwell-network). Shows pinned Java dependencies and surgical backports: Spring `5.3.18` → `5.3.18.rhlw-00010` with **no application code changes**.

**Maven** builds the app. **Sonatype Nexus** is the artifact manager (customer-style consumption through a repository manager).

## Story libraries (3)

| Library | Before (`community`) | After (`lightwell`) |
|---------|----------------------|---------------------|
| Spring Framework | `5.3.18` | `5.3.18.rhlw-00010` via Nexus |
| Jackson Databind | `2.13.4.2` | unchanged (Nexus → Central proxy) |
| Apache Commons Text | `1.9` | unchanged |

## Prerequisites

- JDK 11, `./mvnw`
- **Nexus** (Ansible `provision_nexus.yml` or existing instance) — see [docs/nexus.md](docs/nexus.md)

## Quick start

### 1. Nexus (Ansible)

```bash
cd ansible
ansible-galaxy collection install -r requirements.yml
cp inventory/hosts.example.yml inventory/hosts.yml
ansible-playbook -i inventory/hosts.yml playbooks/provision_nexus.yml
```

Store `nexus_admin_password` in vault (`inventory/group_vars/nexus/vault.yml`).

### 2. Maven settings

```bash
cp maven/settings-nexus.xml.example maven/settings-nexus.xml
# Edit URL and admin password to match your Nexus host
```

### 3. Build and run

**Before:**

```bash
./scripts/cve-status.sh community
./mvnw -Pcommunity -s maven/settings-nexus.xml package
java -jar target/lightwell-app-1.0.0-SNAPSHOT.jar
```

**After (mock Lightwell on Nexus hosted repo):**

```bash
# If not using Ansible upload:
./scripts/build-mock-lightwell-repo.sh
NEXUS_PASSWORD='...' ./scripts/upload-mock-to-nexus.sh

./scripts/cve-status.sh lightwell
./mvnw -Plightwell -s maven/settings-nexus.xml -U -DskipTests package
java -jar target/lightwell-app-1.0.0-SNAPSHOT.jar
```

Open http://localhost:8080

### App-only build (no Nexus)

For a quick compile smoke test without Nexus:

```bash
./mvnw -Pcommunity package
```

The `lightwell` profile **requires** Nexus (or direct `settings-lightwell.xml` to packages.redhat.com).

## APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /` | Demo console |
| `GET /api/status` | Versions, Nexus repo labels, demo CVEs |
| `POST /api/orders` | JSON order + templated status |
| `GET /health` | Probe |

## Ansible pipeline

| Step | Playbook |
|------|----------|
| Nexus | `playbooks/provision_nexus.yml` |
| Build | `playbooks/build.yml` |
| Deploy | `playbooks/deploy.yml` |

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site.yml --tags nexus,build,deploy
```

Details: [ansible/README.md](ansible/README.md)

## Docs

- [docs/maven.md](docs/maven.md) — Maven profiles and wrapper
- [docs/nexus.md](docs/nexus.md) — Repository layout and variables

## Legacy

`maven/settings-mock.xml` and `file://mock-repo` are **deprecated**; use Nexus hosted repo + `upload-mock-to-nexus.sh`.
