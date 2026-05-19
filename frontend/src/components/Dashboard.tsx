import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User as UserIcon, Users, Search, Loader } from 'lucide-react';
import { userService } from '../services/api';
import type { User } from '../types/user';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleUserClick = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const handleDeleteUser = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.deleteUser(userId);
        loadUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert('Failed to delete user');
      }
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.employee_id && u.employee_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const administrators = filteredUsers.filter(u => u.is_admin);
  const regularUsers = filteredUsers.filter(u => !u.is_admin);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-300/30">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">CRM Dashboard</p>
                <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 rounded-3xl bg-slate-50 border border-slate-200 px-4 py-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-200">
                  <UserIcon className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{user?.full_name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr] mb-8">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Welcome back</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">Manage users, activity, and permissions in one place.</h2>
              <p className="mt-4 max-w-2xl text-slate-500">Quickly view user status and jump into individual profiles for updates or moderation.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-2 text-sm text-sky-700">24/7 Monitoring</span>
                <span className="inline-flex items-center rounded-full bg-violet-100 px-3 py-2 text-sm text-violet-700">Priority access</span>
                <span className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-2 text-sm text-cyan-700">Filtered view</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Total Users</p>
                <p className="mt-4 text-4xl font-semibold text-slate-900">{users.length}</p>
                <p className="mt-2 text-sm text-slate-500">All active and inactive accounts</p>
              </div>
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Administrators</p>
                <p className="mt-4 text-4xl font-semibold text-slate-900">{administrators.length}</p>
                <p className="mt-2 text-sm text-slate-500">Users with high-level access</p>
              </div>
            </div>
          </section>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm mb-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-3xl bg-slate-50 p-3 text-slate-700 shadow-sm">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Search</p>
                  <p className="text-lg font-semibold text-slate-900">Find users instantly</p>
                </div>
              </div>
              <div className="w-full lg:w-1/2">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, or employee ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 py-4 pl-14 pr-4 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="h-10 w-10 text-violet-400 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
              <Users className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <p className="text-lg font-semibold text-slate-900">No users found</p>
              <p className="mt-2 text-sm text-slate-500">Try a different search term or clear the filter.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {administrators.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3 text-sky-700 shadow-sm">
                        <UserIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Administrators</p>
                        <h2 className="text-2xl font-semibold text-slate-900">{administrators.length} team members</h2>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {administrators.map(u => (
                      <div
                        key={u.id}
                        onClick={() => handleUserClick(u.id)}
                        className="group cursor-pointer overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white shadow-[0_15px_40px_-20px_rgba(15,23,42,0.15)] ${
                            u.is_active ? 'bg-gradient-to-br from-sky-500 to-cyan-400' : 'bg-slate-400'
                          }`}>
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-lg font-semibold text-slate-900">{u.full_name}</p>
                          {u.employee_id && (
                            <p className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{u.employee_id}</p>
                          )}
                          <p className="mt-3 text-sm text-slate-500">{u.email}</p>
                          <div className="mt-5 flex w-full items-center justify-between gap-3 text-sm">
                            <span className={`rounded-full px-3 py-1 font-medium ${
                              u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              onClick={(e) => handleDeleteUser(u.id, e)}
                              className="rounded-2xl bg-slate-100 px-3 py-1 text-rose-600 transition hover:bg-rose-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {regularUsers.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3 text-violet-700 shadow-sm">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Regular Users</p>
                        <h2 className="text-2xl font-semibold text-slate-900">{regularUsers.length} profiles</h2>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {regularUsers.map(u => (
                      <div
                        key={u.id}
                        onClick={() => handleUserClick(u.id)}
                        className="group cursor-pointer overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white shadow-[0_15px_40px_-20px_rgba(15,23,42,0.15)] ${
                            u.is_active ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500' : 'bg-slate-400'
                          }`}>
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-lg font-semibold text-slate-900">{u.full_name}</p>
                          {u.employee_id && (
                            <p className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{u.employee_id}</p>
                          )}
                          <p className="mt-3 text-sm text-slate-500">{u.email}</p>
                          <div className="mt-5 flex w-full items-center justify-between gap-3 text-sm">
                            <span className={`rounded-full px-3 py-1 font-medium ${
                              u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              onClick={(e) => handleDeleteUser(u.id, e)}
                              className="rounded-2xl bg-slate-100 px-3 py-1 text-rose-600 transition hover:bg-rose-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>
  );
};

export default Dashboard;
