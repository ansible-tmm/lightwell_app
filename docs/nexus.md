# Sonatype Nexus (artifact manager)

Maven **builds** the ACME Order Hub application. **Nexus** is how enterprises host and proxy dependencies—including Lightwell remediated Spring artifacts.

## Repository layout

| Nexus repo | Type | Purpose |
|------------|------|---------|
| `maven-central` | proxy | Upstream Maven Central |
| `lightwell-java-remediated-mock` | hosted | Offline demo: `.rhlw-00010` Spring modules |
| `lightwell-java-remediated` | proxy | Remote `https://packages.redhat.com/lightwell/java/remediated/` |
| `maven-public` | group | Members ordered: mock → (optional RH proxy) → central |

## Provision with Ansible

```bash
cd ansible
ansible-galaxy collection install -r requirements.yml
cp inventory/hosts.example.yml inventory/hosts.yml
# Set vault password: ansible-vault create inventory/group_vars/nexus/vault.yml
#   nexus_admin_password: your-chosen-admin-password

ansible-playbook -i inventory/hosts.yml playbooks/provision_nexus.yml
```

This installs Nexus (Podman container), creates repositories, stages mock `.rhlw` artifacts, and uploads them to the hosted repo.

## Maven settings

Copy `maven/settings-nexus.xml.example` to `maven/settings-nexus.xml` (gitignored) and set:

- Nexus URL (`http://<nexus-host>:8081/repository/maven-public/`)
- `admin` credentials

Build:

```bash
./mvnw -Pcommunity -s maven/settings-nexus.xml package
./mvnw -Plightwell -s maven/settings-nexus.xml -U -DskipTests package
```

## Manual mock upload

```bash
./scripts/build-mock-lightwell-repo.sh
export NEXUS_PASSWORD='...'
./scripts/upload-mock-to-nexus.sh
```

## Existing Nexus

Set in `inventory/group_vars/all.yml`:

- `nexus_base_url`
- `nexus_admin_password` (vault)
- Skip `provision_nexus.yml`; create the same repo names or adjust `nexus_repo_*` variables.

Enable real Lightwell:

- `configure_lightwell_proxy: true`
- `lightwell_maven_user` / `lightwell_maven_token` in vault (stored on Nexus proxy, not build hosts)
