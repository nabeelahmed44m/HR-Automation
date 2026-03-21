import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, DollarSign, Clock, ArrowLeft, Trash2, Calendar, Edit, Globe, Info, Shield, MessageSquare, RefreshCw } from 'lucide-react';
import api from '../api';

export default function JobDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);
    const [scrapeLoading, setScrapeLoading] = useState(false);

    useEffect(() => {
        fetchJob();
    }, [id]);

    const fetchJob = async () => {
        try {
            const { data } = await api.get(`/jobs/${id}`);
            setJob(data);
            if (data.linkedin_url) {
                fetchComments();
            }
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

    const fetchComments = async () => {
        setScrapeLoading(true);
        try {
            const res = await api.get(`/jobs/${id}/comments`);
            setComments(res.data);
        } catch (err) {
            console.error('Failed to automatically fetch live comments', err);
        } finally {
            setScrapeLoading(false);
        }
    };

    const handleScrapeComments = async () => {
        await fetchComments();
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
        <div className="page-enter" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Link to="/" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', display: 'inline-flex', marginBottom: '1.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>

            {/* Hero Header Block */}
            <div style={{
                position: 'relative',
                padding: '3rem',
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                borderRadius: '24px',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                marginBottom: '2rem',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
                <div style={{
                    position: 'absolute', top: '-50%', left: '-10%', width: '60%', height: '200%',
                    background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
                    pointerEvents: 'none', zIndex: 0
                }}></div>

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
                    <div style={{ flex: '1 1 500px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <span className={`badge ${getBadgeClass(job.status)}`} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                • {job.status}
                            </span>
                            {job.publish_status && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0, 119, 181, 0.15)', color: '#4facfe', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                                    <Globe size={14} /> LinkedIn: {job.publish_status}
                                </span>
                            )}
                        </div>

                        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: '1.2' }}>
                            {job.title}
                        </h1>

                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <MapPin size={18} color="var(--accent-primary)" /> {job.location}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={18} color="var(--warning)" /> {job.job_type}
                            </div>
                            {job.salary_range && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <DollarSign size={18} color="var(--success)" /> {job.salary_range}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', minWidth: '220px' }}>
                        {!job.linkedin_url && (
                            <button
                                onClick={handleLinkedInPublish}
                                disabled={publishLoading || job.publish_status === 'pending' || job.status !== 'published'}
                                className="btn btn-primary"
                                style={{
                                    background: 'linear-gradient(135deg, #0077b5, #005582)',
                                    boxShadow: '0 8px 25px rgba(0, 119, 181, 0.3)',
                                    padding: '1rem',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    fontSize: '1rem'
                                }}
                                title={job.status !== 'published' ? 'Job must be marked published internally first' : ''}
                            >
                                {publishLoading ? 'Initiating...' : job.publish_status === 'pending' ? 'Publishing...' : 'Deploy to LinkedIn'}
                            </button>
                        )}

                        {job.linkedin_url && (
                            <a href={job.linkedin_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: 'flex', justifyContent: 'center', color: '#4facfe', borderColor: 'rgba(0, 119, 181, 0.3)', background: 'rgba(0, 119, 181, 0.05)' }}>
                                <Globe size={18} /> View Live on LinkedIn
                            </a>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Link to={`/job/${job.id}/edit`} className="btn btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)' }}>
                                <Edit size={16} /> Edit
                            </Link>
                            <button onClick={handleDelete} disabled={deleting} className="btn btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>

                {job.tags && job.tags.length > 0 && (
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '0.8rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
                        {job.tags.map(tag => (
                            <span key={tag} style={{ padding: '0.4rem 1rem', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '20px', fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: '500' }}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Content Split Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>

                {/* Left Column: Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '20px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.3rem' }}>
                            <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                                <Info size={20} color="var(--accent-secondary)" />
                            </div>
                            About this Role
                        </h3>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                            {job.description}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '20px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.3rem' }}>
                            <div style={{ padding: '0.5rem', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '8px' }}>
                                <Shield size={20} color="var(--accent-primary)" />
                            </div>
                            Requirements
                        </h3>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                            {job.requirements}
                        </div>
                    </div>
                </div>

                {/* Right Column: Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                        <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Experience Level</h4>
                        <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {job.experience_level}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                        <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>System Timestamp</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                            <div style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                <Calendar size={18} color="var(--accent-primary)" />
                            </div>
                            {new Date(job.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>

                    {job.image_base64 && (
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Social Attachment</h4>
                            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <img
                                    src={job.image_base64.startsWith('data:') ? job.image_base64 : (job.image_base64.startsWith('/9j/') ? `data:image/jpeg;base64,${job.image_base64}` : `data:image/png;base64,${job.image_base64}`)}
                                    alt="Job Banner"
                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Live Comments Block */}
            {job.linkedin_url && (
                <div className="glass-panel" style={{ marginTop: '2.5rem', padding: '2.5rem', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontSize: '1.4rem' }}>
                            <div style={{ padding: '0.5rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '8px' }}>
                                <MessageSquare size={20} color="#a855f7" />
                            </div>
                            Live Applicant Comments
                            <span style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', color: 'var(--text-secondary)' }}>
                                {comments.length} detected
                            </span>
                        </h3>

                        <button
                            onClick={handleScrapeComments}
                            disabled={scrapeLoading || !job.linkedin_url}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7', borderColor: 'rgba(168, 85, 247, 0.3)' }}
                        >
                            <RefreshCw size={16} className={scrapeLoading ? "spin" : ""} />
                            {scrapeLoading ? 'Fetching comments of the post...' : 'Refresh Comments'}
                        </button>
                    </div>

                    {scrapeLoading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <div className="spin" style={{ color: 'var(--accent-primary)' }}>
                                <RefreshCw size={36} />
                            </div>
                            <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '500' }}>Fetching comments of the post...</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Connecting to LinkedIn Live Feed...</p>
                        </div>
                    ) : comments.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                            <MessageSquare size={32} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                            <p>No comments found on the live post.</p>
                            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Comments appear here in real-time once applicants interact with your post.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {comments.map((comment, idx) => (
                                <div key={idx} style={{
                                    padding: '1.5rem',
                                    background: comment.is_reply ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    marginLeft: comment.is_reply ? '2.5rem' : '0',
                                    borderLeft: comment.is_reply ? '3px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{comment.author}</div>
                                            {comment.is_reply && <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>Reply</span>}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{comment.timestamp ? new Date(comment.timestamp).toLocaleDateString() : 'Recent'}</div>
                                    </div>
                                    <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{comment.text}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
