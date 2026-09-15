# Ansible automation — Lightwell demo app

**Nexus** provisions artifact hosting; **Maven** builds on the build host; **deploy** runs the JAR under systemd.

## Prerequisites

- Ansible 2.14+
- SSH to RHEL hosts (`nexus`, `build`, `app` groups)
- Vault file with at least `nexus_admin_password`

```bash
cd ansible
ansible-galaxy collection install -r requirements.yml
cp inventory/hosts.example.yml inventory/hosts.yml
ansible-vault create inventory/group_vars/nexus/vault.yml
```

```yaml
# vault.yml
nexus_admin_password: your-secure-password
# Optional real Lightwell proxy on Nexus:
# lightwell_maven_user: service-account
# lightwell_maven_token: token
```

## Step 1 — Nexus

```bash
ansible-playbook -i inventory/hosts.yml playbooks/provision_nexus.yml
```

Creates (Podman):

- `maven-central` proxy
- `lightwell-java-remediated-mock` hosted (+ uploads `.rhlw` Spring artifacts)
- `lightwell-java-remediated` proxy (when `configure_lightwell_proxy: true`)
- `maven-public` group

## Step 2 — Build

Community:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/build.yml
```

Lightwell (after Nexus mock upload):

```bash
ansible-playbook -i inventory/hosts.yml playbooks/build.yml -e maven_profile=lightwell
```

Build host receives templated `maven/settings-nexus.xml` pointing at `nexus_base_url`.

Optional fetch JAR to controller:

```bash
-e fetch_artifact_to_controller=true
```

## Step 3 — Deploy

```bash
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -e jar_source=controller
```

Or after build on same inventory run:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/build.yml playbooks/deploy.yml -e jar_source=build_host
```

## Existing Nexus

1. Skip `provision_nexus.yml`.
2. Create matching repo names or override `nexus_repo_*` in `group_vars/all.yml`.
3. Set `nexus_base_url` and vault password.
4. Run `upload-mock-to-nexus.sh` manually or set `upload_mock_artifacts_to_nexus: false` if using RH proxy only.

## Site playbook

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site.yml --tags nexus
ansible-playbook -i inventory/hosts.yml playbooks/site.yml --tags build -e maven_profile=lightwell
ansible-playbook -i inventory/hosts.yml playbooks/site.yml --tags deploy -e jar_source=controller
```

## Optional EC2

`playbooks/provision_build_ec2.yml` — launch RHEL builder; add IP to inventory.
