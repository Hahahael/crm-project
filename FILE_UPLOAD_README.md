# File Upload Feature for Technical Recommendations

This feature allows users to upload and manage file attachments for Technical Recommendations with a 10MB per file limit.

## 🗃️ Database Setup

### 1. Using your existing MSSQL table:

The system uses your existing `[crmdb].[FileStorage]` table:

```sql
-- Your existing table structure:
[crmdb].[FileStorage]
    [Id] [int] PRIMARY KEY,
    [TrId] [int] NOT NULL,
    [FileName] [nvarchar](255) NOT NULL,
    [FileSize] [bigint] NOT NULL,
    [FileType] [nvarchar](100) NOT NULL,
    [Content] [varbinary](max) NOT NULL,
    [UploadDate] [datetime] NOT NULL,
    [UploadedBy] [int] NULL

-- Optional: Create indexes for better performance
CREATE INDEX IX_FileStorage_TrId ON [crmdb].[FileStorage](TrId);
CREATE INDEX IX_FileStorage_UploadDate ON [crmdb].[FileStorage](UploadDate);
```

## 🎯 Features

### Frontend (TechnicalForm.jsx)
- **Drag & Drop Upload**: Drag files directly into the upload area
- **File Type Validation**: Supports PDF, DOC, XLS, PPT, TXT, and common image formats
- **Size Validation**: 10MB maximum per file
- **Real-time Preview**: Shows file list with upload progress
- **Download Existing**: Download previously uploaded files
- **Visual Feedback**: Loading states, success/error indicators

### Backend (technicalsRoutes.js)
- **File Upload API**: `POST /api/technicals/:id/attachments`
- **File Download API**: `GET /api/technicals/:id/attachments/:attachmentId/download`
- **File List API**: `GET /api/technicals/:id/attachments`
- **File Delete API**: `DELETE /api/technicals/:id/attachments/:attachmentId`
- **Integrated Saves**: Files uploaded when TR is saved/updated

## 🔧 How It Works

### Dual Storage Architecture:
The system uses a dual storage approach for reliability and performance:

1. **MSSQL Storage (`[crmdb].[FileStorage]`)**:
   - Stores actual binary file content
   - Used for file downloads and retrieval
   - Each file gets a unique integer ID (primary key)

2. **PostgreSQL Storage (`technical_recommendations.attachments`)**:
   - Stores array of MSSQL file IDs as JSONB: `[123, 124, 125]`
   - Simple integer array for efficient queries
   - References to MSSQL files (foreign key relationship)

3. **Synchronization**:
   - MSSQL file inserted first, ID captured
   - PostgreSQL updated with file ID array
   - Clean relational approach with proper referential integrity

### File Upload Process:
```
1. User selects files → 2. Client validation → 3. Base64 conversion → 
4. Form submission → 5. Server validation → 6. MSSQL storage → 
7. PostgreSQL JSONB update → 8. Response
```

### File Storage:
- **Binary Data**: Files stored as `VARBINARY(MAX)` in MSSQL `[crmdb].[FileStorage]` table
- **Metadata**: Also stored as JSONB in PostgreSQL `technical_recommendations.attachments` field
- **Dual Storage**: MSSQL for actual file content, PostgreSQL for metadata and fallback
- **Base64 Encoding**: Used for client-server transmission
- **Retrieval**: MSSQL used for downloads, PostgreSQL for metadata and listings

## 📋 Supported File Types

- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
- **Images**: JPG, JPEG, PNG, GIF
- **Size Limit**: 10MB per file
- **Multiple Files**: Yes, unlimited count (within reason)

## 🚀 Usage

### For Users:
1. Open Technical Recommendation form (create/edit)
2. Scroll to "Attachments" section
3. Click upload area or drag & drop files
4. Files are validated and show in list
5. Save the Technical Recommendation to persist files
6. Download existing files using Download button

### For Developers:
```javascript
// Frontend: Include attachments in form submission
const cleanedFormData = {
  ...formData,
  newAttachments: newFiles.map(file => ({
    name: file.name,
    size: file.size,
    type: file.type,
    base64: file.base64
  }))
};

-- Backend: Handle file uploads in TR save
if (body.new_attachments && Array.isArray(body.new_attachments)) {
  for (const file of body.new_attachments) {
    const fileBuffer = Buffer.from(file.base64, 'base64');
    await spiPool.request()
      .input('tr_id', trId)
      .input('filename', file.name)
      .input('file_size', file.size)
      .input('file_type', file.type)
      .input('file_data', fileBuffer)
      .query(`INSERT INTO [crmdb].[FileStorage] 
        (TrId, FileName, FileSize, FileType, Content, UploadDate, UploadedBy)
        VALUES (@tr_id, @filename, @file_size, @file_type, @file_data, GETDATE(), @uploaded_by)`);
  }
}
```

## 🛡️ Security Considerations

- **File Type Validation**: Only allowed file types accepted
- **Size Limitations**: 10MB limit prevents abuse
- **User Authentication**: Only authenticated users can upload
- **SQL Injection Protection**: Parameterized queries used
- **Access Control**: Files associated with specific TRs

## 🔍 API Endpoints

### Upload Files
```
POST /api/technicals/:id/attachments
Body: { files: [{ name, size, type, base64 }] }
```

### List Files
```
GET /api/technicals/:id/attachments
Response: [{ id, filename, file_size, file_type, uploaded_at }]
```

### Download File
```
GET /api/technicals/:id/attachments/:attachmentId/download
Response: Binary file data with proper headers
```

### Delete File
```
DELETE /api/technicals/:id/attachments/:attachmentId
Response: { message: "File deleted successfully" }
```

## 🐛 Troubleshooting

### Common Issues:
1. **File too large**: Check 10MB limit
2. **Unsupported format**: Verify file type in allowed list
3. **Upload fails**: Check network, database connection
4. **Download fails**: Verify file exists, check permissions

### Debug Tips:
- Check browser console for client-side errors
- Check backend logs for server-side errors
- Verify MSSQL table exists and has proper permissions
- Ensure MSSQL connection is working

## 📈 Future Enhancements

Potential improvements:
- [ ] Drag & drop anywhere on form
- [ ] File thumbnails for images
- [ ] Bulk file operations
- [ ] File versioning
- [ ] Cloud storage integration
- [ ] Virus scanning
- [ ] Compression for large files

---

This feature provides a complete file management solution for Technical Recommendations with proper validation, security, and user experience considerations.