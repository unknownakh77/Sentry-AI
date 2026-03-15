'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function CaseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rollingBack, setRollingBack] = useState(false);

  useEffect(() => {
    fetchCase();
  }, [id]);

  const fetchCase = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/api/cases/${id}`);
      const data = await res.json();
      if (data.caseData) setCaseData(data.caseData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    try {
      setRollingBack(true);
      await fetch(`http://localhost:3001/api/actions/${id}/rollback`, { method: 'POST' });
      await fetchCase();
    } catch (err) {
      console.error(err);
    } finally {
      setRollingBack(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500 flex items-center"><RefreshCw className="animate-spin w-5 h-5 mr-2" /> Loading investigation record...</div>;
  if (!caseData) return <div className="p-8 text-red-500">Case not found.</div>;

  const { toolCalls, auditLogs, ...c } = caseData;
  const isRolledBack = c.actionStatus === 'rolled_back';

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </Link>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 border-b-2 border-slate-100 pb-2 inline-block">
            Investigation Record: <span className="font-mono text-slate-500 text-lg ml-2">{id}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Event Type: <span className="font-semibold capitalize text-slate-700">{c.eventType.replace('_', ' ')}</span> &bull; {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`px-4 py-2 rounded-lg border flex flex-col items-center justify-center min-w-[120px] 
            ${c.classification === 'HIGH' ? 'bg-red-50 border-red-200' : c.classification === 'MEDIUM' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Risk Score</span>
            <span className={`text-2xl font-bold ${c.classification === 'HIGH' ? 'text-red-700' : c.classification === 'MEDIUM' ? 'text-amber-700' : 'text-green-700'}`}>
              {c.riskScore}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Left Column: Context & Action */}
        <div className="col-span-1 space-y-6">
          {/* Action Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 font-semibold text-slate-800 flex items-center justify-between">
              Automated Response
              {isRolledBack && <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Rolled Back</span>}
            </div>
            <div className="p-5">
              <div className="flex items-center mb-4">
                {c.action === 'allow' ? (
                  <ShieldCheck className="w-6 h-6 text-green-500 mr-2" />
                ) : (
                  <AlertTriangle className={`w-6 h-6 mr-2 ${isRolledBack ? 'text-amber-500' : 'text-blue-600'}`} />
                )}
                <span className={`font-semibold text-lg ${isRolledBack ? 'text-amber-700 line-through' : 'text-slate-800'}`}>
                  {c.action.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              {c.action !== 'allow' && !isRolledBack && (
                <button 
                  onClick={handleRollback}
                  disabled={rollingBack}
                  className="w-full py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                >
                  {rollingBack ? 'Rolling back...' : 'Reverse Action (Rollback)'}
                </button>
              )}
            </div>
          </div>

          {/* Evidence Card */}
          {c.evidenceList && JSON.parse(c.evidenceList).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 font-semibold text-slate-800">
                Grounding Evidence
              </div>
              <ul className="p-5 space-y-3">
                {JSON.parse(c.evidenceList).map((evidence: string, idx: number) => (
                  <li key={idx} className="flex items-start text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-slate-400 mr-2 mt-0.5 shrink-0" />
                    {evidence}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Audit Logs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 font-semibold text-slate-800">
              Audit Trail
            </div>
            <div className="p-5">
              <div className="space-y-4">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="text-xs">
                    <div className="text-slate-500 mb-0.5">{new Date(log.createdAt).toLocaleString()}</div>
                    <div className="font-medium text-slate-800">[{log.actor}] {log.status.toUpperCase()} {log.action}</div>
                    <div className="text-slate-600">{log.reason}</div>
                  </div>
                ))}
                {auditLogs.length === 0 && <div className="text-sm text-slate-400">No manual audit events.</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Agent Trajectory */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Agent Execution Trajectory</h2>
              <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">
                Visible Reasoning Runtime
              </span>
            </div>
            <div className="p-6">
              <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
                
                {toolCalls.map((tc: any, index: number) => (
                  <div key={tc.id} className="relative pl-6 group">
                    {/* Node Dot */}
                    <div className={`absolute -left-[9px] top-1 rounded-full w-4 h-4 border-2 outline outline-4 outline-white ${tc.status === 'success' ? 'bg-blue-500 border-blue-500' : 'bg-red-500 border-red-500'}`} />
                    
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                          {tc.tool.replace('_', ' ')}
                        </h3>
                        {tc.latencyMs && (
                          <span className="text-xs font-mono text-slate-400 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {tc.latencyMs}ms
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100 leading-relaxed shadow-inner">
                        {tc.summary}
                      </div>
                      
                      {tc.rawRef && (
                        <div className="mt-2">
                          <details className="text-xs">
                            <summary className="text-slate-500 cursor-pointer hover:text-blue-600 ml-1 font-medium transition-colors">View raw JSON context</summary>
                            <pre className="mt-2 p-3 bg-slate-900 text-slate-300 rounded overflow-x-auto text-[10px] leading-tight">
                              {JSON.stringify(JSON.parse(tc.rawRef), null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
