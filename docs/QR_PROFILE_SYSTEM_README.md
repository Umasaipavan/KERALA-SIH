# QR-Based Health Profile System

## Overview

A comprehensive QR-based unique profile access system for Digital Health Record Management, specifically designed for migrant workers and healthcare professionals. This system provides secure, encrypted access to critical health information via QR codes that can be scanned by healthcare providers and emergency responders.

## Features

### 🔐 Security & Privacy
- **AES-256 Encryption**: All QR tokens are encrypted using industry-standard encryption
- **Role-Based Access Control**: Different access levels for healthcare providers, emergency responders, and administrators
- **Audit Logging**: Complete access history tracking for compliance and security
- **JWT Authentication**: Secure token-based authentication for healthcare providers
- **No PII in QR**: QR codes contain only encrypted tokens, not personal information

### 📱 User-Friendly Interface
- **Responsive Design**: Works seamlessly on mobile devices and desktops
- **Intuitive Profile Creation**: Step-by-step form for health profile setup
- **Real-time QR Generation**: Instant QR code creation upon profile completion
- **Multi-language Support**: Designed for international migrant worker populations

### 🏥 Healthcare Provider Tools
- **Camera QR Scanner**: Built-in camera integration for QR code scanning
- **Manual Token Entry**: Alternative access method for situations without camera access
- **Comprehensive Profile Display**: Emergency-focused information layout
- **Emergency Contact Integration**: Direct calling capabilities for emergency contacts
- **Offline Emergency Cache**: Critical information available even during network issues

### 🆘 Emergency Access
- **Public Emergency Access**: No authentication required for emergency situations
- **Critical Information Priority**: Blood type, allergies, and emergency contacts prominently displayed
- **Fast Access Design**: Optimized for quick information retrieval in emergency situations

## System Architecture

### Core Components

1. **QR Profile Manager** (`lib/qr-profile-manager.ts`)
   - Health profile type definitions
   - QR token encryption/decryption utilities
   - Profile validation and management

2. **API Endpoints**
   - `/api/qr/profile` - Profile creation and management
   - `/api/qr/access/[token]` - QR token access and validation

3. **User Interfaces**
   - `/qr-profile` - Profile creation and management interface
   - `/qr-scanner` - Healthcare provider scanning interface
   - `/qr/[token]` - Public emergency access interface

### Data Structure

```typescript
interface HealthProfile {
  id: string;
  userId: string;
  personalInfo: {
    fullName: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other';
    nationality: string;
    phoneNumber: string;
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  emergencyInfo: {
    bloodGroup: string;
    allergies: string[];
    chronicConditions: string[];
    currentMedications: string[];
    medicalNotes: string;
  };
  workInfo: {
    employer: string;
    jobTitle: string;
    workLocation: string;
    workPermitNumber: string;
  };
  qrInfo: {
    qrToken: string;
    qrCodeDataUrl: string;
    generatedAt: Date;
    accessCount: number;
    lastAccessed?: Date;
  };
}
```

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- Next.js 15.3.5+
- Firebase project with Firestore and Authentication
- Required npm packages:
  ```bash
  npm install uuid qrcode crypto-js qr-scanner @types/uuid @types/qrcode
  ```

### Environment Variables
Add these to your `.env.local` file:
```env
# QR Profile System
NEXT_PUBLIC_QR_ENCRYPTION_KEY=your-32-character-encryption-key
NEXT_PUBLIC_QR_BASE_URL=https://yourdomain.com/qr
```

### Firebase Security Rules
```javascript
// Firestore security rules for health profiles
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /healthProfiles/{profileId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow read: if request.auth != null 
        && request.auth.token.role in ['healthcare_provider', 'admin'];
    }
    
    match /qrAccessLogs/{logId} {
      allow create: if true; // Public emergency access logging
      allow read: if request.auth != null;
    }
  }
}
```

## Usage Guide

### For Migrant Workers

1. **Create Profile**
   - Navigate to "My QR Health Profile" in the dashboard
   - Fill in personal information, emergency contacts, and medical details
   - Save profile to generate unique QR code

