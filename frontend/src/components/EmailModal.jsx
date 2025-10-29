import React, { useState, useEffect } from "react";
import { LuX } from "react-icons/lu";

export default function EmailModal({ 
  open, 
  onClose, 
  vendor, 
  rfqItems = [], 
  rfqData = {}, 
  onSend 
}) {
  // Local state for transitions
  const [visible, setVisible] = useState(open);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sending, setSending] = useState(false);

  // Form fields
  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: "",
    content: ""
  });

  // Preview mode toggle
  const [previewMode, setPreviewMode] = useState(false);

  // Initialize form when modal opens
  useEffect(() => {
    if (open && vendor) {
      const currentDate = new Date().toLocaleDateString();
      const itemsTableHtml = generateItemsTable(rfqItems);
      
      setEmailForm({
        to: vendor.email || vendor.emailAddress || vendor.EmailAddress || 
            vendor.vendor?.EmailAddress || vendor.details?.EmailAddress || "",
        subject: `Request for Quotation | ${currentDate}`,
        content: generateEmailContent(vendor, rfqData, itemsTableHtml)
      });
    }
  }, [open, vendor, rfqItems, rfqData]);

  // Modal transitions
  useEffect(() => {
    if (open) {
      setVisible(true);
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      const timeout = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  if (!open && !visible) return null;

  // Generate HTML table for RFQ items
  const generateItemsTable = (items) => {
    if (!items || items.length === 0) {
      return '<p>No items specified for this RFQ.</p>';
    }

    console.log("RFQ Items for email:", items); // Debug log
    
    const tableRows = items.map((item, index) => {
      // Handle different field name variations
      const description = item.description || item.item_name || item.itemName || 
                         item.details?.Description || item.name || 'N/A';
      const brand = item.brand || item.details?.BRAND_ID || item.brandName || 'N/A';
      const partNumber = item.part_number || item.partNumber || item.details?.Code || 
                        item.code || item.part_no || 'N/A';
      const quantity = item.quantity || item.qty || 1;
      const unit = item.unit || item.details?.SK_UOM || item.uom || 'pcs';
      const specifications = item.specifications || item.specs || item.spec || 
                           item.details?.Specification || 'N/A';
      
      return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; border: 1px solid #d1d5db;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db;">${description}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db;">${brand}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db;">${partNumber}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db;">${quantity}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db;">${unit}</td>
        <td style="padding: 8px; border: 1px solid #d1d5db;">${specifications}</td>
      </tr>
      `;
    }).join('');

    return `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #d1d5db;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 12px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: 600;">#</th>
            <th style="padding: 12px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: 600;">Description</th>
            <th style="padding: 12px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: 600;">Brand</th>
            <th style="padding: 12px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: 600;">Part Number</th>
            <th style="padding: 12px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: 600;">Quantity</th>
            <th style="padding: 12px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: 600;">Unit</th>
            <th style="padding: 12px 8px; border: 1px solid #d1d5db; text-align: left; font-weight: 600;">Specifications</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
  };

  // Generate full email content
  const generateEmailContent = (vendor, rfq, itemsTable) => {
    // Get vendor name from different possible fields
    const vendorName = vendor.name || vendor.Name || vendor.vendor?.Name || 
                      vendor.details?.Name || 'Vendor';
    
    // Format date properly
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString();
      } catch {
        return dateStr;
      }
    };
    
    return `
<p>Dear ${vendorName},</p>

<p>We hope this email finds you well. We would like to request a quotation for the following items:</p>

<p><strong>RFQ Details:</strong></p>
<ul>
  <li><strong>RFQ Number:</strong> ${rfq.rfq_number || rfq.rfqNumber || 'N/A'}</li>
  <li><strong>Date Required:</strong> ${formatDate(rfq.due_date || rfq.dueDate)}</li>
  <li><strong>Contact Person:</strong> ${rfq.contact_person || rfq.contactPerson || 'N/A'}</li>
</ul>

<p><strong>Requested Items:</strong></p>
${itemsTable}

<p><strong>Please provide the following information in your quotation:</strong></p>
<ul>
  <li>Unit price for each item</li>
  <li>Lead time for delivery</li>
  <li>Payment terms</li>
  <li>Validity period of the quotation</li>
  <li>Any additional specifications or certifications</li>
</ul>

<p>We would appreciate receiving your quotation within 3-5 business days. If you have any questions or need additional information, please feel free to contact us.</p>

<p>Thank you for your time and consideration.</p>

<p>Best regards,<br/>
<strong>Procurement Team</strong><br/>
${rfq.company_name || 'Our Company'}</p>
    `.trim();
  };

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setEmailForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle send email
  const handleSend = async () => {
    if (!emailForm.to.trim()) {
      alert('Please enter a recipient email address.');
      return;
    }

    setSending(true);
    try {
      await onSend({
        ...emailForm,
        vendor,
        rfqData,
        rfqItems
      });
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Overlay and modal classes
  const overlayClass = `fixed inset-0 z-40 bg-black bg-opacity-40 transition-opacity duration-300 ease-in-out ${
    isAnimating ? "opacity-50" : "opacity-0"
  }`;

  const modalClass = `fixed left-1/2 top-1/2 z-50 grid w-full max-w-4xl max-h-[90vh] overflow-hidden translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg transition-all duration-300 ease-in-out ${
    isAnimating
      ? "opacity-100 scale-100"
      : "opacity-0 scale-95 pointer-events-none"
  } sm:rounded-lg`;

  return (
    <>
      {/* Overlay */}
      <div className={overlayClass} aria-hidden="true" onClick={onClose}></div>
      
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        className={modalClass}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onClick={onClose}
        >
          <LuX className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header */}
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            Send RFQ Email
          </h2>
          <p className="text-sm text-gray-500">
            Send request for quotation to {vendor?.name || 'vendor'}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4 overflow-y-auto max-h-[60vh]">
          {/* To Field */}
          <div>
            <label className="text-sm font-medium leading-none" htmlFor="to">
              To
            </label>
            <input
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              id="to"
              type="email"
              placeholder="vendor@example.com"
              value={emailForm.to}
              onChange={(e) => handleFieldChange('to', e.target.value)}
            />
          </div>

          {/* Subject Field */}
          <div>
            <label className="text-sm font-medium leading-none" htmlFor="subject">
              Subject
            </label>
            <input
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              id="subject"
              placeholder="Email subject"
              value={emailForm.subject}
              onChange={(e) => handleFieldChange('subject', e.target.value)}
            />
          </div>

          {/* Content Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium leading-none" htmlFor="content">
                Message
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className={`px-3 py-1 text-xs rounded ${
                    !previewMode 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setPreviewMode(false)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 text-xs rounded ${
                    previewMode 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setPreviewMode(true)}
                >
                  Preview
                </button>
              </div>
            </div>
            
            {!previewMode ? (
              <textarea
                className="flex min-h-[300px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                id="content"
                placeholder="Email content"
                rows={12}
                value={emailForm.content}
                onChange={(e) => handleFieldChange('content', e.target.value)}
              />
            ) : (
              <div 
                className="min-h-[300px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: emailForm.content }}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
          <button
            type="button"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-gray-300 bg-white shadow-sm hover:bg-gray-100 h-9 px-4 py-2"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-blue-600 text-white shadow hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed h-9 px-4 py-2"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </div>
            ) : (
              'Send Email'
            )}
          </button>
        </div>
      </div>
    </>
  );
}