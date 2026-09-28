# Application builds

## Prerequisites

- **JDK 11**
- **Maven Wrapper** (`./mvnw`)

## Stage 1 — community (default)

No Nexus required:

```bash
./mvnw -Pcommunity package
```

## Stage 2 — lightwell via Nexus

1. Fake Lightwell artifacts must exist in Nexus (`upload-mock-to-nexus.sh`).
2. Copy settings:

```bash
cp maven/settings-nexus.xml.example maven/settings-nexus.xml
# Edit Nexus URL + password
```

3. Build:

```bash
./mvnw -Plightwell -s maven/settings-nexus.xml -U -DskipTests package
```

| Profile | Spring version | Where it resolves |
|---------|----------------|-------------------|
| `community` | `5.3.18` | Central (or Nexus → central) |
| `lightwell` | `5.3.18.rhlw-00010` | Nexus hosted mock (or real Lightwell proxy) |

Repositories for Stage 2 are **not** declared in `pom.xml`; they live in `settings-nexus.xml`.

## Publish JAR to Nexus

```bash
./scripts/publish-app-to-nexus.sh
```

See [README — Already have Nexus?](../README.md#already-have-nexus).
