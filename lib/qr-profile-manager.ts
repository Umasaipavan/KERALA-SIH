// QR Profile System Core Types and Utilities
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';

export interface HealthProfile {
  profileId: string; // UUID
  userId: string; // Firebase user ID  
  userEmail: string;
  
  // Demographics
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
  
  // Critical Emergency Information
  emergencyInfo: {
    bloodGroup: string;
    allergies: string[];
    chronicConditions: string[];
    currentMedications: string[];
    medicalNotes: string;
  };
  
  // Work Information
  workInfo: {
    employer: string;
    jobTitle: string;
    workLocation: string;
    workPermitNumber: string;
  };
  
  // QR Information
  qrInfo: {
    qrToken: string; // Encrypted token
    qrCodeDataUrl: string; // Base64 QR code image
    generatedAt: Date;
    lastAccessed?: Date;
    accessCount: number;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Document References
  documentIds: string[];
  submissionIds: string[];
}

export interface QRAccessLog {
  id: string;
  profileId: string;
  accessedBy: string; // User ID of accessor
  accessedByEmail: string;
  accessedByRole: 'admin' | 'healthcare_provider' | 'emergency_responder';
  accessedAt: Date;
  accessType: 'scan' | 'link' | 'emergency';
  location?: string;
  ipAddress?: string;
}

export interface OfflineEmergencyCache {
  profileId: string;
  fullName: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: {
    name: string;
    phone: string;
  };
  lastSynced: Date;
}

export class QRProfileManager {
  private static readonly ENCRYPTION_KEY = process.env.QR_ENCRYPTION_KEY || 'medibot-qr-key-2025';
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Generate unique profile ID
  static generateProfileId(): string {
    return uuidv4();
  }
  
  // Create encrypted QR token
  static createQRToken(profileId: string): string {
    const payload = {
      profileId,
      timestamp: Date.now(),
      version: '1.0'
    };
    
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(payload), 
      this.ENCRYPTION_KEY
    ).toString();
    
    return encrypted;
  }
  
  // Decrypt QR token to get profile ID
  static decryptQRToken(token: string): { profileId: string; timestamp: number } | null {
    try {
      const decrypted = CryptoJS.AES.decrypt(token, this.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      const payload = JSON.parse(decrypted);
      
      // Check if token is not too old (optional: 1 year expiry)
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (Date.now() - payload.timestamp > oneYear) {
        return null;
      }
      
      return {
        profileId: payload.profileId,
        timestamp: payload.timestamp
      };
    } catch (error) {
      console.error('QR token decryption failed:', error);
      return null;
    }
  }
  
  // Generate QR code with secure link
  static async generateQRCode(profileId: string): Promise<string> {
    try {
      const token = this.createQRToken(profileId);
      const qrUrl = `${this.BASE_URL}/qr/profile/${encodeURIComponent(token)}`;
      
      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return qrDataUrl;
    } catch (error) {
      console.error('QR code generation failed:', error);
      throw new Error('Failed to generate QR code');
    }
  }
  
  // Create offline emergency cache data
  static createEmergencyCache(profile: HealthProfile): OfflineEmergencyCache {
    return {
      profileId: profile.profileId,
      fullName: profile.personalInfo.fullName,
      bloodGroup: profile.emergencyInfo.bloodGroup,
      allergies: profile.emergencyInfo.allergies,
      chronicConditions: profile.emergencyInfo.chronicConditions,
      emergencyContact: {
        name: profile.personalInfo.emergencyContact.name,
        phone: profile.personalInfo.emergencyContact.phone
      },
      lastSynced: new Date()
    };
  }
  
  // Validate access permissions
  static canAccessProfile(accessorRole: string, isEmergency: boolean = false): boolean {
    const allowedRoles = ['admin', 'healthcare_provider', 'emergency_responder'];
    return allowedRoles.includes(accessorRole) || isEmergency;
  }
  
  // Generate access log entry
  static createAccessLog(
    profileId: string,
    accessedBy: string,
    accessedByEmail: string,
    accessedByRole: string,
    accessType: 'scan' | 'link' | 'emergency',
    location?: string,
    ipAddress?: string
  ): QRAccessLog {
    return {
      id: uuidv4(),
      profileId,
      accessedBy,
      accessedByEmail,
      accessedByRole: accessedByRole as any,
      accessedAt: new Date(),
      accessType,
      location,
      ipAddress
    };
  }
}

export default QRProfileManager;