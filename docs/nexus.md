# Sonatype Nexus + Lightwell

Demo focus: configure an enterprise **artifact manager** (Nexus) for Red Hat Lightwell remediated Java packages. No application build client in this phase.

## Repository layout

| Nexus repo | Type | Purpose |
|------------|------|---------|
| `maven-central` | proxy | Upstream Maven Central |
| `lightwell-java-remediated-mock` | hosted | Offline demo: `.rhlw-00010` Spring modules |
| `lightwell-java-remediated` | proxy | Remote `https://packages.redhat.com/lightwell/java/remediated/` |
| `maven-public` | group | Members ordered: mock → (optional RH proxy) → central |

Browse artifacts in the Nexus UI under **Browse** → `lightwell-java-remediated-mock` or `maven-public`.

## Provision with Ansible

```bash
cd ansible
ansible-galaxy collection install -r requirements.yml
cp inventory/hosts.example.yml inventory/hosts.yml
# ansible-vault create inventory/group_vars/nexus/vault.yml
#   nexus_admin_password: your-chosen-admin-password

ansible-playbook -i inventory/hosts.yml playbooks/provision_nexus.yml
```

This installs Nexus (Podman container), creates repositories, stages mock `.rhlw` artifacts, and uploads them to the hosted repo.

## Manual mock upload

```bash
./scripts/build-mock-lightwell-repo.sh
export NEXUS_URL='http://<nexus-host>:8081'
export NEXUS_PASSWORD='...'
./scripts/upload-mock-to-nexus.sh
```

Scripts use `curl` against the Nexus REST API (no local build tool required).

## Existing Nexus

Set in `inventory/group_vars/all.yml`:

- `nexus_base_url`
- `nexus_admin_password` (vault)
- Skip container install if you only need repo/API steps, or point inventory at the existing host

Enable real Lightwell:

- `configure_lightwell_proxy: true`
- `lightwell_maven_user` / `lightwell_maven_token` in vault (stored on the Nexus proxy remote, not on developer machines)

## Story libraries (what lands in Nexus)

| Library | Community | Lightwell (mock hosted) |
|---------|-----------|-------------------------|
| Spring Framework | `5.3.18` (via Central proxy) | `5.3.18.rhlw-00010` |
| Jackson Databind | `2.13.4.2` | unchanged (Central) |
| Apache Commons Text | `1.9` | unchanged |
