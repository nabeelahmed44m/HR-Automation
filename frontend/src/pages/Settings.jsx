import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Shield, Globe, Monitor, AlertCircle, CheckCircle, Smartphone, Lock, User as UserIcon, Cookie, Info } from 'lucide-react';
import api from '../api';

export default function Settings() {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [preferredPlatform, setPreferredPlatform] = useState('none');
    const [preferredDestination, setPreferredDestination] = useState('feed');
    const [linkedinCookie, setLinkedinCookie] = useState('');
    const [linkedinCookieExpired, setLinkedinCookieExpired] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [activeTab, setActiveTab] = useState('publishing');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data);
            setEmail(data.email);
            setPreferredPlatform(data.preferred_platform || 'none');
            setPreferredDestination(data.preferred_destination || 'feed');
            setLinkedinCookie(data.linkedin_cookie || '');
            setLinkedinCookieExpired(data.linkedin_cookie_expired || false);
        } catch (err) {
            console.error('Failed to fetch profile', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const updateData = {
                email,
                preferred_platform: preferredPlatform,
                preferred_destination: preferredDestination,
                linkedin_cookie: linkedinCookie
            };
            if (password) updateData.password = password;

            await api.put('/auth/me', updateData);
            setMessage({ type: 'success', text: 'Settings updated successfully!' });
            setPassword('');
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update settings.' });
        } finally {
            setSaving(false);
        }
    };

    const handleConnectLinkedIn = async () => {
        setIsConnecting(true);
        setMessage({ type: '', text: '' });
        try {
            const { data } = await api.post('/auth/linkedin/connect');
            setLinkedinCookie(data.linkedin_cookie || '');
            setLinkedinCookieExpired(false);
            setMessage({ type: 'success', text: 'LinkedIn correctly connected!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to connect LinkedIn. Try again.' });
        } finally {
            setIsConnecting(false);
        }
    };

    if (loading) return <div className="loading-state">Loading settings...</div>;

    return (
        <div className="page-enter">
            <header className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="btn-icon" style={{ background: 'var(--accent-gradient)' }}>
                        <SettingsIcon size={24} color="white" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '2rem', margin: 0 }}>Settings</h2>
                        <p className="text-subtitle">Manage your profile and platform preferences</p>
                    </div>
                </div>
            </header>

            {message.text && (
                <div style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                    color: message.type === 'success' ? 'var(--success)' : 'var(--danger)'
                }}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            <div style={{ display: 'flex', gap: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '2.5rem' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('publishing')}
                    style={{
                        background: 'none', border: 'none', padding: '0 0 1rem 0', cursor: 'pointer',
                        fontSize: '1rem', fontWeight: 600,
                        color: activeTab === 'publishing' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'publishing' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        transition: 'color 0.2s ease'
                    }}
                >
                    Publishing Preferences
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    style={{
                        background: 'none', border: 'none', padding: '0 0 1rem 0', cursor: 'pointer',
                        fontSize: '1rem', fontWeight: 600,
                        color: activeTab === 'profile' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'profile' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        transition: 'color 0.2s ease'
                    }}
                >
                    Edit Profile
                </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '3rem', maxWidth: '800px' }}>
                {/* Profile Section */}
                {activeTab === 'profile' && (
                    <div style={{ paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <Shield size={20} color="var(--text-secondary)" />
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Security & Profile</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
                            <div className="form-group">
                                <label style={{ color: 'var(--text-secondary)' }}>Email Address</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-control" required />
                            </div>

                            <div className="form-group">
                                <label style={{ color: 'var(--text-secondary)' }}>New Password (leave blank to keep current)</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-control" placeholder="••••••••" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Automation Section */}
                {activeTab === 'publishing' && (
                    <div style={{ paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <Globe size={20} color="var(--text-secondary)" />
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Publishing Preferences</h3>
                        </div>

                        <div className="form-group" style={{ maxWidth: '500px', marginBottom: '2rem' }}>
                            <label style={{ marginBottom: '1rem', display: 'block', color: 'var(--text-secondary)' }}>Primary Search Platform</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label className={`form-control ${preferredPlatform === 'none' ? 'active' : ''}`} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: preferredPlatform === 'none' ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                                    <input type="radio" name="platform" value="none" checked={preferredPlatform === 'none'} onChange={(e) => setPreferredPlatform(e.target.value)} style={{ display: 'none' }} />
                                    <Monitor size={18} /> None
                                </label>
                                <label className={`form-control ${preferredPlatform === 'linkedin' ? 'active' : ''}`} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: preferredPlatform === 'linkedin' ? 'rgba(6, 182, 212, 0.1)' : 'transparent', border: preferredPlatform === 'linkedin' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)' }}>
                                    <input type="radio" name="platform" value="linkedin" checked={preferredPlatform === 'linkedin'} onChange={(e) => setPreferredPlatform(e.target.value)} style={{ display: 'none' }} />
                                    <Smartphone size={18} /> LinkedIn
                                </label>
                            </div>
                        </div>

                        {preferredPlatform === 'linkedin' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '2rem',
                                    flexWrap: 'wrap',
                                    padding: '1.5rem',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ flex: '1 1 300px' }}>
                                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>LinkedIn Integration</h4>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                                            Connect your LinkedIn profile to start publishing job posts automatically. This uses a secure session bridge without storing your password.
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                        {!linkedinCookie || linkedinCookieExpired ? (
                                            <>
                                                {linkedinCookieExpired && (
                                                    <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <AlertCircle size={14} />
                                                        Session Expired
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={handleConnectLinkedIn}
                                                    disabled={isConnecting}
                                                    className="btn btn-secondary"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.6rem 1rem',
                                                        fontSize: '0.9rem',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    <Globe size={16} />
                                                    {isConnecting ? 'Waiting for Login...' : (linkedinCookieExpired ? 'Reconnect LinkedIn' : 'Connect LinkedIn')}
                                                </button>
                                            </>
                                        ) : (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                color: 'var(--success)',
                                                fontSize: '0.85rem',
                                                padding: '0.6rem 1rem',
                                                background: 'rgba(34, 197, 94, 0.1)',
                                                borderRadius: '6px',
                                                border: '1px solid rgba(34, 197, 94, 0.2)'
                                            }}>
                                                <CheckCircle size={16} />
                                                <span>Connected securely</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ maxWidth: '500px' }}>
                                    <label style={{ marginBottom: '1rem', display: 'block', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Destination</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                                            <input type="radio" name="destination" value="feed" checked={preferredDestination === 'feed'} onChange={(e) => setPreferredDestination(e.target.value)} />
                                            <span style={{ color: 'var(--text-primary)' }}>Feed (Default)</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', opacity: 0.6 }}>
                                            <input type="radio" name="destination" value="job_page" checked={preferredDestination === 'job_page'} onChange={(e) => setPreferredDestination(e.target.value)} disabled />
                                            <span>Company Job Page (Incoming Feature)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.5rem' }}>
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
