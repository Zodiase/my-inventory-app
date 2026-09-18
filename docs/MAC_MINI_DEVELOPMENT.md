# Mac mini Development Workflow

Status: accepted on 2026-07-21 for `bd-ckh.1`.

## Deployed inventory access override — 2026-09-18

The user authorized home LAN/WLAN access to the deployed browser UI, superseding the application-container loopback-only requirement below. Its protected environment now sets APP_BIND_IP=192.168.4.21, APP_PORT=48371, and APP_ROOT_URL=http://mini-m4.local:48371. Keep native development, Storybook, Mongo Express, and the database private. The agent handler still requires a loopback socket; local agents use the project client inside the app container.

Verified: hostname web response HTTP 200, network agent request rejected for non-loopback connection, and local read-only agent operation succeeded. Other-device browser access has not been independently observed. If the LAN IP changes, update the binding and recreate only the app container. Rollback restores APP_BIND_IP=127.0.0.1 and recreates only meteorapp; do not remove database volumes.

## Decision

- Run development natively on the Apple-silicon `mini-m4` with Node 22 and
  Meteor 3.4.1. Use Docker only for the production-image build and the private
  MongoDB/Mongo Express stack. The production Dockerfile copies and bundles the
  application; it is not the interactive development environment used by the
  repository's Meteor, Storybook, or Playwright commands.
- Treat `/Users/xh/workspace/my-inventory-app` as the stable primary checkout.
  `/Users/xh/workspace` is the host's documented logical path even when its
  backing storage is mounted elsewhere.
- Keep the primary checkout on `master` for synchronization and integration.
  Put each concurrent feature or Codex task on a short-lived branch in an
  isolated Git worktree. One task owns one worktree; do not run two writers in
  the same checkout.
- Use the Homebrew open-source `tailscale` and `tailscaled` distribution as a
  boot-time service, with Tailscale SSH enabled for the `xh` account. Do not
  enable macOS Remote Login for this workflow and do not forward port 22 from a
  router. Tailnet policy is the network and identity boundary.
- Use ordinary `ssh` from a trusted client for terminal access and editor
  Remote SSH. Add the same host alias in Codex under **Settings > Connections >
  SSH**, then select `/Users/xh/workspace/my-inventory-app` on that host. Use a
  Codex worktree for concurrent changes and a local chat only when intentionally
  operating on the primary checkout.
- Bind Meteor, Storybook, the application container, and Mongo Express to
  `127.0.0.1`. Do not publish MongoDB. Reach HTTP services from another computer
  through explicit SSH local forwards.
- Generate `.env` on `mini-m4` from `env.tpl` with 1Password CLI. Never copy a
  plaintext `.env` from another computer, commit it, print it, or forward the
  client's SSH agent. Create it with a restrictive umask and keep mode `0600`.
- Retain the old development environment and its data unchanged through
  cutover validation. The old environment remains the rollback path until
  `bd-ckh.7` is complete; NAS data reconciliation remains tracked separately by
  `bd-ckh.8`.

## Why native development

The repository's normal workflow invokes host tools directly:

- `npm run start:throwaway` runs `meteor run`.
- Playwright starts Meteor and Storybook as host processes.
- CI installs Meteor 3.4.1 and exercises Node 22 and 24, while browser jobs and
  the production Docker runtime use Node 22.
- The Dockerfile is a production multi-stage bundle build with no source mount,
  interactive shell, or hot-reload contract.

Node 22 therefore minimizes runtime variance with Meteor 3.4.1, browser CI, and
the production image. A development container would need a separate ownership,
mount, browser, port, and cache design without replacing the native workflow.

## First host setup

Run these commands locally on `mini-m4`:

```sh
brew install node@22 tailscale
brew link --overwrite --force node@22
sudo /opt/homebrew/bin/brew services start tailscale
sudo /opt/homebrew/bin/tailscale up --hostname=mini-m4 --ssh

curl "https://install.meteor.com/?release=3.4.1" | sh
export PATH="$HOME/.meteor:$PATH"
meteor --version
node --version
npm --version

cd /Users/xh/workspace/my-inventory-app
npm ci
npm ci --prefix meteor-app
npx playwright install chromium webkit
```

The Tailscale sign-in URL, tailnet SSH rule, and any macOS authorization prompt
are interactive gates. Complete them at the console before relying on remote
access. The tailnet rule must allow only the intended user or devices to reach
`mini-m4:22` and must map SSH access to the non-root `xh` account.

## First client connection

Install and sign in to Tailscale on the client, confirm `mini-m4` appears in
`tailscale status`, then add this alias to the client's `~/.ssh/config`:

```sshconfig
Host mini-m4-dev
    HostName mini-m4
    User xh
    ForwardAgent no
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

Verify the connection and checkout without changing state:

```sh
ssh mini-m4-dev 'hostname; git -C /Users/xh/workspace/my-inventory-app status --short --branch'
```

For Codex, open **Settings > Connections > SSH**, add `mini-m4-dev`, and select
`/Users/xh/workspace/my-inventory-app` as the project path. For an editor, use
its Remote SSH support with the same alias. Do not copy the repository back to
the client for routine development.

## Daily workflow

Open a shell:

```sh
ssh mini-m4-dev
cd /Users/xh/workspace/my-inventory-app
```

Start throwaway-data development on the Mac mini:

```sh
npm run start:throwaway
```

In a separate client terminal, forward only the service being used:

```sh
ssh -N -L 3000:127.0.0.1:3000 mini-m4-dev
ssh -N -L 6006:127.0.0.1:6006 mini-m4-dev
ssh -N -L 8081:127.0.0.1:8081 mini-m4-dev
```

Open `http://127.0.0.1:3000`, `http://127.0.0.1:6006`, or
`http://127.0.0.1:8081` on the client. The Mongo Express tunnel is opt-in and
should exist only while the admin profile is running.

Generate the protected environment file only when personal or Compose data is
needed:

```sh
cd /Users/xh/workspace/my-inventory-app
umask 077
op inject --force -i env.tpl -o .env
chmod 0600 .env
```

## Verification and rollback

Before declaring the host ready, verify that Tailscale SSH survives a restart,
ports 3000, 6006, and 8081 are not listening on a LAN address, MongoDB has no
host port, and a clean checkout can run the documented checks. Backup and
restore proof is owned by `bd-ckh.5`.

If the remote workflow fails during migration, stop work on `mini-m4`, leave its
checkout and data intact for diagnosis, and resume from the unchanged old
environment. Disable Tailscale SSH only from the console or while a separately
verified recovery path is active:

```sh
sudo /opt/homebrew/bin/tailscale set --ssh=false
```

Do not delete either environment or promote temporary MongoDB data during
rollback.

## Evidence

- `package.json`, `meteor-app/package.json`, and `.github/workflows/node.js.yml`
  define the supported Node and CI matrix.
- `meteor-app/.meteor/release` pins Meteor 3.4.1.
- `Dockerfile`, `docker-compose.yml`, `playwright.config.js`, and
  `docs/DEVELOPMENT_NOTES.md` define the current runtime and test boundaries.
- [Meteor installation guidance](https://docs.meteor.com/about/install) maps
  Meteor 3.4 to Node 22 and documents native Apple-silicon support.
- [Tailscale's macOS variants](https://tailscale.com/docs/concepts/macos-variants)
  document that only the open-source `tailscale`/`tailscaled` variant can run
  before login and act as a Tailscale SSH server.
- [Tailscale SSH](https://tailscale.com/docs/features/tailscale-ssh) documents
  the destination-platform and tailnet-policy requirements.
