import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, DollarSign, Clock, Search, ExternalLink, Filter } from 'lucide-react';
import api from '../api';

export default function JobsList() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        setLoading(true);
        fetchJobs();
    }, [statusFilter]);

    const fetchJobs = async () => {
        try {
            const url = statusFilter === 'all' ? '/jobs' : `/jobs?status=${statusFilter}`;
            const { data } = await api.get(url);
            setJobs(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getBadgeClass = (status) => {
        switch (status) {
            case 'published': return 'badge-published';
            case 'closed': return 'badge-closed';
            default: return 'badge-draft';
        }
    };

    return (
        <div className="page-enter">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h2>Open Positions</h2>
                    <p className="text-subtitle">Manage all job postings in one place</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <Filter size={18} color="var(--text-secondary)" />
                    <select
                        className="form-control"
                        style={{ width: 'auto', padding: '0.5rem', border: 'none', background: 'transparent' }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all" style={{ color: 'black' }}>All Statuses</option>
                        <option value="published" style={{ color: 'black' }}>Published</option>
                        <option value="draft" style={{ color: 'black' }}>Drafts</option>
                        <option value="closed" style={{ color: 'black' }}>Closed</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loader"></div>
            ) : (
                <div className="jobs-list-layout">
                    {jobs.length === 0 ? (
                        <div className="empty-state">
                            <Search className="empty-state-icon" />
                            <h3>No jobs found</h3>
                            <p>Try changing your filter or get started by creating a new job.</p>
                            <Link to="/create" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Create Job</Link>
                        </div>
                    ) : (
                        jobs.map(job => (
                            <div key={job.id} className="glass-panel job-card-horizontal">
                                <div className="job-row-main">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                        <h3 className="job-title" style={{ margin: 0 }}>{job.title}</h3>
                                        <span className={`badge ${getBadgeClass(job.status)}`}>{job.status}</span>
                                    </div>
                                    <div className="job-meta-list">
                                        <span className="job-meta-item"><MapPin size={16} /> {job.location}</span>
                                        <span className="job-meta-item"><Clock size={16} /> {job.job_type}</span>
                                    </div>
                                </div>

                                <div className="job-row-meta text-subtitle">
                                    {job.salary_range && <span className="job-meta-item" style={{ color: 'var(--success)' }}><DollarSign size={16} /> {job.salary_range}</span>}
                                    <span style={{ fontSize: '0.85rem' }}>Updated: {new Date(job.updated_at).toLocaleDateString()}</span>
                                </div>

                                <div className="job-row-actions">
                                    <Link to={`/job/${job.id}`} className="btn btn-secondary">
                                        View Details <ExternalLink size={14} style={{ marginLeft: '0.3rem' }} />
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
