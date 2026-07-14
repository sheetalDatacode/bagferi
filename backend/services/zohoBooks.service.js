import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const getZohoConfig = () => ({
  ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN,
  ZOHO_ORG_ID: process.env.ZOHO_ORG_ID,
  ZOHO_BOOKS_BASE: process.env.ZOHO_BOOKS_BASE_URL || 'https://www.zohoapis.in/books/v3',
  ZOHO_ACCOUNTS_BASE: process.env.ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.in',
});

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

async function getAccessToken() {
  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ACCOUNTS_BASE } = getZohoConfig();
  const now = Date.now();
  if (cachedAccessToken && now < cachedAccessTokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    console.error('[Zoho] Missing OAuth configuration in environment variables');
    throw new Error('Zoho OAuth env vars are not fully configured. Ensure ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN are set.');
  }

  const params = new URLSearchParams({
    refresh_token: ZOHO_REFRESH_TOKEN,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });

  const url = `${ZOHO_ACCOUNTS_BASE}/oauth/v2/token`;
  console.log('[Zoho] Requesting new access token...');
  const res = await axios.post(url, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
  });

  if (!res.data?.access_token) {
    console.error('[Zoho] Token refresh failed response:', res.data);
    throw new Error(`Failed to obtain Zoho access token: ${res.data?.error || 'unknown error'}`);
  }

  cachedAccessToken = res.data.access_token;
  const expiresInSec = Number(res.data.expires_in || 3600);
  cachedAccessTokenExpiresAt = Date.now() + expiresInSec * 1000;
  console.log('[Zoho] New access token obtained');
  return cachedAccessToken;
}

async function zohoRequest(method, path, { params = {}, data = {} } = {}) {
  const { ZOHO_ORG_ID, ZOHO_BOOKS_BASE } = getZohoConfig();
  if (!ZOHO_ORG_ID) throw new Error('ZOHO_ORG_ID is not configured');

  const token = await getAccessToken();
  const url = `${ZOHO_BOOKS_BASE}${path}`;

  try {
    console.log(`[Zoho] ${method} ${path}`);
    const res = await axios.request({
      method,
      url,
      params,
      data,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
        'X-com-zoho-books-organizationid': ZOHO_ORG_ID,
      },
      timeout: 15000,
    });

    if (res.data?.code && res.data.code !== 0) {
      console.error('[Zoho] API Error Response:', res.data);
      throw new Error(`Zoho API error (${res.data.code}): ${res.data.message || 'Unknown error'}`);
    }

    return res.data;
  } catch (err) {
    if (err.response?.data) {
      console.error('[Zoho] HTTP Error Response:', err.response.data);
      throw new Error(`Zoho integration error: ${err.response.data.message || JSON.stringify(err.response.data)}`);
    }
    console.error('[Zoho] Request failed:', err.message);
    throw err;
  }
}

async function findContactByEmail(email) {
  if (!email) return null;
  const data = await zohoRequest('GET', '/contacts', { params: { email } });
  const contacts = data?.contacts || [];

  // Strict match in case Zoho returns partial matches or first page of all contacts
  const exactMatch = contacts.find(c =>
    String(c.email || '').toLowerCase() === String(email).toLowerCase()
  );

  return exactMatch || null;
}

async function createContact({ name, companyName, email, phone, gstNumber }) {
  const contact = {
    contact_name: companyName || name || email || 'Customer',
    company_name: companyName || undefined,
    email: email || undefined,
    contact_persons: [{
      first_name: name || email || 'Customer',
      email: email || undefined,
      phone: phone || undefined,
      is_primary_contact: true,
    }],
  };

  if (phone) contact.phone = phone;

  const isIndianOrg = getZohoConfig().ZOHO_BOOKS_BASE.includes('.zohoapis.in');
  if (isIndianOrg) {
    if (gstNumber) {
      contact.gst_no = gstNumber;
      contact.gst_treatment = 'business_gst';
    } else {
      // For types where GST is optional, it should be treated as consumer or unregistered business
      contact.gst_treatment = 'consumer';
    }
  }

  const data = await zohoRequest('POST', '/contacts', { data: contact });
  return data?.contact || null;
}

