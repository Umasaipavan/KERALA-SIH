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
  FileText,
  Shield,
  Activity,
  Menu,
  Loader2,
  CheckCircle,
  AlertCircle,
  Scan,
  User,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import QrScanner from 'qr-scanner';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function DocumentQRScannerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [cameras, setCameras] = useState<QrScanner.Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [manualUrl, setManualUrl] = useState('');
  const [fetchingUser, setFetchingUser] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState('');

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
        description: "Point your camera at a document submission QR code",
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
    
    // Stop scanning
    stopScanning();
    setLoading(true);

    try {
      let submissionUrl = '';
      
      if (data.includes('/admin/submission/')) {
        // Direct admin URL
        submissionUrl = data;
      } else if (data.includes('/submission/')) {
        // Public submission URL - convert to admin URL
        const submissionId = data.split('/submission/')[1];
        submissionUrl = `${window.location.origin}/admin/submission/${submissionId}`;
      } else if (data.startsWith('SUB-')) {
        // Direct submission ID
        submissionUrl = `${window.location.origin}/admin/submission/${data}`;
      } else {
        throw new Error('Invalid document submission QR code');
      }

      toast({
        title: "QR Code Detected! 🎉",
        description: "Redirecting to document submission dashboard...",
      });

      // Add a small delay for better UX
      setTimeout(() => {
        window.location.href = submissionUrl;
      }, 1000);

    } catch (error: any) {
      console.error('Error processing scan result:', error);
      toast({
        title: "Invalid QR Code",
        description: "This doesn't appear to be a document submission QR code",
        variant: "destructive",
      });
      
      setLoading(false);
      // Restart scanning after a delay
      setTimeout(() => startScanning(), 2000);
    }
  };

  const handleManualUrlAccess = () => {
    if (!manualUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter a submission URL or ID",
        variant: "destructive",
      });
      return;
    }

    let finalUrl = manualUrl.trim();
    
    if (finalUrl.startsWith('SUB-')) {
      // Convert submission ID to full URL
      finalUrl = `/admin/submission/${finalUrl}`;
    } else if (!finalUrl.startsWith('http')) {
      // Relative URL - make it absolute
      finalUrl = `${window.location.origin}${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`;
    }

    window.location.href = finalUrl;
  };

  // Fetch all submissions for a user by email or userId
  const fetchUserSubmissions = async () => {
    setFetchingUser(true);
    setFetchError('');
    setUserSubmissions([]);
    try {
      let userId = userQuery;
      // If input looks like an email, fetch userId from profiles
      if (userQuery.includes('@')) {
        const profilesSnap = await getDocs(query(collection(db, 'profiles'), where('email', '==', userQuery)));
        if (!profilesSnap.empty) {
          userId = profilesSnap.docs[0].data().userId;
        } else {
          setFetchError('No user found with that email.');
          setFetchingUser(false);
          return;
        }
      }
      // Now fetch submissions
      const submissionsSnap = await getDocs(query(collection(db, 'submissions'), where('userId', '==', userId)));
      const submissions = submissionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserSubmissions(submissions);
      if (submissions.length === 0) setFetchError('No submissions found for this user.');
    } catch (err: any) {
      setFetchError('Error fetching user data.');
    }
    setFetchingUser(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold mb-2">Processing QR Code</h2>
          <p className="text-gray-600">Redirecting to document submission dashboard...</p>
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
        <div className="max-w-4xl mx-auto p-4 pt-16 lg:pt-6 space-y-6">
          {/* Header */}
          <div className="text-center py-6">
            <div className="flex justify-center items-center gap-3 mb-3">
              <Scan className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Document QR Scanner</h1>
            </div>
            <p className="text-gray-600">Scan document submission QR codes for instant admin access</p>
            {user && (
              <div className="mt-3 text-sm text-gray-500">
                Logged in as: <span className="font-medium text-gray-700">{user.email}</span>
                <Badge variant="outline" className="ml-2">Admin Access</Badge>
              </div>
            )}
          </div>

          {/* Instructions */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <h2 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                How to Use Document QR Scanner
              </h2>
              <div className="space-y-2 text-blue-800">
                <p>• <strong>Step 1:</strong> User submits documents and gets QR code</p>
                <p>• <strong>Step 2:</strong> Admin scans QR code using this scanner</p>
                <p>• <strong>Step 3:</strong> Instant redirect to admin dashboard</p>
                <p>• <strong>Step 4:</strong> Review and approve/reject documents</p>
              </div>
            </CardContent>
          </Card>

          {/* Scanner Controls */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Camera Scanner
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
                  <Button onClick={startScanning} className="flex items-center gap-2" size="lg">
                    <Camera className="w-5 h-5" />
                    Start QR Scanner
                  </Button>
                ) : (
                  <Button onClick={stopScanning} variant="outline" className="flex items-center gap-2" size="lg">
                    <Activity className="w-5 h-5" />
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
                    <p className="text-sm text-gray-600 mb-2">
                      Point your camera at a document submission QR code
                    </p>
                    <div className="inline-flex items-center gap-2 text-blue-600">
                      <Activity className="w-4 h-4 animate-pulse" />
                      <span className="text-sm font-medium">Scanning...</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manual Entry */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium">Manual Entry</h3>
              <p className="text-sm text-gray-600">
                Enter submission URL or ID manually if camera scanning is not available
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="Enter submission URL or ID (e.g., SUB-M3K4R1-AB7X)"
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                  onKeyPress={(e) => e.key === 'Enter' && handleManualUrlAccess()}
                />
                <Button onClick={handleManualUrlAccess} className="whitespace-nowrap">
                  Access Dashboard
                </Button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Examples: <code>SUB-M3K4R1-AB7X</code> or <code>/admin/submission/SUB-M3K4R1-AB7X</code>
              </div>
            </CardContent>
          </Card>

          {/* Quick Access Examples */}
          <Card className="bg-gray-50">
            <CardHeader>
              <h3 className="text-lg font-medium flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Example QR Code URLs
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="font-mono bg-white p-2 rounded border">
                  https://myapp.com/admin/submission/SUB-M3K4R1-AB7X
                </div>
                <div className="font-mono bg-white p-2 rounded border">
                  https://myapp.com/submission/SUB-M3K4R1-AB7X
                </div>
                <div className="font-mono bg-white p-2 rounded border">
                  SUB-M3K4R1-AB7X
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                All these formats are automatically detected and converted to admin dashboard URLs
              </p>
            </CardContent>
          </Card>

          {/* --- New: Fetch User Data Section --- */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium flex items-center gap-2">
                <User className="w-5 h-5" />
                Fetch User Submissions
              </h3>
              <p className="text-sm text-gray-600">
                Enter user email or user ID to view all their document submissions (with images)
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={userQuery}
                  onChange={e => setUserQuery(e.target.value)}
                  placeholder="Enter user email or userId"
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                  onKeyPress={e => e.key === 'Enter' && fetchUserSubmissions()}
                />
                <Button onClick={fetchUserSubmissions} disabled={fetchingUser}>
                  {fetchingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
                </Button>
              </div>
              {fetchError && <div className="text-red-600 text-sm mb-2">{fetchError}</div>}
              {/* Display submissions */}
              {userSubmissions.length > 0 && (
                <div className="space-y-6 mt-4">
                  {userSubmissions.map((submission, idx) => (
                    <Card key={submission.id || idx} className="border-blue-200">
                      <CardHeader>
                        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Submission: {submission.id}
                        </h4>
                        <div className="text-xs text-gray-500">Submitted: {submission.submittedAt?.toDate?.().toLocaleString?.() || submission.submittedAt || 'N/A'}</div>
                        <div className="text-xs text-gray-500">Status: {submission.status || 'N/A'}</div>
                      </CardHeader>
                      <CardContent>
                        {submission.files && submission.files.length > 0 ? (
                          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Attached Documents ({submission.files.length})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {submission.files.map((file: any, fidx: number) => (
                                <div key={fidx} className="bg-white p-3 rounded border flex items-center gap-2">
                                  {file.fileType?.startsWith('image/') ? (
                                    <>
                                      <img
                                        src={`data:${file.fileType};base64,${file.fileData}`}
                                        alt={file.fileName}
                                        className="w-12 h-12 object-contain rounded border mr-2"
                                      />
                                    </>
                                  ) : (
                                    <FileText className="h-5 w-5 text-gray-500" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {file.fileName || file.description || `Document ${fidx + 1}`}
                                    </p>
                                    {file.fileSize && (
                                      <p className="text-xs text-gray-500">
                                        {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500">Type: {file.fileType}</p>
                                  </div>
                                  <div className="flex gap-1">
                                    {file.fileData && file.fileType && (
                                      <>
                                        {/* View button for images and files */}
                                        <Button size="sm" variant="ghost" onClick={() => {
                                          const url = `data:${file.fileType};base64,${file.fileData}`;
                                          window.open(url, '_blank');
                                        }}>
                                          View
                                        </Button>
                                        {/* Download button */}
                                        <Button size="sm" variant="ghost" onClick={() => {
                                          const url = `data:${file.fileType};base64,${file.fileData}`;
                                          const link = document.createElement('a');
                                          link.href = url;
                                          link.download = file.fileName || `document-${fidx + 1}`;
                                          link.click();
                                        }}>
                                          Download
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">No files in this submission.</div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}