# NetLanding

[![Python](https://img.shields.io/pypi/pyversions/netlanding.svg)](https://pypi.org/project/netlanding/)

A locally hosted, income tracker for self-employees. Track gross income and all deductions (platform fees, withdrawal fees) before money reaches your bank. **Not** an expense tracker — strictly income and pre-bank leakage.

---

## Features

- **Dashboard** — Live pipeline view (Pending → Available → Withdrawn → In Bank), fee erosion tracking, per-source breakdown, avg. days to clear
- **Entries** — Full table with search, status/source/date filters, inline edit & delete, paginated
- **Entry Modal** — Real-time net income calculation, status-driven conditional fields (bank account, withdrawal/cleared dates)
- **Settings** — Manage sources, bank accounts, base currency

## First-Time Use

1. **Add Sources** — Go to Settings → Income Sources. Add platforms/clients you earn from (e.g. "Upwork", "Direct Client", "Fiverr").
2. **Add Bank Accounts** — Go to Settings → Bank Accounts. Add where money lands (e.g. "Maybank MYR", "Wise USD").
3. **Set Base Currency** — Go to Settings → Base Display Currency. Choose your preferred display currency (default: USD).
4. **Create Entries** — Go to Entries → New Entry. Log each income event with gross amount, fees, and status.

## Status Lifecycle

| Status | Meaning |
|---|---|
| **Pending** | Money visible on platform but not yet released |
| **Available** | Platform has released — ready to withdraw |
| **Withdrawn** | Withdrawal initiated |
| **In Bank** | Money cleared in your bank account |

## Installation

### PyPI (Recommended)
```bash
pip install netlanding
netlanding
http://127.0.0.1:8000
```

### Docker
> [!NOTE]
> Coming soon!

---

## Contributing
Contributions are welcome. Please review our [Development Guide](./docs/development.md) and open an issue first to discuss what you'd like to change.