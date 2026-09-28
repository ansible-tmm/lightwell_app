# lightwell_app

**Nexus + Red Hat Lightwell** demo: stand up [Sonatype Nexus Repository](https://www.sonatype.com/products/sonatype-nexus-repository) and wire it for Lightwell remediated Java artifacts (`5.3.18` → `5.3.18.rhlw-00010`).

This phase matches the **Nexus-only** path (no application Maven build in scope). Consumption story: enterprise artifact manager → Lightwell hosted/proxy repos → `maven-public` group.

## What you get

| Nexus repository | Type | Role |
|------------------|------|------|
| `maven-central` | proxy | Upstream Maven Central |
| `lightwell-java-remediated-mock` | hosted | Offline demo: Spring `.rhlw-00010` artifacts |
| `lightwell-java-remediated` | proxy | Optional: `packages.redhat.com/lightwell/java/remediated/` |
| `maven-public` | group | Ordered: mock → (optional RH) → central |

## Prerequisites

- Ansible 2.14+
- SSH to a RHEL host (Podman)
- Vault password for Nexus admin (and optional Lightwell service account)

## Quick start

```bash
cd ansible
ansible-galaxy collection install -r requirements.yml
cp inventory/hosts.example.yml inventory/hosts.yml
# Edit nexus host IP / SSH user
ansible-vault create inventory/group_vars/nexus/vault.yml
# vault.yml → nexus_admin_password: <secure-password>

ansible-playbook -i inventory/hosts.yml playbooks/provision_nexus.yml
```

Open Nexus UI: `http://<nexus-host>:8081`

Ansible will:

1. Run Nexus OSS in Podman
2. Create the repositories above
3. Stage and upload mock `.rhlw` Spring modules into the hosted repo

Details: [docs/nexus.md](docs/nexus.md) · [ansible/README.md](ansible/README.md)

## Optional: real Lightwell proxy

In vault / group vars:

```yaml
configure_lightwell_proxy: true
lightwell_maven_user: <service-account>
lightwell_maven_token: <token>
```

Then re-run `provision_nexus.yml` (or create the proxy repo once credentials exist).

## Manual mock upload (existing Nexus)

```bash
./scripts/build-mock-lightwell-repo.sh
NEXUS_URL='http://<host>:8081' NEXUS_PASSWORD='...' ./scripts/upload-mock-to-nexus.sh
```

## Docs

- [docs/nexus.md](docs/nexus.md) — repository layout, variables, existing Nexus
