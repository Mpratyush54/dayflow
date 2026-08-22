import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { SkeletonCard, SkeletonLine, SkeletonTitle, SkeletonAvatar } from '../../components/common/Skeleton';
import { getEmployee, updateEmployee, uploadDocument, deleteDocument } from '../../api/employees';
import type { EmployeePatch } from '../../api/employees';
import type { EmployeeProfile } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import './Profile.css';

const MAX_IMAGE_BYTES = 1024 * 1024;

const PHONE_RE = /^\+?[0-9]{10,15}$/;

function normalizePhone(value: string) {
  return value.replace(/[\s\-()]/g, '');
}

function isValidPhone(value: string) {
  if (!value.trim()) return true; // optional
  return PHONE_RE.test(normalizePhone(value));
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

function initials(name?: string, email?: string) {
  const source = name?.trim() || email || '?';
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function toDateInputValue(value?: string) {
  return value ? value.slice(0, 10) : '';
}

function money(amount: number | undefined, currency = 'INR') {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  if (amount === undefined) return '—';
  return `${symbol}${amount.toLocaleString()}`;
}

interface FormState {
  phone: string;
  address: string;
  profilePicture: string;
  name: string;
  designation: string;
  department: string;
  workLocation: string;
  dateOfBirth: string;
  dateOfJoining: string;
}

function toFormState(profile: EmployeeProfile): FormState {
  return {
    phone: profile.phone ?? '',
    address: profile.address ?? '',
    profilePicture: profile.profilePicture ?? '',
    name: profile.name ?? '',
    designation: profile.designation ?? '',
    department: profile.department ?? '',
    workLocation: profile.workLocation ?? '',
    dateOfBirth: toDateInputValue(profile.dateOfBirth),
    dateOfJoining: toDateInputValue(profile.dateOfJoining),
  };
}

function ProfileSkeleton() {
  return (
    <>
      <div className="skeleton-profile-header">
        <SkeletonAvatar size={72} />
        <div style={{ flex: 1 }}>
          <SkeletonTitle width="35%" />
          <SkeletonLine width="22%" style={{ marginTop: 8 }} />
          <SkeletonLine width="18%" style={{ marginTop: 6 }} />
        </div>
      </div>
      <div className="skeleton-grid-2">
        <SkeletonCard>
          <SkeletonTitle width="50%" />
          <SkeletonLine width="85%" style={{ marginTop: 16 }} />
          <SkeletonLine width="70%" style={{ marginTop: 10 }} />
          <SkeletonLine width="78%" style={{ marginTop: 10 }} />
          <SkeletonLine width="55%" style={{ marginTop: 10 }} />
        </SkeletonCard>
        <SkeletonCard>
          <SkeletonTitle width="45%" />
          <SkeletonLine width="80%" style={{ marginTop: 16 }} />
          <SkeletonLine width="65%" style={{ marginTop: 10 }} />
          <SkeletonLine width="72%" style={{ marginTop: 10 }} />
        </SkeletonCard>
      </div>
      <div className="skeleton-grid-2">
        <SkeletonCard>
          <SkeletonTitle width="40%" />
          <SkeletonLine width="90%" style={{ marginTop: 16 }} />
          <SkeletonLine width="75%" style={{ marginTop: 10 }} />
        </SkeletonCard>
        <SkeletonCard>
          <SkeletonTitle width="55%" />
          <SkeletonLine width="60%" style={{ marginTop: 16 }} />
          <SkeletonLine width="80%" style={{ marginTop: 10 }} />
          <SkeletonLine width="45%" style={{ marginTop: 10 }} />
        </SkeletonCard>
      </div>
    </>
  );
}

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState('');

  const isStaff = user?.role === 'ADMIN' || user?.role === 'HR';
  const isAdmin = isStaff;
  const paramId = searchParams.get('id');
  const targetId = isStaff && paramId ? paramId : user?.id;

  useEffect(() => {
    const idToLoad = targetId;
    if (!idToLoad) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getEmployee(idToLoad as string);
        if (!cancelled) {
          setProfile(data);
          setLoadError('');
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load profile');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [targetId]);

  function startEditing() {
    setSaveError('');
    setForm(toFormState(profile!));
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setSaveError('');
  }

  function set<K extends keyof FormState>(key: K) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => (prev ? { ...prev, [key]: e.target.value } : prev));
  }

  function handlePictureChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !form) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setSaveError('Profile picture must be under 1 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setForm((prev) => (prev ? { ...prev, profilePicture: String(reader.result) } : prev));
    reader.readAsDataURL(file);
  }

  async function handleDocUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !docFile) {
      setDocError('Select a file (PDF/JPG/PNG, ≤5MB)');
      return;
    }
    if (docFile.size > 5 * 1024 * 1024) {
      setDocError('File must be ≤5MB');
      return;
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(docFile.type)) {
      setDocError('Only PDF, JPG, PNG allowed');
      return;
    }
    setDocUploading(true);
    setDocError('');
    try {
      await uploadDocument(profile.id, docFile, docName.trim() || docFile.name);
      const updated = await getEmployee(profile.id);
      setProfile(updated);
      setDocFile(null);
      setDocName('');
      // reset file input value
      const input = document.getElementById('doc-file-input') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setDocUploading(false);
    }
  }

  async function handleDocDelete(docId: string) {
    if (!profile) return;
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDocument(profile.id, docId);
      const updated = await getEmployee(profile.id);
      setProfile(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !form) return;

    if (!isValidPhone(form.phone)) {
      setSaveError('Phone must be 10–15 digits, optional leading + (e.g. +919876543210)');
      return;
    }

    // Employees may only change these three fields (SRS 3.3.2); admins may also
    // edit the job-detail fields below.
    const normalizedPhone = form.phone.trim() ? normalizePhone(form.phone) : '';
    const patch: EmployeePatch = {
      phone: normalizedPhone,
      address: form.address,
      profilePicture: form.profilePicture,
    };
    if (isAdmin) {
      patch.name = form.name;
      patch.designation = form.designation;
      patch.department = form.department;
      patch.workLocation = form.workLocation;
      patch.dateOfBirth = form.dateOfBirth || undefined;
      patch.dateOfJoining = form.dateOfJoining || undefined;
    }

    setSaving(true);
    setSaveError('');
    try {
      const updated = await updateEmployee(profile.id, patch);
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  const items = isAdmin
    ? [
        { to: '/admin', label: 'Overview', icon: '◧', end: true },
        { to: '/admin/employees', label: 'Employees', icon: '👥' },
        { to: '/admin/attendance', label: 'Attendance', icon: '🗓' },
        { to: '/admin/approvals', label: 'Approvals', icon: '✓' },
        { to: '/admin/payroll', label: 'Payroll', icon: '💵' },
        { to: '/admin/reports', label: 'Reports', icon: '📊' },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: '◧', end: true },
        { to: '/profile', label: 'Profile', icon: '👤' },
        { to: '/attendance', label: 'Attendance', icon: '🗓' },
        { to: '/leaves', label: 'Leave', icon: '🌴' },
        { to: '/payslip', label: 'Payslip', icon: '💵' },
      ];

  const commands = isAdmin
    ? [
        { label: 'Overview', hint: 'page', to: '/admin' },
        { label: 'Employees', hint: 'page', to: '/admin/employees' },
        { label: 'Attendance', hint: 'page', to: '/admin/attendance' },
        { label: 'Leave approvals', hint: 'page', to: '/admin/approvals' },
        { label: 'Payroll', hint: 'page', to: '/admin/payroll' },
        { label: 'Reports & analytics', hint: 'page', to: '/admin/reports' },
      ]
    : [
        { label: 'Dashboard', hint: 'page', to: '/dashboard' },
        { label: 'My profile', hint: 'page', to: '/profile' },
        { label: 'Attendance', hint: 'page', to: '/attendance' },
        { label: 'Apply for leave', hint: 'action', to: '/leaves' },
        { label: 'View payslip', hint: 'action', to: '/payslip' },
      ];

  const sidebarUser = {
    name: user?.name?.trim() || user?.email || 'User',
    role: user?.role || 'Employee',
    initials: initials(user?.name, user?.email),
  };

  if (!user) {
    if (authLoading) {
      return (
        <Sidebar user={sidebarUser} items={items} commands={commands}>
          <div className="container page">
            <main className="profile-page"><ProfileSkeleton /></main>
          </div>
        </Sidebar>
      );
    }
    return (
      <Sidebar user={sidebarUser} items={items} commands={commands}>
        <div className="container page">
          <main className="profile-page">
            <Card heading="Sign in required">
              <p className="profile-note">
                You need to sign in to view your profile.
              </p>
            </Card>
          </main>
        </div>
      </Sidebar>
    );
  }

  if (loading) {
    return (
      <Sidebar user={sidebarUser} items={items} commands={commands}>
        <div className="container page">
          <main className="profile-page"><ProfileSkeleton /></main>
        </div>
      </Sidebar>
    );
  }

  if (loadError || !profile) {
    return (
      <Sidebar user={sidebarUser} items={items} commands={commands}>
        <div className="container page">
          <main className="profile-page">
            <p className="profile-page__status profile-page__status--error">
              {loadError || 'Profile not found'}
            </p>
          </main>
        </div>
      </Sidebar>
    );
  }

  const salary = profile.salary;

  return (
    <Sidebar user={sidebarUser} items={items} commands={commands}>
      <div className="container page">
        <div className="orb page__orb" aria-hidden />
        <main className="profile-page">
          <Card className="profile-hero">
        <div className="profile-hero__avatar" aria-hidden>
          {profile.profilePicture ? (
            <img src={profile.profilePicture} alt="" loading="lazy" />
          ) : (
            initials(profile.name, profile.email)
          )}
        </div>
        <div className="profile-hero__meta">
          <h1 className="profile-hero__name">{profile.name || 'Unnamed employee'}</h1>
          <p className="profile-hero__sub">
            {profile.employeeId} · {profile.email}
          </p>
          <div className="profile-hero__badges">
            <Badge>{profile.role}</Badge>
            <Badge tone={profile.status === 'ACTIVE' ? 'success' : 'neutral'}>
              {(profile.status ?? 'ACTIVE').replace('_', ' ')}
            </Badge>
          </div>
        </div>
        {!editing && (
          <Button variant="outline" onClick={startEditing}>
            Edit profile
          </Button>
        )}
      </Card>

      {editing && form ? (
        <Card heading={isAdmin ? 'Edit employee' : 'Edit profile'}>
          <form onSubmit={handleSave}>
            <div className="profile-picture-row">
              <div className="profile-hero__avatar profile-hero__avatar--sm" aria-hidden>
                {form.profilePicture ? (
                  <img src={form.profilePicture} alt="" loading="lazy" />
                ) : (
                  initials(form.name || profile.name, profile.email)
                )}
              </div>
              <label className="btn btn--outline profile-picture-upload">
                Choose picture
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePictureChange}
                  hidden
                />
              </label>
              {form.profilePicture && (
                <Button variant="text" type="button" onClick={() => setForm({ ...form, profilePicture: '' })}>
                  Remove
                </Button>
              )}
            </div>

            <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+91 …" aria-invalid={form.phone ? !isValidPhone(form.phone) : undefined} />
            {form.phone.trim() && !isValidPhone(form.phone) && (
              <p className="form-error" style={{ marginTop: '-8px', marginBottom: '12px' }}>
                Invalid phone — use 10–15 digits, optional leading + (e.g. +919876543210)
              </p>
            )}
            <Input label="Address" value={form.address} onChange={set('address')} />

            {isAdmin && (
              <>
                <Input label="Full name" value={form.name} onChange={set('name')} />
                <Input label="Designation" value={form.designation} onChange={set('designation')} />
                <Input label="Department" value={form.department} onChange={set('department')} />
                <Input label="Work location" value={form.workLocation} onChange={set('workLocation')} />
                <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
                <Input label="Date of joining" type="date" value={form.dateOfJoining} onChange={set('dateOfJoining')} />
              </>
            )}

            {saveError && <p className="form-error">{saveError}</p>}
            <div className="profile-form-actions">
              <Button type="submit" disabled={saving || (!!form.phone.trim() && !isValidPhone(form.phone))}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
              <Button variant="text" type="button" onClick={cancelEditing} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="profile-grid">
          <Card heading="Personal details">
            <dl className="detail-list">
              <div className="detail-list__row">
                <dt>Email</dt>
                <dd>{profile.email}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Phone</dt>
                <dd>{profile.phone || '—'}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Address</dt>
                <dd>{profile.address || '—'}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Date of birth</dt>
                <dd>{formatDate(profile.dateOfBirth)}</dd>
              </div>
            </dl>
          </Card>

          <Card heading="Job details">
            <dl className="detail-list">
              <div className="detail-list__row">
                <dt>Designation</dt>
                <dd>{profile.designation || '—'}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Department</dt>
                <dd>{profile.department || '—'}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Employment</dt>
                <dd>{(profile.employmentType ?? 'FULL_TIME').replace('_', ' ')}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Date of joining</dt>
                <dd>{formatDate(profile.dateOfJoining)}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Work location</dt>
                <dd>{profile.workLocation || '—'}</dd>
              </div>
            </dl>
          </Card>

          <Card heading="Salary structure">
            <dl className="detail-list">
              <div className="detail-list__row">
                <dt>Basic salary</dt>
                <dd>{money(salary?.basicSalary, salary?.currency)}</dd>
              </div>
              {Object.entries(salary?.allowances ?? {}).map(([key, value]) => (
                <div className="detail-list__row" key={`a-${key}`}>
                  <dt>{key.replace(/_/g, ' ')}</dt>
                  <dd>+{money(value, salary?.currency)}</dd>
                </div>
              ))}
              {Object.entries(salary?.deductions ?? {}).map(([key, value]) => (
                <div className="detail-list__row" key={`d-${key}`}>
                  <dt>{key.replace(/_/g, ' ')}</dt>
                  <dd>−{money(value, salary?.currency)}</dd>
                </div>
              ))}
            </dl>
            <p className="profile-note">Read-only. Contact HR for corrections.</p>
          </Card>

          <Card heading="Documents">
            {(() => {
              const realDocs = (profile.documents ?? []).filter((d) => !/example\.(org|com)/i.test(d.url));
              return realDocs.length > 0 ? (
                <ul className="document-list">
                  {realDocs.map((doc) => (
                    <li key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                      <span>
                        <a href={doc.url} target="_blank" rel="noreferrer">
                          {doc.name}
                        </a>
                        <span className="document-list__date" style={{ marginLeft: 8 }}>{formatDate(doc.uploadedAt)}</span>
                      </span>
                      <span style={{ display: 'inline-flex', gap: 8 }}>
                        <a href={doc.url} target="_blank" rel="noreferrer" className="btn btn--outline" style={{ padding: '4px 10px', fontSize: 12 }}>
                          View
                        </a>
                        <a href={doc.url} download={doc.name} className="btn btn--outline" style={{ padding: '4px 10px', fontSize: 12 }}>
                          Download
                        </a>
                        <Button variant="text" onClick={() => void handleDocDelete(doc.id)} style={{ fontSize: 12 }}>
                          Delete
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="profile-note">No documents on file. Uploaded ID proofs and offer letters will appear here (PDF/JPG/PNG, ≤5MB).</p>
              );
            })()}
            <form onSubmit={handleDocUpload} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--color-hairline-soft)', paddingTop: 12 }}>
              <span className="field__label" style={{ fontWeight: 600, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--color-muted)' }}>Upload ID proof / PDF</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  className="input"
                  placeholder="Document name (e.g. Aadhaar)"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  style={{ flex: '1 1 160px' }}
                />
                <input
                  id="doc-file-input"
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/jpg"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                  className="input"
                  style={{ flex: '1 1 180px' }}
                />
                <Button type="submit" disabled={docUploading || !docFile}>
                  {docUploading ? 'Uploading…' : 'Upload'}
                </Button>
              </div>
              <span className="dash-sub">PDF, JPG, PNG ≤5MB — preview and download after upload. URLs served via /uploads and proxied in dev.</span>
              {docError && <p className="form-error">{docError}</p>}
            </form>
          </Card>
        </div>
      )}
        </main>
      </div>
    </Sidebar>
  );
}
