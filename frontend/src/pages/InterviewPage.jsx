import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Vapi from '@vapi-ai/web';
import { Mic, MicOff, PhoneOff, Play, CheckCircle, Sparkles, AlertCircle, Info } from 'lucide-react';
import api from '../api';

const VAPI_PUBLIC_KEY = ""; // Now fetched from backend config

export default function InterviewPage() {
    const { sessionId } = useParams();
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState(null);
    const [error, setError] = useState(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [isInterviewCompleted, setIsInterviewCompleted] = useState(false);
    const [vapiStatus, setVapiStatus] = useState('idle'); // idle, connecting, active, error
    const [volume, setVolume] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const vapiRef = useRef(null);

    useEffect(() => {
        // Security check for microphone access (only allowed on localhost or HTTPS)
        const isSecure = window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'https:';
        if (!isSecure) {
            setError('Insecure Connection: The microphone is blocked on non-localhost HTTP connections. Please use localhost:5173 or https://.');
        } else {
            // Pre-request microphone permission to ensure Vapi has it early
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    console.log('Microphone access granted early');
                    stream.getTracks().forEach(track => track.stop()); // Stop the temporary stream
                    // List devices for debugging
                    navigator.mediaDevices.enumerateDevices().then(devices => {
                        const mics = devices.filter(d => d.kind === 'audioinput');
                        console.log('Available microphones:', mics);
                        if (mics.length === 0) {
                            setError('No microphone found: Please plug in a microphone and refresh.');
                        }
                    });
                })
                .catch(err => {
                    console.error('Mic permission error:', err);
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setError('Microphone access denied: Please allow microphone access in your browser settings and refresh.');
                    } else {
                        setError(`Could not access microphone: ${err.message}`);
                    }
                });
        }

        fetchInterviewConfig();

        return () => {
            if (vapiRef.current) {
                vapiRef.current.stop();
            }
        };
    }, [sessionId]);

    const fetchInterviewConfig = async () => {
        try {
            const { data } = await api.get(`/interview/${sessionId}/config`);
            setConfig(data);

            // Initialize Vapi
            const keyToUse = data.vapi_public_key;
            console.log('Initializing Vapi with key:', keyToUse ? `${keyToUse.substring(0, 5)}...` : 'MISSING');

            const VapiConstructor = Vapi.default || Vapi;
            if (typeof VapiConstructor !== 'function') {
                console.error('Vapi is not a constructor. Vapi value:', Vapi);
                throw new Error('Could not initialize Vapi. Please check the console for details.');
            }
            if (!keyToUse) {
                throw new Error('No Vapi Public Key was provided by the backend.');
            }
            const vapi = new VapiConstructor(keyToUse);
            vapiRef.current = vapi;

            vapi.on('call-start', (call) => {
                console.log('Vapi Call Started:', call?.id || 'no-id');
                setVapiStatus('active');
                setIsCallActive(true);

                // Link call ID to session in our DB immediately
                if (call?.id) {
                    api.post(`/interview/${sessionId}/start-call`, { vapi_call_id: call.id })
                        .catch(err => console.error('Failed to link call ID:', err));
                }
            });

            vapi.on('call-end', () => {
                console.log('Vapi Call Ended');
                setVapiStatus('idle');
                setIsCallActive(false);
                setVolume(0);
                setIsSpeaking(false);
                // We show completion ONLY if they were actually in a call and it ended normally
                // The AI usually ends the call when done, or the user clicks End.
                setIsInterviewCompleted(true);
            });

            vapi.on('speech-start', () => {
                console.log('AI detected speech');
                setIsSpeaking(true);
            });

            vapi.on('speech-end', () => {
                setIsSpeaking(false);
            });

            vapi.on('volume-level', (level) => {
                if (level > 0.01) {
                    console.log('Audio detected:', level);
                }
                setVolume(level);
            });

            vapi.on('message', (msg) => {
                console.log('Vapi Message:', msg);
            });

            vapi.on('error', (err) => {
                console.error('Vapi Error Event:', err);
                setVapiStatus('error');

                // Extract error message for more detailed feedback
                const rawErrorMessage = err.message || (err.error && err.error.message) || JSON.stringify(err);

                // Handle specific Vapi error types
                if (err.type === 'start-method-error' || (err.error && err.error.status === 401)) {
                    setError(`Authentication failure (401). Please check your VAPI_PUBLIC_KEY in .env. (${rawErrorMessage})`);
                } else if (rawErrorMessage.toLowerCase().includes('microphone')) {
                    setError('Microphone access denied. Please allow microphone permissions in your browser.');
                } else {
                    setError(`A connection error occurred: ${rawErrorMessage}`);
                }
            });

        } catch (err) {
            console.error(err);
            if (err.response?.status === 400 && err.response?.data?.detail?.includes('completed')) {
                setIsInterviewCompleted(true);
            } else {
                setError(err.response?.data?.detail || 'Failed to load interview session. Link may be expired.');
            }
        } finally {
            setLoading(false);
        }
    };

    const startInterview = async () => {
        if (!vapiRef.current || !config) return;

        try {
            setVapiStatus('connecting');
            // Merge metadata directly into the assistant configuration
            const assistantWithMetadata = {
                ...config.vapi_config,
                metadata: {
                    session_id: sessionId,
                    candidate_id: config.candidate_id,
                    job_id: config.job_id
                }
            };
            await vapiRef.current.start(assistantWithMetadata);
            if (vapiRef.current.setMuted) vapiRef.current.setMuted(false);
            setVapiStatus('active');
            setIsCallActive(true);
        } catch (err) {
            console.error('Failed to start Vapi call:', err);
            setVapiStatus('error');
            setError('Could not start the AI assistant. Please check your mic permissions.');
        }
    };

    const endInterview = async () => {
        console.log('Ending interview...');
        if (vapiRef.current) {
            try {
                await vapiRef.current.stop();
                console.log('Vapi stop called successfully');
                setVapiStatus('idle');
                setIsCallActive(false);
                setIsInterviewCompleted(true);
            } catch (err) {
                console.error('Error stopping Vapi call:', err);
                setVapiStatus('idle');
                setIsCallActive(false);
            }
        }
    };

    if (loading) return (
        <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div className="loader"></div>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Preparing your interview environment...</p>
        </div>
    );

    if (error) return (
        <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: '2rem' }}>
            <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', marginBottom: '1.5rem' }}>
                <AlertCircle size={48} color="var(--danger)" />
            </div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Interview Unavailable</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: '1.6' }}>{error}</p>
            <Link to="/" className="btn btn-secondary" style={{ marginTop: '2rem' }}>Back to Home</Link>
        </div>
    );

    if (isInterviewCompleted) return (
        <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: '2rem' }}>
            <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', marginBottom: '1.5rem' }}>
                <CheckCircle size={64} color="var(--success)" />
            </div>
            <h1 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '2.5rem' }}>Interview Completed!</h1>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', fontSize: '1.1rem', lineHeight: '1.6' }}>
                Thank you, <strong>{config?.candidate_name}</strong>. Your responses/conversation have been recorded and sent to the recruitment team for the <strong>{config?.job_title}</strong> position.
            </p>
            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>You may close this window now.</p>
        </div>
    );

    return (
        <div className="page-enter" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 1.2rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '20px', color: '#818cf8', fontWeight: '600', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    <Sparkles size={16} /> AI Screening Interview
                </div>
                <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Welcome, {config.candidate_name}</h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Position: {config.job_title}</p>
            </div>

            {/* Stage */}
            <div className="glass-panel" style={{
                padding: '3rem',
                borderRadius: '32px',
                border: isCallActive ? '2px solid #818cf8' : '1px solid rgba(255,255,255,0.1)',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.5s ease',
                boxShadow: isCallActive ? '0 0 50px rgba(99, 102, 241, 0.2)' : 'var(--shadow-lg)'
            }}>
                {isCallActive && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '4px',
                        background: 'linear-gradient(90deg, transparent, #818cf8, transparent)',
                        animation: 'shimmer 2s infinite'
                    }}></div>
                )}

                <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto',
                        background: isCallActive ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${isCallActive ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
                        animation: isCallActive ? 'pulse 2s infinite' : 'none'
                    }}>
                        {isCallActive ? <Mic size={48} color="#818cf8" style={{ transform: `scale(${1 + volume * 0.5})` }} /> : <MicOff size={48} color="rgba(255,255,255,0.2)" />}
                    </div>
                    {isCallActive && (
                        <div style={{ marginTop: '1rem', width: '100px', height: '4px', background: 'rgba(255,255,255,0.1)', margin: '0 auto', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, volume * 300)}%`, height: '100%', background: '#818cf8', transition: 'width 0.1s ease' }}></div>
                        </div>
                    )}
                    {isCallActive && (
                        <div style={{ marginTop: '1.5rem', color: isSpeaking ? '#818cf8' : 'var(--text-secondary)', fontWeight: '700', letterSpacing: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.3s ease' }}>
                            <div className={isSpeaking ? "dot-pulse" : ""} style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSpeaking ? '#818cf8' : 'transparent' }}></div>
                            {isSpeaking ? 'I AM LISTENING...' : 'SPEAK NOW'}
                        </div>
                    )}
                </div>

                {!isCallActive ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', textAlign: 'left', maxWidth: '500px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-primary)', marginBottom: '0.8rem', fontSize: '1rem' }}>
                                <Info size={18} color="#818cf8" /> Instructions
                            </h3>
                            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.2rem' }}>
                                <li>The AI will introduce itself and ask screening questions.</li>
                                <li>Speak clearly and naturally as if talking to a person.</li>
                                <li>Feel free to ask questions about the role or salary.</li>
                                <li>You can end the interview at any time.</li>
                            </ul>
                        </div>
                        <button
                            onClick={startInterview}
                            disabled={vapiStatus === 'connecting'}
                            className="btn btn-primary"
                            style={{
                                padding: '1.2rem 3rem', fontSize: '1.2rem', borderRadius: '50px',
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                                boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)'
                            }}
                        >
                            {vapiStatus === 'connecting' ? 'Connecting...' : <><Play fill="currentColor" size={20} /> Start Interview</>}
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>The AI is listening. Speak clearly.</p>
                        <button
                            onClick={endInterview}
                            className="btn btn-secondary"
                            style={{
                                padding: '1rem 2.5rem', borderRadius: '50px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.05)',
                                color: 'var(--danger)',
                                display: 'flex', alignItems: 'center', gap: '0.8rem'
                            }}
                        >
                            <PhoneOff size={18} /> End Interview
                        </button>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
                    70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(99, 102, 241, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }

                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .dot-pulse {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: #818cf8;
                    animation: dot-pulse 1.5s infinite;
                }

                @keyframes dot-pulse {
                    0% { opacity: 0.2; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                    100% { opacity: 0.2; transform: scale(0.8); }
                }
            ` }} />
        </div>
    );
}
