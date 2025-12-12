import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthProvider';

function StatusBadge({ status }) {
  const statusStyles = {
    pending: 'status-pending',
    resolved: 'status-resolved',
    escalated: 'status-escalated',
    terminated: 'status-terminated'
  };
  
  return (
    <span className={`status-badge ${statusStyles[status] || 'bg-gray-100'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function AdminDashboard() {
  const { session, supabase, signOut } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [responseFile, setResponseFile] = useState(null);
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [tab, setTab] = useState('pending');
  const [filePreview, setFilePreview] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [previousResponses, setPreviousResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info'); // 'info' | 'warning' | 'error' | 'success'
  const [deletingResolved, setDeletingResolved] = useState(false);
  // Stats for super admin home
  const [homeStats, setHomeStats] = useState({
    totalRequests: 0,
    byStatus: { pending: 0, escalated: 0, resolved: 0, terminated: 0 },
    totalStudents: 0,
    totalAdmins: 0,
    totalSuperAdmins: 0,
    departments: 0,
    branches: 0
  });
  // Pie chart range filter state (Home tab)
  const [pieFrom, setPieFrom] = useState('');
  const [pieTo, setPieTo] = useState('');
  const [pieStats, setPieStats] = useState({ total: 0, byStatus: { pending: 0, escalated: 0, resolved: 0, terminated: 0 } });
  const [overviewRangeStats, setOverviewRangeStats] = useState({ departments: 0, branches: 0, byStatus: { pending: 0, escalated: 0, resolved: 0, terminated: 0 } });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const showToast = (msg, type = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    if (!session?.user) return;
    
    const fetchAdminProfile = async () => {
      try {
        console.log('Fetching admin profile...');
        const { data, error } = await supabase
          .from('profiles')
          .select('*, departments:department_id(*)')
          .eq('id', session.user.id)
          .single();
          
        if (error) {
          console.error('Error fetching admin profile:', error);
          throw error;
        }
        
        console.log('Admin profile loaded:', data);
        setProfile(data);
        
        // Check if user is admin
        if (data.role !== 'admin' && data.role !== 'super_admin') {
          setError('Access denied. You do not have administrator privileges.');
          setLoading(false);
          return;
        }
  
  // Set default tab for super_admin to home, else pending
  const initialTab = data.role === 'super_admin' ? 'home' : 'pending';
        setTab(initialTab);
        // Fetch requests after profile is loaded
        await fetchRequests(data, initialTab);
      } catch (err) {
        console.error('Error in fetchAdminProfile:', err);
        setError('Failed to load your profile information: ' + (err.message || 'Unknown error'));
        setLoading(false);
      }
    };
    
    fetchAdminProfile();
  }, [session, supabase]);
  
  useEffect(() => {
    // Create preview URL for file if selected
    if (responseFile) {
      const fileType = responseFile.type.split('/')[0];
      if (fileType === 'image') {
        const objectUrl = URL.createObjectURL(responseFile);
        setFilePreview(objectUrl);
        
        return () => URL.revokeObjectURL(objectUrl);
      } else {
        setFilePreview(null);
      }
    }
  }, [responseFile]);

  // Filter requests when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRequests(requests);
      return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const filtered = requests.filter(request => 
      request.id.toLowerCase().includes(term)
    );
    
    setFilteredRequests(filtered);
  }, [searchTerm, requests]);
  
  const fetchRequests = async (adminProfile, tab) => {
    if (!adminProfile) {
      console.error('Cannot fetch requests: adminProfile is null');
      return;
    }
    
    try {
      setLoadingRequests(true);
      console.log('Fetching requests for role:', adminProfile.role, 'tab:', tab);
      
      // Department-specific query for regular admins
      let query = supabase
        .from('examination_requests')
        .select(`
          *,
          departments:department_id(*),
          branches:branch_id(*),
          campuses:campus_id(campus),
          student:student_id(id, full_name, email, student_id, phone),
          responses:request_responses(*)
        `)
        .order('created_at', { ascending: false });
      
      // Filter requests by department for regular admins
      if (adminProfile.role === 'admin') {
        console.log('Filtering by department:', adminProfile.department_id);
        query = query.eq('department_id', adminProfile.department_id);
      }
      
      // For super_admin role, allow viewing across all departments
      if (adminProfile.role === 'super_admin') {
        if (tab === 'home') {
          // Build stats instead of listing
          const [allReq, pend, esc, res, ter, students, admins, superAdmins, depts, brs] = await Promise.all([
            supabase.from('examination_requests').select('id', { count: 'exact', head: true }),
            supabase.from('examination_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('examination_requests').select('id', { count: 'exact', head: true }).eq('status', 'escalated'),
            supabase.from('examination_requests').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
            supabase.from('examination_requests').select('id', { count: 'exact', head: true }).eq('status', 'terminated'),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'super_admin'),
            supabase.from('departments').select('id', { count: 'exact', head: true }),
            supabase.from('branches').select('id', { count: 'exact', head: true })
          ]);
          const nextHome = {
            totalRequests: allReq.count || 0,
            byStatus: {
              pending: pend.count || 0,
              escalated: esc.count || 0,
              resolved: res.count || 0,
              terminated: ter.count || 0,
            },
            totalStudents: students.count || 0,
            totalAdmins: admins.count || 0,
            totalSuperAdmins: superAdmins.count || 0,
            departments: depts.count || 0,
            branches: brs.count || 0
          };
          setHomeStats(nextHome);
          // Initialize pie stats with global counts by default
          setPieStats({
            total: (allReq.count || 0),
            byStatus: {
              pending: pend.count || 0,
              escalated: esc.count || 0,
              resolved: res.count || 0,
              terminated: ter.count || 0,
            }
          });
          // Initialize overview range stats to global snapshot
          setOverviewRangeStats({
            departments: nextHome.departments,
            branches: nextHome.branches,
            byStatus: { ...nextHome.byStatus }
          });
          setRequests([]);
          setFilteredRequests([]);
          setLoadingRequests(false);
          setLoading(false);
          return;
        } else if (tab === 'all') {
          console.log('Super admin viewing all requests (no status filter)');
          // No additional status filter; query already selects across all departments
        } else if (tab === 'resolved') {
          console.log('Super admin viewing all resolved requests');
          query = query.eq('status', 'resolved');
        } else if (tab === 'escalated') {
          console.log('Super admin viewing all escalated requests');
          query = query.eq('status', 'escalated');
        } else if (tab === 'terminated') {
          console.log('Super admin viewing all terminated requests');
          query = query.eq('status', 'terminated');
        } else if (tab === 'pending') {
          console.log('Super admin viewing all pending requests');
          query = query.eq('status', 'pending');
        }
      } else {
        // Regular admin tab filters
        if (tab === 'pending') {
          console.log('Filtering for pending requests only');
          query = query.eq('status', 'pending');
        } else if (tab === 'resolved') {
          console.log('Filtering for resolved requests only');
          query = query.eq('status', 'resolved');
        } else if (tab === 'escalated') {
          console.log('Filtering for escalated requests only');
          query = query.eq('status', 'escalated');
        } else if (tab === 'terminated') {
          console.log('Filtering for terminated requests only');
          query = query.eq('status', 'terminated');
        }
      }
      
      console.log('Final query parameters:', { 
        role: adminProfile.role,
        tab: tab,
        department: adminProfile.role === 'admin' ? adminProfile.department_id : 'all'
      });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error in request query:', error);
        throw error;
      }
      
      console.log(`Requests loaded for ${tab} tab:`, data?.length || 0);
      
      // For super_admin, no extra filtering – they can view all matching the tab
      let filteredData = data;
      
      // Verify student data is loaded correctly
      if (filteredData && filteredData.length > 0) {
        const missingStudentData = filteredData.filter(req => !req.student || !req.student.email);
        if (missingStudentData.length > 0) {
          console.warn(`${missingStudentData.length} requests have missing student data`);
          
          // For each request with missing student data, fetch it directly
          for (const req of missingStudentData) {
            console.log(`Fetching missing student data for request ${req.id}`);
            const { data: studentData, error: studentError } = await supabase
              .from('profiles')
              .select('id, full_name, email, student_id, phone')
              .eq('id', req.student_id)
              .single();
              
            if (studentError) {
              console.error(`Error fetching student data for request ${req.id}:`, studentError);
            } else if (studentData) {
              req.student = studentData;
              console.log(`Updated student data for request ${req.id}:`, studentData.email);
            }
          }
        }
      }
      
      setRequests(filteredData || []);
      setFilteredRequests(filteredData || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to load requests: ' + (err.message || 'Unknown error'));
    } finally {
      setLoadingRequests(false);
      setLoading(false);
    }
  };

  // Helper to compute pie stats with optional date range
  const updatePieStats = async (fromDate, toDate) => {
    try {
      let startISO = null;
      let endISO = null;
      if (fromDate) {
        startISO = new Date(`${fromDate}T00:00:00`).toISOString();
      }
      if (toDate) {
        endISO = new Date(`${toDate}T23:59:59.999`).toISOString();
      }

      const base = (status) => {
        let q = supabase.from('examination_requests').select('id', { count: 'exact', head: true });
        if (status) q = q.eq('status', status);
        if (startISO) q = q.gte('created_at', startISO);
        if (endISO) q = q.lte('created_at', endISO);
        return q;
      };

      const depRowsQ = (() => {
        let q = supabase.from('examination_requests').select('department_id');
        if (startISO) q = q.gte('created_at', startISO);
        if (endISO) q = q.lte('created_at', endISO);
        return q;
      })();
      const brRowsQ = (() => {
        let q = supabase.from('examination_requests').select('branch_id');
        if (startISO) q = q.gte('created_at', startISO);
        if (endISO) q = q.lte('created_at', endISO);
        return q;
      })();

      const [allReq, pend, esc, res, ter, depRows, brRows] = await Promise.all([
        base(),
        base('pending'),
        base('escalated'),
        base('resolved'),
        base('terminated'),
        depRowsQ,
        brRowsQ,
      ]);

      setPieStats({
        total: allReq.count || 0,
        byStatus: {
          pending: pend.count || 0,
          escalated: esc.count || 0,
          resolved: res.count || 0,
          terminated: ter.count || 0,
        }
      });
      // Compute distinct counts for departments / branches within range
      const depCount = Array.isArray(depRows?.data) ? new Set(depRows.data.map(r => r.department_id).filter(v => v != null)).size : 0;
      const brCount = Array.isArray(brRows?.data) ? new Set(brRows.data.map(r => r.branch_id).filter(v => v != null)).size : 0;
      setOverviewRangeStats({
        departments: depCount,
        branches: brCount,
        byStatus: {
          pending: pend.count || 0,
          escalated: esc.count || 0,
          resolved: res.count || 0,
          terminated: ter.count || 0,
        }
      });
    } catch (err) {
      console.error('Failed to update pie stats:', err);
      showToast('Failed to update chart. Try a different date range.', 'error');
    }
  };
  
  const handleViewDetails = async (request) => {
    setSelectedRequest(request);
    setResponseText('');
    setResponseFile(null);
    setFilePreview(null);
    // Mark as viewed using the boolean column on examination_requests
    try {
      await supabase
        .from('examination_requests')
        .update({ viewed: true })
        .eq('id', request.id);
    } catch (markErr) {
      console.warn('Could not mark request as viewed (boolean):', markErr?.message || markErr);
    }
    
    // Fetch previous responses for this request
    try {
      setLoadingResponses(true);
      const { data: responses, error } = await supabase
        .from('request_responses')
        .select(`
          *,
          responder:responder_id (full_name, role)
        `)
        .eq('request_id', request.id)
        .neq('response_type', 'viewed')
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Error fetching responses:', error);
      } else {
        setPreviousResponses(responses || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching responses:', err);
    } finally {
      setLoadingResponses(false);
    }
  };
  
  const handleResolve = async () => {
    if (!selectedRequest || !responseText.trim()) {
      showToast('please fill the respond to request', 'warning');
      return;
    }
    
    try {
      setSubmittingResponse(true);
      
      // Upload response attachment if provided
      let attachmentUrl = null;
      if (responseFile) {
        const fileExt = responseFile.name.split('.').pop().toLowerCase();
        const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'xls', 'xlsx'];
        
        if (!allowedTypes.includes(fileExt)) {
          throw new Error('File type not supported. Please upload PDF, Image, or Excel files only.');
        }
        
        // Create a more descriptive filename
        const safeRequestId = selectedRequest.id;
        const timestamp = Date.now();
        const fileName = `response_${safeRequestId}_${timestamp}.${fileExt}`;
        
        console.log('Uploading response file:', fileName);
        
        // Upload the file with content type
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('request-responses')
          .upload(fileName, responseFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: responseFile.type
          });

        if (uploadError) {
          console.error('File upload error:', uploadError);
          throw uploadError;
        }

        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('request-responses')
          .getPublicUrl(fileName);

        // Verify the URL is valid
        attachmentUrl = publicUrl;
        console.log('File uploaded successfully, URL:', attachmentUrl);
        
        // Test if the URL is accessible
        try {
          const testFetch = await fetch(attachmentUrl, { method: 'HEAD' });
          if (!testFetch.ok) {
            console.warn('Attachment URL may not be publicly accessible:', attachmentUrl);
          }
        } catch (err) {
          console.warn('Could not verify attachment URL accessibility:', err);
        }
      }
      
      // Create response record
      console.log('Creating response record...');
      
      // Add a note if this was an escalated request resolved by a super_admin
      let responseTypeNote = '';
      if (selectedRequest.status === 'escalated' && profile?.role === 'super_admin') {
        responseTypeNote = '[Resolved by Super Admin]';
      }
      
      const { data: responseData, error: responseError } = await supabase
        .from('request_responses')
        .insert({
          request_id: selectedRequest.id,
          responder_id: session.user.id,
          response_text: responseTypeNote ? `${responseTypeNote} ${responseText}` : responseText,
          response_type: 'resolution',
          attachments: attachmentUrl ? [attachmentUrl] : []
        })
        .select('*');
        
      if (responseError) {
        console.error('Response record error:', responseError);
        throw responseError;
      }
      
      console.log('Response record created:', responseData);
      
      // Update request status to resolved
      console.log('Updating request status...');
      const { error: updateError } = await supabase
        .from('examination_requests')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: responseText,
          assigned_admin_id: session.user.id
        })
        .eq('id', selectedRequest.id);
        
      if (updateError) {
        console.error('Request update error:', updateError);
        throw updateError;
      }
      
      // Email notifications removed
      
      // Close details modal and refresh
      setSelectedRequest(null);
      setPreviousResponses([]);
      if (profile) {
        fetchRequests(profile, 'pending');
      }
    } catch (err) {
      console.error('Error resolving request:', err);
      alert('Failed to resolve request: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmittingResponse(false);
    }
  };
  
  const handleEscalate = async () => {
    if (!selectedRequest || !responseText.trim()) {
      showToast('please fill the respond to request', 'warning');
      return;
    }
    
    try {
      setSubmittingResponse(true);
      
      // Upload response attachment if provided
      let attachmentUrl = null;
      if (responseFile) {
        const fileExt = responseFile.name.split('.').pop().toLowerCase();
        const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'xls', 'xlsx'];
        
        if (!allowedTypes.includes(fileExt)) {
          throw new Error('File type not supported. Please upload PDF, Image, or Excel files only.');
        }
        
        // Create a more descriptive filename
        const safeRequestId = selectedRequest.id;
        const timestamp = Date.now();
        const fileName = `escalation_${safeRequestId}_${timestamp}.${fileExt}`;
        
        console.log('Uploading escalation file:', fileName);
        
        // Upload the file with content type
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('request-responses')
          .upload(fileName, responseFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: responseFile.type
          });

        if (uploadError) {
          console.error('File upload error:', uploadError);
          throw uploadError;
        }

        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('request-responses')
          .getPublicUrl(fileName);

        // Verify the URL is valid
        attachmentUrl = publicUrl;
        console.log('File uploaded successfully, URL:', attachmentUrl);
        
        // Test if the URL is accessible
        try {
          const testFetch = await fetch(attachmentUrl, { method: 'HEAD' });
          if (!testFetch.ok) {
            console.warn('Attachment URL may not be publicly accessible:', attachmentUrl);
          }
        } catch (err) {
          console.warn('Could not verify attachment URL accessibility:', err);
        }
      }
      
      // Create response record for escalation
      console.log('Creating escalation response record...');
      const { data: responseData, error: responseError } = await supabase
        .from('request_responses')
        .insert({
          request_id: selectedRequest.id,
          responder_id: session.user.id,
          response_text: responseText,
          response_type: 'escalation',
          attachments: attachmentUrl ? [attachmentUrl] : []
        })
        .select('*');
        
      if (responseError) {
        console.error('Response record error:', responseError);
        throw responseError;
      }
      
      console.log('Escalation response record created:', responseData);
      
      // Update request status to escalated
      console.log('Updating request status to escalated...');
      const { error: updateError } = await supabase
        .from('examination_requests')
        .update({
          status: 'escalated',
          assigned_admin_id: session.user.id
        })
        .eq('id', selectedRequest.id);
        
      if (updateError) {
        console.error('Request update error:', updateError);
        throw updateError;
      }
      
      // Email notifications removed
      
      // Close details modal and refresh
      setSelectedRequest(null);
      setPreviousResponses([]);
      if (profile) {
        fetchRequests(profile, 'pending');
      }
    } catch (err) {
      console.error('Error escalating request:', err);
      alert('Failed to escalate request: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmittingResponse(false);
    }
  };
  
  const handleTerminate = async () => {
    if (!selectedRequest || !responseText.trim()) {
      showToast('please fill the respond to request', 'warning');
      return;
    }
    
    try {
      setSubmittingResponse(true);
      
      // Upload response attachment if provided
      let attachmentUrl = null;
      if (responseFile) {
        const fileExt = responseFile.name.split('.').pop().toLowerCase();
        const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'xls', 'xlsx'];
        
        if (!allowedTypes.includes(fileExt)) {
          throw new Error('File type not supported. Please upload PDF, Image, or Excel files only.');
        }
        
        // Create a more descriptive filename
        const safeRequestId = selectedRequest.id;
        const timestamp = Date.now();
        const fileName = `termination_${safeRequestId}_${timestamp}.${fileExt}`;
        
        console.log('Uploading termination file:', fileName);
        
        // Upload the file with content type
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('request-responses')
          .upload(fileName, responseFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: responseFile.type
          });

        if (uploadError) {
          console.error('File upload error:', uploadError);
          throw uploadError;
        }

        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('request-responses')
          .getPublicUrl(fileName);

        // Verify the URL is valid
        attachmentUrl = publicUrl;
        console.log('File uploaded successfully, URL:', attachmentUrl);
        
        // Test if the URL is accessible
        try {
          const testFetch = await fetch(attachmentUrl, { method: 'HEAD' });
          if (!testFetch.ok) {
            console.warn('Attachment URL may not be publicly accessible:', attachmentUrl);
          }
        } catch (err) {
          console.warn('Could not verify attachment URL accessibility:', err);
        }
      }
      
      // Create response record for termination
      console.log('Creating termination response record...');
      const { data: responseData, error: responseError } = await supabase
        .from('request_responses')
        .insert({
          request_id: selectedRequest.id,
          responder_id: session.user.id,
          response_text: responseText,
          response_type: 'termination',
          attachments: attachmentUrl ? [attachmentUrl] : []
        })
        .select('*');
        
      if (responseError) {
        console.error('Response record error:', responseError);
        throw responseError;
      }
      
      console.log('Termination response record created:', responseData);
      
      // Update request status to terminated
      console.log('Updating request status to terminated...');
      const { error: updateError } = await supabase
        .from('examination_requests')
        .update({
          status: 'terminated',
          resolved_at: new Date().toISOString(),
          resolution_notes: responseText,
          assigned_admin_id: session.user.id
        })
        .eq('id', selectedRequest.id);
        
      if (updateError) {
        console.error('Request update error:', updateError);
        throw updateError;
      }
      
      // Email notifications removed
      
      // Close details modal and refresh
      setSelectedRequest(null);
      setPreviousResponses([]);
      if (profile) {
        fetchRequests(profile, 'pending');
      }
    } catch (err) {
      console.error('Error terminating request:', err);
      alert('Failed to terminate request: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmittingResponse(false);
    }
  };
  
  const changeTab = (newTab) => {
    console.log('Changing tab from', tab, 'to', newTab);
    setTab(newTab);
    setSearchTerm(''); // Clear search when changing tab
    if (profile) {
       requestAnimationFrame(() => fetchRequests(profile, newTab));; // Ensure tab state is updated before fetching
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Email test and processing functions removed

  const handlePriorityChange = async (newPriority, requestId) => {
    const { data: priorityChangeData, error: priorityChangeError } = await supabase
      .from('examination_requests')
      .update({ priority: newPriority })
      .eq('id', requestId)
      .select();

    if (priorityChangeError) {
      console.log("Can't Change Priority.")
    } else {
      console.log("Successfully changed priority.")
    }

    if (priorityChangeData && priorityChangeData.length > 0) {
      // Fetch the full request with joins
      const { data: fullRequest, error: fetchError } = await supabase
        .from('examination_requests')
        .select(`
          *,
          departments:department_id(*),
          student:student_id(id, full_name, email, student_id, phone),
          responses:request_responses(*)
        `)
        .eq('id', requestId)
        .single();

      if (!fetchError && fullRequest) {
        handleViewDetails(fullRequest);
      } else {
        // fallback to old behavior if fetch fails
        handleViewDetails(priorityChangeData[0]);
      }
    }
  };

  // Email queue processing removed

  if (loading && !profile) {
    return (
      <div className="page-container flex justify-center items-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-opacity-50 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container flex justify-center items-center">
        <div className="glass-card p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h2 className="text-2xl font-bold text-gray-800">Access Error</h2>
            <p className="mt-2 text-red-600">{error}</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="secondary-button w-full"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="dashboard-container fade-in">
        {toastMessage && (
          <div className={`mb-4 p-3 rounded-md border ${toastType === 'warning' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : toastType === 'error' ? 'bg-red-100 border-red-300 text-red-800' : toastType === 'success' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-blue-100 border-blue-300 text-blue-800'}`}>
            {toastMessage}
          </div>
        )}
        <div className="card-header">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {profile?.role === 'super_admin' ? 'SuperAdmin Dashboard — Controller of Examinations' : 'Admin Dashboard — Controller of Examinations'}
            </h1>
            <div className="text-gray-600">
              {profile?.role === 'super_admin' 
                ? 'Manage all student requests across departments'
                : `Managing ${profile?.departments?.name || 'Department'} requests`}
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:flex-row gap-2">
            {(profile?.role === 'super_admin') && (
              <button
                onClick={async () => {
                  if (deletingResolved) return;
                  const confirm = window.confirm('Delete all resolved requests' + (profile?.role === 'admin' ? ' in your department' : ' (all departments)') + '? This cannot be undone.');
                  if (!confirm) return;
                  try {
                    setDeletingResolved(true);
                    // Fetch resolved request ids within scope
                    let q = supabase
                      .from('examination_requests')
                      .select('id')
                      .eq('status', 'resolved');
                    if (profile?.role === 'admin') {
                      q = q.eq('department_id', profile.department_id);
                    }
                    const { data: resolvedRows, error: fetchErr } = await q;
                    if (fetchErr) throw fetchErr;
                    const ids = (resolvedRows || []).map(r => r.id);
                    if (ids.length === 0) {
                      showToast('No resolved requests to delete.', 'info');
                      return;
                    }
                    // Delete related responses first
                    const { error: respDelErr } = await supabase
                      .from('request_responses')
                      .delete()
                      .in('request_id', ids);
                    if (respDelErr) throw respDelErr;
                    // Delete the requests
                    const { error: reqDelErr } = await supabase
                      .from('examination_requests')
                      .delete()
                      .in('id', ids);
                    if (reqDelErr) throw reqDelErr;
                    showToast(`Deleted ${ids.length} resolved request(s).`, 'success');
                    // Refresh current tab
                    if (profile) await fetchRequests(profile, tab);
                  } catch (err) {
                    console.error('Delete resolved failed:', err);
                    showToast('Failed to delete resolved requests. ' + (err.message || ''), 'error');
                  } finally {
                    setDeletingResolved(false);
                  }
                }}
                className={`danger-button flex items-center gap-2 ${deletingResolved ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={deletingResolved}
                title="Delete all resolved requests"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10"/></svg>
                {deletingResolved ? 'Deleting…' : 'Delete All Resolved'}
              </button>
            )}
            {/* Email test and queue buttons removed */}
            <button
              onClick={handleSignOut}
              className="danger-button flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
        
        {/* Email test message UI removed */}
        
        {/* Tab navigation */}
        <div className="flex overflow-x-auto bg-white rounded-lg shadow mb-6">
          {/* For super_admin: Home (first), Escalated, Resolved, Terminated, Pending, All Requests (last) */}
          {profile?.role === 'super_admin' ? (
            <>
              <button 
                onClick={() => changeTab('home')} 
                className={`px-4 py-3 text-sm font-medium flex-shrink-0 border-b-2 ${
                  tab === 'home' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001 1h6a1 1 0 001-1V10m-9 11V9m0 0l-2 2m2-2l2 2" />
                  </svg>
                  Home
                </div>
              </button>
              <button 
                onClick={() => changeTab('all')} 
                className={`px-4 py-3 text-sm font-medium flex-shrink-0 border-b-2 ${
                  tab === 'all' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                  All Requests
                  {tab === 'all' && filteredRequests.length > 0 && (
                    <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {filteredRequests.length}
                    </span>
                  )}
                </div>
              </button>
              <button 
                onClick={() => changeTab('escalated')} 
                className={`px-4 py-3 text-sm font-medium flex-shrink-0 border-b-2 ${
                  tab === 'escalated' 
                    ? 'border-orange-600 text-orange-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  Escalated Pending
                  {tab === 'escalated' && filteredRequests.length > 0 && (
                    <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {filteredRequests.length}
                    </span>
                  )}
                </div>
              </button>
              <button 
                onClick={() => changeTab('resolved')} 
                className={`px-4 py-3 text-sm font-medium flex-shrink-0 border-b-2 ${
                  tab === 'resolved' 
                    ? 'border-green-600 text-green-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Resolved
                </div>
              </button>
              <button 
                onClick={() => changeTab('terminated')} 
                className={`px-4 py-3 text-sm font-medium flex-shrink-0 border-b-2 ${
                  tab === 'terminated' 
                    ? 'border-red-600 text-red-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  Terminated
                </div>
              </button>
              <button 
                onClick={() => changeTab('pending')} 
                className={`px-4 py-3 text-sm font-medium flex-shrink-0 border-b-2 ${
                  tab === 'pending' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Pending
                </div>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => changeTab('pending')} 
            className={`px-4 py-3 text-sm font-medium flex-shrink-0 border-b-2 ${
              tab === 'pending' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
                  Pending
              {tab === 'pending' && filteredRequests.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {filteredRequests.length}
                </span>
              )}
            </div>
          </button>
          
          <button 
            onClick={() => changeTab('resolved')} 
            className={`px-4 py-3 text-sm font-medium flex-shrink-0 border-b-2 ${
              tab === 'resolved' 
                ? 'border-green-600 text-green-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              {profile?.role === 'super_admin' ? 'Resolved by Super Admin' : 'Resolved'}
            </div>
          </button>
          
          {profile?.role !== 'super_admin' && (
          <button 
            onClick={() => changeTab('escalated')} 
            className={`px-4 py-3 text-sm font-medium flex-shrink-0 border-b-2 ${
              tab === 'escalated' 
                ? 'border-orange-600 text-orange-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              Escalated
            </div>
          </button>
          )}
          {profile?.role !== 'super_admin' && (
          <button 
            onClick={() => changeTab('terminated')} 
            className={`px-4 py-3 text-sm font-medium flex-shrink-0 border-b-2 ${
              tab === 'terminated' 
                ? 'border-red-600 text-red-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Terminated
            </div>
          </button>
          )}
          </>
          )}
          
        </div>
        
        {/* SuperAdmin Home dashboard */}
        {profile?.role === 'super_admin' && tab === 'home' ? (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-4">
                <div className="text-sm text-gray-500">Total Requests</div>
                <div className="text-2xl font-bold">{homeStats.totalRequests}</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-sm text-gray-500">Students</div>
                <div className="text-2xl font-bold">{homeStats.totalStudents}</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-sm text-gray-500">Admins</div>
                <div className="text-2xl font-bold">{homeStats.totalAdmins}</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-sm text-gray-500">Super Admins</div>
                <div className="text-2xl font-bold">{homeStats.totalSuperAdmins}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pie chart */}
              <div className="glass-card p-6 flex flex-col items-center justify-center h-full">
                <div className="w-full flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Requests by Status</h3>
                  <div className="text-sm text-gray-500">Total: {pieStats.total}</div>
                </div>
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                  <div className="md:col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input type="date" value={pieFrom} onChange={(e)=>{ setPieFrom(e.target.value); updatePieStats(e.target.value, pieTo); }} className="form-input py-2" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input type="date" value={pieTo} onChange={(e)=>{ setPieTo(e.target.value); updatePieStats(pieFrom, e.target.value); }} className="form-input py-2" />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <button onClick={()=>{ setPieFrom(''); setPieTo(''); updatePieStats('', ''); }} className="secondary-button w-full">Reset</button>
                  </div>
                </div>
                {(() => {
                  const total = Math.max(1, pieStats.total);
                  const seg = pieStats.byStatus;
                  const pct = {
                    pending: (seg.pending / total) * 100,
                    escalated: (seg.escalated / total) * 100,
                    resolved: (seg.resolved / total) * 100,
                    terminated: (seg.terminated / total) * 100,
                  };
                  const bg = `conic-gradient(
                    #3b82f6 0% ${pct.pending}%,
                    #f59e0b ${pct.pending}% ${pct.pending + pct.escalated}%,
                    #10b981 ${pct.pending + pct.escalated}% ${pct.pending + pct.escalated + pct.resolved}%,
                    #ef4444 ${pct.pending + pct.escalated + pct.resolved}% 100%
                  )`;
                  return (
                    <div className="w-full flex flex-col items-center">
                      <div className="w-48 h-48 rounded-full" style={{ background: bg }}></div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{background:'#3b82f6'}}></span>Pending ({seg.pending})</div>
                        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{background:'#f59e0b'}}></span>Escalated ({seg.escalated})</div>
                        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{background:'#10b981'}}></span>Resolved ({seg.resolved})</div>
                        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{background:'#ef4444'}}></span>Terminated ({seg.terminated})</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Organization Overview (date-range aware) */}
              <div className="glass-card p-6 lg:col-span-2 h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-4">Organization Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 sm:grid-rows-2 auto-rows-fr gap-4 h-full">
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 h-full flex flex-col justify-center">
                    <div className="text-sm text-gray-500">Departments (in range)</div>
                    <div className="text-2xl font-bold">{overviewRangeStats.departments}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 h-full flex flex-col justify-center">
                    <div className="text-sm text-gray-500">Branches (in range)</div>
                    <div className="text-2xl font-bold">{overviewRangeStats.branches}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 h-full flex flex-col justify-center">
                    <div className="text-sm text-gray-500">Active Pending</div>
                    <div className="text-2xl font-bold">{overviewRangeStats.byStatus.pending}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 h-full flex flex-col justify-center">
                    <div className="text-sm text-gray-500">Escalated Pending</div>
                    <div className="text-2xl font-bold">{overviewRangeStats.byStatus.escalated}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 h-full flex flex-col justify-center">
                    <div className="text-sm text-gray-500">Resolved</div>
                    <div className="text-2xl font-bold">{overviewRangeStats.byStatus.resolved}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 h-full flex flex-col justify-center">
                    <div className="text-sm text-gray-500">Terminated</div>
                    <div className="text-2xl font-bold">{overviewRangeStats.byStatus.terminated}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
        <>
        {/* Search input (hidden on Home) */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by Request ID..."
              className="form-input pl-10 w-full md:w-64"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {loadingRequests ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-opacity-50 border-t-blue-600"></div>
            <p className="mt-4 text-gray-500">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            {searchTerm ? (
              <p className="text-gray-500">No requests found matching ID: "{searchTerm}"</p>
            ) : (
            <p className="text-gray-500">No {tab} requests found.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="data-table-header">Actions</th>
                  <th className="data-table-header">Request ID</th>
                  <th className="data-table-header">Title</th>
                  <th className="data-table-header">Student</th>
                  <th className="data-table-header">Department</th>
                  <th className="data-table-header">Branch</th>
                  <th className="data-table-header">Campus</th>
                  <th className="data-table-header">Date</th>
                  <th className="data-table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="data-table-cell">
                      <button
                        onClick={() => handleViewDetails(request)}
                        className="primary-button text-sm py-1 px-3"
                      >
                        View & Respond
                      </button>
                    </td>
                    <td className="data-table-cell">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{request.id}</span>
                    </td>
                    <td className="data-table-cell">
                      <div className="text-sm font-medium text-gray-900">{request.title}</div>
                      <div className="text-xs text-gray-500">{request.request_type.replace('_', ' ')}</div>
                    </td>
                    <td className="data-table-cell">
                      <div className="text-sm">{request.student?.full_name}</div>
                      <div className="text-xs text-gray-500">{request.student?.student_id}</div>
                    </td>
                    <td className="data-table-cell">
                      <div className="text-sm">{request.departments?.name || 'Unknown'}</div>
                    </td>
                    <td className="data-table-cell">
                      <div className="text-sm">{request.branches?.branch_name || '-'}</div>
                    </td>
                    <td className="data-table-cell">
                      <div className="text-sm">{request.campuses?.campus || '-'}</div>
                    </td>
                    <td className="data-table-cell">
                      <div className="text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="data-table-cell">
                      <StatusBadge status={request.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </>
        )}
      </div>
      
      {selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
              <h3 className="text-xl font-bold text-gray-800">Request Details</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            {toastMessage && (
              <div className={`mb-4 p-3 rounded-md border ${toastType === 'warning' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : toastType === 'error' ? 'bg-red-100 border-red-300 text-red-800' : toastType === 'success' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-blue-100 border-blue-300 text-blue-800'}`}>
                {toastMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="glass-card p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Request Information</h4>
                <div className="space-y-3">
                  <div>
                    <span className="block text-xs text-gray-500">Request ID</span>
                    <span className="block font-mono text-sm bg-gray-100 px-2 py-1 rounded mt-1">{selectedRequest.id}</span>
                  </div>
                  
                  <div>
                    <span className="block text-xs text-gray-500">Status</span>
                    <StatusBadge status={selectedRequest.status} />
                  </div>
                  
                  <div>
                    <span className="block text-xs text-gray-500">Type</span>
                    <span className="capitalize text-sm">{selectedRequest.request_type.replace('_', ' ')}</span>
                  </div>
                    
                    <div>
                      <span className="block text-xs text-gray-500">Campus</span>
                      <span className="text-sm">{selectedRequest.campuses?.campus || '-'}</span>
                    </div>
                  
                  <div>
                    <span className="block text-xs text-gray-500">Priority</span>
                    <select
                      className="capitalize text-sm border rounded px-2 py-1 mt-1"
                      value={selectedRequest.priority}
                      onChange={(e) => handlePriorityChange(e.target.value, selectedRequest.id)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <span className="block text-xs text-gray-500">Submitted On</span>
                    <span className="text-sm">{new Date(selectedRequest.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="glass-card p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Student Information</h4>
                <div className="space-y-3">
                  <div>
                    <span className="block text-xs text-gray-500">Name</span>
                    <span className="block text-sm font-medium">{selectedRequest.student?.full_name}</span>
                  </div>
                  
                  <div>
                    <span className="block text-xs text-gray-500">Email</span>
                    <span className="block text-sm">{selectedRequest.student?.email}</span>
                  </div>
                  
                  <div>
                    <span className="block text-xs text-gray-500">Student ID</span>
                    <span className="block text-sm">{selectedRequest.student?.student_id}</span>
                  </div>
                  
                  <div>
                    <span className="block text-xs text-gray-500">Phone</span>
                    <span className="block text-sm">{selectedRequest.student?.phone || 'Not provided'}</span>
                  </div>
                  
                  <div>
                    <span className="block text-xs text-gray-500">Department</span>
                    <span className="block text-sm">{selectedRequest.departments?.name || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Branch</span>
                    <span className="block text-sm">{selectedRequest.branches?.branch_name || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Campus</span>
                    <span className="block text-sm">{selectedRequest.campuses?.campus || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-5 mb-6">
              <h4 className="text-lg font-medium text-gray-800 mb-2">{selectedRequest.title}</h4>
              <p className="bg-gray-50 p-4 rounded text-gray-700 mb-4">{selectedRequest.description}</p>
              
              {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Attachments</h5>
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
            
            {/* Previous responses section */}
            {loadingResponses ? (
              <div className="glass-card p-5 mb-6 text-center">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-opacity-50 border-t-gray-600"></div>
                <p className="text-sm text-gray-500 mt-2">Loading previous responses...</p>
              </div>
            ) : previousResponses.length > 0 ? (
              <div className="glass-card p-5 mb-6">
                <h4 className="text-lg font-medium text-gray-800 mb-4">Previous Responses</h4>
                <div className="space-y-4">
                  {previousResponses.map((response) => (
                    <div key={response.id} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                      <div className="flex justify-between mb-2">
                        <div>
                          <span className="font-medium text-blue-800">{response.responder?.full_name || 'Administrator'}</span>
                          <span className="text-xs ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {response.responder?.role || 'admin'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(response.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-gray-700 whitespace-pre-line">{response.response_text}</div>
                      
                      {response.attachments && response.attachments.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-blue-200">
                          <p className="text-xs text-gray-600 mb-1">Attachments:</p>
                          <div className="flex flex-wrap gap-2">
                            {response.attachments.map((url, index) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs inline-flex items-center gap-1 bg-white text-blue-700 px-2 py-1 rounded border border-blue-300 hover:bg-blue-50"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
            ) : null}
            
            {/* Show response form for pending requests and for escalated requests if user is super_admin */}
            {(selectedRequest.status === 'pending' || (selectedRequest.status === 'escalated' && profile?.role === 'super_admin')) && (
              <div className="glass-card p-5">
                <h4 className="text-lg font-medium mb-4">Respond to Request</h4>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Response</label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="form-input min-h-[120px]"
                    placeholder="Type your response to the student here..."
                    rows="4"
                    required
                  ></textarea>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attachment (Optional)
                  </label>
                  <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                    <input
                      type="file"
                      onChange={(e) => setResponseFile(e.target.files[0])}
                      className="w-full"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.xls,.xlsx"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Accepted formats: PDF, Images (JPG, PNG, GIF), Excel (XLS, XLSX)
                    </p>
                  </div>
                  
                  {filePreview && (
                    <div className="mt-2 p-3 border rounded-lg bg-gray-50">
                      <div className="font-medium text-sm text-gray-700 mb-1">Preview</div>
                      <img src={filePreview} alt="File preview" className="max-h-48 rounded border" />
                    </div>
                  )}
                  
                  {responseFile && !filePreview && (
                    <div className="mt-2 flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                      <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700 text-sm">{responseFile.name}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleResolve}
                    disabled={submittingResponse}
                    className="success-button flex items-center gap-2"
                  >
                    {submittingResponse ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Resolve Request
                      </>
                    )}
                  </button>
                  
                  {/* Show escalate button only for regular admins, not for super_admins */}
                  {profile?.role === 'admin' && (
                    <button
                      onClick={handleEscalate}
                      disabled={submittingResponse}
                      className="primary-button flex items-center gap-2"
                    >
                      {submittingResponse ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
                          </svg>
                          Escalate to SuperAdmin
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={handleTerminate}
                    disabled={submittingResponse}
                    className="danger-button flex items-center gap-2"
                  >
                    {submittingResponse ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        Terminate Request
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard; 