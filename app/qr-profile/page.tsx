'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/sidebar';
import { 
  QrCode, 
  User, 
  Heart, 
  Briefcase, 
  Download,
  Share2,
  Eye,
  Shield,
  Activity,
  Plus,
  Menu,
  Save,
  AlertCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { HealthProfile } from '@/lib/qr-profile-manager';

interface ProfileFormData {
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
}

export default function QRProfilePage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    personalInfo: {
      fullName: '',
      dateOfBirth: '',
      gender: 'other',
      nationality: '',
      phoneNumber: '',
      emergencyContact: {
        name: '',
        relationship: '',
        phone: ''
      }
    },
    emergencyInfo: {
      bloodGroup: '',
      allergies: [],
      chronicConditions: [],
      currentMedications: [],
      medicalNotes: ''
    },
    workInfo: {
      employer: '',
      jobTitle: '',
      workLocation: '',
      workPermitNumber: ''
    }
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

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

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = await user?.getIdToken();
      const response = await fetch('/api/qr/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.hasProfile) {
          setProfile(data.profile);
          setFormData({
            personalInfo: data.profile.personalInfo,
            emergencyInfo: data.profile.emergencyInfo,
            workInfo: data.profile.workInfo
          });
          setHasProfile(true);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.personalInfo.fullName || !formData.emergencyInfo.bloodGroup) {
      toast({
        title: "Missing Information",
        description: "Please fill in your full name and blood group (required)",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const token = await user?.getIdToken();
      
      const response = await fetch('/api/qr/profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        
        toast({
          title: "Success!",
          description: data.message,
        });

        // Reload profile to get the QR code
        await loadProfile();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save profile');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadQRCode = () => {
    if (!profile?.qrInfo.qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.href = profile.qrInfo.qrCodeDataUrl;
    link.download = `health-profile-qr-${profile.personalInfo.fullName.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addItem = (type: 'allergies' | 'chronicConditions' | 'currentMedications', value: string) => {
    if (!value.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      emergencyInfo: {
        ...prev.emergencyInfo,
        [type]: [...prev.emergencyInfo[type], value.trim()]
      }
    }));
    
    if (type === 'allergies') setNewAllergy('');
    if (type === 'chronicConditions') setNewCondition('');
    if (type === 'currentMedications') setNewMedication('');
  };

  const removeItem = (type: 'allergies' | 'chronicConditions' | 'currentMedications', index: number) => {
    setFormData(prev => ({
      ...prev,
      emergencyInfo: {
        ...prev.emergencyInfo,
        [type]: prev.emergencyInfo[type].filter((_, i) => i !== index)
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Loading your health profile...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My QR Health Profile</h1>
            <p className="text-gray-600">Create and manage your secure digital health profile</p>
            {user && (
              <div className="mt-3 text-sm text-gray-500">
                Logged in as: <span className="font-medium text-gray-700">{user.email}</span>
              </div>
            )}
          </div>

          {/* QR Code Display */}
          {hasProfile && profile?.qrInfo.qrCodeDataUrl && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader className="text-center">
                <h2 className="text-xl font-semibold text-blue-900">Your Health Profile QR Code</h2>
                <p className="text-sm text-blue-700">
                  This QR code contains a secure link to your health profile. It never expires and updates automatically.
                </p>
              </CardHeader>
              <CardContent className="text-center">
                <div className="inline-block p-4 bg-white rounded-lg shadow-lg">
                  <img 
                    src={profile.qrInfo.qrCodeDataUrl} 
                    alt="Health Profile QR Code"
                    className="w-64 h-64 mx-auto"
                  />
                </div>
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                  <Button onClick={downloadQRCode} className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download QR Code
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Share Link
                  </Button>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Generated: {new Date(profile.qrInfo.generatedAt).toLocaleDateString()} | 
                  Accessed: {profile.qrInfo.accessCount || 0} times
                  {profile.qrInfo.lastAccessed && (
                    <> | Last: {new Date(profile.qrInfo.lastAccessed).toLocaleDateString()}</>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.personalInfo.fullName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, fullName: e.target.value }
                    }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <Input
                    type="date"
                    value={formData.personalInfo.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, dateOfBirth: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <select
                    value={formData.personalInfo.gender}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, gender: e.target.value as any }
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nationality</label>
                  <Input
                    value={formData.personalInfo.nationality}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, nationality: e.target.value }
                    }))}
                    placeholder="e.g., Indian"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <Input
                    value={formData.personalInfo.phoneNumber}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, phoneNumber: e.target.value }
                    }))}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="pt-4">
                <h3 className="font-semibold mb-3">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <Input
                      value={formData.personalInfo.emergencyContact.name}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          emergencyContact: { ...prev.personalInfo.emergencyContact, name: e.target.value }
                        }
                      }))}
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Relationship</label>
                    <Input
                      value={formData.personalInfo.emergencyContact.relationship}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          emergencyContact: { ...prev.personalInfo.emergencyContact, relationship: e.target.value }
                        }
                      }))}
                      placeholder="e.g., Spouse, Parent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <Input
                      value={formData.personalInfo.emergencyContact.phone}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          emergencyContact: { ...prev.personalInfo.emergencyContact, phone: e.target.value }
                        }
                      }))}
                      placeholder="Emergency contact phone"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Medical Information */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Emergency Medical Information
              </h2>
              <div className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Critical information for emergency responders
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Blood Group <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.emergencyInfo.bloodGroup}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    emergencyInfo: { ...prev.emergencyInfo, bloodGroup: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-sm font-medium mb-1">Allergies</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    placeholder="Add allergy"
                    onKeyPress={(e) => e.key === 'Enter' && addItem('allergies', newAllergy)}
                  />
                  <Button 
                    type="button"
                    onClick={() => addItem('allergies', newAllergy)}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.emergencyInfo.allergies.map((allergy, index) => (
                    <Badge 
                      key={index} 
                      variant="destructive"
                      className="cursor-pointer"
                      onClick={() => removeItem('allergies', index)}
                    >
                      {allergy} ×
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Chronic Conditions */}
              <div>
                <label className="block text-sm font-medium mb-1">Chronic Conditions</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder="Add chronic condition"
                    onKeyPress={(e) => e.key === 'Enter' && addItem('chronicConditions', newCondition)}
                  />
                  <Button 
                    type="button"
                    onClick={() => addItem('chronicConditions', newCondition)}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.emergencyInfo.chronicConditions.map((condition, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeItem('chronicConditions', index)}
                    >
                      {condition} ×
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Current Medications */}
              <div>
                <label className="block text-sm font-medium mb-1">Current Medications</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    placeholder="Add current medication"
                    onKeyPress={(e) => e.key === 'Enter' && addItem('currentMedications', newMedication)}
                  />
                  <Button 
                    type="button"
                    onClick={() => addItem('currentMedications', newMedication)}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.emergencyInfo.currentMedications.map((medication, index) => (
                    <Badge 
                      key={index} 
                      className="cursor-pointer"
                      onClick={() => removeItem('currentMedications', index)}
                    >
                      {medication} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Medical Notes</label>
                <Textarea
                  value={formData.emergencyInfo.medicalNotes}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    emergencyInfo: { ...prev.emergencyInfo, medicalNotes: e.target.value }
                  }))}
                  placeholder="Any additional medical information for emergency responders..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Work Information */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Work Information
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Employer</label>
                  <Input
                    value={formData.workInfo.employer}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      workInfo: { ...prev.workInfo, employer: e.target.value }
                    }))}
                    placeholder="Current employer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Job Title</label>
                  <Input
                    value={formData.workInfo.jobTitle}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      workInfo: { ...prev.workInfo, jobTitle: e.target.value }
                    }))}
                    placeholder="Your job title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Work Location</label>
                  <Input
                    value={formData.workInfo.workLocation}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      workInfo: { ...prev.workInfo, workLocation: e.target.value }
                    }))}
                    placeholder="Work location/address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Work Permit Number</label>
                  <Input
                    value={formData.workInfo.workPermitNumber}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      workInfo: { ...prev.workInfo, workPermitNumber: e.target.value }
                    }))}
                    placeholder="Work permit/visa number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="text-center pb-8">
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              size="lg"
              className="px-8 py-3 bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {hasProfile ? 'Update Profile' : 'Create QR Profile'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}