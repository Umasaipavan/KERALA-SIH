'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/sidebar';
import { 
  QrCode, 
  Camera, 
  User, 
  Heart, 
  Briefcase,
  Shield,
  Activity,
  Calendar,
  Phone,
  MapPin,
  AlertCircle,
  FileText,
  Menu,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { HealthProfile } from '@/lib/qr-profile-manager';
import QrScanner from 'qr-scanner';

interface ScanResult {
  profile: HealthProfile;
  accessInfo: {
    scannedAt: string;
    scannerRole: string;
    requiresAuthentication: boolean;
  };
}

export default function QRScannerPage() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [cameras, setCameras] = useState<QrScanner.Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [manualToken, setManualToken] = useState('');

  // Set sidebar open by default on desktop
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    // Check if QR Scanner is supported
    QrScanner.hasCamera().then(hasCamera => {
      if (hasCamera) {
        QrScanner.listCameras(true).then(cameras => {
          setCameras(cameras);
          if (cameras.length > 0) {
            setSelectedCamera(cameras[0].id);
          }
        });
      }
    });

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      setScanning(true);
      setCameraPermission('prompt');
      
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }

      qrScannerRef.current = new QrScanner(
        videoRef.current,
        result => handleScanResult(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
        }
      );

      if (selectedCamera) {
        await qrScannerRef.current.setCamera(selectedCamera);
      }

      await qrScannerRef.current.start();
      setCameraPermission('granted');
      
      toast({
        title: "Scanner Started",
        description: "Point your camera at a QR code to scan",
      });
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      setCameraPermission('denied');
      setScanning(false);
      
      toast({
        title: "Scanner Error",
        description: error.message || "Failed to start camera scanner",
        variant: "destructive",
      });
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      setScanning(false);
    }
  };

  const handleScanResult = async (data: string) => {
    console.log('QR Code scanned:', data);
    
    // Stop scanning temporarily
    stopScanning();
    setLoading(true);

    try {
      // Extract token from QR data
      let token = '';
      if (data.startsWith('http')) {
        // URL format: extract token from URL
        const url = new URL(data);
        token = url.pathname.split('/').pop() || '';
      } else {
        // Direct token
        token = data;
      }

      await accessProfile(token);
    } catch (error: any) {
      console.error('Error processing scan result:', error);
      toast({
        title: "Invalid QR Code",
        description: "This doesn't appear to be a valid health profile QR code",
        variant: "destructive",
      });
      setLoading(false);
      // Restart scanning after a delay
      setTimeout(() => startScanning(), 2000);
    }
  };

  const accessProfile = async (token: string) => {
    try {
      setLoading(true);
      
      const headers: any = {};
      if (user) {
        const authToken = await user.getIdToken();
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/qr/access/${token}`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scannerInfo: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            scannerRole: user ? 'authenticated' : 'anonymous'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setScanResult(data);
        
        toast({
          title: "Profile Accessed",
          description: `Successfully loaded ${data.profile.personalInfo.fullName}'s health profile`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to access profile');
      }
    } catch (error: any) {
      console.error('Error accessing profile:', error);
      toast({
        title: "Access Error",
        description: error.message || "Failed to access health profile",
        variant: "destructive",
      });
      
      // Restart scanning after error
      setTimeout(() => startScanning(), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleManualTokenAccess = async () => {
    if (!manualToken.trim()) {
      toast({
        title: "Missing Token",
        description: "Please enter a QR token",
        variant: "destructive",
      });
      return;
    }

    await accessProfile(manualToken.trim());
    setManualToken('');
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Accessing health profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        <Menu className="w-5 h-5" />
      </button>
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-48 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 pt-16 lg:pt-6 space-y-6">
          {/* Header */}
          <div className="text-center py-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Health Profile Scanner</h1>
            <p className="text-gray-600">Scan QR codes to access patient health profiles</p>
            {user && (
              <div className="mt-3 text-sm text-gray-500">
                Logged in as: <span className="font-medium text-gray-700">{user.email}</span>
                <Badge variant="outline" className="ml-2">Healthcare Provider</Badge>
              </div>
            )}
          </div>

          {!scanResult && (
            <>
              {/* Scanner Controls */}
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    QR Code Scanner
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cameras.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Camera</label>
                      <select
                        value={selectedCamera}
                        onChange={(e) => setSelectedCamera(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={scanning}
                      >
                        {cameras.map(camera => (
                          <option key={camera.id} value={camera.id}>
                            {camera.label || `Camera ${camera.id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 justify-center">
                    {!scanning ? (
                      <Button onClick={startScanning} className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Start Scanner
                      </Button>
                    ) : (
                      <Button onClick={stopScanning} variant="outline" className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Stop Scanner
                      </Button>
                    )}
                  </div>

                  {cameraPermission === 'denied' && (
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-red-700 font-medium">Camera Permission Denied</p>
                      <p className="text-red-600 text-sm mt-1">
                        Please enable camera permission in your browser settings to use the QR scanner.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Video Scanner */}
              {scanning && (
                <Card>
                  <CardContent className="p-6">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        className="w-full max-w-md mx-auto rounded-lg border-2 border-blue-300"
                        style={{ aspectRatio: '4/3' }}
                      />
                      <div className="text-center mt-4">
                        <p className="text-sm text-gray-600">
                          Point your camera at a QR code to scan
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Manual Token Entry */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Manual Token Access</h3>
                  <p className="text-sm text-gray-600">
                    Enter a QR token manually if camera scanning is not available
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Enter QR token"
                      className="flex-1 p-2 border border-gray-300 rounded-md"
                      onKeyPress={(e) => e.key === 'Enter' && handleManualTokenAccess()}
                    />
                    <Button onClick={handleManualTokenAccess}>
                      Access Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Profile Display */}
          {scanResult && (
            <>
              {/* Success Header */}
              <Card className="border-2 border-green-200 bg-green-50">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h2 className="text-xl font-semibold text-green-900 mb-2">Profile Access Successful</h2>
                  <p className="text-green-700">
                    Scanned at {new Date(scanResult.accessInfo.scannedAt).toLocaleString()}
                  </p>
                  <Button 
                    onClick={() => {
                      setScanResult(null);
                      startScanning();
                    }}
                    variant="outline"
                    className="mt-4"
                  >
                    Scan Another QR Code
                  </Button>
                </CardContent>
              </Card>

              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase">Full Name</label>
                      <p className="text-lg font-semibold">{scanResult.profile.personalInfo.fullName}</p>
                    </div>
                    {scanResult.profile.personalInfo.dateOfBirth && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase">Age / DOB</label>
                        <p className="text-lg">
                          {calculateAge(scanResult.profile.personalInfo.dateOfBirth)} years
                          <span className="text-sm text-gray-600 ml-2">
                            ({formatDate(scanResult.profile.personalInfo.dateOfBirth)})
                          </span>
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase">Gender</label>
                      <p className="text-lg capitalize">{scanResult.profile.personalInfo.gender}</p>
                    </div>
                    {scanResult.profile.personalInfo.nationality && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase">Nationality</label>
                        <p className="text-lg">{scanResult.profile.personalInfo.nationality}</p>
                      </div>
                    )}
                    {scanResult.profile.personalInfo.phoneNumber && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase">Phone</label>
                        <p className="text-lg flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {scanResult.profile.personalInfo.phoneNumber}
                        </p>
                      </div>
                    )}
                  </div>

                  {scanResult.profile.personalInfo.emergencyContact.name && (
                    <div className="pt-4 border-t">
                      <h3 className="font-semibold mb-3 text-red-700">Emergency Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase">Name</label>
                          <p className="font-medium">{scanResult.profile.personalInfo.emergencyContact.name}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase">Relationship</label>
                          <p>{scanResult.profile.personalInfo.emergencyContact.relationship}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase">Phone</label>
                          <p className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {scanResult.profile.personalInfo.emergencyContact.phone}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Emergency Medical Information */}
              <Card className="border-2 border-red-200">
                <CardHeader className="bg-red-50">
                  <h2 className="text-xl font-semibold flex items-center gap-2 text-red-900">
                    <Heart className="w-5 h-5" />
                    Emergency Medical Information
                  </h2>
                  <div className="text-sm text-red-700 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Critical information for emergency care
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {scanResult.profile.emergencyInfo.bloodGroup && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase">Blood Group</label>
                      <p className="text-2xl font-bold text-red-600">
                        {scanResult.profile.emergencyInfo.bloodGroup}
                      </p>
                    </div>
                  )}

                  {scanResult.profile.emergencyInfo.allergies.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Allergies</label>
                      <div className="flex flex-wrap gap-2">
                        {scanResult.profile.emergencyInfo.allergies.map((allergy, index) => (
                          <Badge key={index} variant="destructive">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanResult.profile.emergencyInfo.chronicConditions.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Chronic Conditions</label>
                      <div className="flex flex-wrap gap-2">
                        {scanResult.profile.emergencyInfo.chronicConditions.map((condition, index) => (
                          <Badge key={index} variant="secondary">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanResult.profile.emergencyInfo.currentMedications.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Current Medications</label>
                      <div className="flex flex-wrap gap-2">
                        {scanResult.profile.emergencyInfo.currentMedications.map((medication, index) => (
                          <Badge key={index} className="bg-blue-100 text-blue-800">
                            {medication}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanResult.profile.emergencyInfo.medicalNotes && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase">Medical Notes</label>
                      <div className="bg-gray-50 p-3 rounded-lg border">
                        <p className="text-sm whitespace-pre-wrap">{scanResult.profile.emergencyInfo.medicalNotes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Work Information */}
              {(scanResult.profile.workInfo.employer || 
                scanResult.profile.workInfo.jobTitle || 
                scanResult.profile.workInfo.workLocation ||
                scanResult.profile.workInfo.workPermitNumber) && (
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Work Information
                    </h2>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {scanResult.profile.workInfo.employer && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase">Employer</label>
                          <p className="text-lg">{scanResult.profile.workInfo.employer}</p>
                        </div>
                      )}
                      {scanResult.profile.workInfo.jobTitle && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase">Job Title</label>
                          <p className="text-lg">{scanResult.profile.workInfo.jobTitle}</p>
                        </div>
                      )}
                      {scanResult.profile.workInfo.workLocation && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase">Work Location</label>
                          <p className="text-lg flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {scanResult.profile.workInfo.workLocation}
                          </p>
                        </div>
                      )}
                      {scanResult.profile.workInfo.workPermitNumber && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase">Work Permit</label>
                          <p className="text-lg">{scanResult.profile.workInfo.workPermitNumber}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* User Documents/Images Section */}
              {scanResult.userData?.submissions?.length > 0 && (
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Medical Documents
                    </h2>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {scanResult.userData.submissions.map((submission: any, idx: number) => (
                        <div key={idx} className="bg-white p-4 rounded-lg border shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={submission.status === 'approved' ? 'default' : 'secondary'}>
                              {submission.status || 'submitted'}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatDate(submission.submittedAt)}
                            </span>
                          </div>
                          
                          <h3 className="font-medium mb-2">
                            {submission.description || `Submission ${idx + 1}`}
                          </h3>
                          
                          <div className="text-xs text-gray-600 space-y-1">
                            {submission.files && (
                              <p>Files: {submission.files.length} document(s)</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Medications Section */}
              {scanResult.userData?.medications?.length > 0 && (
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      Medications
                    </h2>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {scanResult.userData.medications.map((med: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-lg border">
                          <h3 className="font-semibold text-lg">{med.medicationName}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                            <div>
                              <span className="text-xs text-gray-500">Dosage</span>
                              <p>{med.dosage}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Frequency</span>
                              <p>{med.frequency}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Start Date</span>
                              <p>{formatDate(med.startDate)}</p>
                            </div>
                          </div>
                          {med.notes && (
                            <p className="text-sm mt-2 text-gray-700">{med.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Appointments Section */}
              {scanResult.userData?.appointments?.length > 0 && (
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Appointments
                    </h2>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {scanResult.userData.appointments.map((apt: any, idx: number) => (
                        <div key={idx} className="bg-white p-4 rounded-lg border shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <Badge>{apt.status}</Badge>
                            <span className="text-xs text-gray-500">
                              {apt.date} at {apt.time}
                            </span>
                          </div>
                          
                          <h3 className="font-medium">{apt.hospitalName}</h3>
                          <p className="text-sm text-gray-600">Dr. {apt.doctorName}</p>
                          
                          <div className="mt-2 text-xs text-gray-500">
                            <p>{apt.appointmentType}</p>
                            {apt.notes && <p className="mt-1">{apt.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Chat History Section */}
              {scanResult.userData?.chatSessions?.length > 0 && (
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Chat History
                    </h2>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                      Patient has {scanResult.userData.chatSessions.length} chat sessions on record
                    </p>
                    <div className="space-y-2">
                      {scanResult.userData.chatSessions.slice(0, 3).map((session: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border text-sm">
                          <p className="text-xs text-gray-500 mb-1">
                            {formatDate(session.createdAt)} • {session.messages?.length || 0} messages
                          </p>
                          <p className="truncate">
                            {session.messages?.[0]?.content?.substring(0, 50) || "No messages"}...
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Profile Metadata */}
              <Card className="border-gray-200">
                <CardHeader>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Profile Information
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase">Profile Created</label>
                      <p>{(scanResult.profile as any).metadata?.createdAt ? formatDate((scanResult.profile as any).metadata.createdAt) : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase">Last Updated</label>
                      <p>{(scanResult.profile as any).metadata?.updatedAt ? formatDate((scanResult.profile as any).metadata.updatedAt) : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase">Total Accesses</label>
                      <p>{(scanResult.profile as any).qrInfo?.accessCount || 0} times</p>
                    </div>
                    {scanResult.profile.qrInfo.lastAccessed && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase">Last Accessed</label>
                        <p>{formatDate(scanResult.profile.qrInfo.lastAccessed.toString())}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Display summary stats */}
                  {scanResult.stats && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-medium mb-2">User Data Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div className="bg-blue-50 p-2 rounded">
                          <p className="text-xs text-blue-700">Chat Sessions</p>
                          <p className="font-bold text-blue-900">{scanResult.stats.totalChatSessions}</p>
                        </div>
                        <div className="bg-green-50 p-2 rounded">
                          <p className="text-xs text-green-700">Medications</p>
                          <p className="font-bold text-green-900">{scanResult.stats.totalMedications}</p>
                        </div>
                        <div className="bg-purple-50 p-2 rounded">
                          <p className="text-xs text-purple-700">Documents</p>
                          <p className="font-bold text-purple-900">{scanResult.stats.totalSubmissions}</p>
                        </div>
                        <div className="bg-yellow-50 p-2 rounded">
                          <p className="text-xs text-yellow-700">Appointments</p>
                          <p className="font-bold text-yellow-900">{scanResult.stats.totalAppointments}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}