# ProofLine public demo

This repository contains the reviewed, compiled ProofLine public-demo
artifact. It is a deployment repository, not a second application source
tree.

The demo uses the same interface and workflow pages as ProofLine, but its data
adapter is replaced at build time with fictional JSON and temporary in-browser
state. It contains no backend, production profile, real vacancy or application
record, credential, provider call, upload, persistence, or automatic job
submission.

All people, employers, roles, scores, metrics, and outcomes shown by the demo
are invented. Scores and readiness signals are illustrative and are not hiring
predictions.

## Repository contents

- `site/` — compiled static files deployed to GitHub Pages.
- `fixtures/proofline-public-demo.json` — the fictional source fixture embedded
  into the matching compiled artifact; the browser does not fetch it at runtime.
- `PUBLIC_ARTIFACT.json` — exact file sizes and SHA-256 hashes for the reviewed
  artifact and fixture.
- `.github/scripts/verify-public-artifact.mjs` — deployment gate that rejects
  changed hashes, backend/network primitives, private paths, production adapter
  markers, source maps, missing assets, and unexpected files.
- `THIRD_PARTY_NOTICES.md` — licenses retained for bundled dependencies.

The canonical GUI, production HTTP adapter, demo adapter, build tooling, and
tests remain in the private `career-Ops` project. A demo-mode build produces
this static artifact. The same artifact can be hosted by GitHub Pages, an AWS
S3 static website/CloudFront distribution, or another static host.

## Deployment

GitHub Actions validates the committed artifact and then publishes only
`site/`. It does not install dependencies, compile application source, or run a
backend.

For another static host, upload the contents of `site/`. This artifact was
built for the `/proofline-public-demo/` GitHub project-page base path. Build a
separate demo artifact with base path `/` for an S3/CloudFront root or custom
domain.

## Licensing

The current first-party compiled demo is distributed under the proprietary
notice in [LICENSE](LICENSE). Bundled third-party components retain their own
licenses in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Historical
Apache-2.0 versions remain subject to their historical license terms.
