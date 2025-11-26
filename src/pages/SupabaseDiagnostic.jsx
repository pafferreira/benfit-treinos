import { useState } from 'react';
import { supabase } from '../lib/supabase';

const SupabaseDiagnostic = () => {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const runDiagnostic = async () => {
        setLoading(true);
        const diagnosticResults = {
            timestamp: new Date().toISOString(),
            env: {
                url: import.meta.env.VITE_SUPABASE_URL ? '✅ Configured' : '❌ Missing',
                key: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Missing',
            },
            tables: {}
        };

        // Test each table
        const tables = [
            'B_Users',
            'B_Exercises',
            'B_Workouts',
            'B_Workout_Days',
            'B_Workout_Exercises',
            'B_User_Assignments',
            'B_Workout_Sessions',
            'B_Session_Logs',
            'B_AI_Chat_History',
            'B_User_Progress'
        ];

        for (const table of tables) {
            try {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    diagnosticResults.tables[table] = {
                        status: '❌ Error',
                        error: error.message,
                        code: error.code
                    };
                } else {
                    diagnosticResults.tables[table] = {
                        status: '✅ OK',
                        count: count || 0
                    };
                }
            } catch (err) {
                diagnosticResults.tables[table] = {
                    status: '❌ Exception',
                    error: err.message
                };
            }
        }

        setResult(diagnosticResults);
        setLoading(false);
    };

    return (
        <div style={{
            padding: '2rem',
            maxWidth: '800px',
            margin: '0 auto',
            fontFamily: 'monospace'
        }}>
            <h1>🔍 Supabase Diagnostic</h1>

            <button
                onClick={runDiagnostic}
                disabled={loading}
                style={{
                    padding: '0.75rem 1.5rem',
                    background: loading ? '#ccc' : '#F59E0B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    marginBottom: '2rem'
                }}
            >
                {loading ? '🔄 Running...' : '▶️ Run Diagnostic'}
            </button>

            {result && (
                <div>
                    <h2>📊 Results</h2>

                    <div style={{
                        background: '#f5f5f5',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                    }}>
                        <h3>Environment Variables</h3>
                        <p>VITE_SUPABASE_URL: {result.env.url}</p>
                        <p>VITE_SUPABASE_ANON_KEY: {result.env.key}</p>
                    </div>

                    <div style={{
                        background: '#f5f5f5',
                        padding: '1rem',
                        borderRadius: '8px'
                    }}>
                        <h3>Database Tables</h3>
                        {Object.entries(result.tables).map(([table, info]) => (
                            <div key={table} style={{
                                padding: '0.5rem',
                                marginBottom: '0.5rem',
                                background: info.status.includes('✅') ? '#d4edda' : '#f8d7da',
                                borderRadius: '4px'
                            }}>
                                <strong>{table}</strong>: {info.status}
                                {info.count !== undefined && ` (${info.count} rows)`}
                                {info.error && (
                                    <div style={{ fontSize: '0.85rem', color: '#721c24', marginTop: '0.25rem' }}>
                                        Error: {info.error}
                                        {info.code && ` (Code: ${info.code})`}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div style={{
                        marginTop: '2rem',
                        padding: '1rem',
                        background: '#fff3cd',
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                    }}>
                        <h3>💡 Next Steps</h3>
                        {result.env.url === '❌ Missing' || result.env.key === '❌ Missing' ? (
                            <p>⚠️ Configure your .env file with Supabase credentials</p>
                        ) : Object.values(result.tables).some(t => t.status.includes('❌')) ? (
                            <>
                                <p>⚠️ Some tables are missing or have errors</p>
                                <p>📝 Execute these SQL scripts in Supabase Dashboard:</p>
                                <ol>
                                    <li>database/supabase_database_script.sql</li>
                                    <li>database/supabase_data_population.sql</li>
                                </ol>
                            </>
                        ) : (
                            <p>✅ Everything looks good! Your Supabase integration is working.</p>
                        )}
                    </div>

                    <details style={{ marginTop: '2rem' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                            📋 Raw JSON Results
                        </summary>
                        <pre style={{
                            background: '#1e1e1e',
                            color: '#d4d4d4',
                            padding: '1rem',
                            borderRadius: '8px',
                            overflow: 'auto',
                            fontSize: '0.85rem'
                        }}>
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    );
};

export default SupabaseDiagnostic;
