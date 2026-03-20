import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, AlertCircle } from 'lucide-react';
import api from '../api';

export default function CreateJob() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        requirements: '',
        experience_level: '',
        location: '',
        salary_range: '',
        job_type: 'Full-time',
        status: 'draft'
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/jobs', formData);
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail?.[0]?.msg || 'Failed to create job');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-enter" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2>Create New Job Post</h2>
                <p className="text-subtitle">Fill in the details to publish a new position</p>
            </div>

            <div className="glass-panel">
                {error && (
                    <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '10px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <AlertCircle color="var(--danger)" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Job Title</label>
                            <input type="text" name="title" className="form-control" value={formData.title} onChange={handleChange} placeholder="e.g. Senior Frontend Engineer" required minLength={3} />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Job Description</label>
                            <textarea name="description" className="form-control" value={formData.description} onChange={handleChange} placeholder="Describe the role..." required minLength={10}></textarea>
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Requirements</label>
                            <textarea name="requirements" className="form-control" value={formData.requirements} onChange={handleChange} placeholder="Key skills and qualifications..." required minLength={10}></textarea>
                        </div>

                        <div className="form-group">
                            <label>Location</label>
                            <input type="text" name="location" className="form-control" value={formData.location} onChange={handleChange} placeholder="Remote, New York, etc." required />
                        </div>

                        <div className="form-group">
                            <label>Experience Level</label>
                            <input type="text" name="experience_level" className="form-control" value={formData.experience_level} onChange={handleChange} placeholder="e.g. 3-5 Years" required />
                        </div>

                        <div className="form-group">
                            <label>Salary Range (Optional)</label>
                            <input type="text" name="salary_range" className="form-control" value={formData.salary_range} onChange={handleChange} placeholder="e.g. $120k - $150k" />
                        </div>

                        <div className="form-group">
                            <label>Job Type</label>
                            <select name="job_type" className="form-control" value={formData.job_type} onChange={handleChange} required>
                                <option value="Full-time">Full-time</option>
                                <option value="Part-time">Part-time</option>
                                <option value="Contract">Contract</option>
                                <option value="Freelance">Freelance</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Status</label>
                            <select name="status" className="form-control" value={formData.status} onChange={handleChange} required>
                                <option value="draft">Draft (Private)</option>
                                <option value="published">Published (Public)</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            <Save size={18} />
                            {loading ? 'Creating...' : 'Save Job Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
