import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, AlertCircle, Image as ImageIcon, Download, Calendar, Clock, User as UserIcon, Mail, Shield, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { userService, photoService } from '../services/api';
import type { User } from '../types/user';

const UserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [photosByDay, setPhotosByDay] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      loadUserData();
    }
  }, [id]);

  const loadUserData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const userData = await userService.getUserById(id);
      setUser(userData);
      try {
        const employeeId = userData.employee_id || id;
        const photosData = await photoService.getEmployeePhotosDayWise(employeeId);
        setPhotosByDay(photosData.photos_by_day || {});
      } catch (err) {
        console.log('Photos not available');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadScreenshot = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `photo-${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleDayExpansion = (date: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4">
        <div className="rounded-[2rem] bg-white border border-slate-200 p-10 text-center shadow-lg">
          <Loader className="h-12 w-12 text-slate-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 px-4 py-10">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 mb-8"
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
    <div className="min-h-screen bg-slate-100 text-slate-900 px-4 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className={`flex h-20 w-20 items-center justify-center rounded-3xl text-3xl font-bold text-white shadow-lg ${
                user.is_active ? 'bg-gradient-to-br from-emerald-500 via-lime-500 to-emerald-600' : 'bg-slate-400'
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
              <span className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                user.is_active ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
              {user.is_admin && (
                <span className="rounded-full px-5 py-2.5 bg-sky-100 text-sky-700 border border-sky-200 text-sm font-semibold">
                  <Shield className="h-4 w-4 inline mr-1" />
                  Administrator
                </span>
              )}
            </div>
          </div>

          <div className="mt-10 grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500 mb-3 flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> Email</p>
              <p className="text-lg font-semibold text-slate-900 break-words">{user.email}</p>
            </div>
            {user.employee_id && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500 mb-3 flex items-center gap-2"><UserIcon className="h-4 w-4 text-slate-400" /> Employee ID</p>
                <p className="text-lg font-semibold text-slate-900">{user.employee_id}</p>
              </div>
            )}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500 mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /> Created</p>
              <p className="text-lg font-semibold text-slate-900">{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500 mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-slate-400" /> Last Updated</p>
              <p className="text-lg font-semibold text-slate-900">{new Date(user.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-3xl bg-slate-100 p-3 text-slate-700">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Photos</p>
                <h2 className="text-2xl font-semibold text-slate-900">{Object.values(photosByDay).flat().length} assets</h2>
              </div>
            </div>
          </div>

          {Object.keys(photosByDay).length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-lg">
              <ImageIcon className="mx-auto h-16 w-16 mb-4 text-slate-400" />
              <p className="text-lg font-semibold text-slate-900">No photos available</p>
              <p className="mt-2 text-sm text-slate-500">This profile does not have screenshot history yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(photosByDay).map(([date, photos]) => (
                <div key={date} className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleDayExpansion(date)}
                    className="w-full flex items-center justify-between gap-4 p-6 text-left hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-base font-semibold text-slate-900">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                        <p className="text-sm text-slate-500">{photos.length} screenshot{photos.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {expandedDays[date] ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
                  </button>
                  {expandedDays[date] && (
                    <div className="space-y-6 border-t border-slate-200 p-6">
                      {hoveredImage && (
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                          <img src={hoveredImage} alt="Preview" className="h-72 w-full rounded-3xl object-cover" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {photos.map((photo: any) => {
                          const imageUrl = photo.url || photo.photo_url;
                          const timeLabel = photo.timestamp || photo.modified_at;
                          return (
                            <div
                              key={photo.id || imageUrl}
                              onMouseEnter={() => setHoveredImage(imageUrl)}
                              onMouseLeave={() => setHoveredImage(null)}
                              className="group overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                            >
                              <div className="relative h-40 overflow-hidden bg-slate-100">
                                <img src={imageUrl} alt="Screenshot" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent opacity-0 transition group-hover:opacity-100" />
                                <div className="absolute bottom-3 left-3 right-3 opacity-0 transition group-hover:opacity-100">
                                  <div className="rounded-2xl bg-white/90 px-3 py-2 text-xs font-medium text-slate-900 backdrop-blur">
                                    Hover preview
                                  </div>
                                </div>
                              </div>
                              <div className="p-3 space-y-2">
                                <p className="text-sm font-semibold text-slate-900 truncate">{photo.source || 'Screenshot'}</p>
                                <p className="text-xs text-slate-500">{timeLabel ? new Date(timeLabel).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time'}</p>
                                <div className="flex items-center justify-between gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedImage(imageUrl)}
                                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadScreenshot(imageUrl)}
                                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="relative max-w-5xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt="Full screenshot"
                className="w-full h-full object-contain bg-slate-100"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 bg-slate-900 text-white p-3 rounded-full transition hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetails;