export async function ensureZohoContactForVendor(vendor) {
  if (!vendor) throw new Error('Vendor is required');
  if (vendor.zohoContactId) return vendor.zohoContactId;

  let contact = await findContactByEmail(vendor.email);
  if (contact) {
    // Proactively update contact with GST if available
    if (vendor.gstNumber && !contact.gst_no) {
      try {
        await zohoRequest('PUT', `/contacts/${contact.contact_id}`, {
          data: {
            gst_no: vendor.gstNumber,
            gst_treatment: 'business_gst'
          }
        });
      } catch (e) {
        console.warn('[Zoho] Failed to update contact GST:', e.message);
      }
    }
  } else {
    contact = await createContact({
      name: vendor.name || vendor.storeName,
      companyName: vendor.storeName || vendor.businessName,
      email: vendor.email,
      phone: vendor.phone,
      gstNumber: vendor.gstNumber,
    });
  }
  return contact?.contact_id || contact?.contact_person_id;
}

export async function createSubscriptionInvoice({
  contactId,
  planName,
  amount,
  currency = 'INR',
  referenceNumber,
  notes,
  vendorGstNumber,
  baseAmount,
  gstAmount,
  discount
}) {
  const dateStr = new Date().toISOString().slice(0, 10);

  // 🔹 GST Logic: Compare seller and buyer states
  const adminGst = process.env.ADMIN_GST_NUMBER || '24AATCM8365L1ZM';
  const adminStateCode = adminGst.substring(0, 2);
  const vendorGst = (vendorGstNumber || '').trim();
  const vendorStateCode = vendorGst.substring(0, 2);

  // Determine which GST Tax ID to use (Default to CGST/SGST unless IGST is required and available)
  let gstTaxId = process.env.ZOHO_GST_18_TAX_ID;
  const igstTaxId = process.env.ZOHO_IGST_18_TAX_ID;
  const isInterstate = vendorStateCode && vendorStateCode !== adminStateCode;

  if (isInterstate && igstTaxId) {
    gstTaxId = igstTaxId;
    console.log(`[Zoho] Interstate transaction (Seller: ${adminStateCode}, Buyer: ${vendorStateCode}). Using IGST ID.`);
  } else if (isInterstate && !igstTaxId) {
    console.warn(`[Zoho] Interstate detected but ZOHO_IGST_18_TAX_ID is missing in .env! Attempting auto-discovery...`);
    try {
      const taxesData = await zohoRequest('GET', '/settings/taxes');
      const taxes = taxesData?.taxes || [];
      // Common names for IGST 18% in Zoho India
      const match = taxes.find(t => ['IGST18', 'IGST 18', 'IGST 18%', 'Interstate GST 18%'].includes(t.tax_name));
      if (match) {
        gstTaxId = match.tax_id;
        console.log(`[Zoho] Auto-discovered IGST ID: ${gstTaxId} (Name: ${match.tax_name})`);
      } else {
        console.error(`[Zoho] Could not find IGST 18% in Zoho tax settings. Please set ZOHO_IGST_18_TAX_ID in .env`);
      }
    } catch (e) {
      console.error(`[Zoho] Tax auto-discovery failed:`, e.message);
    }
  }

  const lineItems = [];
  
  if (baseAmount !== undefined && baseAmount !== null) {
    // 1. Main Plan Item
    const mainItem = {
      description: planName || 'Subscription',
      rate: baseAmount,
      quantity: 1,
      hsn_or_sac: 9987,
    };

    const useTaxId = gstTaxId && gstAmount > 0;
    if (useTaxId) {
      mainItem.tax_id = gstTaxId;
    } else {
      mainItem.is_taxable = false;
      mainItem.tax_exemption_code = 'NON_TAXABLE';
    }
    lineItems.push(mainItem);

    // 2. Discount (if any)
    if (discount && discount > 0) {
      const discountItem = {
        description: 'Discount Applied',
        rate: -discount,
        quantity: 1,
      };

      if (useTaxId) {
        // If the main item is taxable, the discount line must also be taxable 
        // to avoid Zoho's "mixed taxable/non-taxable" error for GST-registered businesses.
        discountItem.tax_id = gstTaxId;
      } else {
        discountItem.is_taxable = false;
        discountItem.tax_exemption_code = 'NON_TAXABLE';
      }
      lineItems.push(discountItem);
    }

    // 3. Manual GST Line (Only if NOT using native Zoho Tax)
    if (!gstTaxId && gstAmount > 0) {
      lineItems.push({
        description: 'GST (Tax)',
        rate: gstAmount,
        quantity: 1,
        is_taxable: false,
        tax_exemption_code: 'NON_TAXABLE',
      });
    }
  } else {
    // Fallback to total amount single line
    lineItems.push({
      description: planName || 'Subscription',
      rate: amount,
      quantity: 1,
      is_taxable: false,
      tax_exemption_code: 'NON_TAXABLE',
      hsn_or_sac: 9987,
    });
  }

  // Build rich notes that include GST numbers for maximum visibility
  let finalizedNotes = notes || '';
  const gstSection = [
    `Seller GSTIN: ${adminGst}`,
    `Buyer GSTIN: ${vendorGst || 'Not Provided'}`
  ].join('\n');

  if (gstSection) {
    finalizedNotes = finalizedNotes ? `${gstSection}\n\n${finalizedNotes}` : gstSection;
  }

  const invoice = {
    customer_id: contactId,
    date: dateStr,
    payment_terms: 0,
    reference_number: referenceNumber,
    line_items: lineItems,
    currency_code: currency,
    notes: finalizedNotes,
    gst_no: vendorGstNumber || undefined,
    gst_treatment: vendorGstNumber ? 'business_gst' : 'consumer',
    place_of_supply: vendorStateCode || adminStateCode,
  };

  if (!invoice.gst_no) delete invoice.gst_no;

  console.log(`[Zoho] Creating invoice for contact: ${contactId}, Amount: ${amount}`);
  const data = await zohoRequest('POST', '/invoices', { data: invoice });
  const inv = data?.invoice;
  if (!inv) {
    console.error('[Zoho] Invoice creation returned no invoice data');
    throw new Error('Zoho did not return invoice');
  }

  console.log(`[Zoho] Invoice created: ${inv.invoice_number} (ID: ${inv.invoice_id}, Total: ${inv.total})`);
  return {
    id: inv.invoice_id,
    number: inv.invoice_number,
    status: inv.status,
    total: inv.total,
    pdfUrl: inv.invoice_pdf_url || inv.invoice_url || null,
  };
}

