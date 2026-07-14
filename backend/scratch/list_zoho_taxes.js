import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;
const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID;
const ZOHO_BOOKS_BASE = process.env.ZOHO_BOOKS_BASE_URL || 'https://www.zohoapis.in/books/v3';
const ZOHO_ACCOUNTS_BASE = process.env.ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.in';

async function getAccessToken() {
  const params = new URLSearchParams({
    refresh_token: ZOHO_REFRESH_TOKEN,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });

  const url = `${ZOHO_ACCOUNTS_BASE}/oauth/v2/token`;
  const res = await axios.post(url, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data.access_token;
}

async function listTaxes() {
  try {
    const token = await getAccessToken();
    const url = `${ZOHO_BOOKS_BASE}/settings/taxes`;
    const res = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'X-com-zoho-books-organizationid': ZOHO_ORG_ID,
      },
    });

    console.log('--- Zoho Tax Rates ---');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error fetching taxes:', err.response?.data || err.message);
  }
}

listTaxes();
