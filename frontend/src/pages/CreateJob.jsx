import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, AlertCircle, Settings as SettingsIcon } from 'lucide-react';
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
        status: 'draft',
        publish_destination: 'feed',
        tags: '',
        image_url: '',
        skill_weight: 40,
        experience_weight: 30,
        education_weight: 10,
        keyword_weight: 20,
        shortlist_threshold: 70,
        review_threshold: 50
    });

    useEffect(() => {
        fetchProfileDefaults();
    }, []);

    const fetchProfileDefaults = async () => {
        try {
            const { data } = await api.get('/auth/me');
            if (data.preferred_platform === 'none') {
                setFormData(prev => ({ ...prev, publish_destination: 'none' }));
            } else {
                setFormData(prev => ({ ...prev, publish_destination: data.preferred_destination }));
            }
        } catch (err) {
            console.error('Failed to fetch profile defaults', err);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                ...formData,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
            };

            // If they chose 'none', we don't send it to the backend as it might not be in the Enum or we treat it as no-op
            if (payload.publish_destination === 'none') {
                // You might choose to send null or handle it backend side. 
                // For now, let's just let it pass if the backend supports null.
                payload.publish_destination = null;
            }

            await api.post('/jobs', payload);
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

                        <div className="form-group">
                            <label>Publish To LinkedIn</label>
                            <select name="publish_destination" className="form-control" value={formData.publish_destination || 'none'} onChange={handleChange} required>
                                <option value="none">Do not publish</option>
                                <option value="feed">LinkedIn Feed (Instant)</option>
                                <option value="job_page">Job Page (Incoming...)</option>
                                <option value="both">Both (Incoming...)</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Banner Image URL (LinkedIn Attachment)</label>
                            <input type="url" name="image_url" className="form-control" value={formData.image_url} onChange={handleChange} placeholder="https://example.com/banner.png" />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Tags (Comma separated)</label>
                            <input type="text" name="tags" className="form-control" value={formData.tags} onChange={handleChange} placeholder="Python, Backend, Remote" />
                        </div>

                        {/* --- ATS SCORING CONFIGURATION --- */}
                        <div style={{ gridColumn: 'span 2', marginTop: '2.5rem', marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '15px', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <SettingsIcon size={18} /> ATS Resume Scoring Engine (NLP Calibration)
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Configure how the AI should rank incoming resumes based on the job description.</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Skill Weight (%)</label>
                                    <input type="number" name="skill_weight" className="form-control" value={formData.skill_weight} onChange={handleChange} min={0} max={100} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Exp Weight (%)</label>
                                    <input type="number" name="experience_weight" className="form-control" value={formData.experience_weight} onChange={handleChange} min={0} max={100} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Edu Weight (%)</label>
                                    <input type="number" name="education_weight" className="form-control" value={formData.education_weight} onChange={handleChange} min={0} max={100} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Keyword Density (%)</label>
                                    <input type="number" name="keyword_weight" className="form-control" value={formData.keyword_weight} onChange={handleChange} min={0} max={100} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Shortlist Threshold (Scale 0-100)</label>
                                    <input type="number" name="shortlist_threshold" className="form-control" value={formData.shortlist_threshold} onChange={handleChange} min={0} max={100} placeholder="e.g. 70" />
                                    <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Scores above this will be Auto-Shortlisted</span>
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Review Threshold (Scale 0-100)</label>
                                    <input type="number" name="review_threshold" className="form-control" value={formData.review_threshold} onChange={handleChange} min={0} max={100} placeholder="e.g. 50" />
                                    <span style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>Scores below this will be Rejected</span>
                                </div>
                            </div>
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
