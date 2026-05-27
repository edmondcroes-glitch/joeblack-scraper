# Joeblack Lottery Scraper

Scrapes Diario, Flamingo, Super-4 results from joeblack.online
and sends them to solodipueblo.com WordPress.

## Setup

1. Install Node.js 18+ on your server
2. npm install
3. Set environment variable: WEBHOOK_SECRET=your_secret_key
4. Run: node scraper.js

## Cron (run every hour after 9pm)
0 21,22,23 * * * cd /path/to/joeblack-scraper && node scraper.js

## Deploy to Railway
1. Create account at railway.app
2. New project → Deploy from GitHub
3. Set WEBHOOK_SECRET environment variable
4. Add cron schedule: 0 * * * *
