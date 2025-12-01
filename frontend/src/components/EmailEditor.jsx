import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { LuBold, LuItalic, LuList, LuLock, LuMail, LuEye, LuSeparatorHorizontal } from 'react-icons/lu';
import { useUser } from '../contexts/UserContext.jsx';
import config from '../config.js';
import './EmailEditor.css';

// Custom EmailEditor component with seamless integrated experience
export default function EmailEditor({ 
  vendor, 
  rfqData, 
  rfqItems, 
  onChange 
}) {
  const { currentUser } = useUser();
  const [fullContent, setFullContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Generate sections separately for better editing control
  const generateEmailSections = useCallback(() => {
    if (!vendor || !rfqData) return { header: '', table: '', footer: '' };

    const vendorName = vendor.name || vendor.Name || vendor.vendor?.Name || 
                      vendor.details?.Name || 'Vendor';
    
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString();
      } catch {
        return dateStr;
      }
    };

    const header = `<p>Dear ${vendorName},</p>

<p>We hope this email finds you well. We would like to request a quotation for the following items:</p>

<p><strong>RFQ Details:</strong></p>
<ul>
  <li><strong>RFQ Number:</strong> ${rfqData.rfq_number || rfqData.rfqNumber || 'N/A'}</li>
  <li><strong>Date Required:</strong> ${formatDate(rfqData.due_date || rfqData.dueDate)}</li>
  <li><strong>Contact Person:</strong> ${rfqData.contact_person || rfqData.contactPerson || 'N/A'}</li>
</ul>`;

    const footer = `<p><strong>Please provide the following information in your quotation:</strong></p>
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
<strong>${currentUser?.fullName || currentUser?.username || 'Procurement Team'}</strong><br/>
${config.business?.companyName || config.companyName || 'Our Company'}</p>`;

    // Generate simple table for editor (no fancy styling)
    const generateSimpleTable = () => {
      if (!rfqItems || rfqItems.length === 0) {
        return '<p><em>No items specified for this RFQ.</em></p>';
      }

      const tableRows = rfqItems.map((item, index) => {
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
          <tr>
            <td>${index + 1}</td>
            <td>${description}</td>
            <td>${brand}</td>
            <td>${partNumber}</td>
            <td>${quantity}</td>
            <td>${unit}</td>
            <td>${specifications}</td>
          </tr>
        `;
      }).join('');

      return `
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr>
              <th style="border: 1px solid #ccc; padding: 8px; background: #f5f5f5;">#</th>
              <th style="border: 1px solid #ccc; padding: 8px; background: #f5f5f5;">Description</th>
              <th style="border: 1px solid #ccc; padding: 8px; background: #f5f5f5;">Brand</th>
              <th style="border: 1px solid #ccc; padding: 8px; background: #f5f5f5;">Part Number</th>
              <th style="border: 1px solid #ccc; padding: 8px; background: #f5f5f5;">Qty</th>
              <th style="border: 1px solid #ccc; padding: 8px; background: #f5f5f5;">Unit</th>
              <th style="border: 1px solid #ccc; padding: 8px; background: #f5f5f5;">Specifications</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;
    };

    return {
      header,
      table: generateSimpleTable(),
      footer
    };
  }, [vendor, rfqData, rfqItems, currentUser]);

  // Generate fancy table for preview only
  const generateFancyTable = useCallback(() => {
    if (!rfqItems || rfqItems.length === 0) {
      return `
        <div style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #94a3b8;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 20px;">📋</span>
            <p style="margin: 0; font-weight: 600; color: #475569;">Requested Items</p>
            <span style="background: #94a3b8; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">PROTECTED</span>
          </div>
          <p style="color: #64748b; font-style: italic; margin: 0;">No items specified for this RFQ.</p>
        </div>
      `;
    }

    const tableRows = rfqItems.map((item, index) => {
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
          <td style="padding: 12px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 500;">${index + 1}</td>
          <td style="padding: 12px 8px; border: 1px solid #d1d5db; font-weight: 500;">${description}</td>
          <td style="padding: 12px 8px; border: 1px solid #d1d5db;">${brand}</td>
          <td style="padding: 12px 8px; border: 1px solid #d1d5db; font-family: monospace;">${partNumber}</td>
          <td style="padding: 12px 8px; border: 1px solid #d1d5db; text-align: center;">${quantity}</td>
          <td style="padding: 12px 8px; border: 1px solid #d1d5db; text-align: center;">${unit}</td>
          <td style="padding: 12px 8px; border: 1px solid #d1d5db; font-size: 14px;">${specifications}</td>
        </tr>
      `;
    }).join('');

    return `
      <div style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #3b82f6; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <span style="font-size: 20px;">📋</span>
          <p style="margin: 0; font-weight: 600; color: #1e293b; font-size: 16px;">Requested Items</p>
          <span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">PROTECTED</span>
        </div>
        <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%); color: white;">
                <th style="padding: 14px 8px; border: none; text-align: center; font-weight: 600; font-size: 14px;">#</th>
                <th style="padding: 14px 8px; border: none; text-align: left; font-weight: 600; font-size: 14px;">Description</th>
                <th style="padding: 14px 8px; border: none; text-align: left; font-weight: 600; font-size: 14px;">Brand</th>
                <th style="padding: 14px 8px; border: none; text-align: left; font-weight: 600; font-size: 14px;">Part Number</th>
                <th style="padding: 14px 8px; border: none; text-align: center; font-weight: 600; font-size: 14px;">Qty</th>
                <th style="padding: 14px 8px; border: none; text-align: center; font-weight: 600; font-size: 14px;">Unit</th>
                <th style="padding: 14px 8px; border: none; text-align: left; font-weight: 600; font-size: 14px;">Specifications</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }, [rfqItems]);

  // Initialize sectioned email content when data is available
  useEffect(() => {
    if (vendor && rfqData) {
      const sections = generateEmailSections();
      const editorContent = `${sections.header}

<hr style="border: 2px dashed #3b82f6; margin: 32px 0; background: none;" />
<div style="text-align: center; margin: -16px 0 16px 0;">
  <span style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">
    PROTECTED TABLE SECTION - Click Preview to see the final table
  </span>
</div>

<!-- ${sections.table} -->

<hr style="border: 2px dashed #3b82f6; margin: 32px 0; background: none;" />

${sections.footer}`;
      
      setFullContent(editorContent);
      
      // For the parent component, send the complete email with fancy table
      const completeEmail = sections.header + generateFancyTable() + sections.footer;
      onChange?.(completeEmail);
    }
  }, [vendor, rfqData, rfqItems, onChange, generateEmailSections, generateFancyTable, currentUser]);

  // TipTap editor with complete email content
  const editor = useEditor({
    extensions: [StarterKit],
    content: fullContent,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      setFullContent(content);
      onChange?.(content);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] p-6',
      },
    },
  });

  // Update editor content when fullContent changes
  useEffect(() => {
    if (editor && fullContent && editor.getHTML() !== fullContent) {
      editor.commands.setContent(fullContent, false);
    }
  }, [editor, fullContent]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <LuMail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Email Composer</h3>
            <p className="text-sm text-gray-600">
              Edit your RFQ email below. The items table is automatically generated and protected.
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
              !showPreview 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
              showPreview 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <LuEye className="w-4 h-4 inline mr-1" />
            Preview
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {!showPreview && (
        <div className="flex items-center space-x-1 p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-2 rounded-md transition-all duration-200 ${
                editor?.isActive('bold') 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
              title="Bold"
            >
              <LuBold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-2 rounded-md transition-all duration-200 ${
                editor?.isActive('italic') 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
              title="Italic"
            >
              <LuItalic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded-md transition-all duration-200 ${
                editor?.isActive('bulletList') 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
              title="Bullet List"
            >
              <LuList className="w-4 h-4" />
            </button>
          </div>
          
          <div className="h-6 w-px bg-gray-300 mx-2"></div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <LuLock className="w-4 h-4" />
            <span>Items table is protected from editing</span>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="min-h-[500px]">
        {showPreview ? (
          /* Preview Mode */
          <div className="p-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Email Preview</h4>
                <p className="text-xs text-gray-500">This is how your email will appear to the recipient</p>
              </div>
              <div className="p-6 prose prose-lg max-w-none">
                {/* Generate preview content with fancy table */}
                <div dangerouslySetInnerHTML={{ 
                  __html: (() => {
                    if (!vendor || !rfqData) return fullContent;
                    
                    const sections = generateEmailSections();
                    return sections.header + generateFancyTable() + sections.footer;
                  })()
                }} />
              </div>
            </div>
          </div>
        ) : (
          /* Editor Mode */
          <div className="relative">
            <EditorContent 
              editor={editor} 
              className="email-editor-content"
            />
            {!fullContent && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <LuMail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Generating email content...</p>
                  <p className="text-sm">Please wait while we prepare your RFQ email</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span>✅ Auto-saves as you type</span>
          <span>🔒 Table content protected</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs">
            {vendor?.name || 'Vendor'} • {rfqItems?.length || 0} items
          </span>
        </div>
      </div>
    </div>
  );
}