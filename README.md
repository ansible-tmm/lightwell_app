# lightwell_app

**ACME Order Hub** — demo for [Red Hat Lightwell Network](https://www.redhat.com/en/technologies/cloud/lightwell-network). Show a normal Spring Boot build first, then Stage 2: resolve a **fake Lightwell** Spring version (`5.3.18.rhlw-00010`) through **Sonatype Nexus**.

## Table of contents

1. [Prerequisites](#prerequisites)
2. [How the pieces fit](#how-the-pieces-fit)
3. [Repositories (match shared Nexus)](#repositories-match-shared-nexus)
4. [Demo story (vulnerable → production-ready)](#demo-story-vulnerable--production-ready)
5. [Stage 1 — Build the app normally](#stage-1--build-the-app-normally)
6. [Already have Nexus?](#already-have-nexus)
7. [Stage 2 — Lightwell through Nexus (fake package)](#stage-2--lightwell-through-nexus-fake-package)
8. [Optional: provision Nexus with Ansible](#optional-provision-nexus-with-ansible)
9. [Story library](#story-library)
10. [Docs](#docs)

## Prerequisites

| Need | Stage 1 | Stage 2 / publish |
|------|---------|-------------------|
| JDK 11 | yes | yes |
| Project build wrapper (`./mvnw`) | yes | yes |
| Sonatype Nexus (existing or Ansible) | no | yes |
| Nexus admin password | no | yes |

## How the pieces fit

**Nexus layout** — how dependency resolution is wired. App publish uses stock `maven-releases` (not a member of `maven-public`).

```mermaid
flowchart TB
  Central["Public Java registry (Central)"] -->|"upstream"| Proxy["proxy: maven-central"]
  Mock["hosted: lightwell-java-remediated"] -->|"searched first"| Group["group: maven-public"]
  Proxy -->|"fallback"| Group
  Build["App build"] -->|"resolves from"| Group
  AppRepo["hosted: maven-releases"] -.->|"not a member of maven-public"| Group
```

**How packages and the app JAR move** — same Nexus; three different paths:

```mermaid
flowchart LR
  Upload["upload-mock-to-nexus.sh"] -->|"publishes fake .rhlw"| Mock
  Build["App build"] -->|"resolves deps"| Group
  Publish["publish-app-to-nexus.sh"] -->|"publishes app JAR"| AppRepo

  subgraph Nexus
    Mock["hosted: lightwell-java-remediated"]
    Group["group: maven-public"]
    AppRepo["hosted: maven-releases"]
  end
```

**Demo flow** — do Stage 1, then Stage 2; publish is optional either time:

```mermaid
flowchart TD
  S1["Stage 1: build community"] --> Run1["Run JAR locally"]
  S1 --> Pub1["Optional: publish JAR"]
  S1 -->|"next"| Prep["Upload fake Lightwell packages"]
  Prep --> S2["Stage 2: build lightwell via maven-public"]
  S2 --> Run2["Run remediated JAR"]
  S2 --> Pub2["Optional: re-publish JAR"]
```

Use the **stock** Nexus names (`maven-central`, `maven-public`, `maven-releases`) plus the shared **`lightwell-java-remediated`** hosted repo — no duplicate `central` / `public` / `acme-releases` repos.

## Repositories (match shared Nexus)

These usually **already exist**. Do not create second copies with different names.

| Name | Type | On shared Nexus | What you do |
|------|------|-----------------|-------------|
| `maven-central` | **proxy** | stock default | Leave as-is (remote = Central) |
| `lightwell-java-remediated` | **hosted** | colleague / Lightwell | Upload fake `.rhlw` packages here (`upload-mock-to-nexus.sh`) |
| `maven-releases` | **hosted** | stock default | Publish the ACME app JAR here (`publish-app-to-nexus.sh`) |
| `maven-public` | **group** | stock default | **Edit members** so order is: (1) `lightwell-java-remediated`, (2) `maven-central` (keep other members after if you want) |

Ignore unrelated defaults (`nuget-*`, `pypi-*`, `maven-snapshots`, `maven-all`, etc.) for this Java demo.

### After repos are wired

| Step | Direction |
|------|-----------|
| Upload fake Lightwell | `./scripts/build-mock-lightwell-repo.sh` then `./scripts/upload-mock-to-nexus.sh` → `lightwell-java-remediated` |
| Publish app JAR | `./mvnw -Pcommunity package` then `./scripts/publish-app-to-nexus.sh` → `maven-releases` |
| Point builds at Nexus | Copy `maven/settings-nexus.xml.example` → `maven/settings-nexus.xml`; URL `…/repository/maven-public/` |
| Stage 2 build | `./mvnw -Plightwell -s maven/settings-nexus.xml -U -DskipTests package` |

Full command blocks: [Already have Nexus?](#already-have-nexus) and [Stage 2](#stage-2--lightwell-through-nexus-fake-package).

## Demo story (vulnerable → production-ready)

Simple arc: same Order Hub app, same Spring version line — community pin is **vulnerable**, Lightwell pin via Nexus is **production-ready**. No app code rewrite.

| Beat | Spring version | Demo CVE catalog |
|------|----------------|------------------|
| **Stage 1** (community) | `5.3.18` | VULNERABLE |
| **Stage 2** (Lightwell via Nexus) | `5.3.18.rhlw-00010` | REMEDIATED |

`./scripts/cve-status.sh` is **not a scanner**. It prints a hardcoded Spring CVE catalog (same idea as the UI). The CVE **IDs are real**; the VULNERABLE / REMEDIATED labels flip only when the Spring version contains `rhlw`.

### Spring CVEs in this demo

| CVE | One-line context | Read more |
|-----|------------------|-----------|
| [CVE-2022-22965](https://nvd.nist.gov/vuln/detail/CVE-2022-22965) | “Spring4Shell” — RCE class of issue in Spring MVC on certain setups | [NVD](https://nvd.nist.gov/vuln/detail/CVE-2022-22965) · [Spring](https://spring.io/security/cve-2022-22965) |
| [CVE-2023-20860](https://nvd.nist.gov/vuln/detail/CVE-2023-20860) | Security bypass via pattern mismatch (Spring Security / MVC) | [NVD](https://nvd.nist.gov/vuln/detail/CVE-2023-20860) · [Spring](https://spring.io/security/cve-2023-20860) |
| [CVE-2023-20863](https://nvd.nist.gov/vuln/detail/CVE-2023-20863) | Spring Expression DoS / resource issues on affected 5.3.x lines | [NVD](https://nvd.nist.gov/vuln/detail/CVE-2023-20863) · [Spring](https://spring.io/security/cve-2023-20863) |

### Optional: `cve-status.sh` — expected output

**Before** (vulnerable):

```bash
./scripts/cve-status.sh community
```

```text
=== ACME Order Hub — Spring remediation demo ===
Profile: community (community)
Spring Framework: 5.3.18

Demo CVE catalog (not a scanner):
  CVE-2022-22965       Spring Framework       VULNERABLE
  CVE-2023-20860       Spring Framework       VULNERABLE
  CVE-2023-20863       Spring Framework       VULNERABLE
```

**After** (production-ready):

```bash
./scripts/cve-status.sh lightwell
```

```text
=== ACME Order Hub — Spring remediation demo ===
Profile: lightwell (lightwell-remediated)
Spring Framework: 5.3.18.rhlw-00010

Demo CVE catalog (not a scanner):
  CVE-2022-22965       Spring Framework       REMEDIATED
  CVE-2023-20860       Spring Framework       REMEDIATED
  CVE-2023-20863       Spring Framework       REMEDIATED
```

## Stage 1 — Build the app normally

Community Spring Framework `5.3.18` from public Central. No Nexus required.

**1. Build the application**

```bash
./mvnw -Pcommunity package
```

`./mvnw` is the project build wrapper (downloads the build tool if needed — you do not install anything globally).  
`-Pcommunity` selects the **community** profile in `pom.xml` (Spring Framework pinned to `5.3.18`).  
`package` compiles the app and produces a runnable JAR at `target/lightwell-app-1.0.0-SNAPSHOT.jar`.

**2. Run the application**

```bash
java -jar target/lightwell-app-1.0.0-SNAPSHOT.jar
```

Starts the Spring Boot server using that JAR (needs JDK 11+). Leave this terminal running; open http://localhost:8080 for the demo console (same before/after CVE story as the optional script). Stop with Ctrl+C when finished.

Optional talk-track printout: `./scripts/cve-status.sh community`

## Already have Nexus?

Use this path when Nexus is already running. You do **not** need Ansible provisioning.

Confirm the [Repositories](#repositories-match-shared-nexus) table (especially `maven-public` member order), then continue below.

### A. Publish the app JAR into Nexus

```bash
./mvnw -Pcommunity package

export NEXUS_URL='http://<your-nexus-host>:8081'
export NEXUS_USER='admin'
export NEXUS_PASSWORD='...'
export NEXUS_REPO='maven-releases'   # optional; this is the default

./scripts/publish-app-to-nexus.sh
```

Browse: `http://<nexus-host>:8081` → **Browse** → `maven-releases` → `com/acme/lightwell-app`.

### B. Point builds at Nexus (optional for Stage 1)

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

Demo simulation: republish Central Spring `5.3.18` jars as `5.3.18.rhlw-00010` into the Nexus **hosted** Lightwell repo. Same idea as real Lightwell, without packages.redhat.com.

### 1. Stage and upload the fake Lightwell artifacts

```bash
./scripts/build-mock-lightwell-repo.sh

export NEXUS_URL='http://<your-nexus-host>:8081'
export NEXUS_USER='admin'
export NEXUS_PASSWORD='...'
# default repo: lightwell-java-remediated
./scripts/upload-mock-to-nexus.sh
```

Confirm in Nexus **Browse** → `lightwell-java-remediated` → `org/springframework/.../5.3.18.rhlw-00010/`.

### 2. Build with the Lightwell profile (resolves via Nexus)

Requires `maven/settings-nexus.xml` from [Already have Nexus? §B](#b-point-builds-at-nexus-optional-for-stage-1).

```bash
./mvnw -Plightwell -s maven/settings-nexus.xml -U -DskipTests package
java -jar target/lightwell-app-1.0.0-SNAPSHOT.jar
```

Only the Spring version property changes (`5.3.18` → `5.3.18.rhlw-00010`). Application code is unchanged.

Optional talk-track printout (Spring rows should now say REMEDIATED): `./scripts/cve-status.sh lightwell`

### 3. Re-publish the remediated build (optional)

```bash
NEXUS_REPO=maven-releases ./scripts/publish-app-to-nexus.sh
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

Creates Podman Nexus and aligns with the same repo names (`maven-central`, `maven-public`, `lightwell-java-remediated`, uploads fake `.rhlw` artifacts). Uses stock `maven-releases` for app publishing.

### Real Lightwell proxy (later)

When you have Red Hat credentials for `packages.redhat.com`, add a **separate** proxy (do not reuse the hosted name):

```yaml
configure_lightwell_proxy: true
nexus_repo_lightwell_proxy: lightwell-java-remediated-remote
lightwell_repo_user: <service-account>
lightwell_repo_token: <token>
```

Store those in vault; Nexus holds them on the proxy remote — not on developer laptops.

## Story library

| Library | Stage 1 | Stage 2 |
|---------|---------|---------|
| Spring Framework | `5.3.18` (vulnerable) | `5.3.18.rhlw-00010` (production-ready) |

## Docs

- [docs/nexus.md](docs/nexus.md) — repo layout, existing Nexus, variables
- [docs/maven.md](docs/maven.md) — build profiles and wrapper
- [ansible/README.md](ansible/README.md) — Ansible provision details
