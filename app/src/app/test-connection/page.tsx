import { createClient } from '@/utils/supabase/server';

export default async function TestConnectionPage() {
    const supabase = await createClient();

    // Try to select from the 'people' table which should exist if migrations ran
    const { count, error } = await supabase.from('people').select('*', { count: 'exact', head: true });

    return (
        <div className="p-8 font-sans">
            <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>

            <div className="space-y-4">
                <div className="p-4 border rounded bg-gray-50">
                    <h2 className="font-semibold mb-2">Status:</h2>
                    {error ? (
                        <div className="text-red-600">
                            <p className="font-bold">Connection Failed or Schema Missing</p>
                            <pre className="mt-2 bg-red-50 p-2 rounded text-sm overflow-auto">
                                {JSON.stringify(error, null, 2)}
                            </pre>
                            <p className="mt-4 text-sm text-gray-700">
                                If the error is "relation 'people' does not exist", it means the database schema hasn't been pushed yet.
                            </p>
                        </div>
                    ) : (
                        <div className="text-green-600">
                            <p className="font-bold">Connection Successful!</p>
                            <p>The 'people' table exists and is accessible.</p>
                            <p className="mt-2">Row Count: <span id="row-count">{count}</span></p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
