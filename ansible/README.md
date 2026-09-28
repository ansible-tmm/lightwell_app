# Ansible — Nexus + Lightwell

Provisions **Sonatype Nexus** with Lightwell-oriented repositories and optional fake `.rhlw` uploads. For day-to-day Stage 1 / Stage 2 builds against an **existing** Nexus, use the [root README](../README.md).

## Prerequisites

- Ansible 2.14+
- SSH to a RHEL host in the `nexus` inventory group
- Vault with `nexus_admin_password`

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
# lightwell_repo_user: service-account
# lightwell_repo_token: token
```

## Provision Nexus

```bash
ansible-playbook -i inventory/hosts.yml playbooks/provision_nexus.yml
```

Or:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site.yml
```

Creates (Podman):

- `maven-central` proxy
- `lightwell-java-remediated-mock` hosted (+ uploads fake `.rhlw` Spring artifacts when enabled)
- `lightwell-java-remediated` proxy (when `configure_lightwell_proxy: true`)
- `maven-public` group

Create `acme-releases` (hosted) in the Nexus UI to publish the application JAR.

## Existing Nexus

Prefer the [README “Already have Nexus?”](../README.md#already-have-nexus) steps (UI + scripts). If you still want Ansible against an existing host:

1. Point inventory `nexus` at that host; skip container install or set vars accordingly.
2. Override `nexus_repo_*` / `nexus_base_url` if names differ.
3. Keep `upload_mock_artifacts_to_nexus: true` or run `scripts/upload-mock-to-nexus.sh` locally.

## Variables

See `roles/nexus/defaults/main.yml` and [docs/nexus.md](../docs/nexus.md).
