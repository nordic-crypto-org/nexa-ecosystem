# Contributing to the Nexa Ecosystem Directory

Want your Nexa project listed? Open a pull request.

1. Click **+ Add your project** on the site, or [edit `data.js` on GitHub](https://github.com/nordic-crypto-org/nexa-ecosystem/edit/main/data.js). If you aren't a member, GitHub forks the repo for you and opens a pull request.
2. Add one line to `ENTRIES` in the right category section.
3. Optional: add a logo (see below).
4. Submit the pull request and fill in the template.

## Entry format

```js
["category", "Name", "One short, neutral sentence describing the project.", "https://official-url/", "logo-key", {x:"https://x.com/example", telegram:"https://t.me/example"}],
```

- **category**: one of the keys below.
- **Name**: the project's own name.
- **Description**: one factual sentence. No marketing claims, prices or promises.
- **URL**: the official HTTPS link. No referral or affiliate links.
- **logo-key**: the file name (without `.png`) in `assets/logos/`. Use `""` to show an initials placeholder.
- **social** (optional): official accounts only. See below. A high-risk listing puts `"warn"` before this object.

## Social links

Add a `social` object only for accounts you can verify from the project's own website, GitHub, GitLab, or an official announcement. Leave a key out when you cannot verify it. Do not guess.

Keys: `x`, `telegram`, `discord`, `reddit`, `github`, `gitlab`, `youtube`, `medium`, `website`.

## Categories

| key | Section |
|---|---|
| `wallets` | Wallets |
| `explorers` | Explorers |
| `exchanges` | Exchanges & Markets |
| `mining` | Mining |
| `developers` | Developers |
| `tokens` | Tokens & NFTs |
| `community` | Community |
| `news` | News & Learning |

## Logos

- Use only the project's **own** official logo, taken from its site (favicon, apple-touch-icon, og:image), its GitHub/GitLab avatar, or its repo assets. Never use another project's logo.
- Square PNG, **64×64 px**, transparent or solid background, under 20 KB, saved as `assets/logos/<logo-key>.png`.
- No hotlinking. Logos are served from this repo.
- If there's no logo, leave the key empty and an initials placeholder is shown.

## Rules

- The project must be live, related to Nexa, and its link must load.
- Being listed is not an endorsement. Maintainers may edit or decline entries, and may remove dead or abandoned links.
- Prefer a pull request. If you can't make one, [open an issue](https://github.com/nordic-crypto-org/nexa-ecosystem/issues) instead.
