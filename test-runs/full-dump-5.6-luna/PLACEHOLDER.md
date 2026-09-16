# Placeholder

This folder holds raw-dump comparison test runs against `openai/gpt-5.6-luna`
— the repo's raw content pasted/attached straight to the model, bypassing
LemonBeam's pipeline entirely. Used to sanity-check what the pipeline buys
us over just dumping everything into context.

File naming: `<repo-name>-<your initials>.json`, e.g. `express-ka.json`.

See `test-runs/README.md` at the repo root for the required JSON shape.

Delete this file once the first real test file is added here — it only
exists so the folder isn't empty (git doesn't track empty directories).
