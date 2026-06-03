import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Image as ImageIcon, Download, Calendar, Clock, User as UserIcon, Mail, Shield, Activity, ChevronDown, ChevronUp, X, ZoomIn, TrendingUp } from 'lucide-react';
import { userService, photoService, performanceService } from '../services/api';
import type { User } from '../types/user';

// Constants
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = { 
  weekday: 'short', 
  month: 'short', 
  day: 'numeric' 
};

const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = { 
  hour: '2-digit', 
  minute: '2-digit' 
};

// Types
interface Photo {
  id?: string;
  url?: string;
  photo_url?: string;
  timestamp?: string;
  modified_at?: string;
  source?: string;
}

interface PhotoCardProps {
  photo: Photo;
  onView: (url: string) => void;
  onHover: (url: string | null) => void;
  onDownload: (url: string) => void;
}

interface DaySectionProps {
  date: string;
  photos: Photo[];
  isExpanded: boolean;
  onToggle: () => void;
  onViewPhoto: (url: string) => void;
  hoveredImage: string | null;
  onHover: (url: string | null) => void;
  onDownload: (url: string) => void;
}

interface PerformanceData {
  date: string;
  originalDate: string;
  performance: number;
}

// Utility functions
const getPhotoUrl = (photo: Photo): string => photo.url || photo.photo_url || '';
const getPhotoTime = (photo: Photo): string => photo.timestamp || photo.modified_at || '';
const formatDate = (date: string): string => new Date(date).toLocaleDateString('en-US', DATE_FORMAT_OPTIONS);
const formatTime = (time: string): string => {
  if (!time) return 'Unknown time';
  return new Date(time).toLocaleTimeString([], TIME_FORMAT_OPTIONS);
};

// Loading Skeleton Component
const LoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-slate-100 px-4 py-10">
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="h-10 w-32 bg-slate-200 rounded-2xl animate-pulse" />
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-slate-200 rounded-3xl animate-pulse" />
            <div className="space-y-3">
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
              <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Photo Card Component
const PhotoCard: React.FC<PhotoCardProps> = React.memo(({ photo, onView, onHover, onDownload }) => {
  const imageUrl = getPhotoUrl(photo);
  const timeLabel = getPhotoTime(photo);
  
  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload(imageUrl);
  };
  
  return (
    <div
      onMouseEnter={() => onHover(imageUrl)}
      onMouseLeave={() => onHover(null)}
      className="group overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative h-40 overflow-hidden bg-slate-100">
        <img 
          src={imageUrl} 
          alt="Screenshot" 
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
        <div className="absolute bottom-3 left-3 right-3 opacity-0 transition duration-300 group-hover:opacity-100">
          <div className="rounded-2xl bg-white/95 px-3 py-2 text-xs font-medium text-slate-900 backdrop-blur-sm shadow-sm">
            <ZoomIn className="h-3 w-3 inline mr-1" />
            Click to preview
          </div>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {photo.source || 'Screenshot'}
        </p>
        <p className="text-xs text-slate-500">
          {formatTime(timeLabel)}
        </p>
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            onClick={() => onView(imageUrl)}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-all hover:bg-slate-50 hover:border-slate-300"
          >
            View
          </button>
          <button
            onClick={handleDownloadClick}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 transition-all hover:bg-slate-50 hover:border-slate-300"
            aria-label="Download screenshot"
          >
            <Download className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  );
});

PhotoCard.displayName = 'PhotoCard';

