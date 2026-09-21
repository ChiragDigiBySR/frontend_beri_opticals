// src/utils/invoiceTemplates.js

// const formatDate = (date) => date ? new Date(date).toLocaleDateString("en-IN") : "-";
const formatDate = (date) => {
  if (!date) return "-";

  const [year, month, day] = date.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const formatTime = (date) => {
  if (!date) return "-";

  const time = date.slice(11, 16); // "14:00"
  const [hour, minute] = time.split(":").map(Number);

  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
};

const sharedStyles = `
  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background:#fff; padding:30px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .invoice { width:100%; max-width:800px; margin:auto; border:1px solid #e0c8a8; border-radius:8px; overflow:hidden; }
  .invoice-header { display:flex; justify-content:space-between; align-items:center; padding:2px 24px; }
  .invoice-header h1 { font-size:34px; font-weight:700; letter-spacing:2px; color:#e8710a; }
  .store-logo img { width:200px; height:200px; object-fit:contain; }
  .details { display:grid; grid-template-columns:2fr 1fr; }
  .details-left, .details-right { padding:10px; font-size:11px; }
  .details p { margin-bottom:4px; }
  .customer-section { margin-top:6px; padding-top:6px; border-top:1px solid #e0c8a8; }
  .customer-section .label { font-weight:700; color:#e8710a; margin-bottom:3px; }
  .section-title { background:#fdf0e2; padding:2px 16px; font-size:13px; font-weight:700; letter-spacing:1px; color:#e8710a; }
  .content { padding:14px; }
  .content > * + * { margin-top:14px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  thead tr { background:#e8710a; color:#fff; }
  th, td { padding:2px 12px; }
  td.center, th.center { text-align:center; }
  td.bold { font-weight:600; }
  tbody tr:nth-child(even) { background:#faf6f2; }
  .summary-block { border:1px solid #e0c8a8; border-radius:6px; overflow:hidden; }
  .prescription-grid { display:grid; grid-template-columns:1fr 1fr; }
  .prescription-grid > div:first-child { border-right:1px solid #e0c8a8; }
  .eye-title { background:#e8710a; color:#fff; text-align:center; padding:6px; font-size:13px; font-weight:600; }
  .prescription-grid table th { background:#faf6f2; color:#2a1f14; font-size:11px; text-align:center; }
  .prescription-grid table td { text-align:center; font-size:10px; }
  .invoice-footer { text-align:center; padding:8px 24px; border-top:1px solid #e0c8a8; }
  .invoice-footer p { font-size:12px; color:#8a7a6a; }
  .invoice-footer .thanks { font-size:14px; font-weight:600; color:#e8710a; }
`;

const prescriptionBlock = (prescription, items) => {
  if (!prescription?.length) return "";
  const list = Array.isArray(prescription) ? prescription : [prescription];
  return `<div class="summary-block">${list.map((pres, i) => {
    const r = pres?.eyewear?.rightEye || {};
    const l = pres?.eyewear?.leftEye || {};
    const linked = items?.find(p => p.productKey === pres?.productKey);
    const label = linked ? linked.name || "-" : "Product not found";
    return `
      <div style="margin-bottom:12px;border-bottom:1px dashed #e0c8a8;padding-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px;">
          <span style="font-size:12px;font-weight:700;color:#e8710a;padding:0 10px;">Prescription ${i + 1}</span>
          <span style="font-size:11px;font-weight:600;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;padding:2px 10px;border-radius:999px;">${label}</span>
        </div>
        <div class="prescription-grid">
          <div><div class="eye-title">Right Eye</div>
            <table><thead><tr><th></th><th>SPH</th><th>CYL</th><th>AXIS</th><th>V/N</th></tr></thead>
            <tbody>
              <tr><td>DV</td><td>${r.sph || "-"}</td><td>${r.cyl || "-"}</td><td>${r.axis || "-"}</td><td>${r.vis || "-"}</td></tr>
              <tr><td>NV</td><td>${r.nv_sph || "-"}</td><td>${r.nv_cyl || "-"}</td><td>${r.nv_axis || "-"}</td><td>${r.nv_vis || "-"}</td></tr>
              <tr><td>ADD</td><td>${r.add || "-"}</td><td>-</td><td>-</td><td>-</td></tr>
            </tbody></table></div>
          <div><div class="eye-title">Left Eye</div>
            <table><thead><tr><th></th><th>SPH</th><th>CYL</th><th>AXIS</th><th>V/N</th></tr></thead>
            <tbody>
              <tr><td>DV</td><td>${l.sph || "-"}</td><td>${l.cyl || "-"}</td><td>${l.axis || "-"}</td><td>${l.vis || "-"}</td></tr>
              <tr><td>NV</td><td>${l.nv_sph || "-"}</td><td>${l.nv_cyl || "-"}</td><td>${l.nv_axis || "-"}</td><td>${l.nv_vis || "-"}</td></tr>
              <tr><td>ADD</td><td>${l.add || "-"}</td><td>-</td><td>-</td><td>-</td></tr>
            </tbody></table></div>
        </div>
      </div>`;
  }).join("")}</div>`;
};

const shell = (title, d, body) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>${sharedStyles}</style></head><body>
<div class="invoice">
  <div class="invoice-header">
    <h1>${title}</h1>
    <div class="store-logo">${d.logoUrl ? `<img src="${d.logoUrl}" />` : ""}</div>
  </div>
  <div class="details">
    <div class="details-left">
      <p><strong>Bill Number:</strong> ${d.jcNo}</p>
      <p><strong>Company Name:</strong> ${d.companyName}</p>
      <p><strong>Address:</strong> ${d.companyAddress}</p>
      <p><strong>Email:</strong> ${d.companyEmail}</p>
      <p><strong>Phone:</strong> ${d.companyPhone}</p>
      ${d.companyGstin ? `<p>GSTIN: ${d.companyGstin}</p>` : ""}
    </div>
    <div class="details-right">
      <p><strong>Date of Order:</strong> ${formatDate(d.orderDate)}</p>
      <p><strong>Time of Order:</strong> ${formatTime(d.orderDate)}</p>
      <p><strong>Date of Delivery:</strong> ${formatDate(d.deliveryDate)}</p>
      <div class="customer-section">
        <p class="label">Customer Details:</p>
        <p><strong>Name:</strong> ${d.customerName || "-"}</p>
        <p><strong>Address:</strong> ${d.customerAddress || "-"}</p>
        <p><strong>Phone:</strong> ${d.customerPhone || "-"}</p>
      </div>
    </div>
  </div>
  <div class="content">${body}
    <div class="invoice-footer">
      <p>No signature is required as this is a system-generated invoice.</p>
      <p class="thanks">Thank you for your business!</p>
    </div>
  </div>
</div></body></html>`;

const paymentSummary = (d) => `
  <div><div class="section-title">Payment Summary</div>
    <table><thead><tr><th class="center">Grand Total</th><th class="center">Advanced Paid</th><th class="center">Balance Due</th><th class="center">Payment Method</th></tr></thead>
    <tbody><tr><td class="center bold">Rs. ${d.total}</td><td class="center">Rs. ${d.advance}</td><td class="center bold">Rs. ${d.balance}</td><td class="center">${d.ttype}</td></tr></tbody>
  </table></div>`;

export const generateAdvanceInvoiceWithGstHTML = (d) => {
  const rows = d.items.map((item, i) => `<tr><td class="center">${i + 1}</td><td class="center">${item.name}</td><td class="center">${item.hsnSac}</td><td class="center">${Number(item.price).toFixed(2)}</td><td class="center">${item.quantity}</td><td class="center">${Number(item.discount).toFixed(2)}</td><td class="center bold">${Number(item.total).toFixed(2)}</td></tr>`).join("");
  return shell("Advance Receipt", d, `
    <div><div class="section-title">Items</div>
      <table><thead><tr><th>S.No</th><th>Item</th><th>HSN</th><th class="center">Price</th><th class="center">Qty</th><th class="center">Discount</th><th class="center">Amount</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <div><div class="section-title">Tax Summary</div>
      <table><thead><tr><th>Sub Total</th><th>Add. Discount</th><th>SGST</th><th>CGST</th><th>IGST</th></tr></thead>
      <tbody><tr><td class="center">${d.subTotal}</td><td class="center">${d.additionalDiscount}</td><td class="center">${d.sgst}</td><td class="center">${d.cgst}</td><td class="center">${d.igst}</td></tr></tbody></table></div>
    ${paymentSummary(d)}
    ${d.showPrescription ? prescriptionBlock(d.prescription, d.items) : ""}
    ${d.companyName.includes("Chashmewale") ? `<div class="summary-block">
      <div class="section-title">Terms & Conditions</div>

      <div style="padding:10px 16px; font-size:10px; line-height:1.2; color:#2a1f14;">
        <ol style="padding-left:18px; margin:0;">
          <li>
            Exchanges: Within 7 days only (no returns).
          </li>

          <li>
            Collection: Within 15 days (firm not liable after).
          </li>

          <li>
            Cancellation: Within 2 hours (lens charges apply after).
          </li>

          <li>
            Tax: GST Composition Scheme applies.
          </li>
        </ol>
      </div>
    </div>` : ""
    }
    `);
};

export const generateAdvanceInvoiceWithoutGstHTML = (d) => {
  const rows = d.items.map((item, i) => `<tr><td class="center">${i + 1}</td><td class="center">${item.name}</td><td class="center">${Number(item.price).toFixed(2)}</td><td class="center">${item.quantity}</td><td class="center">${Number(item.discount).toFixed(2)}</td><td class="center bold">${Number(item.total).toFixed(2)}</td></tr>`).join("");
  return shell("Advance Receipt", d, `
    <div><div class="section-title">Items</div>
      <table><thead><tr><th>S.No</th><th>Item</th><th class="center">Price</th><th class="center">Qty</th><th class="center">Discount</th><th class="center">Amount</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <div><div class="section-title">Summary</div>
      <table><thead><tr><th>Sub Total</th><th>Add. Discount</th></tr></thead>
      <tbody><tr><td class="center">${d.subTotal}</td><td class="center">${d.additionalDiscount}</td></tr></tbody></table></div>
    ${paymentSummary(d)}
    ${d.showPrescription ? prescriptionBlock(d.prescription, d.items) : ""}

    ${d.companyName.includes("Chashmewale") ? `<div class="summary-block">
      <div class="section-title">Terms & Conditions</div>

      <div style="padding:10px 16px; font-size:10px; line-height:1.2; color:#2a1f14;">
        <ol style="padding-left:18px; margin:0;">
          <li>
            Exchanges: Within 7 days only (no returns).
          </li>

          <li>
            Collection: Within 15 days (firm not liable after).
          </li>

          <li>
            Cancellation: Within 2 hours (lens charges apply after).
          </li>

          <li>
            Tax: GST Composition Scheme applies.
          </li>
        </ol>
      </div>
    </div>` : ""
    }
    `);
};

export const generateDeliveredInvoiceWithGstHTML = (d) => {
  const rows = d.items.map((item, i) => `<tr><td class="center">${i + 1}</td><td class="center">${item.name}</td><td class="center">${item.hsnSac}</td><td class="center">${Number(item.price).toFixed(2)}</td><td class="center">${item.quantity}</td><td class="center">${Number(item.discount).toFixed(2)}</td><td class="center bold">${Number(item.total).toFixed(2)}</td></tr>`).join("");
  return shell("Invoice Receipt", d, `
    <div><div class="section-title">Items</div>
      <table><thead><tr><th>S.No</th><th>Item</th><th>HSN</th><th class="center">Price</th><th class="center">Qty</th><th class="center">Discount</th><th class="center">Amount</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <div><div class="section-title">Tax Summary</div>
      <table><thead><tr><th>Sub Total</th><th>Add. Discount</th><th>SGST</th><th>CGST</th><th>IGST</th></tr></thead>
      <tbody><tr><td class="center">${d.subTotal}</td><td class="center">${d.additionalDiscount}</td><td class="center">${d.sgst}</td><td class="center">${d.cgst}</td><td class="center">${d.igst}</td></tr></tbody></table></div>
    ${paymentSummary(d)}
    ${d.showPrescription ? prescriptionBlock(d.prescription, d.items) : ""}

    ${d.companyName.includes("Chashmewale") ? `<div class="summary-block">
      <div class="section-title">Terms & Conditions</div>

      <div style="padding:10px 16px; font-size:10px; line-height:1.2; color:#2a1f14;">
        <ol style="padding-left:18px; margin:0;">
          <li>
            Exchanges: Within 7 days only (no returns).
          </li>

          <li>
            Collection: Within 15 days (firm not liable after).
          </li>

          <li>
            Cancellation: Within 2 hours (lens charges apply after).
          </li>

          <li>
            Tax: GST Composition Scheme applies.
          </li>
        </ol>
      </div>
    </div>` : ""
    }
    `);
};

export const generateDeliveredInvoiceWithoutGstHTML = (d) => {
  const rows = d.items.map((item, i) => `<tr><td class="center">${i + 1}</td><td class="center">${item.name}</td><td class="center">${Number(item.price).toFixed(2)}</td><td class="center">${item.quantity}</td><td class="center">${Number(item.discount).toFixed(2)}</td><td class="center bold">${Number(item.total).toFixed(2)}</td></tr>`).join("");
  return shell("Invoice Receipt", d, `
    <div><div class="section-title">Items</div>
      <table><thead><tr><th>S.No</th><th>Item</th><th class="center">Price</th><th class="center">Qty</th><th class="center">Discount</th><th class="center">Amount</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <div><div class="section-title">Summary</div>
      <table><thead><tr><th>Sub Total</th><th>Add. Discount</th></tr></thead>
      <tbody><tr><td class="center">${d.subTotal}</td><td class="center">${d.additionalDiscount}</td></tr></tbody></table></div>
    ${paymentSummary(d)}
    ${d.showPrescription ? prescriptionBlock(d.prescription, d.items) : ""}

    ${d.companyName.includes("Chashmewale") ? `<div class="summary-block">
      <div class="section-title">Terms & Conditions</div>

      <div style="padding:10px 16px; font-size:10px; line-height:1.2; color:#2a1f14;">
        <ol style="padding-left:18px; margin:0;">
          <li>
            Exchanges: Within 7 days only (no returns).
          </li>

          <li>
            Collection: Within 15 days (firm not liable after).
          </li>

          <li>
            Cancellation: Within 2 hours (lens charges apply after).
          </li>

          <li>
            Tax: GST Composition Scheme applies.
          </li>
        </ol>
      </div>
    </div>` : ""
    }
    
    `);
};

// Build invoiceData object from raw jobCard + products + prescription
export const buildInvoiceData = (jobCard, products = [], prescription = [], store = {}) => {
  const includedTax = products.reduce((sum, item) =>
    item.gstType === "INCLUDED" ? sum + (item.gstAmount || 0) : sum, 0);

  const items = products.map(item => ({
    name: item.productName || item.otherProductName || "N/A",
    price: item.price || 0,
    quantity: item.quantity || 0,
    hsnSac: item.hsnSac || "-",
    discount: item.discount || 0,
    total: item.price * item.quantity - (item.discount || 0) + (item.gstType === "EXCLUDED" ? (item.gstAmount || 0) : 0),
    cgst: item.cgst || 0, sgst: item.sgst || 0, igst: item.igst || 0,
    gstType: item.gstType || 0, gstAmount: item.gstAmount || 0,
    productKey: item.productKey,
  }));

  let totalCgst = 0, totalSgst = 0, totalIgst = 0;
  products.forEach(p => { totalCgst += p.cgst || 0; totalSgst += p.sgst || 0; totalIgst += p.igst || 0; });

  return {
    jcNo: jobCard.billNo || jobCard.jcNumber,
    companyName: store.storeName, companyAddress: store.address,
    companyEmail: store.email, companyPhone: store.mobile, companyGstin: store.gstNumber,
    orderDate: jobCard.orderDate, deliveryDate: jobCard.deliveryDate,
    customerName: jobCard.name, customerAddress: jobCard.address, customerPhone: jobCard.mobile,
    items,
    subTotal: jobCard.subTotal - includedTax,
    additionalDiscount: jobCard.additionalDiscount,
    sgst: totalSgst, cgst: totalCgst, igst: totalIgst,
    total: jobCard.total - jobCard.additionalDiscount,
    advance: jobCard.advance, balance: jobCard.balance,
    ttype: jobCard.transactionType,
    logoUrl: store.logo || "https://digibysr.com/wp-content/uploads/2025/01/DigiOptics.png",
    prescription,
  };
};

// Fire the OS print dialog
// export const printInvoiceHTML = (html) => {
//   const win = window.open("", "_blank", "width=900,height=700");
//   win.document.write(html);
//   win.document.close();
//   win.focus();
//   setTimeout(() => { win.print(); }, 500);
// };



export const printInvoiceHTML = (html, thermal = false) => {
  const win = window.open(
    "",
    "_blank",
    thermal
      ? "width=320,height=600,menubar=no,toolbar=no,location=no"
      : "width=900,height=700"
  );
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
};



















// ── Thermal helpers ────────────────────────────────────────────────────────

const THERMAL_STYLE = `<style>
  @page {
    size: 80mm auto;
    margin: 0;
  }
  * { margin:0; padding:0; box-sizing:border-box; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
  html, body {
    width: 80mm;
    max-width: 80mm;
    font-family:'Courier New',Courier,monospace;
    font-size:11px;
    background:#fff;
    color:#000;
    padding:6px 8px 16px 8px;
  }
  .dashed { border-top:1px dashed #000; margin:5px 0; }
  .solid  { border-top:1px solid  #000; margin:5px 0; }
  .header { text-align:center; }
  .header .bill-type  { font-size:11px; }
  .header .shop-name  { font-size:17px; font-weight:900; letter-spacing:0.5px; text-transform:uppercase; }
  .header .address    { font-size:9.5px; margin-top:2px; }
  .header .gst-line   { font-size:9.5px; margin-top:1px; }
  table.items-table { width:100%; border-collapse:collapse; font-size:10px; table-layout:fixed; }
  table.items-table th, table.items-table td { border:1px solid #000; padding:2px 3px; vertical-align:top; }
  table.items-table th { font-weight:700; font-size:10px; text-align:center; }
  .col-sno  { width:5%;  text-align:center; }
  .col-desc { width:43%; text-align:left; }
  .col-qty  { width:10%; text-align:center; }
  .col-rate { width:20%; text-align:right; }
  .col-amt  { width:22%; text-align:right; }
  .totals-row { display:flex; justify-content:space-between; font-size:10px; padding:1px 0; }
  .pay-words  { font-size:9.5px; line-height:1.4; }
  .pay-amounts { font-size:10px; width:100%; }
  .pay-row    { display:flex; justify-content:space-between; padding:1px 0; gap:4px; }
  .pay-row span:last-child { white-space:nowrap; flex-shrink:0; }
  .pay-row.due { font-weight:900; font-size:11px; }
  .gst-table  { width:100%; font-size:9px; border-collapse:collapse; }
  .gst-table th, .gst-table td { text-align:center; padding:1px 2px; border:1px solid #000; }
  .terms { font-size:8.5px; line-height:1.45; }
  .terms ol { padding-left:14px; }
  .footer { text-align:center; font-size:10px; margin-top:6px; }
  .footer .thanks { font-weight:700; font-size:11px; letter-spacing:0.5px; }
  .stamp { display:flex; justify-content:space-between; font-size:9.5px; margin-top:6px; }
</style>`;

const thermalFmt = (n) => Number(n || 0).toFixed(2);

const thermalNumberToWords = (amount) => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function toWords(n) {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + " " + ones[n % 10] + " ";
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred " + toWords(n % 100);
    if (n < 100000) return toWords(Math.floor(n / 1000)) + "Thousand " + toWords(n % 1000);
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + "Lakh " + toWords(n % 100000);
    return toWords(Math.floor(n / 10000000)) + "Crore " + toWords(n % 10000000);
  }
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = toWords(rupees).trim() + " Rupees";
  if (paise > 0) result += " and " + toWords(paise).trim() + " Paise";
  return result + " Only";
};

const thermalBuildItemRows = (items) => items.map((item, i) => {
  const discount = Number(item.discount || 0);
  const discRow = discount > 0
    ? `<tr><td></td><td style="font-size:9px;"> Disc: -${thermalFmt(discount)}</td><td></td><td></td><td></td></tr>`
    : "";
  return `<tr>
    <td class="col-sno">${i + 1}</td>
    <td class="col-desc">${item.name || "N/A"}</td>
    <td class="col-qty">${item.quantity || 0}</td>
    <td class="col-rate">${thermalFmt(item.price || 0)}</td>
    <td class="col-amt">${thermalFmt(item.total || 0)}</td>
  </tr>${discRow}`;
}).join("");

const thermalBuildItemsTable = (items, subTotal) => {
  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);
  return `<table class="items-table">
    <thead><tr>
      <th class="col-sno">&nbsp;</th>
      <th class="col-desc">Description</th>
      <th class="col-qty">Qty</th>
      <th class="col-rate">Rate</th>
      <th class="col-amt">Amt</th>
    </tr></thead>
    <tbody>
      ${thermalBuildItemRows(items)}
      <tr><td colspan="4" style="text-align:right;font-weight:700;font-size:9.5px;">Total Value</td>
          <td class="col-amt" style="font-weight:700;">${thermalFmt(subTotal)}</td></tr>
      <tr><td colspan="5" style="padding:6px 0;border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;">&nbsp;</td></tr>
      <tr><td colspan="2" style="font-weight:700;">Total</td>
          <td class="col-qty" style="font-weight:700;text-align:center;">${totalQty}</td>
          <td colspan="2" style="font-weight:700;text-align:right;">${thermalFmt(subTotal)}</td></tr>
    </tbody>
  </table>`;
};

const thermalBuildGstTable = (sgst, cgst, igst) => `
  <div class="dashed"></div>
  <div style="font-size:9px;font-weight:700;margin-bottom:2px;">Tax Summary</div>
  <table class="gst-table">
    <thead><tr><th>SGST</th><th>CGST</th><th>IGST</th><th>Total Tax</th></tr></thead>
    <tbody><tr>
      <td>${thermalFmt(sgst)}</td><td>${thermalFmt(cgst)}</td><td>${thermalFmt(igst)}</td>
      <td>${thermalFmt(Number(sgst) + Number(cgst) + Number(igst))}</td>
    </tr></tbody>
  </table>`;

const thermalBuildTerms = (companyName) => {
  if (companyName?.includes("Chashmewale")) {
    return `<div class="dashed"></div><div class="terms"><strong>Terms &amp; Conditions:</strong><ol>
      <li>Items can only be exchanged within 7 days. No returns.</li>
      <li>Orders must be collected within 15 days.</li>
      <li>Orders can be cancelled within 2 hours of placing.</li>
      <li>This bill is issued under the GST Composition Scheme.</li>
    </ol></div>`;
  }
  return `<div class="dashed"></div><div class="terms"><strong>Terms &amp; Condition:</strong><ol>
    <li>Goods once sold cannot be exchanged or taken back.</li>
    <li>No guarantee for plating/coating of metal frames and scratches on plastic lenses.</li>
    <li>No responsibility for breakage of rimless glass after delivery.</li>
    <li>All disputes subject to local jurisdiction.</li>
  </ol></div>`;
};

const thermalBuildHeader = (d) => `
  <div class="header">
    <div class="bill-type">BILL OF SUPPLY</div>
    ${d.companyGstin ? `<div style="font-size:9.5px;">GST No.: ${d.companyGstin}</div>` : ""}
    <div class="shop-name">${d.companyName || ""}</div>
    <div class="address">${d.companyAddress || ""}</div>
    <div class="gst-line">${d.companyPhone ? `Mobile: ${d.companyPhone}` : ""}</div>
  </div>`;

const thermalBuildMeta = (d) => `
  <div class="solid"></div>
  <table style="width:100%;table-layout:fixed;border:none;border-collapse:collapse;font-size:10px;">
    <tr>
      <td style="width:55%;vertical-align:top;border:none;">
        <strong>Customer Name :</strong><br>
        <strong>${d.customerName || "-"}</strong>
        ${d.customerPhone ? `<br>Mobile : ${d.customerPhone}` : ""}
        ${d.customerAddress ? `<br><span style="font-size:9px;">${d.customerAddress}</span>` : ""}
      </td>
      <td style="width:45%;vertical-align:top;text-align:right;border:none;">
        <strong>Bill No :</strong> ${d.jcNo || "-"}<br>
        <strong>Date :</strong> ${formatDate(d.orderDate)}
      </td>
    </tr>
  </table>
  <div class="solid"></div>`;

const thermalBuildPaySection = (wordsTotal, grandTotal, advance, balance, ttype, isAdvance, deliveryDate) => {
  const paidAmt = Number(grandTotal) - Number(balance);
  const amountsHTML = isAdvance
    ? `<div class="pay-row"><span>Grand Total :</span><span>Rs. ${thermalFmt(grandTotal)}</span></div>
       <div class="pay-row"><span>Advance (${ttype || "-"}) :</span><span>Rs. ${thermalFmt(advance)}</span></div>
       <div class="pay-row due"><span>Balance Due :</span><span>Rs. ${thermalFmt(balance)}</span></div>`
    : `<div class="pay-row"><span>Grand Total :</span><span>Rs. ${thermalFmt(grandTotal)}</span></div>
       ${advance > 0 ? `<div class="pay-row"><span>Advance :</span><span>Rs. ${thermalFmt(advance)}</span></div>` : ""}
       <div class="pay-row"><span>Paid (${ttype || "-"}) :</span><span>Rs. ${thermalFmt(paidAmt)}</span></div>
       <div class="pay-row due"><span>Due Amt. :</span><span>Rs. ${thermalFmt(balance)}</span></div>`;

  const deliveryHTML = isAdvance && deliveryDate
    ? `<div class="dashed"></div><div style="font-size:9px;text-align:center;"><strong>Expected Delivery:</strong> ${formatDate(deliveryDate)}</div>`
    : "";

  return `<table style="width:100%;table-layout:fixed;border:none;border-collapse:collapse;margin-top:3px;">
    <tr>
      <td style="width:52%;vertical-align:top;padding-right:4px;border:none;">
        <div class="pay-words"><strong>Total Invoice value In Words</strong><br>${wordsTotal}</div>
      </td>
      <td style="width:48%;vertical-align:top;border:none;">
        <div class="pay-amounts">${amountsHTML}</div>
      </td>
    </tr>
  </table>${deliveryHTML}`;
};

const thermalShell = (title, body) => `<!DOCTYPE html><html>
<head><meta charset="UTF-8"><title>${title}</title>${THERMAL_STYLE}</head>
<body>${body}</body></html>`;

export const generateThermalAdvanceInvoiceHTML = (d, showGst = false) => {
  const { companyName, items = [], subTotal = 0, additionalDiscount = 0, sgst = 0, cgst = 0, igst = 0,
    total = 0, advance = 0, balance = 0, ttype, deliveryDate } = d;
  return thermalShell("Thermal Advance Receipt", `
    ${thermalBuildHeader(d)}
    ${thermalBuildMeta(d)}
    ${thermalBuildItemsTable(items, subTotal)}
    ${additionalDiscount > 0 ? `<div class="totals-row"><span>Additional Discount</span><span>- Rs. ${thermalFmt(additionalDiscount)}</span></div>` : ""}
    ${showGst ? thermalBuildGstTable(sgst, cgst, igst) : ""}
    <div class="dashed"></div>
    ${thermalBuildPaySection(thermalNumberToWords(Number(total)), total, advance, balance, ttype, true, deliveryDate)}
    ${thermalBuildTerms(companyName)}
    <div class="dashed"></div>
    <div class="stamp"><span>E. &amp; O.E.</span><span>for: ${companyName || ""}</span></div>
    <div class="footer"><div class="thanks">/// Thanks /// Visit Again ///</div></div>`);
};

export const generateThermalDeliveredInvoiceHTML = (d, showGst = false) => {
  const { companyName, items = [], subTotal = 0, additionalDiscount = 0, sgst = 0, cgst = 0, igst = 0,
    total = 0, advance = 0, balance = 0, ttype } = d;
  return thermalShell("Thermal Bill of Supply", `
    ${thermalBuildHeader(d)}
    ${thermalBuildMeta(d)}
    ${thermalBuildItemsTable(items, subTotal)}
    ${additionalDiscount > 0 ? `<div class="totals-row"><span>Additional Discount</span><span>- Rs. ${thermalFmt(additionalDiscount)}</span></div>` : ""}
    ${showGst ? thermalBuildGstTable(sgst, cgst, igst) : ""}
    <div class="dashed"></div>
    ${thermalBuildPaySection(thermalNumberToWords(Number(total)), total, advance, balance, ttype, false, null)}
    ${thermalBuildTerms(companyName)}
    <div class="dashed"></div>
    <div class="stamp"><span>E. &amp; O.E.</span><span>for: ${companyName || ""}</span></div>
    <div class="footer"><div class="thanks">/// Thanks /// Visit Again ///</div></div>`);
};




// -----------------------
// Nazar opticals - client
// -----------------------


// ── 8cm × 10.7cm Advance Slip ─────────────────────────────────────────────────
// Matches the physical slip format: shop name, phone, Ref#, Date, Total,
// Advance, Balance, Delivery Date, 3 terms, footer note.

const SLIP_STYLE = `<style>
  @page {
    size: 80mm 110mm;
    margin: 0;
  }
  * { margin:0; padding:0; box-sizing:border-box; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
  html, body {
    width: 80mm;
    height: 110mm;
    max-width: 80mm;
    max-height: 110mm;
    overflow: hidden;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    background: #fff;
    color: #000;
  }
  .slip-wrap         { width:80mm; height:110mm; max-height:110mm; overflow:hidden; padding:5px 7px 4px 7px; display:flex; flex-direction:column; }
  .slip-header       { text-align: center; margin-bottom: 3px; flex-shrink:0; }
  .slip-shop-name    { font-size: 17px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; line-height: 1.1; }
  .slip-shop-sub     { font-size: 7.5px; letter-spacing: 3px; text-transform: uppercase; }
  .slip-phone        { font-size: 10px; font-weight: 700; margin-top: 1px; }
  .slip-rows         { flex-shrink:0; }
  .slip-row          { display: flex; justify-content: space-between; align-items: baseline; padding: 1px 0; font-size: 10.5px; }
  .slip-row .label   { font-weight: 600; }
  .slip-row .value   { font-weight: 400; }
  .slip-row.bold .value { font-weight: 700; }
  .slip-terms        { font-size: 7.5px; line-height: 1.4; margin-top: 3px; flex-shrink:0; }
  .slip-terms p      { margin-bottom: 1px; }
  .slip-footer       { text-align: center; font-size: 8.5px; font-weight: 700; margin-top: 4px; border-top: 1px solid #000; padding-top: 3px; flex-shrink:0; }
</style>`;

export const generateSlipHTML = (d) => {
  const balance = Number(d.balance ?? 0);
  const total = Number(d.total ?? 0);
  const advance = Number(d.advance ?? 0);

  return `<!DOCTYPE html><html>
<head><meta charset="UTF-8"><title>Advance Slip</title>${SLIP_STYLE}</head>
<body>
  <div class="slip-wrap">
    <div class="slip-header">
      ${d.logoUrl
      ? `<img src="${d.logoUrl}" style="height:28px;max-width:100%;object-fit:contain;display:block;margin:0 auto 2px auto;" />`
      : `<div class="slip-shop-name">${d.companyName || ""}</div>`
    }
      ${d.companyPhone ? `<div class="slip-phone">01145597227</div>` : ""}
    </div>


    <div class="slip-rows">
      <div class="slip-row">
        <span class="label">Reference #:</span>
        <span class="value">${d.jcNo || "-"}</span>
      </div>
      <div class="slip-row">
        <span class="label">Date:</span>
        <span class="value">${formatDate(d.orderDate)}</span>
      </div>
      <div class="slip-row">
        <span class="label">Total Amount:</span>
        <span class="value">${total > 0 ? `Rs. ${thermalFmt(total)}` : ""}</span>
      </div>
      <div class="slip-row">
        <span class="label">Advance:</span>
        <span class="value">${advance > 0 ? `Rs. ${thermalFmt(advance)}` : "0"}</span>
      </div>
      <div class="slip-row bold">
        <span class="label">Balance:</span>
        <span class="value">${thermalFmt(balance)}</span>
      </div>
      <div class="slip-row">
        <span class="label">Date of Delivery:</span>
        <span class="value">${formatDate(d.deliveryDate)}</span>
      </div>
    </div>


    <div class="slip-terms">
      <p>* Order once placed will not be Cancelled &amp; advance taken will not be refunded in any case.</p>
      <p>* If failed to collect goods within one month the advance amount will be forfeited.</p>
      <p>* We will not be responsible for any type of breakage of customers own frames and lenses.</p>
    </div>

    <div class="slip-footer">Kindly bring this slip at the time of delivery</div>
  </div>
</body></html>`;
};