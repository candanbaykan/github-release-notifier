# GitHub Release Notifier

This script checks for new releases of GitHub repositories defined in `repositories.json` periodically. If a new release found, an email is sent to the user.

## Instructions

1. Install `bun` from [bun.sh](https://bun.sh/).
2. Copy `.env` and `repositories.json` from the `examples` folder to project's root directory.
3. Edit `.env` and `repositories.json` files for your needs.
4. Install dependencies: `bun install`.
5. Run the script: `bun start`.
