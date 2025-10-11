#!/usr/bin/env node
// tools/send-rfq-to-mssql.js
// Usage: node tools/send-rfq-to-mssql.js <rfqId> [backendUrl]
// This script fetches an RFQ from the local backend, constructs MSSQL quotation payloads
// (one per vendor with quotes) and posts them to /api/mssql/quotations with
// ModifiedBy=1 and ValidityDate=today (explicitly set).

const http = require('http');
const https = require('https');
const { URL } = require('url');

function doFetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const body = opts.body ? JSON.stringify(opts.body) : null;
    const headers = Object.assign({ 'Accept': 'application/json' }, opts.headers || {});
    if (body) headers['Content-Type'] = 'application/json';
    const req = lib.request(u, { method: opts.method || 'GET', headers }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const ct = res.headers['content-type'] || '';
        if (ct.includes('application/json')) {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch (err) { reject(new Error('Invalid JSON response: ' + err.message + '\n' + data)); }
        } else {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function todayDateString() {
  return new Date().toISOString().slice(0,10);
}

async function main() {
  const rfqId = process.argv[2];
  const backend = process.argv[3] || 'http://localhost:5000';
  if (!rfqId) {
    console.error('Usage: node tools/send-rfq-to-mssql.js <rfqId> [backendUrl]');
    process.exit(2);
  }
  try {
    console.log('Fetching RFQ', rfqId, 'from', backend);
    const rfqRes = await doFetch(`${backend}/api/rfqs/${rfqId}`);
    if (rfqRes.status >= 400) {
      console.error('Failed to fetch RFQ:', rfqRes.status, rfqRes.body);
      process.exit(1);
    }
    const rfq = rfqRes.body;
    console.log('RFQ fetched. items:', rfq.items?.length, 'vendors:', rfq.vendors?.length);

    // For each vendor that has quotes, build a MSSQL quotation and details
    const vendorsWithQuotes = (rfq.vendors || []).filter(v => Array.isArray(v.quotes) && v.quotes.length > 0);
    if (vendorsWithQuotes.length === 0) {
      console.log('No vendor quotes found on this RFQ. Nothing to send.');
      return;
    }

    for (const vendor of vendorsWithQuotes) {
      const vendorMssqlId = vendor.vendor?.Id || vendor.vendor_external_id || vendor.vendorExternalId || vendor.vendor_id || vendor.vendorId || null;
      const details = [];
      let totalQty = 0;
      let totalAmount = 0;

      for (const q of vendor.quotes) {
        // find the item
        const item = (rfq.items || []).find(it => String(it.item_id || it.itemId || it.item_external_id) === String(q.item_id || q.itemId));
        const stockId = (item && (item.item_external_id || item.itemExternalId || item.stock?.Id || item.stock?.id)) || q.item_external_id || q.itemExternalId || null;
        const qty = q.quantity ?? q.qty ?? 1;
        const unitPrice = q.unit_price ?? q.unitPrice ?? q.unitPrice ?? 0;
        const amount = Number(unitPrice) * Number(qty || 0);
        totalQty += Number(qty || 0);
        totalAmount += amount;
        if (!stockId) {
          console.warn('Skipping quote for item (no stock id found):', q, 'item:', item?.itemId || item?.item_id);
          continue;
        }
        details.push({ Qty: qty, Stock_Id: Number(stockId), Amount: amount, Unit_Price: Number(unitPrice) });
      }

      if (details.length === 0) {
        console.log('No valid details for vendor', vendor.vendorId || vendor.id || vendorMssqlId, '— skipping.');
        continue;
      }

      const quotation = {
        Code: `${rfq.rfqNumber || 'RFQ'}-${vendor.vendorId || vendorMssqlId || Date.now()}`,
        Customer_Id: rfq.accountId || null,
        TotalQty: totalQty,
        VatType: 1,
        TotalWithOutVAT: totalAmount,
        VAT: rfq.vat || 0,
        TotalWithVat: totalAmount + (rfq.vat || 0),
        ValidityDate: todayDateString(),
        ModifiedBy: 1,
        DateModified: new Date().toISOString(),
        Status: 0,
        Notes: `Imported from RFQ ${rfq.id}`,
      };

      const payload = { quotation, details };
      console.log('Sending MSSQL quotation for vendor', vendor.vendorId || vendorMssqlId, 'details:', details.length);
      const postRes = await doFetch(`${backend}/api/mssql/quotations`, { method: 'POST', body: payload });
      console.log('MSSQL response status:', postRes.status);
      console.log(JSON.stringify(postRes.body, null, 2));
    }

    console.log('Done sending quotations to MSSQL.');
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
