# Ansible — Nexus + Lightwell

Provisions **Sonatype Nexus** with Lightwell-oriented repositories and optional mock `.rhlw` uploads. Application build/deploy is out of scope for this phase.

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
# lightwell_maven_user: service-account
# lightwell_maven_token: token
```

## Provision Nexus

```bash
ansible-playbook -i inventory/hosts.yml playbooks/provision_nexus.yml
```

Or via site playbook:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site.yml
```

Creates (Podman):

- `maven-central` proxy
- `lightwell-java-remediated-mock` hosted (+ uploads `.rhlw` Spring artifacts when enabled)
- `lightwell-java-remediated` proxy (when `configure_lightwell_proxy: true`)
- `maven-public` group

## Existing Nexus

1. Skip `provision_nexus.yml` if Nexus already runs.
2. Create matching repo names or override `nexus_repo_*` in `group_vars/all.yml`.
3. Set `nexus_base_url` and vault password.
4. Run `scripts/upload-mock-to-nexus.sh` from the repo root, or keep `upload_mock_artifacts_to_nexus: true` against a reachable host.

## Variables

See `roles/nexus/defaults/main.yml` and [docs/nexus.md](../docs/nexus.md).