/**
 * Mark an invoice as sent and optionally email it via Zoho
 * Required for some Zoho orgs to allow PDF download via API
 */
export async function markInvoiceAsSent(invoiceId, sendEmail = false) {
  if (!invoiceId) return false;
  
  try {
    // 1. If Org has "Approval" enabled, we must approve it first
    console.log(`[Zoho] Attempting to Approve/Sent invoice ${invoiceId}`);
    try {
      await zohoRequest('POST', `/invoices/${invoiceId}/status/approved`);
      console.log(`[Zoho] Invoice ${invoiceId} approved`);
    } catch (approveErr) {
      // Ignore failure if approval is not enabled/required
      console.log(`[Zoho] Approval check: ${approveErr.message} (may not be required)`);
    }

    // 2. Mark as Sent
    await zohoRequest('POST', `/invoices/${invoiceId}/status/sent`);
    console.log(`[Zoho] Invoice ${invoiceId} marked as SENT`);
    
    // 3. Optionally attempt to email
    if (sendEmail) {
      try {
        await zohoRequest('POST', `/invoices/${invoiceId}/email`, { data: {} });
        console.log(`[Zoho] Email triggered for invoice ${invoiceId}`);
      } catch (emailErr) {
        console.warn(`[Zoho] Email trigger skipped (missing template or contact email): ${emailErr.message}`);
      }
    }
    return true;
  } catch (error) {
    console.error(`[Zoho] CRITICAL: Failed to transition invoice ${invoiceId} from Draft: ${error.message}`);
    return false;
  }
}

