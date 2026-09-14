# lightwell_app

**ACME Order Hub** — a small demo web application for [Red Hat Lightwell Network](https://www.redhat.com/en/technologies/cloud/lightwell-network). It shows pinned Java dependencies, representative CVE status, and how a **surgical backport** changes only Maven coordinates (Spring `5.3.18` → `5.3.18.rhlw-00010`) with **no application code changes**.

## Story libraries (3)

| Library | Before (`community`) | After (`lightwell`) |
|---------|----------------------|---------------------|
| Spring Framework | `5.3.18` (Maven Central) | `5.3.18.rhlw-00010` (remediated repo) |
| Jackson Databind | `2.13.4.2` | unchanged |
| Apache Commons Text | `1.9` | unchanged |

Pins are also listed in `requirements-community.properties` and `requirements-lightwell.properties`.

## Prerequisites

- JDK 11
- `./mvnw` (Maven Wrapper included) or Maven 3.8+
- `curl` (for mock repo script)

See [docs/maven.md](docs/maven.md) for detailed Maven setup.

## Quick start — local

### Before (community)

```bash
./scripts/cve-status.sh community
./mvnw -Pcommunity package
java -jar target/lightwell-app-1.0.0-SNAPSHOT.jar
```

Open http://localhost:8080

### After (mock Lightwell)

```bash
./scripts/build-mock-lightwell-repo.sh
./scripts/cve-status.sh lightwell
./mvnw -Plightwell -s maven/settings-mock.xml -U -DskipTests package
java -jar target/lightwell-app-1.0.0-SNAPSHOT.jar
```

The UI build banner shows `lightwell-remediated` and Spring `5.3.18.rhlw-00010`. Spring demo CVE rows flip to **REMEDIATED**; Jackson and Commons Text stay open (intentional).

### Real Lightwell repository

1. Copy `maven/settings-lightwell.xml.example` → `maven/settings-lightwell.xml` (gitignored).
2. Add console.redhat.com registry service account credentials.
3. `./mvnw -Plightwell -s maven/settings-lightwell.xml package`

Remediated URL: `https://packages.redhat.com/lightwell/java/remediated/`

## APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /` | Demo console (static UI) |
| `GET /api/status` | Versions, repos, demo CVE list |
| `POST /api/orders` | JSON order + templated status (Jackson + Commons Text) |
| `GET /health` | Ansible / load balancer probe |

## What changes between before and after

Only **dependency configuration**:

- `spring-framework.version` in `pom.xml` profile `lightwell`
- Maven `settings.xml` repository URL (mock file repo or packages.redhat.com)

No Java source changes. Rebuild and redeploy the JAR to switch states (the UI reflects the build you deployed; use **Simulated walkthrough** for a narrated preview).

## Ansible (build + deploy)

Step **2**: build on EC2 or RHEL — Step **3**: push JAR and run under systemd.

```bash
cd ansible
ansible-galaxy collection install -r requirements.yml
cp inventory/hosts.example.yml inventory/hosts.yml
# edit hosts, then:
ansible-playbook -i inventory/hosts.yml playbooks/build.yml
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -e fetch_artifact_to_controller=true -e jar_source=controller
```

Details: [ansible/README.md](ansible/README.md)

## Mock repository note

`scripts/build-mock-lightwell-repo.sh` republishes upstream Spring 5.3.18 JARs with a `.rhlw-00010` version label for **offline demos only**. Production Lightwell artifacts are Red Hat rebuilds with backported fixes.

## Project layout

```
pom.xml, mvnw, src/          Application
maven/                       Maven settings (mock + Lightwell example)
scripts/                     Mock repo + cve-status.sh
ansible/                     Build and deploy playbooks
docs/maven.md                Maven reference
```
