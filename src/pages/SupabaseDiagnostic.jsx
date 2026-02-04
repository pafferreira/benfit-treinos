import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SupabaseDiagnostic = () => {
    const [status, setStatus] = useState('Checking...');
    const [users, setUsers] = useState(null);
    const [error, setError] = useState(null);
    const [envInfo, setEnvInfo] = useState({});

    useEffect(() => {
        const checkConnection = async () => {
            const url = import.meta.env.VITE_SUPABASE_URL || 'NOT_SET';
            setEnvInfo({
                url: url.substring(0, 15) + '...',
                key_configured: !!import.meta.env.VITE_SUPABASE_ANON_KEY
            });

            try {
                // Try to fetch users
                const { data, error } = await supabase
                    .from('b_users')
                    .select('*')
                    .limit(10);

                if (error) {
                    setError(error);
                    setStatus('FAILED');
                } else {
                    setUsers(data);
                    setStatus('SUCCESS');
                }
            } catch (err) {
                setError(err);
                setStatus('CRITICAL ERROR');
            }
        };

        checkConnection();
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace', background: '#f0f0f0', minHeight: '100vh' }}>
            <h1>Supabase Diagnostic</h1>

            <div style={{ marginBottom: '20px', padding: '10px', background: 'white', borderRadius: '4px' }}>
                <h3>Environment</h3>
                <pre>{JSON.stringify(envInfo, null, 2)}</pre>
            </div>

            <div style={{ marginBottom: '20px', padding: '10px', background: 'white', borderRadius: '4px' }}>
                <h3>Connection Status: <span style={{ color: status === 'SUCCESS' ? 'green' : 'red' }}>{status}</span></h3>
            </div>

            {error && (
                <div style={{ marginBottom: '20px', padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
                    <h3>Error</h3>
                    <pre>{JSON.stringify(error, null, 2)}</pre>
                    {error.message && <p><strong>Message:</strong> {error.message}</p>}
                    {error.hint && <p><strong>Hint:</strong> {error.hint}</p>}
                </div>
            )}

            <div style={{ padding: '10px', background: 'white', borderRadius: '4px' }}>
                <h3>B_Users Table Content (Raw)</h3>
                <p>This shows exactly what the application can see.</p>
                <div style={{ maxHeight: '400px', overflow: 'auto', background: '#333', color: '#fff', padding: '10px' }}>
                    <pre>{users ? JSON.stringify(users, null, 2) : 'Loading...'}</pre>
                </div>
            </div>
        </div>
    );
};

export default SupabaseDiagnostic;