2. **Share QR Code**
   - Download QR code image for printing or saving to phone
   - Share QR code with healthcare providers
   - Keep QR code accessible for emergency situations

3. **Update Profile**
   - Edit existing information through the profile interface
   - QR code remains the same but points to updated information
   - Changes are immediately available to healthcare providers

### For Healthcare Providers

1. **Scan QR Code**
   - Use the QR Scanner page for camera-based scanning
   - Alternative: Enter QR token manually
   - Authentication required for full access

2. **Access Patient Information**
   - View comprehensive health profile
   - Access emergency contacts with direct calling
   - Review medical history and current medications

3. **Emergency Access**
   - Public access available without authentication
   - Critical information prioritized (blood type, allergies)
   - All access attempts are logged for security

### For Emergency Responders

1. **Quick Access**
   - Scan QR code or access via direct link
   - No authentication required for emergency situations
   - Critical medical information displayed prominently

2. **Emergency Contacts**
   - Direct access to emergency contact information
   - One-click calling capabilities
   - Relationship and contact details clearly displayed

## Security Considerations

### Data Protection
- Personal health information is encrypted at rest
- QR tokens use time-based encryption keys
- All access attempts are logged with timestamps and scanner information
- No PII is embedded directly in QR codes

### Access Control
- Public emergency access limited to critical information
- Authenticated access provides full profile details
- Role-based permissions for different user types
- Audit trails for compliance and investigation

### Privacy Compliance
- GDPR-compliant data handling
- User consent mechanisms for profile creation
- Data retention policies configurable
- Right to deletion and data portability

## API Reference

### Create/Update Profile
```http
POST /api/qr/profile
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "personalInfo": { ... },
  "emergencyInfo": { ... },
  "workInfo": { ... }
}
```

### Access Profile via QR Token
```http
POST /api/qr/access/{token}
Content-Type: application/json

{
  "scannerInfo": {
    "userAgent": "...",
    "timestamp": "...",
    "scannerRole": "emergency_public_access"
  }
}
```

## Deployment Considerations

### Production Setup
1. Configure proper SSL/TLS certificates
2. Set up Firebase production environment
3. Configure environment variables for encryption keys
4. Implement monitoring and alerting for security events
5. Set up backup and disaster recovery procedures

### Performance Optimization
- QR code generation is cached for better performance
- Profile access is optimized for emergency situations
- Image compression for QR codes to reduce file sizes
- CDN implementation for global access speed

### Scaling Considerations
- Firestore can handle millions of profiles
- QR token generation is stateless and horizontally scalable
- Consider Redis caching for frequently accessed profiles
- Implement rate limiting for API endpoints

## Troubleshooting

### Common Issues

1. **QR Code Not Generating**
   - Check encryption key configuration
   - Verify user authentication status
   - Review browser console for errors

2. **Camera Scanner Not Working**
   - Ensure HTTPS is enabled (required for camera access)
   - Check browser permissions for camera
   - Verify qr-scanner library installation

3. **Profile Access Denied**
   - Verify Firebase authentication setup
   - Check Firestore security rules
   - Review user role assignments

### Error Codes
- `QR_TOKEN_INVALID`: QR token could not be decrypted
- `PROFILE_NOT_FOUND`: No profile exists for the given token
- `ACCESS_DENIED`: Insufficient permissions for profile access
- `ENCRYPTION_ERROR`: QR token encryption/decryption failed

## Support & Maintenance

### Regular Maintenance Tasks
- Review access logs for security anomalies
- Update encryption keys periodically
- Monitor system performance and uptime
- Update dependencies for security patches

### Monitoring & Alerts
- Set up alerts for unusual access patterns
- Monitor QR code generation failures
- Track system performance metrics
- Log all security-related events

## Contributing

When contributing to the QR Profile system:

1. Follow security best practices
2. Test with various QR code readers
3. Verify mobile responsiveness
4. Test emergency access scenarios
5. Update documentation for new features

## License

This QR-based health profile system is designed for healthcare applications and should comply with relevant healthcare data protection regulations in your jurisdiction.

---

For technical support or feature requests, please refer to the development team or create an issue in the project repository.