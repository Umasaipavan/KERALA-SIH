// API endpoint for QR Profile Management
import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { QRProfileManager, HealthProfile } from '@/lib/qr-profile-manager';

export async function POST(req: NextRequest) {
  try {
    console.log('API: Creating/updating health profile');
    
    // Get authorization token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
    }

    // Parse JWT token
    let userId, userEmail;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.user_id || payload.sub;
      userEmail = payload.email;
      
      if (!userId || !userEmail) {
        throw new Error('Invalid token: missing user information');
      }
    } catch (error) {
      console.error('Token parsing error:', error);
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const body = await req.json();
    const { personalInfo, emergencyInfo, workInfo } = body;
    
    // Validate required fields
    if (!personalInfo?.fullName || !emergencyInfo?.bloodGroup) {
      return NextResponse.json({ 
        error: 'Missing required fields: fullName and bloodGroup are required' 
      }, { status: 400 });
    }

    // Check if profile already exists
    const profilesQuery = query(
      collection(db, 'healthProfiles'),
      where('userId', '==', userId)
    );
    const existingProfiles = await getDocs(profilesQuery);
    
    let profileId: string;
    let qrToken: string;
    let qrCodeDataUrl: string;
    let isNewProfile = false;

    if (!existingProfiles.empty) {
      // Update existing profile
      const existingProfile = existingProfiles.docs[0];
      const profileData = existingProfile.data() as HealthProfile;
      profileId = profileData.profileId;
      qrToken = profileData.qrInfo.qrToken;
      qrCodeDataUrl = profileData.qrInfo.qrCodeDataUrl;
    } else {
      // Create new profile
      isNewProfile = true;
      profileId = QRProfileManager.generateProfileId();
      qrToken = QRProfileManager.createQRToken(profileId);
      qrCodeDataUrl = await QRProfileManager.generateQRCode(profileId);
    }

    // Prepare profile data
    const profileData: HealthProfile = {
      profileId,
      userId,
      userEmail,
      personalInfo: {
        fullName: personalInfo.fullName,
        dateOfBirth: personalInfo.dateOfBirth || '',
        gender: personalInfo.gender || 'other',
        nationality: personalInfo.nationality || '',
        phoneNumber: personalInfo.phoneNumber || '',
        emergencyContact: {
          name: personalInfo.emergencyContact?.name || '',
          relationship: personalInfo.emergencyContact?.relationship || '',
          phone: personalInfo.emergencyContact?.phone || '',
        }
      },
      emergencyInfo: {
        bloodGroup: emergencyInfo.bloodGroup,
        allergies: emergencyInfo.allergies || [],
        chronicConditions: emergencyInfo.chronicConditions || [],
        currentMedications: emergencyInfo.currentMedications || [],
        medicalNotes: emergencyInfo.medicalNotes || ''
      },
      workInfo: {
        employer: workInfo?.employer || '',
        jobTitle: workInfo?.jobTitle || '',
        workLocation: workInfo?.workLocation || '',
        workPermitNumber: workInfo?.workPermitNumber || ''
      },
      qrInfo: {
        qrToken,
        qrCodeDataUrl,
        generatedAt: isNewProfile ? new Date() : (existingProfiles.docs[0].data().qrInfo.generatedAt),
        accessCount: isNewProfile ? 0 : (existingProfiles.docs[0].data().qrInfo.accessCount || 0)
      },
      createdAt: isNewProfile ? new Date() : existingProfiles.docs[0].data().createdAt,
      updatedAt: new Date(),
      documentIds: existingProfiles.empty ? [] : (existingProfiles.docs[0].data().documentIds || []),
      submissionIds: existingProfiles.empty ? [] : (existingProfiles.docs[0].data().submissionIds || [])
    };

    // Save to Firestore
    const profileDocRef = doc(db, 'healthProfiles', profileId);
    await setDoc(profileDocRef, profileData, { merge: true });

    console.log(`Health profile ${isNewProfile ? 'created' : 'updated'} successfully:`, profileId);

    return NextResponse.json({
      success: true,
      profileId,
      qrCodeDataUrl,
      message: `Profile ${isNewProfile ? 'created' : 'updated'} successfully`,
      isNewProfile
    });

  } catch (error: any) {
    console.error('Error managing health profile:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      success: false 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('API: Getting user health profile');
    
    // Get authorization token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
    }

    // Parse JWT token
    let userId, userEmail;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.user_id || payload.sub;
      userEmail = payload.email;
      
      if (!userId || !userEmail) {
        throw new Error('Invalid token: missing user information');
      }
    } catch (error) {
      console.error('Token parsing error:', error);
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    // Get user's health profile
    const profilesQuery = query(
      collection(db, 'healthProfiles'),
      where('userId', '==', userId)
    );
    const profilesSnapshot = await getDocs(profilesQuery);

    if (profilesSnapshot.empty) {
      return NextResponse.json({ 
        success: true,
        hasProfile: false,
        message: 'No health profile found. Please create one first.'
      });
    }

    const profileDoc = profilesSnapshot.docs[0];
    const profileData = profileDoc.data() as HealthProfile;

    console.log('Retrieved health profile for user:', userEmail);

    return NextResponse.json({
      success: true,
      hasProfile: true,
      profile: profileData
    });

  } catch (error: any) {
    console.error('Error retrieving health profile:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      success: false 
    }, { status: 500 });
  }
}