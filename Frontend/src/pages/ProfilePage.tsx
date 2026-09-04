import { useState } from 'react';
import { Shield, UserPlus, Trash2, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../data/useApi';
import { fetchUsers, createUser, updateUser, deleteUser } from '../data/api';
import type { DashboardUser } from '../data/api';

export default function ProfilePage() {
  const { user: currentUser } = useAuth();
  const { data: users, loading, error, refetch } = useApi<DashboardUser[]>(() => fetchUsers(), []);

  // Add User Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setFormError('Name and Email are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createUser({ name: newName, email: newEmail, role: newRole });
      setNewName('');
      setNewEmail('');
      setNewRole('viewer');
      setShowAddForm(false);
      refetch();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: DashboardUser) => {
    try {
      await updateUser(user.id, { is_active: !user.is_active });
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to remove this user from dashboard access?')) return;
    try {
      await deleteUser(id);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-[18px] font-bold" style={{ color: 'var(--text-1)' }}>Admin & Access Management</h2>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
          Manage user profiles, platform roles, and dashboard authorizations
        </p>
      </div>

      {/* Section 1: Your Profile */}
      <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl shrink-0">
            {currentUser?.email ? currentUser.email.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-bold" style={{ color: 'var(--text-1)' }}>
                {currentUser?.email ? currentUser.email.split('@')[0] : 'Admin'}
              </h3>
              <span className="badge badge-success text-[10px]">Active Session</span>
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-2)' }}>
              {currentUser?.email || 'admin@mcl.gov.in'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-medium">
                Role: {currentUser?.role ? currentUser.role.toUpperCase() : 'ADMIN'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-medium">
                Access Level: Full Access
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl flex items-center gap-3 text-[11px]" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
          <Shield size={20} className="text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-1)' }}>Pre-SASCI Security Infrastructure</p>
            <p style={{ color: 'var(--text-3)' }}>JWT Auth readiness enabled for future SSO integration</p>
          </div>
        </div>
      </div>

      {/* Section 2: Dashboard Access Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4"
             style={{ borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
          <div>
            <h3 className="text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>Authorized Dashboard Users</h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
              Whitelist of team members allowed to access internal EPMS analytics
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-semibold transition-all shrink-0"
          >
            <UserPlus size={14} /> Add User
          </button>
        </div>

        {/* Add User Form Drawer/Box */}
        {showAddForm && (
          <form onSubmit={handleCreateUser} className="p-5 border-b space-y-4 animate-slide-down" style={{ borderColor: 'var(--glass-border)', background: 'var(--glass-bg)' }}>
            <h4 className="text-[13px] font-bold text-blue-400">Add New Dashboard User</h4>
            {formError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">
                <AlertCircle size={14} /> {formError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Executive Engineer"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="input-dark w-full text-[12px] py-1.5"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. officer@mcl.gov.in"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="input-dark w-full text-[12px] py-1.5"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400 block mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="input-dark w-full text-[12px] py-1.5"
                >
                  <option value="viewer">Viewer (Read Only)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-[11px] text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : 'Save User'}
              </button>
            </div>
          </form>
        )}

        {/* User Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-2 text-gray-400">
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <span className="text-[12px]">Loading user directory...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-400 text-[12px]">
              Failed to load users: {error}
            </div>
          ) : (
            <table className="w-full" style={{ minWidth: 700 }}>
              <thead className="tbl-head">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="tbl-body">
                {(users || []).map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-500/20 flex items-center justify-center text-[10px] font-bold text-gray-300">
                          {u.name ? u.name.slice(0, 2).toUpperCase() : 'US'}
                        </div>
                        <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>{u.email}</td>
                    <td>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                        u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 size={13} /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                          <XCircle size={13} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="px-2 py-1 rounded text-[10px] font-medium border border-gray-700 hover:bg-white/10 transition-colors text-gray-300"
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(users || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400 text-[12px]">
                      No dashboard users found. Click "Add User" to grant access.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
