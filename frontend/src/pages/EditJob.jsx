import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, AlertCircle, ArrowLeft, Settings as SettingsIcon, Sparkles, RefreshCw, Plus, X, Trash2 } from 'lucide-react';
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
        image_url: '',
        skill_weight: 40,
        experience_weight: 30,
        education_weight: 10,
        keyword_weight: 20,
        shortlist_threshold: 70,
        review_threshold: 50
    });

    // --- AI Screening State ---
    const [questions, setQuestions] = useState([]);
    const [questionsLoading, setQuestionsLoading] = useState(false);
    const [questionsSaving, setQuestionsSaving] = useState(false);

    useEffect(() => {
        fetchJob();
        fetchQuestions();
    }, [id]);

    const fetchQuestions = async () => {
        try {
            const { data } = await api.get(`/jobs/${id}/screening/questions`);
            setQuestions(data);
        } catch (err) {
            console.error('Failed to fetch questions', err);
        }
    };

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
                image_url: data.image_url || '',
                skill_weight: data.skill_weight || 40,
                experience_weight: data.experience_weight || 30,
                education_weight: data.education_weight || 10,
                keyword_weight: data.keyword_weight || 20,
                shortlist_threshold: data.shortlist_threshold || 70,
                review_threshold: data.review_threshold || 50
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

    const handleGenerateQuestions = async () => {
        setQuestionsLoading(true);
        try {
            const { data } = await api.post(`/jobs/${id}/screening/generate`);
            // Add unique temporary IDs for keying
            const qs = data.questions.map((q, idx) => ({
                id: `temp-${Date.now()}-${idx}`,
                question_text: q,
                question_source: 'AI',
                question_order: idx,
                is_required: true
            }));
            setQuestions(qs);
        } catch (err) {
            console.error('Generation failed', err);
            alert('Failed to generate questions. Check API keys.');
        } finally {
            setQuestionsLoading(false);
        }
    };

    const handleAddQuestion = () => {
        const newQ = {
            id: `temp-${Date.now()}`,
            question_text: '',
            question_source: 'HR',
            question_order: questions.length,
            is_required: true
        };
        setQuestions([...questions, newQ]);
    };

    const handleRemoveQuestion = (qid) => {
        setQuestions(questions.filter(q => q.id !== qid));
    };

    const handleMoveQuestion = (qid, direction) => {
        const idx = questions.findIndex(q => q.id === qid);
        if (idx === -1) return;
        const newQs = [...questions];
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newQs.length) return;

        [newQs[idx], newQs[targetIdx]] = [newQs[targetIdx], newQs[idx]];
        // Update order property
        newQs.forEach((q, i) => q.question_order = i);
        setQuestions(newQs);
    };

    const handleQuestionChange = (qid, field, value) => {
        setQuestions(questions.map(q => q.id === qid ? { ...q, [field]: value } : q));
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

            // Update Job
            await api.put(`/jobs/${id}`, payload);

            // Update Questions
            if (questions.length > 0) {
                setQuestionsSaving(true);
                await api.post(`/jobs/${id}/screening/questions`, {
                    questions: questions.map((q, idx) => ({
                        question_text: q.question_text,
                        question_order: idx,
                        question_source: q.question_source,
                        is_required: q.is_required
                    }))
                });
            }

            navigate(`/job/${id}`);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Failed to update job');
        } finally {
            setLoading(false);
            setQuestionsSaving(false);
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
                                    <input type="number" name="shortlist_threshold" className="form-control" value={formData.shortlist_threshold} onChange={handleChange} min={0} max={100} />
                                    <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Scores above this will be Auto-Shortlisted</span>
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Review Threshold (Scale 0-100)</label>
                                    <input type="number" name="review_threshold" className="form-control" value={formData.review_threshold} onChange={handleChange} min={0} max={100} />
                                    <span style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>Scores below this will be Rejected</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ gridColumn: 'span 2', marginTop: '1rem', marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '15px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                            <h4 style={{ marginBottom: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Sparkles size={18} /> AI Voice Screening Questions
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Manage the questions that AI will ask candidates during the automated phone screening.</p>

                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <button type="button" onClick={handleGenerateQuestions} disabled={questionsLoading} className="btn-impact" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {questionsLoading ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
                                    {questions.length > 0 ? 'Regenerate with AI' : 'Generate with AI'}
                                </button>
                                <button type="button" onClick={handleAddQuestion} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem', gap: '0.5rem' }}>
                                    <Plus size={14} /> Add Custom
                                </button>
                            </div>

                            {questions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    No screening questions configured.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    {questions.map((q, idx) => (
                                        <div key={q.id} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', opacity: 0.6 }}>
                                                <button type="button" onClick={() => handleMoveQuestion(q.id, 'up')} disabled={idx === 0} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>▲</button>
                                                <span style={{ textAlign: 'center', fontSize: '0.7rem' }}>{idx + 1}</span>
                                                <button type="button" onClick={() => handleMoveQuestion(q.id, 'down')} disabled={idx === questions.length - 1} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>▼</button>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <textarea
                                                    className="form-control"
                                                    style={{ minHeight: '60px', fontSize: '0.9rem' }}
                                                    value={q.question_text}
                                                    onChange={(e) => handleQuestionChange(q.id, 'question_text', e.target.value)}
                                                    placeholder="Enter question text..."
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveQuestion(q.id)}
                                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <div
                                                    onClick={() => handleQuestionChange(q.id, 'is_required', !q.is_required)}
                                                    style={{ fontSize: '0.65rem', cursor: 'pointer', padding: '0.2rem 0.4rem', borderRadius: '4px', background: q.is_required ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', color: q.is_required ? '#10b981' : '#64748b', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}
                                                >
                                                    {q.is_required ? 'Req' : 'Opt'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
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
