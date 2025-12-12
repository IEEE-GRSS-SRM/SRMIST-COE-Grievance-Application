import { useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthProvider';

function StatusBadge({ status }) {
  const statusStyles = {
    pending: 'status-pending',
    resolved: 'status-resolved',
    escalated: 'status-escalated',
    terminated: 'status-terminated'
  };
  
  const statusIcons = {
    pending: (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
      </svg>
    ),
    resolved: (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
      </svg>
    ),
    escalated: (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
      </svg>
    ),
    terminated: (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
      </svg>
    )
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {statusIcons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RequestHistory({ refreshKey = 0 }) {
  const { session, supabase } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [profile, setProfile] = useState(null);
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [resubmitText, setResubmitText] = useState('');
  const [resubmitFile, setResubmitFile] = useState(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  // const [deletingMine, setDeletingMine] = useState(false); // Disabled: delete all requests

  // Helper to fetch the student's requests
  const fetchStudentRequests = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('examination_requests')
        .select(`
            *,
            departments:department_id (name, code),
            branches:branch_id (branch_name),
            campuses:campus_id (campus)
          `)
        .eq('student_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to load your requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    
    // First fetch the user profile to determine the role
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error) {
          throw error;
        }
        
        setProfile(data);
        
        // Only fetch requests if the user is a student
        if (data.role === 'student') {
          fetchStudentRequests();
        } else {
          // For admin users, we don't need to load anything here
          // They should be redirected to AdminDashboard
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load your profile information');
        setLoading(false);
      }
    };
    
    fetchUserProfile();

    // Subscribe to realtime changes for this student's requests
    const channel = supabase.channel('examination_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'examination_requests', filter: `student_id=eq.${session.user.id}` }, (payload) => {
        // Refetch on any insert/update/delete affecting this student's requests
        fetchStudentRequests();
      });
    channel.subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [session, supabase, refreshKey]);
  
  const fetchResponses = async (requestId) => {
    if (!requestId) return;
    
    try {
      setLoadingResponses(true);
      
      const { data, error } = await supabase
        .from('request_responses')
        .select(`
          *,
          responder:responder_id (full_name, role)
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      setResponses(data || []);
    } catch (err) {
      console.error('Error fetching responses:', err);
    } finally {
      setLoadingResponses(false);
    }
  };
  
  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    fetchResponses(request.id);
  };
  
  const closeDetails = () => {
    setSelectedRequest(null);
    setResponses([]);
  };

  const startResubmit = (request) => {
    setSelectedRequest(request);
    setResubmitOpen(true);
    setResubmitText('');
    setResubmitFile(null);
  };

  // const handleDeleteSingle = async (request) => {
  //   if (!request?.id || !session?.user) return;
  //   const warn = request.status === 'terminated'
  //     ? 'This request is TERMINATED. Are you sure you want to permanently delete it?'
  //     : 'Are you sure you want to permanently delete this request?';
  //   const ok = window.confirm(warn);
  //   if (!ok) return;
  //   try {
  //     setDeletingId(request.id);
  //     // Delete responses related to this request
  //     const { error: respErr } = await supabase
  //       .from('request_responses')
  //       .delete()
  //       .eq('request_id', request.id);
  //     if (respErr) throw respErr;
  //     // Delete the request, scoped to current user for safety
  //     const { error: reqErr } = await supabase
  //       .from('examination_requests')
  //       .delete()
  //       .eq('id', request.id)
  //       .eq('student_id', session.user.id);
  //     if (reqErr) throw reqErr;
  //     // Update local state and close any open modals for this request
  //     setRequests(prev => prev.filter(r => r.id !== request.id));
  //     if (selectedRequest && selectedRequest.id === request.id) {
  //       setSelectedRequest(null);
  //       setResponses([]);
  //     }
  //     if (resubmitOpen && selectedRequest && selectedRequest.id === request.id) {
  //       setResubmitOpen(false);
  //       setResubmitText('');
  //       setResubmitFile(null);
  //     }
  //   } catch (err) {
  //     console.error('Delete request failed:', err);
  //     alert('Failed to delete the request. ' + (err.message || ''));
  //   } finally {
  //     setDeletingId(null);
  //   }
  // };

  const handleResubmit = async () => {
    if (!selectedRequest) return;
    if (!resubmitText.trim() && !resubmitFile) {
      alert('Please provide additional information or attach a supporting file.');
      return;
    }
    try {
      setResubmitting(true);
      // Upload attachment if any
      let attachmentUrl = null;
      if (resubmitFile) {
        const ext = resubmitFile.name.split('.').pop().toLowerCase();
        const allowed = ['pdf','jpg','jpeg','png','gif','xls','xlsx'];
        if (!allowed.includes(ext)) throw new Error('Unsupported file type.');
        const ts = Date.now();
        const fileName = `resubmit_${selectedRequest.id}_${ts}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('request-attachments')
          .upload(fileName, resubmitFile, { cacheControl: '3600', upsert: false, contentType: resubmitFile.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('request-attachments').getPublicUrl(fileName);
        attachmentUrl = pub.publicUrl;
      }

      // Append resubmission note to description for student visibility, keep same request id
      const resubmitNote = `\n\n[Resubmission on ${new Date().toLocaleString()}]\n${resubmitText}`;
      const newAttachments = attachmentUrl ? [ ...(selectedRequest.attachments || []), attachmentUrl ] : selectedRequest.attachments || [];

      // Update request status back to pending and append info
      const { error: updErr } = await supabase
        .from('examination_requests')
        .update({
          status: 'pending',
          description: (selectedRequest.description || '') + resubmitNote,
          attachments: newAttachments
        })
        .eq('id', selectedRequest.id);
      if (updErr) throw updErr;

      // Add a response trail item of type 'resubmission'
      await supabase.from('request_responses').insert({
        request_id: selectedRequest.id,
        responder_id: session.user.id,
        response_text: resubmitText,
        response_type: 'resubmission',
        attachments: attachmentUrl ? [attachmentUrl] : []
      });

      // Refresh list
      // Update local state optimistically
      setRequests(prev => prev.map(r => r.id === selectedRequest.id ? {
        ...r,
        status: 'pending',
        description: (r.description || '') + resubmitNote,
        attachments: newAttachments
      } : r));

      setResubmitOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      console.error('Resubmit failed:', err);
      alert('Failed to resubmit: ' + (err.message || 'Unknown error'));
    } finally {
      setResubmitting(false);
    }
  };

  // If the user is an admin, don't show this component
  if (profile && (profile.role === 'admin' || profile.role === 'super_admin')) {
    return null;
  }

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold mb-4">Request History</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold mb-4">Request History</h2>
        <div className="bg-red-50 p-4 rounded-lg text-red-700 mb-6 border border-red-200">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
            </svg>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
          Request History
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{requests.length} {requests.length === 1 ? 'request' : 'requests'}</span>
          {profile?.role === 'student' && requests.length > 0 && (
            <span className="text-xs text-gray-400" title="Bulk delete disabled">Delete All My Requests (disabled)</span>
          )}
        </div>
      </div>
      
      {requests.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p className="text-gray-500 mb-3">You haven't submitted any requests yet.</p>
          <p className="text-sm text-gray-400">Your examination requests will appear here once submitted.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campus</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-700">{request.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{request.title}</div>
                    <div className="text-xs text-gray-500 capitalize">{request.request_type.replace('_', ' ')}</div>
                  </td>
                  <td className="px-6 py-4"><div className="text-sm text-gray-900">{request.departments?.name || 'Unknown'}</div></td>
                  <td className="px-6 py-4"><div className="text-sm text-gray-900">{request.branches?.branch_name || '-'}</div></td>
                  <td className="px-6 py-4"><div className="text-sm text-gray-900">{request.campuses?.campus || '-'}</div></td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={request.status} />
                      {request.viewed && (
                        <span title="Viewed by faculty/admin" className="inline-flex items-center text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full text-[10px]">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          Viewed
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleViewDetails(request)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                        View
                      </button>
                      {request.status === 'terminated' && (
                        <button
                          onClick={() => startResubmit(request)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100"
                        >
                          Resubmit
                        </button>
                      )}
                      {/* Delete button disabled */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      
      {selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">{selectedRequest.title}</h3>
              <button
                onClick={closeDetails}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Request ID</p>
                  <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mt-1">{selectedRequest.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedRequest.status} />
                    {selectedRequest.viewed && (
                      <span className="inline-flex items-center text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full text-[10px]">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Viewed by Faculty
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="text-sm">{selectedRequest.departments?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Branch</p>
                  <p className="text-sm">{selectedRequest.branches?.branch_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Campus</p>
                  <p className="text-sm">{selectedRequest.campuses?.campus || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Submitted On</p>
                  <p className="text-sm">{new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
              <div className="bg-white p-4 rounded border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>
              
              {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Attachments</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.attachments.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                        </svg>
                        Attachment {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {responses.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Responses</h4>
                <div className="space-y-4">
                  {responses.map((response) => (
                    <div key={response.id} className="bg-white p-4 rounded border border-gray-200">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">{response.responder?.full_name || 'Administrator'}</span>
                        <span className="text-xs text-gray-500">{new Date(response.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap">{response.response_text}</p>
                      
                      {response.attachments && response.attachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex flex-wrap gap-2">
                            {response.attachments.map((url, index) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                                </svg>
                                Attachment {index + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-right">
              <button
                onClick={closeDetails}
                className="secondary-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {resubmitOpen && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Resubmit Request</h3>
              <button onClick={() => setResubmitOpen(false)} className="text-gray-500 hover:text-gray-700" aria-label="Close">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="mb-4 text-sm text-gray-600">You're resubmitting the same request. The Request ID will remain unchanged.</div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Information</label>
              <textarea value={resubmitText} onChange={(e)=>setResubmitText(e.target.value)} className="form-input min-h-[120px]" placeholder="Provide additional details or clarifications" />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (optional)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.xls,.xlsx" onChange={(e)=>setResubmitFile(e.target.files[0])} />
              <p className="text-xs text-gray-500 mt-1">Accepted: PDF, Images, Excel</p>
            </div>
            <div className="flex justify-end gap-3">
              <button className="secondary-button" onClick={()=>setResubmitOpen(false)}>Cancel</button>
              <button className={`primary-button ${resubmitting ? 'opacity-70 cursor-not-allowed':''}`} onClick={handleResubmit} disabled={resubmitting}>
                {resubmitting ? 'Submitting...' : 'Resubmit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestHistory; 