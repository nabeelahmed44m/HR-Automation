import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Mail, Phone, Linkedin, FileText, Send, CheckCircle, ArrowLeft, MapPin, Briefcase, Sparkles, Building2, ChevronRight, Clock, ShieldCheck, Trophy, ExternalLink, Award, Zap, Target, Star, RefreshCw } from 'lucide-react';
import api from '../api';

export default function PublicApply() {
    const { id } = useParams();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState('description');

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        linkedin_profile: '',
        resume_text: '',
        resume_base64: '',
        resume_filename: ''
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setFormData(prev => ({
                ...prev,
                resume_base64: event.target.result,
                resume_filename: file.name
            }));
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const { data } = await api.get(`/jobs/${id}/public`);
                setJob(data);
            } catch (err) {
                console.error(err);
                setError('Job posting not found or no longer active.');
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await api.post(`/jobs/${id}/apply`, formData);
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || 'Submission failed.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="loader"></div>;

    if (success) {
        return (
            <div className="premium-page-enter" style={{
                maxWidth: '600px',
                margin: '8rem auto',
                padding: '5rem 4rem',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.01)',
                backdropFilter: 'blur(100px)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '60px',
                boxShadow: '0 0 100px rgba(16, 185, 129, 0.2)',
                color: '#fff'
            }}>
                <div style={{ display: 'inline-flex', padding: '2rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', marginBottom: '2.5rem' }}>
                    <CheckCircle size={80} color="#10b981" />
                </div>
                <h2 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', fontWeight: '900' }}>Success!</h2>
                <p style={{ color: '#94a3b8', fontSize: '1.3rem', lineHeight: '1.6' }}>Application submitted for <strong>{job.title}</strong>.</p>
            </div>
        );
    }

    const ownerName = job.owner_email ? job.owner_email.split('@')[0].toUpperCase() : "ELITE RECRUITER";

    return (
        <div className="premium-page-enter" style={{
            position: 'relative', width: '100%', minHeight: '100vh',
            background: '#020617', color: '#f8fafc', fontFamily: 'Inter, sans-serif',
            paddingTop: '6rem', paddingBottom: '6rem'
        }}>
            {/* High-Impact Visual Foundations */}
            <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '1200px', height: '1200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)', zIndex: 0, filter: 'blur(150px)', pointerEvents: 'none' }}></div>
            <div style={{ position: 'fixed', bottom: '-20%', left: '-10%', width: '1000px', height: '1000px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%)', zIndex: 0, filter: 'blur(130px)', pointerEvents: 'none' }}></div>

            <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto', padding: '5rem 2rem' }}>

                {step === 'description' && (
                    <div className="content-fade-in">
                        <header style={{ textAlign: 'center', marginBottom: '6rem' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 1.4rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', marginBottom: '2.5rem', color: '#38bdf8', fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '4px' }}>
                                <Zap size={14} fill="#38bdf8" /> Limited Opening
                            </div>
                            <h1 style={{ fontSize: '6.5rem', fontWeight: '900', marginBottom: '2rem', letterSpacing: '-5px', lineHeight: '0.9', background: 'linear-gradient(to bottom, #fff 40%, rgba(255,255,255,0.5))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {job.title}
                            </h1>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap', color: '#64748b', fontSize: '1.25rem', fontWeight: '600' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}><MapPin size={24} color="#38bdf8" /> {job.location}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}><Star size={24} color="#fbbf24" /> {job.job_type}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}><Clock size={24} color="#a855f7" /> {job.experience_level}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}><Building2 size={24} color="#f472b6" /> TEAM {ownerName}</span>
                            </div>
                        </header>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '5rem', alignItems: 'start', marginBottom: '8rem' }}>
                            <main style={{ display: 'flex', flexDirection: 'column', gap: '5rem' }}>
                                <section>
                                    <h2 style={{ fontSize: '2.5rem', color: '#fff', marginBottom: '2rem', fontWeight: '900', letterSpacing: '-1.5px' }}>The Mission</h2>
                                    <p style={{ color: '#94a3b8', lineHeight: '2', fontSize: '1.25rem', whiteSpace: 'pre-line' }}>{job.description}</p>
                                </section>
                                <section>
                                    <h2 style={{ fontSize: '2.5rem', color: '#fff', marginBottom: '2rem', fontWeight: '900', letterSpacing: '-1.5px' }}>Your Arsenal</h2>
                                    <p style={{ color: '#94a3b8', lineHeight: '2', fontSize: '1.25rem', whiteSpace: 'pre-line' }}>{job.requirements}</p>
                                </section>
                            </main>

                            <aside style={{ position: 'sticky', top: '4rem' }}>
                                <div style={{
                                    padding: '4rem 3rem', background: 'rgba(255,255,255,0.01)', backdropFilter: 'blur(100px)',
                                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '48px',
                                    boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8)', textAlign: 'center'
                                }}>
                                    <h3 style={{ fontSize: '1.8rem', color: '#fff', fontWeight: '900', marginBottom: '1.5rem', letterSpacing: '-1px' }}>Ready for Impact?</h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '4rem', textAlign: 'left' }}>
                                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                            <div style={{ width: '56px', height: '56px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={28} color="#10b981" /></div>
                                            <div>
                                                <div style={{ color: '#fff', fontWeight: '700', fontSize: '1rem' }}>Secure Portal</div>
                                                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>E2E Encrypted Data</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                            <div style={{ width: '56px', height: '56px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trophy size={28} color="#38bdf8" /></div>
                                            <div>
                                                <div style={{ color: '#fff', fontWeight: '700', fontSize: '1rem' }}>Premium Track</div>
                                                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>High-Growth Future</div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => { setStep('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        style={{
                                            width: '100%', padding: '2rem', borderRadius: '24px', fontSize: '1.6rem', fontWeight: '900',
                                            background: 'linear-gradient(135deg, #38bdf8, #818cf8)', color: '#fff', border: 'none', cursor: 'pointer',
                                            boxShadow: '0 20px 50px rgba(56, 189, 248, 0.4)', transition: 'all 0.3s'
                                        }}
                                        className="btn-impact"
                                    >
                                        APPLY NOW
                                    </button>
                                </div>
                            </aside>
                        </div>
                    </div>
                )}

                {step === 'form' && (
                    <div className="content-fade-in" style={{ maxWidth: '850px', margin: '0 auto' }}>
                        <button
                            onClick={() => setStep('description')}
                            style={{ background: 'transparent', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '3rem', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '600' }}
                        >
                            <ArrowLeft size={20} /> Back to Description
                        </button>

                        <div style={{
                            padding: '5rem 4rem', background: 'rgba(255,255,255,0.01)', backdropFilter: 'blur(100px)',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '56px',
                            boxShadow: '0 60px 150px -30px rgba(0,0,0,0.9)', position: 'relative'
                        }}>
                            <div style={{ marginBottom: '5rem', textAlign: 'center' }}>
                                <h1 style={{ fontSize: '3.5rem', color: '#fff', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-2px' }}>Application Portal</h1>
                                <p style={{ color: '#64748b', fontSize: '1.1rem' }}>E2E Encrypted Submission Pathway</p>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                                    <div className="field-group">
                                        <label className="field-label">FULL LEGAL NAME</label>
                                        <input required className="input-premium" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="Jane Doe" />
                                    </div>
                                    <div className="field-group">
                                        <label className="field-label">BUSINESS EMAIL</label>
                                        <input required type="email" className="input-premium" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="jane@example.com" />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                                    <div className="field-group">
                                        <label className="field-label">PHONE NUMBER</label>
                                        <input type="tel" className="input-premium" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
                                    </div>
                                    <div className="field-group">
                                        <label className="field-label">LINKEDIN URL</label>
                                        <input type="url" className="input-premium" value={formData.linkedin_profile} onChange={e => setFormData({ ...formData, linkedin_profile: e.target.value })} placeholder="linkedin.com/in/jane" />
                                    </div>
                                </div>

                                <div className="field-group">
                                    <label className="field-label">RESUME UPLOAD (PDF/DOCX)</label>
                                    <div className="upload-box">
                                        <input type="file" accept=".pdf,.docx" onChange={handleFileChange} style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }} />
                                        {formData.resume_filename ? (
                                            <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.2rem', fontWeight: '700' }}>
                                                <CheckCircle size={24} /> {formData.resume_filename}
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center' }}>
                                                <FileText size={40} color="#38bdf8" style={{ marginBottom: '1rem' }} />
                                                <div style={{ fontWeight: '700', color: '#fff' }}>Click to select or drag and drop</div>
                                                <div style={{ fontSize: '0.85rem', color: '#475569' }}>Max file size 25MB</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="field-group">
                                    <label className="field-label">EXECUTIVE SUMMARY (OPTIONAL)</label>
                                    <textarea className="input-premium" style={{ minHeight: '150px' }} value={formData.resume_text} onChange={e => setFormData({ ...formData, resume_text: e.target.value })} placeholder="Tell us about your background..." />
                                </div>

                                <button
                                    type="submit" disabled={submitting}
                                    style={{
                                        width: '100%', padding: '1.8rem', borderRadius: '24px', fontSize: '1.5rem', fontWeight: '900',
                                        background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', cursor: 'pointer',
                                        boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)', transition: 'all 0.3s'
                                    }}
                                    className="btn-impact"
                                >
                                    {submitting ? 'PROCESSING...' : 'SUBMIT APPLICATION'}
                                </button>
                                <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                    <ShieldCheck size={16} /> Privacy-First Encryption
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                
                body { background: #020617; }

                .premium-page-enter {
                    animation: premiumEnter 1.2s cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }

                @keyframes premiumEnter {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .content-fade-in { animation: fadeIn 0.8s ease-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                .input-premium {
                    width: 100%;
                    padding: 1.2rem 1.6rem;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 16px;
                    color: #fff;
                    font-size: 1.1rem;
                    font-weight: 500;
                    outline: none;
                    transition: all 0.25s;
                }
                .input-premium:focus {
                    border-color: #38bdf8;
                    background: rgba(255,255,255,0.06);
                    box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.1);
                }

                .field-label {
                    color: #fff;
                    font-size: 0.9rem;
                    font-weight: 800;
                    letter-spacing: 1px;
                    margin-bottom: 0.8rem;
                    display: block;
                }

                .upload-box {
                    background: rgba(255,255,255,0.02);
                    border: 2px dashed rgba(255,255,255,0.08);
                    border-radius: 20px;
                    padding: 3rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    position: relative;
                    transition: all 0.3s;
                }
                .upload-box:hover { border-color: #38bdf8; background: rgba(255,255,255,0.04); }

                .btn-impact:hover { transform: translateY(-5px); filter: brightness(1.1); }
                .btn-impact:active { transform: translateY(0); }

                .loader {
                    width: 60px;
                    height: 60px;
                    border: 4px solid rgba(255,255,255,0.05);
                    border-radius: 50%;
                    border-top-color: #38bdf8;
                    animation: spin 1s linear infinite;
                    margin: 200px auto;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
