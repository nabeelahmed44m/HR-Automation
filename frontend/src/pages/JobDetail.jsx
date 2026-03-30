import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, DollarSign, Clock, ArrowLeft, Trash2, Calendar, Edit, Globe, Info, Shield, MessageSquare, RefreshCw, Mail, Phone, Briefcase, FileText, X, Download, User, Sparkles, CheckCircle, PhoneCall, PhoneOff, Star, ChevronDown, ChevronUp, Award } from 'lucide-react';
import api from '../api';

export default function JobDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [comments, setComments] = useState([]);
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [applicantsLoading, setApplicantsLoading] = useState(false);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);
    const [scrapeLoading, setScrapeLoading] = useState(false);
    const [previewCandidate, setPreviewCandidate] = useState(null);
    const [activeTab, setActiveTab] = useState('details'); // details, applicants, social, screening
    const [applicantsCount, setApplicantsCount] = useState(0);
    // --- AI Screening State ---
    const [screeningQuestions, setScreeningQuestions] = useState([]);
    const [interviewSessions, setInterviewSessions] = useState({});
    const [expandedTranscripts, setExpandedTranscripts] = useState({});
    const [callingCandidates, setCallingCandidates] = useState({});

    useEffect(() => {
        if (id) {
            fetchJob();
            fetchApplicants();
            fetchApplicantsCount();
            fetchScreeningQuestions();
        }
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

    const fetchApplicants = async () => {
        setApplicantsLoading(true);
        try {
            const res = await api.get(`/jobs/${id}/applicants`);
            setApplicants(res.data);
        } catch (err) {
            console.error('Failed to fetch applicants', err);
        } finally {
            setApplicantsLoading(false);
        }
    };

    const fetchApplicantsCount = async () => {
        try {
            const { data } = await api.get(`/jobs/${id}/application/count`);
            setApplicantsCount(data.count);
        } catch (err) {
            console.error('Failed to fetch applicant count', err);
        }
    };

    const handleScrapeComments = async () => {
        await fetchComments();
    };

    // --- AI Screening helpers ---
    const fetchScreeningQuestions = async () => {
        try {
            const { data } = await api.get(`/jobs/${id}/screening/questions`);
            setScreeningQuestions(data);
        } catch { /* not critical */ }
    };

    const fetchInterviewSession = async (candidateId) => {
        try {
            const { data } = await api.get(`/jobs/${id}/candidates/${candidateId}/interview`);
            setInterviewSessions(prev => ({ ...prev, [candidateId]: data }));
        } catch { /* no session yet */ }
    };

    const handleInitiateCall = async (candidateId) => {
        setCallingCandidates(prev => ({ ...prev, [candidateId]: true }));
        try {
            await api.post(`/jobs/${id}/candidates/${candidateId}/call`);
            await fetchInterviewSession(candidateId);
            alert('Outbound call initiated successfully!');
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to initiate call');
        } finally {
            setCallingCandidates(prev => ({ ...prev, [candidateId]: false }));
        }
    };

    const handleSendInterviewLink = async (candidateId) => {
        setCallingCandidates(prev => ({ ...prev, [candidateId]: true }));
        try {
            const res = await api.post(`/jobs/${id}/candidates/${candidateId}/send-interview-link`);
            await fetchInterviewSession(candidateId);
            alert(`Interview link sent successfully to candidate's email!\nLink: ${res.data.link}`);
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to send interview link');
        } finally {
            setCallingCandidates(prev => ({ ...prev, [candidateId]: false }));
        }
    };

    const toggleTranscript = (candidateId) => {
        setExpandedTranscripts(prev => ({ ...prev, [candidateId]: !prev[candidateId] }));
    };

    const getCallStatusStyle = (status) => {
        const map = {
            INTERVIEW_COMPLETED: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.25)', icon: '✓', label: 'Completed' },
            CALL_INITIATED: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.25)', icon: '📞', label: 'Call Initiated' },
            IN_PROGRESS: { bg: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: 'rgba(6,182,212,0.25)', icon: '🎙️', label: 'In Progress' },
            NO_RESPONSE: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.25)', icon: '✗', label: 'No Response' },
            SCREENING_FAILED: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.25)', icon: '✗', label: 'Failed' },
            PENDING: { bg: 'rgba(99,102,241,0.1)', color: '#818cf8', border: 'rgba(99,102,241,0.25)', icon: '○', label: 'Pending' },
        };
        return map[status] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: 'rgba(255,255,255,0.1)', icon: '?', label: status };
    };

    const getRecommendationStyle = (rec) => {
        if (!rec) return {};
        const map = {
            Proceed: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
            Maybe: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
            Reject: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
        };
        return map[rec] || {};
    };

    const shortlisted = applicants.filter(a => a.status === 'shortlisted');
    const handleDownload = (cand) => {
        const link = document.createElement('a');
        link.href = cand.resume_base64;
        link.download = cand.resume_filename || 'resume.pdf';
        link.click();
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

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => setActiveTab('details')} style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', background: activeTab === 'details' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)', color: activeTab === 'details' ? '#fff' : 'var(--text-secondary)', transition: 'all 0.3s' }}>
                    <Info size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Job Description
                </button>
                <button onClick={() => setActiveTab('applicants')} style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', background: activeTab === 'applicants' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)', color: activeTab === 'applicants' ? '#fff' : 'var(--text-secondary)', transition: 'all 0.3s' }}>
                    <User size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Applicants ({applicantsCount})
                </button>
                <button onClick={() => setActiveTab('screening')} style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', background: activeTab === 'screening' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(99,102,241,0.08)', color: activeTab === 'screening' ? '#fff' : '#818cf8', transition: 'all 0.3s', border: activeTab === 'screening' ? 'none' : '1px solid rgba(99,102,241,0.2)' }}>
                    <Sparkles size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />AI Screening {screeningQuestions.length > 0 && `(${screeningQuestions.length}Q)`}
                </button>
                <button onClick={() => setActiveTab('social')} style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', background: activeTab === 'social' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)', color: activeTab === 'social' ? '#fff' : 'var(--text-secondary)', transition: 'all 0.3s' }}>
                    <MessageSquare size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Social Signals
                </button>
            </div>

            {/* Main Content Layouts */}
            {activeTab === 'details' && (
                <div className="page-enter" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>
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
            )}

            {activeTab === 'screening' && (
                <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Questions Panel */}
                    <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '20px', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontSize: '1.3rem', margin: 0 }}>
                                <div style={{ padding: '0.5rem', background: 'rgba(99,102,241,0.1)', borderRadius: '8px' }}><Sparkles size={20} color="#818cf8" /></div>
                                Interview Questions
                                <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.7rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: '12px' }}>{screeningQuestions.length} questions</span>
                            </h3>
                            <Link to={`/job/${id}/edit`} style={{ fontSize: '0.85rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Edit size={14} /> Manage Questions
                            </Link>
                        </div>

                        {screeningQuestions.length === 0 ? (
                            <div style={{ padding: '2.5rem', textAlign: 'center', background: 'rgba(99,102,241,0.03)', border: '2px dashed rgba(99,102,241,0.2)', borderRadius: '14px', color: 'var(--text-secondary)' }}>
                                <Sparkles size={36} color="rgba(99,102,241,0.3)" style={{ marginBottom: '1rem' }} />
                                <p style={{ marginBottom: '0.5rem' }}>No screening questions configured yet.</p>
                                <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Go to Edit Job to add AI-generated or custom questions.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {screeningQuestions.map((q, idx) => (
                                    <div key={q.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem 1.2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px' }}>
                                        <span style={{ minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '800' }}>{idx + 1}</span>
                                        <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5', paddingTop: '0.2rem' }}>{q.question_text}</span>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                            {q.is_required && <span style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', borderRadius: '4px', fontWeight: '800', textTransform: 'uppercase' }}>Required</span>}
                                            <span style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem', background: q.question_source === 'AI' ? 'rgba(99,102,241,0.1)' : 'rgba(6,182,212,0.1)', color: q.question_source === 'AI' ? '#818cf8' : '#22d3ee', borderRadius: '4px', fontWeight: '800' }}>{q.question_source}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Candidate Calls Panel */}
                    <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontSize: '1.3rem', marginBottom: '1.5rem' }}>
                            <div style={{ padding: '0.5rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}><PhoneCall size={20} color="#10b981" /></div>
                            Screening Calls
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '400' }}>— shortlisted candidates only</span>
                        </h3>

                        {shortlisted.length === 0 ? (
                            <div style={{ padding: '2.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '14px', color: 'var(--text-secondary)' }}>
                                <p>No shortlisted candidates yet.</p>
                                <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Candidates scoring above the shortlist threshold will appear here.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                {shortlisted.map(cand => {
                                    const session = interviewSessions[cand.id];
                                    const statusStyle = session ? getCallStatusStyle(session.status) : null;
                                    const evaluation = session?.ai_evaluation;
                                    const isExpanded = expandedTranscripts[cand.id];
                                    const isCalling = callingCandidates[cand.id];

                                    return (
                                        <div key={cand.id} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px' }}>
                                            {/* Candidate Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: session ? '1rem' : 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: '800', color: '#10b981' }}>
                                                        {cand.full_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1rem' }}>{cand.full_name}</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={12} />{cand.email}</span>
                                                            {cand.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={12} />{cand.phone}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    {session && statusStyle && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`, borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700' }}>
                                                            {statusStyle.icon} {statusStyle.label}
                                                        </span>
                                                    )}
                                                    {!session ? (
                                                        screeningQuestions.length > 0 ? (
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button
                                                                    onClick={() => handleSendInterviewLink(cand.id)}
                                                                    disabled={isCalling || !cand.email}
                                                                    className="btn btn-secondary"
                                                                    style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)' }}
                                                                    title={!cand.email ? 'No email on file' : ''}
                                                                >
                                                                    {isCalling ? <RefreshCw size={14} className="spin" /> : <Mail size={14} />}
                                                                    Send Meeting Link
                                                                </button>
                                                                <button
                                                                    onClick={() => handleInitiateCall(cand.id)}
                                                                    disabled={isCalling || !cand.phone}
                                                                    className="btn btn-primary"
                                                                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 6px 20px rgba(16,185,129,0.3)', padding: '0.6rem 1.2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                                    title={!cand.phone ? 'No phone number on file' : ''}
                                                                >
                                                                    {isCalling ? <RefreshCw size={14} className="spin" /> : <PhoneCall size={14} />}
                                                                    {isCalling ? 'Initiating...' : 'Call'}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Add screening questions first</span>
                                                        )
                                                    ) : (
                                                        <button
                                                            onClick={() => fetchInterviewSession(cand.id)}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                                        >
                                                            <RefreshCw size={13} /> Refresh
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* AI Evaluation */}
                                            {evaluation && (
                                                <div style={{ marginTop: '1rem', padding: '1.2rem', background: 'rgba(99,102,241,0.05)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.15)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                                                        <div style={{ color: '#818cf8', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <Award size={15} /> AI Evaluation
                                                        </div>
                                                        <span style={{
                                                            padding: '0.3rem 0.8rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '800',
                                                            ...getRecommendationStyle(evaluation.recommendation)
                                                        }}>
                                                            {evaluation.recommendation === 'Proceed' ? '✓ Proceed' : evaluation.recommendation === 'Maybe' ? '~ Maybe' : '✗ Reject'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: evaluation.summary ? '1rem' : 0 }}>
                                                        {[['Communication', evaluation.communication], ['Technical', evaluation.technical_clarity], ['Confidence', evaluation.confidence]].map(([label, score]) => (
                                                            <div key={label} style={{ textAlign: 'center', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                                                <div style={{ fontSize: '1.8rem', fontWeight: '900', color: score >= 7 ? '#10b981' : score >= 5 ? '#fbbf24' : '#ef4444' }}>{score}</div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.2rem' }}>{label}</div>
                                                                <div style={{ marginTop: '0.4rem', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${score * 10}%`, height: '100%', background: score >= 7 ? '#10b981' : score >= 5 ? '#fbbf24' : '#ef4444', borderRadius: '2px', transition: 'width 1s ease' }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {evaluation.summary && (
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>{evaluation.summary}</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Vapi Transcript + Recording */}
                                            {session?.transcript?.length > 0 && (
                                                <div style={{ marginTop: '1rem' }}>
                                                    {session.recording_url && (
                                                        <a
                                                            href={session.recording_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#06b6d4', marginBottom: '0.6rem' }}
                                                        >
                                                            🎙️ Listen to Recording
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => toggleTranscript(cand.id)}
                                                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'space-between' }}
                                                    >
                                                        <span>📝 View Call Transcript ({session.transcript.length} messages)</span>
                                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                    {isExpanded && (
                                                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '360px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: '12px' }}>
                                                            {session.transcript.map((item, idx) => {
                                                                const isBot = item.role === 'bot' || item.role === 'assistant';
                                                                return (
                                                                    <div key={idx} style={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end' }}>
                                                                        <div style={{
                                                                            maxWidth: '80%',
                                                                            padding: '0.6rem 0.9rem',
                                                                            borderRadius: isBot ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                                                                            background: isBot ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.12)',
                                                                            border: `1px solid ${isBot ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)'}`,
                                                                            fontSize: '0.83rem',
                                                                            color: isBot ? '#a5b4fc' : '#6ee7b7',
                                                                            lineHeight: '1.5',
                                                                        }}>
                                                                            <div style={{ fontSize: '0.68rem', fontWeight: '700', marginBottom: '0.2rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                                {isBot ? '🤖 Interviewer' : '👤 Candidate'}
                                                                            </div>
                                                                            {item.message}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'applicants' && (
                <div className="page-enter glass-panel" style={{ padding: '2.5rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontSize: '1.4rem', marginBottom: '2rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                            <Briefcase size={20} color="var(--success)" />
                        </div>
                        Received Applications
                        <span style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', color: 'var(--text-secondary)' }}>
                            {applicants.length} candidates
                        </span>
                    </h3>

                    {applicantsLoading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spin"><RefreshCw /></div></div>
                    ) : applicants.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                            <p>No one has applied for this job yet.</p>
                            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Share the application link on social media to attract candidates.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {applicants.map((cand) => (
                                <div key={cand.id} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                                            {cand.ats_score !== null && (
                                                <div style={{
                                                    width: '64px', height: '64px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                    background: cand.ats_score >= (job.shortlist_threshold || 70) ? 'rgba(16, 185, 129, 0.1)' : (cand.ats_score >= (job.review_threshold || 50) ? 'rgba(251, 191, 36, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                                                    border: `1px solid ${cand.ats_score >= (job.shortlist_threshold || 70) ? 'rgba(16, 185, 129, 0.2)' : (cand.ats_score >= (job.review_threshold || 50) ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)')}`
                                                }}>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: cand.ats_score >= (job.shortlist_threshold || 70) ? '#10b981' : (cand.ats_score >= (job.review_threshold || 50) ? '#fbbf24' : '#ef4444') }}>{Math.round(cand.ats_score)}</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.8, color: '#fff' }}>ATS</div>
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                    {cand.full_name}
                                                    <span style={{
                                                        fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '10px', textTransform: 'uppercase', fontWeight: '800',
                                                        background: cand.status === 'shortlisted' ? 'rgba(16, 185, 129, 0.15)' : (cand.status === 'review' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                                                        color: cand.status === 'shortlisted' ? '#10b981' : (cand.status === 'review' ? '#fbbf24' : '#ef4444'),
                                                        border: `1px solid ${cand.status === 'shortlisted' ? 'rgba(16, 185, 129, 0.2)' : (cand.status === 'review' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)')}`
                                                    }}>
                                                        {cand.status}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', fontSize: '0.9rem' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)' }}><Mail size={14} /> {cand.email}</span>
                                                    {cand.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}><Phone size={14} /> {cand.phone}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            Applied: {new Date(cand.applied_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {cand.ats_explanation && (
                                        <div style={{ margin: '1rem 0', padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: '700', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                <Sparkles size={16} /> AI Match Analysis
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <CheckCircle size={14} /> MATCHED KEYWORDS
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                        {cand.ats_explanation.matched_skills.map(s => (
                                                            <span key={s} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '4px' }}>{s}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <X size={14} /> MISSING KEYWORDS
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                        {cand.ats_explanation.missing_skills.map(s => (
                                                            <span key={s} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '4px' }}>{s}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '2rem', fontSize: '0.85rem' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Exp: <strong style={{ color: '#fff' }}>{cand.ats_explanation.experience_detected}</strong></span>
                                                <span style={{ color: 'var(--text-secondary)' }}>Edu: <strong style={{ color: '#fff' }}>{cand.ats_explanation.education_detected.join(', ') || 'None found'}</strong></span>
                                            </div>
                                        </div>
                                    )}

                                    {cand.linkedin_profile && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <a href={cand.linkedin_profile} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#0077b5', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Globe size={14} /> View LinkedIn Profile
                                            </a>
                                        </div>
                                    )}
                                    {cand.resume_base64 && (
                                        <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ padding: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}><FileText size={20} color="var(--accent-primary)" /></div>
                                                <div>
                                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{cand.resume_filename}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Resume Uploaded</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.6rem' }}>
                                                <button onClick={() => setPreviewCandidate(cand)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                                    Quick Look
                                                </button>
                                                <button onClick={() => handleDownload(cand)} className="btn btn-secondary" style={{ padding: '0.5rem 0.5rem', color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {cand.resume_text && (
                                        <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px dotted rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '1rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                                            <strong style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                <FileText size={16} color="#38bdf8" /> Cover Letter
                                            </strong>
                                            {cand.resume_text}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'social' && job.linkedin_url && (
                <div className="page-enter glass-panel" style={{ padding: '2.5rem', borderRadius: '20px' }}>
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
                            {scrapeLoading ? 'Fetching components...' : 'Refresh Activity'}
                        </button>
                    </div>

                    {scrapeLoading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <div className="spin" style={{ color: 'var(--accent-primary)' }}>
                                <RefreshCw size={36} />
                            </div>
                            <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '500' }}>Fetching comments of the post...</p>
                        </div>
                    ) : comments.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                            <p>No comments found on the live post.</p>
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

            {/* Resume Preview Modal */}
            {previewCandidate && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', padding: '2rem'
                }}>
                    <div style={{
                        width: '100%', maxWidth: '900px', height: '94vh',
                        background: 'var(--bg-secondary)', borderRadius: '24px',
                        border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column', boxShadow: '0 0 100px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{previewCandidate.full_name}'s Resume</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{previewCandidate.resume_filename}</p>
                            </div>
                            <button onClick={() => setPreviewCandidate(null)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--danger)', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ flex: 1, background: '#fff' }}>
                            {previewCandidate.resume_base64.includes('application/pdf') ? (
                                <iframe
                                    src={previewCandidate.resume_base64}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    title="Resume Preview"
                                />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#333', gap: '1rem', background: '#f8fafc' }}>
                                    <div style={{ padding: '2rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}><FileText size={64} color="var(--accent-primary)" /></div>
                                    <h4 style={{ color: '#1e293b', fontSize: '1.4rem' }}>Document Preview Unavailable</h4>
                                    <p style={{ color: '#64748b' }}>This file type cannot be previewed directly in the browser.</p>
                                    <button onClick={() => handleDownload(previewCandidate)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 2rem' }}>
                                        <Download size={20} /> Download to View
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
