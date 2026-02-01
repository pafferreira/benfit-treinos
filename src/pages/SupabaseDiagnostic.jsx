import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Play, Loader2, CheckCircle, XCircle, AlertTriangle, FileJson } from 'lucide-react';
import './SupabaseDiagnostic.css';

const SupabaseDiagnostic = () => {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const runDiagnostic = async () => {
        setLoading(true);
        const diagnosticResults = {
            timestamp: new Date().toISOString(),
            env: {
                url: import.meta.env.VITE_SUPABASE_URL ? 'Configured' : 'Missing',
                key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configured' : 'Missing',
            },
            tables: {}
        };

        // Test each table
        const tables = [
            'b_users',
            'b_exercises',
            'b_workouts',
            'b_workout_days',
            'b_workout_exercises',
            'b_user_assignments',
            'b_workout_sessions',
            'b_session_logs',
            'b_ai_chat_history',
            'b_user_progress'
        ];

        for (const table of tables) {
            try {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    diagnosticResults.tables[table] = {
                        status: 'Error',
                        error: error.message,
                        code: error.code
                    };
                } else {
                    diagnosticResults.tables[table] = {
                        status: 'OK',
                        count: count || 0
                    };
                }
            } catch (err) {
                diagnosticResults.tables[table] = {
                    status: 'Exception',
                    error: err.message
                };
            }
        }

        setResult(diagnosticResults);
        setLoading(false);
    };

    return (
        <div className="diagnostic-container">
            <div className="diagnostic-header">
                <h1 className="diagnostic-title">System Check</h1>
                <p>Verify your Supabase connection and database status.</p>
            </div>

            <button
                className="run-btn"
                onClick={runDiagnostic}
                disabled={loading}
            >
                {loading ? <Loader2 className="spinner" /> : <Play size={20} />}
                {loading ? 'Running Diagnostic...' : 'Run Diagnostic'}
            </button>

            {result && (
                <div className="results-section">
                    {/* Environment */}
                    <div className="result-card">
                        <h3 className="result-title">Environment Variables</h3>
                        <div className={`status-row ${result.env.url === 'Configured' ? 'success' : 'error'}`}>
                            <span>VITE_SUPABASE_URL</span>
                            <span>{result.env.url}</span>
                        </div>
                        <div className={`status-row ${result.env.key === 'Configured' ? 'success' : 'error'}`}>
                            <span>VITE_SUPABASE_ANON_KEY</span>
                            <span>{result.env.key}</span>
                        </div>
                    </div>

                    {/* Tables */}
                    <div className="result-card">
                        <h3 className="result-title">Database Tables</h3>
                        {Object.entries(result.tables).map(([table, info]) => (
                            <div
                                key={table}
                                className={`status-row ${info.status === 'OK' ? 'success' : 'error'}`}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <strong>{table}</strong>
                                    {info.error && <span style={{ fontSize: '0.75rem' }}>{info.error}</span>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {info.status === 'OK' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                    {info.count !== undefined && <span>{info.count} rows</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Next Steps */}
                    <div className="next-steps">
                        <h3 className="result-title" style={{ color: 'inherit' }}>
                            <AlertTriangle size={18} style={{ display: 'inline', marginRight: '0.5rem' }} />
                            Next Steps
                        </h3>
                        {result.env.url === 'Missing' || result.env.key === 'Missing' ? (
                            <p>⚠️ Configure your .env file with Supabase credentials</p>
                        ) : Object.values(result.tables).some(t => t.status !== 'OK') ? (
                            <div>
                                <p>⚠️ Some tables are missing or have errors</p>
                                <p>📝 Execute these SQL scripts in Supabase Dashboard:</p>
                                <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                                    <li>database/supabase_database_script.sql</li>
                                    <li>database/supabase_data_population.sql</li>
                                </ol>
                            </div>
                        ) : (
                            <p>✅ Everything looks good! Your Supabase integration is working.</p>
                        )}
                    </div>

                    {/* Raw JSON */}
                    <details>
                        <summary style={{ cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <FileJson size={18} /> Raw JSON Results
                        </summary>
                        <pre className="raw-json">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    );
};

export default SupabaseDiagnostic;