export async function downloadInvoicePdf(invoiceId) {
  if (!invoiceId) return null;
  const { ZOHO_ORG_ID, ZOHO_BOOKS_BASE } = getZohoConfig();
  const token = await getAccessToken();
  const url = `${ZOHO_BOOKS_BASE}/invoices/${invoiceId}`;

  try {
    console.log(`[Zoho] Attempting to download PDF for invoice: ${invoiceId}`);
    const res = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'X-com-zoho-books-organizationid': ZOHO_ORG_ID,
        'Accept': 'application/pdf'
      },
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    const buffer = Buffer.from(res.data);
    if (buffer.slice(0, 4).toString() === '%PDF') {
      console.log(`[Zoho] PDF downloaded: ${buffer.length} bytes`);
      return buffer;
    }
    console.error('[Zoho] Content is not a PDF');
    return null;
  } catch (err) {
    console.error('[Zoho] PDF download failed:', err.message);
    return null;
  }
}

export async function recordInvoicePayment({ contactId, invoiceId, amount, paymentDate, razorpayPaymentId, paymentMode = 'Others', invoiceTotal }) {
  const date = (paymentDate ? new Date(paymentDate) : new Date()).toISOString().slice(0, 10);
  
  // Sanitize payment mode for Zoho
  const validModes = ['cash', 'check', 'creditcard', 'bank transfer', 'others'];
  const sanitizedMode = (paymentMode && validModes.includes(paymentMode.toLowerCase())) 
    ? (paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1)) 
    : 'Others';

  // IMPORTANT: To clear "Balance Due", we must apply exactly what Zoho thinks is due (including its calculated tax)
  // If Zoho Total is 588.82 but user paid 499 (mismatch), we apply the Zoho Total to mark as Paid
  const finalAmount = invoiceTotal || amount;
  const amountApplied = invoiceTotal || amount;

  const payment = {
    customer_id: contactId,
    payment_mode: sanitizedMode,
    amount: finalAmount,
    date,
    reference_number: razorpayPaymentId || 'N/A',
    invoices: [{ invoice_id: invoiceId, amount_applied: amountApplied }],
  };

  console.log(`[Zoho] Recording payment for invoice: ${invoiceId}, Amount: ${finalAmount}, Applied: ${amountApplied} (Mode: ${sanitizedMode})`);
  try {
    const data = await zohoRequest('POST', '/customerpayments', { data: payment });
    console.log(`[Zoho] Payment recording SUCCESS for ${invoiceId}`);
    return { 
      id: data?.payment?.payment_id || null, 
      status: data?.payment?.status || null 
    };
  } catch (err) {
    console.error(`[Zoho] Payment recording failed for invoice ${invoiceId}: ${err.message}`);
    // If it failed because it's still in draft, we have a lifecycle issue (Org settings)
    if (err.message.includes('Draft') || err.message.includes('status')) {
      console.warn(`[Zoho] Retrying payment after forceful status overrides...`);
      try {
        await zohoRequest('POST', `/invoices/${invoiceId}/status/approved`);
      } catch (e) {}
      await zohoRequest('POST', `/invoices/${invoiceId}/status/sent`);
      const data = await zohoRequest('POST', '/customerpayments', { data: payment });
      return { id: data?.payment?.payment_id || null, status: data?.payment?.status || null };
    }
    throw err;
  }
}

export async function getInvoicesForContact(contactId) {
  if (!contactId) return [];
  const data = await zohoRequest('GET', '/invoices', { params: { customer_id: contactId } });
  return data?.invoices || [];
}

export default {
  getAccessToken,
  ensureZohoContactForVendor,
  createSubscriptionInvoice,
  markInvoiceAsSent,
  recordInvoicePayment,
  downloadInvoicePdf,
  getInvoicesForContact,
};
