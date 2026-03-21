import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../api';

export default function EditJob() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        requirements: '',
        experience_level: '',
        location: '',
        salary_range: '',
        job_type: '',
        status: '',
        publish_destination: 'feed',
        tags: '',
        image_url: ''
    });

    useEffect(() => {
        fetchJob();
    }, [id]);

    const fetchJob = async () => {
        try {
            const { data } = await api.get(`/jobs/${id}`);
            setFormData({
                title: data.title,
                description: data.description,
                requirements: data.requirements,
                experience_level: data.experience_level,
                location: data.location,
                salary_range: data.salary_range || '',
                job_type: data.job_type,
                status: data.status,
                publish_destination: data.publish_destination || 'feed',
                tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
                image_url: data.image_url || ''
            });
        } catch (err) {
            console.error(err);
            setError('Failed to fetch job details');
        } finally {
            setPageLoading(false);
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
                tags: typeof formData.tags === 'string' ? formData.tags.split(',').map(t => t.trim()) : (Array.isArray(formData.tags) ? formData.tags : [])
            };

            if (payload.publish_destination === 'none') {
                payload.publish_destination = null;
            }

            await api.put(`/jobs/${id}`, payload);
            navigate(`/job/${id}`);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail?.[0]?.msg || 'Failed to update job');
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) return <div className="loader"></div>;

    return (
        <div className="page-enter" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Link to={`/job/${id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', display: 'inline-flex', marginBottom: '2rem' }}>
                <ArrowLeft size={16} /> Cancel Editing
            </Link>
            <div style={{ marginBottom: '2rem' }}>
                <h2>Edit Job Post</h2>
                <p className="text-subtitle">Update the details for this position</p>
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
                            <input type="text" name="title" className="form-control" value={formData.title} onChange={handleChange} required minLength={3} />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Job Description</label>
                            <textarea name="description" className="form-control" value={formData.description} onChange={handleChange} required minLength={10}></textarea>
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Requirements</label>
                            <textarea name="requirements" className="form-control" value={formData.requirements} onChange={handleChange} required minLength={10}></textarea>
                        </div>

                        <div className="form-group">
                            <label>Location</label>
                            <input type="text" name="location" className="form-control" value={formData.location} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>Experience Level</label>
                            <input type="text" name="experience_level" className="form-control" value={formData.experience_level} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>Salary Range (Optional)</label>
                            <input type="text" name="salary_range" className="form-control" value={formData.salary_range} onChange={handleChange} />
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
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
