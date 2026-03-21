import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, LogIn, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api';

export default function Register() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            await api.post('/auth/register', { email, password });
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || 'An error occurred during registration.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="page-enter" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '3rem', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(34, 197, 94, 0.15)', width: '80px', height: '80px', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <CheckCircle size={40} color="var(--success)" />
                    </div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Success!</h2>
                    <p className="text-subtitle">Registration complete. Taking you to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-enter" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ background: 'var(--accent-secondary)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 20px rgba(168, 85, 247, 0.3)' }}>
                        <UserPlus size={32} color="white" />
                    </div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Create Account</h2>
                    <p className="text-subtitle">Sign up to post and manage jobs</p>
                </div>

                {error && (
                    <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '10px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        <AlertCircle color="var(--danger)" size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-control" placeholder="your@email.com" required />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-control" placeholder="••••••••" required minLength={8} />
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="form-control" placeholder="••••••••" required minLength={8} />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: 'linear-gradient(135deg, var(--accent-secondary), #9333ea)', padding: '0.8rem', fontSize: '1rem', fontWeight: 'bold' }}>
                        {loading ? 'Processing...' : 'Register'}
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Already have an account? <Link to="/login" style={{ color: 'var(--accent-secondary)', textDecoration: 'none', fontWeight: 'bold' }}>Sign In</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
