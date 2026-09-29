# Sonatype Nexus + Lightwell

Nexus is the enterprise **artifact manager** for this demo. Repo names match a typical shared Nexus (stock `maven-*` plus `lightwell-java-remediated`).

For the staged walkthrough, start with the [root README](../README.md).

## Repository layout

| Nexus repo | Type | Purpose |
|------------|------|---------|
| `maven-central` | proxy | Upstream Central — remote `https://repo1.maven.org/maven2/` |
| `lightwell-java-remediated` | hosted | Fake (or real) `.rhlw` Spring modules |
| `lightwell-java-remediated-remote` | proxy | Optional real remote `packages.redhat.com/lightwell/java/remediated/` |
| `maven-public` | group | Members ordered: Lightwell hosted → (optional RH proxy) → `maven-central` |
| `maven-releases` | hosted | ACME Order Hub application JAR |

On a shared Nexus these usually already exist — edit `maven-public` member order instead of creating duplicates. See [README — Repositories](../README.md#repositories-match-shared-nexus).

## Already have Nexus

1. Confirm repos in the table (especially `maven-public` members).
2. Upload fake Lightwell packages:

```bash
./scripts/build-mock-lightwell-repo.sh
export NEXUS_URL='http://<nexus-host>:8081'
export NEXUS_PASSWORD='...'
./scripts/upload-mock-to-nexus.sh
```

3. Publish the app:

```bash
./mvnw -Pcommunity package
NEXUS_URL='http://<nexus-host>:8081' NEXUS_PASSWORD='...' ./scripts/publish-app-to-nexus.sh
```

4. Point builds at `maven-public` via `maven/settings-nexus.xml` (from `settings-nexus.xml.example`).

## Provision with Ansible

```bash
cd ansible
ansible-galaxy collection install -r requirements.yml
cp inventory/hosts.example.yml inventory/hosts.yml
ansible-playbook -i inventory/hosts.yml playbooks/provision_nexus.yml
```

## Real Lightwell proxy

```yaml
configure_lightwell_proxy: true
nexus_repo_lightwell_proxy: lightwell-java-remediated-remote
lightwell_repo_user: <service-account>
lightwell_repo_token: <token>
```

## Story library

| Library | Community | Lightwell (hosted) |
|---------|-----------|--------------------|
| Spring Framework | `5.3.18` (vulnerable) | `5.3.18.rhlw-00010` (production-ready) |
