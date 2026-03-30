import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Save, AlertCircle, Settings as SettingsIcon, Sparkles, Plus, Trash2, GripVertical, Star, RefreshCw, X, ArrowLeft } from 'lucide-react';
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

    // --- AI Screening Questions State ---
    const [questions, setQuestions] = useState([]);
    const [questionsLoading, setQuestionsLoading] = useState(false);

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

    // --- AI Question generation (Pre-creation) ---
    const handleGenerateQuestions = async () => {
        if (!formData.title || !formData.description) {
            alert('Please fill in Job Title and Description first so AI can generate relevant questions.');
            return;
        }
        setQuestionsLoading(true);
        try {
            const { data } = await api.post('/jobs/screening/generate', {
                title: formData.title,
                description: formData.description,
                requirements: formData.requirements,
                experience_level: formData.experience_level,
                salary_range: formData.salary_range
            });
            const qs = data.questions.map((text, i) => ({
                id: `temp_${i}_${Date.now()}`,
                question_text: text,
                question_order: i,
                question_source: 'AI',
                is_required: true,
            }));
            setQuestions(qs);
        } catch (err) {
            console.error('Failed to generate questions', err);
            alert('AI generation failed. Please try again or add questions manually.');
        } finally {
            setQuestionsLoading(false);
        }
    };

    const handleAddQuestion = () => {
        setQuestions(prev => [
            ...prev,
            {
                id: `q_custom_${Date.now()}`,
                question_text: '',
                question_order: prev.length,
                question_source: 'HR',
                is_required: true,
            }
        ]);
    };

    const handleDeleteQuestion = (id) => {
        setQuestions(prev => prev.filter(q => q.id !== id).map((q, i) => ({ ...q, question_order: i })));
    };

    const handleQuestionChange = (id, field, value) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const handleMoveQuestion = (id, direction) => {
        setQuestions(prev => {
            const idx = prev.findIndex(q => q.id === id);
            if (direction === 'up' && idx === 0) return prev;
            if (direction === 'down' && idx === prev.length - 1) return prev;
            const newArr = [...prev];
            const swap = direction === 'up' ? idx - 1 : idx + 1;
            [newArr[idx], newArr[swap]] = [newArr[swap], newArr[idx]];
            return newArr.map((q, i) => ({ ...q, question_order: i }));
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Create Job
            const payload = {
                ...formData,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
            };
            if (payload.publish_destination === 'none') {
                payload.publish_destination = null;
            }

            const { data: createdJob } = await api.post('/jobs', payload);

            // 2. Save Questions if any
            if (questions.length > 0) {
                await api.post(`/jobs/${createdJob.id}/screening/questions`, {
                    questions: questions.map((q, i) => ({
                        question_text: q.question_text,
                        question_order: i,
                        question_source: q.question_source,
                        is_required: q.is_required,
                    }))
                });
            }

            navigate(`/job/${createdJob.id}`);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail?.[0]?.msg || 'Failed to create job');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-enter" style={{ maxWidth: '850px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>Create Job Posting</h2>
                    <p className="text-subtitle">Publish a new position and setup AI screening questions</p>
                </div>
                <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={16} /> Back
                </button>
            </div>

            <div className="glass-panel" style={{ padding: '2.5rem' }}>
                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '12px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Job Title</label>
                            <input type="text" name="title" className="form-control" value={formData.title} onChange={handleChange} placeholder="e.g. Senior Backend Developer" required minLength={3} />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Job Description</label>
                            <textarea name="description" className="form-control" value={formData.description} onChange={handleChange} placeholder="Describe the responsibilities and daily tasks..." style={{ minHeight: '120px' }} required minLength={10}></textarea>
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Requirements</label>
                            <textarea name="requirements" className="form-control" value={formData.requirements} onChange={handleChange} placeholder="Key skills, technologies, and qualifications..." style={{ minHeight: '100px' }} required minLength={10}></textarea>
                        </div>

                        <div className="form-group">
                            <label>Location</label>
                            <input type="text" name="location" className="form-control" value={formData.location} onChange={handleChange} placeholder="Remote, Region, or City" required />
                        </div>

                        <div className="form-group">
                            <label>Experience Level</label>
                            <input type="text" name="experience_level" className="form-control" value={formData.experience_level} onChange={handleChange} placeholder="e.g. Mid-to-Senior (4+ years)" required />
                        </div>

                        <div className="form-group">
                            <label>Salary Range (Optional)</label>
                            <input type="text" name="salary_range" className="form-control" value={formData.salary_range} onChange={handleChange} placeholder="e.g. $100k - $140k" />
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
                            <label>Initial Status</label>
                            <select name="status" className="form-control" value={formData.status} onChange={handleChange} required>
                                <option value="draft">Draft (Private)</option>
                                <option value="published">Published (Public)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>LinkedIn Publication</label>
                            <select name="publish_destination" className="form-control" value={formData.publish_destination || 'none'} onChange={handleChange} required>
                                <option value="none">No auto-post</option>
                                <option value="feed">Post to Feed</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Banner Image URL (Attachment)</label>
                            <input type="url" name="image_url" className="form-control" value={formData.image_url} onChange={handleChange} placeholder="https://example.com/banner-image.jpg" />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Tags (Comma separated)</label>
                            <input type="text" name="tags" className="form-control" value={formData.tags} onChange={handleChange} placeholder="NodeJS, AWS, React, FinTech" />
                        </div>

                        {/* --- ATS CONFIG SECTION --- */}
                        <div style={{ gridColumn: 'span 2', marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(56, 189, 248, 0.03)', borderRadius: '15px', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1rem' }}>
                                <SettingsIcon size={18} /> Candidate Ranking Preferences (ATS Engine)
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem' }}>Skills weight</label>
                                    <input type="number" name="skill_weight" className="form-control" value={formData.skill_weight} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem' }}>Exp weight</label>
                                    <input type="number" name="experience_weight" className="form-control" value={formData.experience_weight} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem' }}>Edu weight</label>
                                    <input type="number" name="education_weight" className="form-control" value={formData.education_weight} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.75rem' }}>Keyword weight</label>
                                    <input type="number" name="keyword_weight" className="form-control" value={formData.keyword_weight} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        {/* --- AI SCREENING QUESTIONS SECTION --- */}
                        <div style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '2rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '15px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div>
                                    <h4 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.1rem', marginBottom: '0.4rem' }}>
                                        <Sparkles size={18} /> AI Phone Screening Setup
                                    </h4>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>These questions will be asked by the AI voice assistant during candidate screening calls.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button type="button" onClick={handleGenerateQuestions} disabled={questionsLoading} className="btn-impact" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {questionsLoading ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
                                        {questions.length > 0 ? 'Regenerate' : '✨ Generate Questions'}
                                    </button>
                                    <button type="button" onClick={handleAddQuestion} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                                        <Plus size={14} /> Add Custom
                                    </button>
                                </div>
                            </div>

                            {questions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                                    No questions yet. Click "Generate" to let Gemini AI draft them based on your job description.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {questions.map((q, idx) => (
                                        <div key={q.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'rgba(0,0,0,0.2)', padding: '1.2rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', opacity: 0.6 }}>
                                                <button type="button" onClick={() => handleMoveQuestion(q.id, 'up')} disabled={idx === 0} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>▲</button>
                                                <span style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>{idx + 1}</span>
                                                <button type="button" onClick={() => handleMoveQuestion(q.id, 'down')} disabled={idx === questions.length - 1} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>▼</button>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <textarea
                                                    className="form-control"
                                                    style={{ minHeight: '60px', fontSize: '0.92rem', background: 'rgba(255,255,255,0.03)' }}
                                                    value={q.question_text}
                                                    onChange={(e) => handleQuestionChange(q.id, 'question_text', e.target.value)}
                                                    placeholder="Enter question text..."
                                                />
                                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: q.question_source === 'AI' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: q.question_source === 'AI' ? '#818cf8' : '#10b981', fontWeight: '800' }}>
                                                        {q.question_source === 'AI' ? '✦ AI GENERATED' : '⊕ HR CUSTOM'}
                                                    </span>
                                                    <div
                                                        onClick={() => handleQuestionChange(q.id, 'is_required', !q.is_required)}
                                                        style={{ fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', color: q.is_required ? '#fbbf24' : '#64748b' }}
                                                    >
                                                        <Star size={10} fill={q.is_required ? '#fbbf24' : 'none'} />
                                                        {q.is_required ? 'Required for screening' : 'Optional'}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteQuestion(q.id)}
                                                style={{ background: 'rgba(239, 68, 68, 0.08)', border: 'none', color: '#ef4444', padding: '0.6rem', borderRadius: '10px', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1.2rem', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} style={{ padding: '0.8rem 1.5rem' }}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.8rem 2.5rem', fontSize: '1.05rem', boxShadow: '0 10px 30px rgba(99,102,241,0.2)' }}>
                            <Save size={20} />
                            {loading ? 'Creating Job...' : 'Publish Job & Save Questions'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
