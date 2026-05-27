const puppeteer = require('puppeteer');
const axios     = require('axios');

// ── CONFIG ──────────────────────────────────────────────────────
const JOEBLACK_URL  = 'https://www.joeblack.online/';
const WEBHOOK_URL   = 'https://www.solodipueblo.com/wp-admin/admin-ajax.php?action=lal_joeblack_update';
const WEBHOOK_KEY   = process.env.WEBHOOK_SECRET || 'CHANGE_THIS_SECRET';
// ────────────────────────────────────────────────────────────────

async function scrape() {
    console.log('[JB] Starting scrape:', new Date().toISOString());

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    try {
        await page.goto(JOEBLACK_URL, { waitUntil: 'networkidle2', timeout: 30000 });

        const results = await page.evaluate(() => {
            const getText = (el) => el ? el.innerText.trim() : null;

            // Each game is in a <table> — find by the game image src
            const tables = Array.from(document.querySelectorAll('table'));
            const data   = {};

            tables.forEach(table => {
                const img  = table.querySelector('img');
                const bold = table.querySelector('strong, b');
                if (!img || !bold) return;

                const src  = img.src || img.getAttribute('src') || '';
                const nums = getText(bold);

                if (src.includes('diario'))   data.diario   = nums;
                if (src.includes('flamingo'))  data.flamingo = nums;
                if (src.includes('super4') || src.includes('super-4')) data.super4 = nums;
                if (src.includes('wnk'))       data.wnk      = nums;

                // Sunday: Santo Domingo
                if (src.includes('santodomingo') || src.includes('sto_domingo')) data.santodomingo = nums;
            });

            // Get date from page heading
            const heading = document.querySelector('h3, h2, .results-date');
            data.date = heading ? heading.innerText.trim() : new Date().toDateString();

            return data;
        });

        console.log('[JB] Scraped:', JSON.stringify(results, null, 2));

        // Parse numbers into structured format
        const parseNums = (str) => {
            if (!str) return null;
            const groups = str.trim().split(/\s+/).filter(n => /^\d{4}$/.test(n));
            return groups.length > 0 ? groups : null;
        };

        const payload = {
            secret: WEBHOOK_KEY,
            date:   results.date || new Date().toDateString(),
            games:  {}
        };

        if (results.diario)  {
            const nums = parseNums(results.diario);
            if (nums) payload.games.Diario = { name: 'Diario', sets: nums.map(n => n.split('')) };
        }
        if (results.flamingo) {
            const nums = parseNums(results.flamingo);
            if (nums) payload.games.Flamingo = { name: 'Flamingo', sets: nums.map(n => n.split('')) };
        }
        if (results.super4) {
            const nums = parseNums(results.super4);
            if (nums && nums.length === 1) payload.games['Super-4'] = { name: 'Super-4', numbers: nums[0].split('') };
            else if (nums) payload.games['Super-4'] = { name: 'Super-4', sets: nums.map(n => n.split('')) };
        }
        if (results.santodomingo) {
            const nums = parseNums(results.santodomingo);
            if (nums) payload.games['Santo Domingo'] = { name: 'Santo Domingo', sets: nums.map(n => n.split('')) };
        }

        if (Object.keys(payload.games).length === 0) {
            console.log('[JB] No games found — results may not be posted yet');
            return;
        }

        // Send to WordPress
        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
        });

        console.log('[JB] WordPress response:', response.status, response.data);
        console.log('[JB] Done!');

    } catch (err) {
        console.error('[JB] Error:', err.message);
    } finally {
        await browser.close();
    }
}

scrape();
