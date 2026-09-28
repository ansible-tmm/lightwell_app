# Sonatype Nexus + Lightwell

Nexus is the enterprise **artifact manager** for this demo: host a fake Lightwell Spring version, proxy Central, and optionally publish the ACME Order Hub JAR.

For the staged walkthrough (build normally → Lightwell via Nexus), start with the [root README](../README.md).

## Repository layout

| Nexus repo | Type | Purpose |
|------------|------|---------|
| `central` | proxy | Upstream Central — remote `https://repo1.maven.org/maven2/` (Central’s public registry URL) |
| `lightwell-java-remediated-mock` | hosted | Fake `.rhlw-00010` Spring modules for demos |
| `lightwell-java-remediated` | proxy | Optional real remote `packages.redhat.com/lightwell/java/remediated/` |
| `public` | group | Members ordered: mock → (optional RH proxy) → central |
| `acme-releases` | hosted | ACME Order Hub application JAR (create in UI) |

When creating repos in the Nexus UI, choose the Java package recipe Nexus labels **maven2** (JAR layout only).

## Already have Nexus

1. Create the repositories in the table (UI or API). Skip names that exist.
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

4. Point builds at the `public` group via `maven/settings-nexus.xml` (from `settings-nexus.xml.example`).

Scripts talk to the Nexus REST API with `curl`.

## Provision with Ansible

```bash
cd ansible
ansible-galaxy collection install -r requirements.yml
cp inventory/hosts.example.yml inventory/hosts.yml
# ansible-vault create inventory/group_vars/nexus/vault.yml
#   nexus_admin_password: your-chosen-admin-password

ansible-playbook -i inventory/hosts.yml playbooks/provision_nexus.yml
```

Installs Nexus (Podman), creates `central` / Lightwell mock / `public` group, and uploads fake `.rhlw` artifacts. Create `acme-releases` in the UI for app publishing.

## Real Lightwell proxy

```yaml
configure_lightwell_proxy: true
lightwell_repo_user: <service-account>
lightwell_repo_token: <token>
```

Credentials live in vault and are stored on the Nexus proxy remote.

## Story libraries

| Library | Community | Lightwell (fake hosted) |
|---------|-----------|-------------------------|
| Spring Framework | `5.3.18` | `5.3.18.rhlw-00010` |
| Jackson Databind | `2.13.4.2` | unchanged (Central) |
| Apache Commons Text | `1.9` | unchanged |
