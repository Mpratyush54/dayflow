import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { getEmployee, updateEmployee } from '../../api/employees';
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

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState<FormState | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;
    async function load() {
      try {
        const data = await getEmployee(userId);
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
  }, [user]);

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

  if (!user) {
    if (authLoading) {
      return <main className="profile-page"><p className="profile-page__status">Loading…</p></main>;
    }
    return (
      <main className="profile-page">
        <Card heading="Sign in required">
          <p className="profile-note">
            You need to sign in to view your profile.
          </p>
        </Card>
      </main>
    );
  }

  if (loading) {
    return <main className="profile-page"><p className="profile-page__status">Loading profile…</p></main>;
  }

  if (loadError || !profile) {
    return (
      <main className="profile-page">
        <p className="profile-page__status profile-page__status--error">
          {loadError || 'Profile not found'}
        </p>
      </main>
    );
  }

  const salary = profile.salary;

  return (
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
            {profile.documents && profile.documents.length > 0 ? (
              <ul className="document-list">
                {profile.documents.map((doc) => (
                  <li key={doc.id}>
                    <a href={doc.url} target="_blank" rel="noreferrer">
                      {doc.name}
                    </a>
                    <span className="document-list__date">{formatDate(doc.uploadedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="profile-note">No documents on file.</p>
            )}
          </Card>
        </div>
      )}
    </main>
  );
}