// Day Section Component
const DaySection: React.FC<DaySectionProps> = React.memo(({ 
  date, photos, isExpanded, onToggle, onViewPhoto, hoveredImage, onHover, onDownload 
}) => {
  const photoCount = photos.length;
  
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden transition-all">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-6 text-left hover:bg-slate-50 transition-colors duration-200"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-slate-500" />
          <div>
            <p className="text-base font-semibold text-slate-900">
              {formatDate(date)}
            </p>
            <p className="text-sm text-slate-500">
              {photoCount} screenshot{photoCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-500 transition-transform" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-500 transition-transform" />
        )}
      </button>
      
      {isExpanded && (
        <div className="space-y-6 border-t border-slate-200 p-6">
          {hoveredImage && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <img 
                src={hoveredImage} 
                alt="Preview" 
                className="h-72 w-full rounded-3xl object-cover shadow-md" 
              />
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {photos.map((photo, index) => (
              <PhotoCard
                key={photo.id || `${date}-${index}`}
                photo={photo}
                onView={onViewPhoto}
                onHover={onHover}
                onDownload={onDownload}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

DaySection.displayName = 'DaySection';

// Main Component
const UserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<User | null>(null);
  const [photosByDay, setPhotosByDay] = useState<Record<string, Photo[]>>({});
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(`expanded-days-${id}`);
    return saved ? JSON.parse(saved) : {};
  });

  // Load user data
  useEffect(() => {
    if (id) {
      loadUserData();
    }
  }, [id]);

  // Save expanded state to localStorage
  useEffect(() => {
    if (id && Object.keys(expandedDays).length > 0) {
      localStorage.setItem(`expanded-days-${id}`, JSON.stringify(expandedDays));
    }
  }, [expandedDays, id]);

  const loadUserData = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const userData = await userService.getUserById(id);
      setUser(userData);
      
      // Load photos if employee exists
      if (userData.employee_id || id) {
        try {
          const employeeId = userData.employee_id || id;
          const photosData = await photoService.getEmployeePhotosDayWise(employeeId);
          setPhotosByDay(photosData.photos_by_day || {});
          
          // Auto-expand today or first day with photos
          if (Object.keys(photosData.photos_by_day || {}).length > 0 && Object.keys(expandedDays).length === 0) {
            const today = new Date().toISOString().split('T')[0];
            const firstDay = Object.keys(photosData.photos_by_day)[0];
            const dayToExpand = photosData.photos_by_day[today] ? today : firstDay;
            setExpandedDays({ [dayToExpand]: true });
          }
        } catch (err) {
          console.warn('Photos not available:', err);
        }
      }

      // Load performance data for last 7 days
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startDate = sevenDaysAgo.toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];
        
        const perfData = await performanceService.getUserPerformance(parseInt(id), startDate, endDate);
        
        // Process performance data to get daily averages
        const dailyPerformance: Record<string, number[]> = {};
        if (perfData && perfData.performances) {
          perfData.performances.forEach((p: any) => {
            if (p.recorded_at && p.performance_percentage !== undefined && p.performance_percentage !== null) {
              const date = new Date(p.recorded_at).toISOString().split('T')[0];
              if (!dailyPerformance[date]) {
                dailyPerformance[date] = [];
              }
              dailyPerformance[date].push(p.performance_percentage);
            }
          });
        }

        // Convert to array format for chart
        const chartData: PerformanceData[] = Object.entries(dailyPerformance)
          .map(([date, performances]) => {
            const avgPerformance = performances.reduce((sum, val) => sum + val, 0) / performances.length;
            return {
              date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              originalDate: date,
              performance: Math.round(avgPerformance * 100) / 100 // Round to 2 decimal places
            };
          })
          .sort((a, b) => new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime());

        console.log('Performance chart data:', chartData);
        setPerformanceData(chartData);
      } catch (err) {
        console.warn('Performance data not available:', err);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to load user';
      setError(errorMessage);
      console.error('Error loading user:', err);
    } finally {
      setLoading(false);
    }
  }, [id, expandedDays]);

  const handleDownload = useCallback((url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `screenshot-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const toggleDayExpansion = useCallback((date: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  }, []);

  const handleViewPhoto = useCallback((url: string) => {
    setSelectedImage(url);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImage) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedImage, closeModal]);

  const totalPhotos = useMemo(() => {
    return Object.values(photosByDay).flat().length;
  }, [photosByDay]);

  const sortedDays = useMemo(() => {
    return Object.entries(photosByDay).sort(([dateA], [dateB]) => 
      new Date(dateB).getTime() - new Date(dateA).getTime()
    );
  }, [photosByDay]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
        <div className="max-w-2xl mx-auto rounded-[2rem] bg-white border border-slate-200 p-10 shadow-lg">
          <div className="flex items-center gap-3 text-rose-500">
            <AlertCircle className="h-6 w-6" />
            <p className="text-lg font-semibold">{error || 'User not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Dashboard</span>
        </button>

        {/* User Profile Card */}
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className={`flex h-20 w-20 items-center justify-center rounded-3xl text-3xl font-bold text-white shadow-lg transition-transform hover:scale-105 ${
                user.is_active 
                  ? 'bg-gradient-to-br from-emerald-500 via-lime-500 to-emerald-600' 
                  : 'bg-gradient-to-br from-slate-400 to-slate-500'
              }`}>
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Profile</p>
                <h1 className="text-3xl font-semibold text-slate-900">{user.full_name}</h1>
                <p className="mt-2 flex items-center gap-2 text-slate-500">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold ${
                user.is_active 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                <Activity className={`h-3.5 w-3.5 ${user.is_active ? 'text-emerald-500' : 'text-slate-400'}`} />
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
              {user.is_admin && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 bg-sky-100 text-sky-700 border border-sky-200 text-sm font-semibold">
                  <Shield className="h-3.5 w-3.5" />
                  Administrator
                </span>
              )}
            </div>
          </div>

          {/* User Details Grid */}
          <div className="mt-10 grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-all hover:shadow-md">
              <p className="text-sm text-slate-500 mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" /> Email
              </p>
              <p className="text-lg font-semibold text-slate-900 break-words">{user.email}</p>
            </div>
            {user.employee_id && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-all hover:shadow-md">
                <p className="text-sm text-slate-500 mb-3 flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-slate-400" /> Employee ID
                </p>
                <p className="text-lg font-semibold text-slate-900">{user.employee_id}</p>
              </div>
            )}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-all hover:shadow-md">
              <p className="text-sm text-slate-500 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" /> Created
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-all hover:shadow-md">
              <p className="text-sm text-slate-500 mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" /> Last Updated
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {new Date(user.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Performance Graph Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-3xl bg-slate-100 p-3 text-slate-700">
              <TrendingUp className="w-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Performance</p>
              <h2 className="text-2xl font-semibold text-slate-900">
                Last 7 Days
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-lg">
              <p className="text-lg font-semibold text-slate-900">Loading performance data...</p>
            </div>
          ) : performanceData.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-lg">
              <TrendingUp className="mx-auto h-16 w-16 mb-4 text-slate-400 opacity-50" />
              <p className="text-lg font-semibold text-slate-900">No performance data available</p>
              <p className="mt-2 text-sm text-slate-500">
                This profile doesn't have any performance data for the last 7 days.
              </p>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg">
              <div className="relative h-96 flex items-end justify-between gap-6 px-6 pb-10">
                {performanceData.map((data, index) => (
                  <div key={`cylinder-${index}`} className="flex flex-col items-center gap-3 flex-1">
                    <div className="text-sm font-semibold text-slate-900">
                      {data.performance.toFixed(1)}%
                    </div>
                    <div className="relative w-full flex-1 flex items-end">
                      {/* Cylinder body */}
                      <div 
                        className="w-full relative"
                        style={{ height: `${Math.max(data.performance, 100)}%` }}
                      >
                        {/* Main cylinder body with 3D gradient */}
                        <div 
                          className="absolute inset-0 rounded-b-lg"
                          style={{
                            background: `linear-gradient(90deg, 
                              #1e40af 0%, 
                              #3b82f6 25%, 
                              #60a5fa 50%, 
                              #3b82f6 75%, 
                              #1e40af 100%)`,
                            boxShadow: 'inset -10px 0 20px rgba(0,0,0,0.3), inset 10px 0 20px rgba(255,255,255,0.2)'
                          }}
                        />
                        {/* Left shadow for 3D effect */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1/3 rounded-l-lg opacity-50"
                          style={{
                            background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 100%)'
                          }}
                        />
                        {/* Right highlight for 3D effect */}
                        <div 
                          className="absolute right-0 top-0 bottom-0 w-1/4 rounded-r-lg opacity-30"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 100%)'
                          }}
                        />
                      </div>
                      {/* Cylinder top (ellipse) */}
                      <div 
                        className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-full rounded-full"
                        style={{
                          height: '16px',
                          background: `linear-gradient(90deg, 
                            #1e40af 0%, 
                            #3b82f6 25%, 
                            #60a5fa 50%, 
                            #3b82f6 75%, 
                            #1e40af 100%)`,
                          boxShadow: 'inset -3px 0 6px rgba(0,0,0,0.3), inset 3px 0 6px rgba(255,255,255,0.2)'
                        }}
                      />
                    </div>
                    <div className="text-sm text-slate-600 font-medium text-center truncate w-full">
                      {data.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Photos Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-3xl bg-slate-100 p-3 text-slate-700">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Screenshots</p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {totalPhotos} asset{totalPhotos !== 1 ? 's' : ''}
                </h2>
              </div>
            </div>
          </div>

          {sortedDays.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-lg">
              <ImageIcon className="mx-auto h-16 w-16 mb-4 text-slate-400 opacity-50" />
              <p className="text-lg font-semibold text-slate-900">No screenshots available</p>
              <p className="mt-2 text-sm text-slate-500">
                This profile doesn't have any screenshot history yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDays.map(([date, photos]) => (
                <DaySection
                  key={date}
                  date={date}
                  photos={photos}
                  isExpanded={!!expandedDays[date]}
                  onToggle={() => toggleDayExpansion(date)}
                  onViewPhoto={handleViewPhoto}
                  hoveredImage={hoveredImage}
                  onHover={setHoveredImage}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}
        </section>

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={closeModal}
          >
            <div
              className="relative max-w-5xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt="Full screenshot preview"
                className="w-full h-full object-contain bg-slate-100"
              />
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-3 rounded-full transition-all hover:scale-110 backdrop-blur-sm"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDownload(selectedImage)}
                className="absolute bottom-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-3 rounded-full transition-all hover:scale-110 backdrop-blur-sm"
                aria-label="Download image"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetails;