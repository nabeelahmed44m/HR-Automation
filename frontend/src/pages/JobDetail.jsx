import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, DollarSign, Clock, ArrowLeft, Trash2, Calendar, Edit } from 'lucide-react';
import api from '../api';

export default function JobDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);

    useEffect(() => {
        fetchJob();
    }, [id]);

    const fetchJob = async () => {
        try {
            const { data } = await api.get(`/jobs/${id}`);
            setJob(data);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch job details');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this job posting?')) {
            setDeleting(true);
            try {
                await api.delete(`/jobs/${id}`);
                navigate('/');
            } catch (err) {
                console.error(err);
                alert('Failed to delete job');
                setDeleting(false);
            }
        }
    };

    const handleLinkedInPublish = async () => {
        setPublishLoading(true);
        try {
            await api.post(`/jobs/${id}/publish/linkedin`);
            alert('LinkedIn publish task initiated safely in the background! Refresh this page in a minute to check the status.');
            fetchJob();
        } catch (err) {
            console.error(err);
            alert('Failed to initiate publish task. Check credentials.');
        } finally {
            setPublishLoading(false);
        }
    };

    const getBadgeClass = (status) => {
        switch (status) {
            case 'published': return 'badge-published';
            case 'closed': return 'badge-closed';
            default: return 'badge-draft';
        }
    };

    if (loading) return <div className="loader"></div>;
    if (error || !job) return <div className="empty-state"><h3>Job Not Found</h3><Link to="/">Back Home</Link></div>;

    return (
        <div className="page-enter">
            <Link to="/" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', display: 'inline-flex', marginBottom: '2rem' }}>
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>

            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{job.title}</h1>
                        <div className="job-meta-list" style={{ marginTop: '1rem', fontSize: '1rem' }}>
                            <span className="job-meta-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.8rem', borderRadius: '15px' }}><MapPin size={18} color="var(--accent-primary)" /> {job.location}</span>
                            {job.salary_range && <span className="job-meta-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.8rem', borderRadius: '15px' }}><DollarSign size={18} color="var(--success)" /> {job.salary_range}</span>}
                            <span className="job-meta-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.8rem', borderRadius: '15px' }}><Clock size={18} color="var(--warning)" /> {job.job_type}</span>
                            <span className={`badge ${getBadgeClass(job.status)}`} style={{ padding: '0.5rem 1rem' }}>{job.status}</span>
                            {job.publish_status && (
                                <span className="job-meta-item" style={{ background: 'rgba(0, 119, 181, 0.15)', color: '#0077b5', padding: '0.3rem 0.8rem', borderRadius: '15px', fontWeight: 'bold' }}>
                                    LinkedIn: {job.publish_status}
                                </span>
                            )}
                        </div>
                        {job.tags && job.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                {job.tags.map(tag => (
                                    <span key={tag} style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', opacity: 0.8 }}>#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {!job.linkedin_url && (
                            <button
                                onClick={handleLinkedInPublish}
                                disabled={publishLoading || job.publish_status === 'pending' || job.status !== 'published'}
                                className="btn btn-primary"
                                style={{ background: 'linear-gradient(135deg, #0077b5, #005582)' }}
                                title={job.status !== 'published' ? 'Job must be published first' : ''}
                            >
                                {publishLoading ? 'Initiating...' : job.publish_status === 'pending' ? 'Publishing...' : 'Publish to LinkedIn'}
                            </button>
                        )}

                        {job.linkedin_url && (
                            <a href={job.linkedin_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ color: '#0077b5', borderColor: 'rgba(0, 119, 181, 0.3)' }}>
                                View on LinkedIn
                            </a>
                        )}

                        <Link to={`/job/${job.id}/edit`} className="btn btn-secondary" style={{ color: 'var(--accent-primary)', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
                            <Edit size={18} />
                            Edit Job
                        </Link>
                        <button onClick={handleDelete} disabled={deleting} className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                            <Trash2 size={18} />
                            {deleting ? 'Deleting...' : 'Delete Job'}
                        </button>
                    </div>
                </div>

                <div style={{ height: '1px', background: 'var(--glass-border)' }}></div>

                <div>
                    <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '1rem', fontSize: '1.2rem' }}>About the Role</h3>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '15px', color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                        {job.description}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                    <div>
                        <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '1rem', fontSize: '1.2rem' }}>Requirements</h3>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '15px', color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                            {job.requirements}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Experience Level</h4>
                            <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{job.experience_level}</p>
                        </div>

                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Date Posted / Last Updated</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: '500' }}>
                                <Calendar size={18} color="var(--accent-primary)" />
                                {new Date(job.updated_at).toLocaleDateString()}
                            </div>
                        </div>

                        {job.image_base64 && (
                            <div className="glass-panel" style={{ padding: '1rem' }}>
                                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Attachment Thumbnail</h4>
                                <img
                                    src={job.image_base64.startsWith('data:') ? job.image_base64 : (job.image_base64.startsWith('/9j/') ? `data:image/jpeg;base64,${job.image_base64}` : `data:image/png;base64,${job.image_base64}`)}
                                    alt="Job Attachment"
                                    style={{ width: '100%', borderRadius: '10px', height: '200px', objectFit: 'cover' }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
