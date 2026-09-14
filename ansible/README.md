# Ansible automation — Lightwell demo app

Three-step flow: **build** the JAR on a builder host, **deploy** it with systemd, optionally **provision** EC2 first.

## Prerequisites

- Ansible 2.14+
- SSH access to RHEL build/app hosts (or run provision playbook)
- Collections:

```bash
cd ansible
ansible-galaxy collection install -r requirements.yml
```

## Inventory

```bash
cp inventory/hosts.example.yml inventory/hosts.yml
# Edit ansible_host and ansible_user
```

For local development (sync repo from your laptop instead of git):

```yaml
# group_vars/all.yml or host vars
deploy_from_git: false
```

Run playbooks from the `ansible/` directory so `playbook_dir` resolves correctly.

## Step 2 — Build

Community (before):

```bash
ansible-playbook -i inventory/hosts.yml playbooks/build.yml
```

Lightwell mock (after):

```bash
ansible-playbook -i inventory/hosts.yml playbooks/build.yml \
  -e maven_profile=lightwell \
  -e build_mock_lightwell_repo=true \
  -e maven_settings_file=/opt/acme/lightwell_app/maven/settings-mock.xml
```

Optional: fetch JAR to controller:

```bash
ansible-playbook ... -e fetch_artifact_to_controller=true
```

Registered fact on build host: `built_jar_path`.

## Step 3 — Deploy

From controller artifact (after `fetch_artifact_to_controller`):

```bash
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml -e jar_source=controller
```

From build host (same playbook run or prior facts in inventory):

```bash
ansible-playbook -i inventory/hosts.yml playbooks/build.yml playbooks/deploy.yml \
  -e jar_source=build_host
```

Health check: `http://<app-host>:8080/health`

## Optional — Provision build EC2

```bash
ansible-playbook playbooks/provision_build_ec2.yml \
  -e ec2_key_name=my-keypair \
  -e ec2_subnet_id=subnet-0123456789abcdef0
```

Add returned IP to `inventory/hosts.yml` under `build`.

## Secrets (real Lightwell)

Store in vault (do not commit plaintext):

```bash
ansible-vault create inventory/group_vars/build/vault.yml
```

```yaml
lightwell_maven_user: your-service-account
lightwell_maven_token: your-token
```

Then:

```yaml
use_real_lightwell: true
maven_profile: lightwell
maven_settings_file: "{{ app_root }}/maven/settings-lightwell.xml"
build_mock_lightwell_repo: false
```

## Site playbook

```bash
ansible-playbook -i inventory/hosts.yml playbooks/site.yml --tags build
ansible-playbook -i inventory/hosts.yml playbooks/site.yml --tags deploy -e jar_source=controller
```
