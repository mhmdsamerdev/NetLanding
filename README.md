# NetLanding

**How much of your money actually reaches you?**

You earn $1,000 on a platform. Then come the platform fee, the withdrawal fee, and days of waiting. What lands in your bank is less. NetLanding shows you exactly how much less, and where the rest went.

It's a small income tracker that runs on your own computer. No account. No cloud. Your data stays with you.

![NetLanding dashboard](https://raw.githubusercontent.com/mhmdsamerdev/NetLanding/main/docs/dashboard.png)

## Get started

```bash
uv tool install netlanding
netlanding
```

That's it. Your browser opens and you're in. (Prefer pip? `pip install netlanding` works too.)

## What you get

- **See every dollar move.** Each payment goes from Pending → Available → Withdrawn → In Bank. You always know where your money is sitting.
- **See what fees take.** A clear picture of what each platform really leaves you, so you know which clients are worth it.
- **Never forget a withdrawal.** The dashboard tells you what's ready to pull out, and for how long it's been waiting.
- **Log income in seconds.** A quick form, and one click on the status badge to move a payment forward.
- **Set it up once.** Give each source its usual fee and how long it takes to clear, and NetLanding fills in the rest.
- **Your data is safe.** Automatic backups, JSON and CSV export, and import with a preview and Undo.

NetLanding tracks income only. It's not an expense tracker, and that's on purpose.

## Commands

```bash
netlanding                        # start and open the browser
netlanding stop                   # stop the server
netlanding backup                 # save a snapshot now
netlanding export --format csv    # or json
```

Options: `--port`, `--host`, `--no-browser`, `--log`. Your data lives in `~/.netlanding/`.

## Contributing

Ideas and fixes are welcome. Open an issue first, and read the [development guide](./docs/development.md).
