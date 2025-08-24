import { useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthProvider';
import { createEmailNotification, sendTestEmail, checkEmailApiConnection, getEmailTypeConstraints } from '../utils/emailService';

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
  const { session, supabase } = useContext(AuthContext);
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
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestMessage, setEmailTestMessage] = useState('');
  const [emailTestSuccess, setEmailTestSuccess] = useState(true);

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
        
        // Fetch requests after profile is loaded
        await fetchRequests(data, 'pending');
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
          student:student_id(id, full_name, email, student_id, phone),
          responses:request_responses(*)
        `)
        .order('created_at', { ascending: false });
      
      // Filter requests by department for regular admins
      if (adminProfile.role === 'admin') {
        console.log('Filtering by department:', adminProfile.department_id);
        query = query.eq('department_id', adminProfile.department_id);
      }
      
      // For super_admin role, we have special handling
      if (adminProfile.role === 'super_admin') {
        if (tab === 'pending') {
          // Super admins see only escalated requests in the pending tab
          console.log('Super admin viewing escalated requests in pending tab');
          query = query.eq('status', 'escalated');
        } else if (tab === 'resolved') {
          // Show only resolved requests that were previously escalated or resolved by super_admin
          console.log('Super admin viewing resolved requests');
          query = query.eq('status', 'resolved');
          // We'll filter for super_admin resolved requests after fetching
        } else if (tab === 'terminated') {
          // Show only terminated requests that were previously escalated or terminated by super_admin
          console.log('Super admin viewing terminated requests');
          query = query.eq('status', 'terminated');
          // We'll filter for super_admin terminated requests after fetching
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
      
      // For super_admin, filter resolved and terminated requests to only show those handled by super_admin
      let filteredData = data;
      
      if (adminProfile.role === 'super_admin' && data) {
        if (tab === 'resolved' || tab === 'terminated') {
          // Get all super_admin user IDs
          const { data: superAdmins, error: superAdminError } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'super_admin');
            
          if (superAdminError) {
            console.error('Error fetching super_admin IDs:', superAdminError);
          } else if (superAdmins) {
            const superAdminIds = superAdmins.map(admin => admin.id);
            console.log('Super admin IDs:', superAdminIds);
            
            // Filter requests to only include those that were previously escalated
            // or were resolved/terminated by a super_admin
            filteredData = data.filter(request => {
              // Check if this request was ever escalated
              const wasEscalated = request.responses && request.responses.some(
                response => response.response_type === 'escalation'
              );
              
              // Check if this request was resolved/terminated by a super_admin
              const handledBySuperAdmin = request.responses && request.responses.some(
                response => 
                  (response.response_type === 'resolution' || response.response_type === 'termination') && 
                  superAdminIds.includes(response.responder_id)
              );
              
              return wasEscalated || handledBySuperAdmin;
            });
            
            console.log(`Filtered requests for super_admin ${tab} tab:`, filteredData.length);
          }
        }
      }
      
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
  
  const handleViewDetails = async (request) => {
    setSelectedRequest(request);
    setResponseText('');
    setResponseFile(null);
    setFilePreview(null);
    
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
      
      // Get the student's email if not already available in the selectedRequest
      let studentEmail = selectedRequest.student?.email;
      let studentName = selectedRequest.student?.full_name;
      
      // If student email is not available, fetch it directly
      if (!studentEmail) {
        console.log('Student email not found in request data, fetching directly...');
        const { data: studentData, error: studentError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', selectedRequest.student_id)
          .single();
          
        if (studentError) {
          console.error('Error fetching student data:', studentError);
        } else if (studentData) {
          studentEmail = studentData.email;
          studentName = studentData.full_name;
          console.log('Found student email:', studentEmail);
        }
      }
      
      // Create and send email notification
      console.log('Creating email notification...');
      if (studentEmail) {
        // Customize the email subject and content based on whether it was escalated and resolved by super_admin
        const wasEscalated = selectedRequest.status === 'escalated';
        const resolvedBySuperAdmin = profile?.role === 'super_admin';
        
        let emailSubject = `Your Request "${selectedRequest.title}" Has Been Resolved`;
        if (wasEscalated && resolvedBySuperAdmin) {
          emailSubject = `Your Escalated Request "${selectedRequest.title}" Has Been Resolved by Senior Administration`;
        }
        
        let emailIntro = `Your request "${selectedRequest.title}" has been resolved. Here's the resolution:`;
        if (wasEscalated && resolvedBySuperAdmin) {
          emailIntro = `Your escalated request "${selectedRequest.title}" has been reviewed and resolved by senior administration. Here's their response:`;
        }
        
        const emailData = {
          recipientEmail: studentEmail,
          recipientName: studentName || 'Student',
          requestId: selectedRequest.id,
          emailType: 'request_resolved',
          subject: emailSubject,
          content: `Dear ${studentName || 'Student'},

${emailIntro}

${responseText}

Thank you for your patience.

Regards,
SRMIST Examination Control Team`,
          attachments: attachmentUrl ? [attachmentUrl] : []
        };
        
        console.log('Email notification data:', emailData);
        
        const emailResult = await createEmailNotification(supabase, emailData);
        console.log('Email notification created:', emailResult);
      } else {
        console.error('Could not send email notification: Student email not found');
      }
      
      // If this was an escalated request resolved by super_admin, also notify the original admin
      if (selectedRequest.status === 'escalated' && profile?.role === 'super_admin' && selectedRequest.assigned_admin_id) {
        try {
          // Get the original admin's details
          const { data: adminData, error: adminError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', selectedRequest.assigned_admin_id)
            .single();
            
          if (adminError) {
            console.error('Error fetching original admin data:', adminError);
          } else if (adminData && adminData.email) {
            // Send notification to the original admin
            const adminEmailData = {
              recipientEmail: adminData.email,
              recipientName: adminData.full_name || 'Administrator',
              requestId: selectedRequest.id,
              emailType: 'request_resolved',
              subject: `Escalated Request "${selectedRequest.title}" Resolved by Super Admin`,
              content: `Dear ${adminData.full_name || 'Administrator'},

An escalated request that you previously handled has been resolved by a super administrator.

Request ID: ${selectedRequest.id}
Title: ${selectedRequest.title}
Resolution: ${responseText}

This is for your information only. The student has been notified directly.

Regards,
SRMIST Examination Control System`,
              attachments: attachmentUrl ? [attachmentUrl] : []
            };
            
            console.log('Sending notification to original admin:', adminData.email);
            await createEmailNotification(supabase, adminEmailData);
            console.log('Original admin notification sent');
          }
        } catch (notifyError) {
          console.error('Error notifying original admin:', notifyError);
          // Don't throw here, as the main resolution was successful
        }
      }
      
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
      
      // Get the student's email if not already available in the selectedRequest
      let studentEmail = selectedRequest.student?.email;
      let studentName = selectedRequest.student?.full_name;
      
      // If student email is not available, fetch it directly
      if (!studentEmail) {
        console.log('Student email not found in request data, fetching directly...');
        const { data: studentData, error: studentError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', selectedRequest.student_id)
          .single();
          
        if (studentError) {
          console.error('Error fetching student data:', studentError);
        } else if (studentData) {
          studentEmail = studentData.email;
          studentName = studentData.full_name;
          console.log('Found student email:', studentEmail);
        }
      }
      
      // Create and send email notification to the student
      console.log('Creating email notification for escalation...');
      if (studentEmail) {
        const emailData = {
          recipientEmail: studentEmail,
          recipientName: studentName || 'Student',
          requestId: selectedRequest.id,
          emailType: 'request_escalated',
          subject: `Your Request "${selectedRequest.title}" Has Been Escalated`,
          content: `Dear ${studentName || 'Student'},

Your request "${selectedRequest.title}" has been escalated to senior administrators for further review.

${responseText}

Thank you for your patience.

Regards,
SRMIST Examination Control Team`,
          attachments: attachmentUrl ? [attachmentUrl] : []
        };
        
        console.log('Email notification data for student:', emailData);
        
        const emailResult = await createEmailNotification(supabase, emailData);
        console.log('Email notification to student created:', emailResult);
      } else {
        console.error('Could not send email notification: Student email not found');
      }
      
      // Fetch all super_admin users to notify them about the escalation
      console.log('Fetching super_admin users for notification...');
      const { data: superAdmins, error: superAdminError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'super_admin');
        
      if (superAdminError) {
        console.error('Error fetching super_admin users:', superAdminError);
      } else if (superAdmins && superAdmins.length > 0) {
        console.log(`Found ${superAdmins.length} super_admin users to notify`);
        
        // Get department name for the notification
        let departmentName = selectedRequest.departments?.name || 'Unknown Department';
        
        // Send notification to each super_admin
        for (const admin of superAdmins) {
          if (admin.email) {
            const adminEmailData = {
              recipientEmail: admin.email,
              recipientName: admin.full_name || 'Administrator',
              requestId: selectedRequest.id,
              emailType: 'request_escalated',
              subject: `Escalated Request: "${selectedRequest.title}" from ${departmentName}`,
              content: `Dear ${admin.full_name || 'Administrator'},

A request has been escalated to you from ${departmentName}.

Request ID: ${selectedRequest.id}
Title: ${selectedRequest.title}
Student: ${studentName || 'Unknown'}
Department: ${departmentName}

Escalation Notes:
${responseText}

This request requires your attention and can be viewed in the Super Admin Dashboard.

Regards,
SRMIST Examination Control System`,
              attachments: attachmentUrl ? [attachmentUrl] : []
            };
            
            console.log(`Sending notification to super_admin: ${admin.email}`);
            try {
              await createEmailNotification(supabase, adminEmailData);
              console.log(`Notification sent to super_admin: ${admin.email}`);
            } catch (emailError) {
              console.error(`Failed to send notification to super_admin ${admin.email}:`, emailError);
            }
          }
        }
      } else {
        console.warn('No super_admin users found to notify about the escalation');
      }
      
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
      
      // Get the student's email if not already available in the selectedRequest
      let studentEmail = selectedRequest.student?.email;
      let studentName = selectedRequest.student?.full_name;
      
      // If student email is not available, fetch it directly
      if (!studentEmail) {
        console.log('Student email not found in request data, fetching directly...');
        const { data: studentData, error: studentError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', selectedRequest.student_id)
          .single();
          
        if (studentError) {
          console.error('Error fetching student data:', studentError);
        } else if (studentData) {
          studentEmail = studentData.email;
          studentName = studentData.full_name;
          console.log('Found student email:', studentEmail);
        }
      }
      
      // Create and send email notification
      console.log('Creating email notification for termination...');
      if (studentEmail) {
        const emailData = {
          recipientEmail: studentEmail,
          recipientName: studentName || 'Student',
        requestId: selectedRequest.id,
        emailType: 'request_terminated',
        subject: `Your Request "${selectedRequest.title}" Has Been Closed`,
          content: `Dear ${studentName || 'Student'},

Your request "${selectedRequest.title}" has been closed. Here's the reason:

${responseText}

Thank you for your understanding.

Regards,
SRMIST Examination Control Team`,
        attachments: attachmentUrl ? [attachmentUrl] : []
        };
        
        console.log('Email notification data:', emailData);
        
        const emailResult = await createEmailNotification(supabase, emailData);
        console.log('Email notification created:', emailResult);
      } else {
        console.error('Could not send email notification: Student email not found');
      }
      
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

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setEmailTestMessage('');

    try {
      // First check API connection
      const connectionTest = await checkEmailApiConnection();
      console.log('API connection test result:', connectionTest);
      
      if (!connectionTest.success && !connectionTest.simulated) {
        setEmailTestMessage(`API connection failed: ${connectionTest.message}`);
        setEmailTestSuccess(false);
        setTestingEmail(false);
        return;
      }
      
      // If connection was simulated (likely due to CORS), show a warning but continue
      if (connectionTest.simulated) {
        console.log('API connection was simulated due to CORS, proceeding with test email');
      }

      // Get allowed email types for debugging
      try {
        const emailTypes = await getEmailTypeConstraints(supabase);
        console.log('Allowed email types:', emailTypes);
      } catch (constraintError) {
        console.warn('Could not fetch email type constraints:', constraintError);
      }

      const result = await sendTestEmail(
        supabase, 
        session?.user?.email || 'test@example.com', 
        profile?.full_name || 'Test User'
      );
      
      console.log('Test email result:', result);
      
      if (result.success) {
        if (result.simulatedOnly || result.message?.includes('mock server')) {
          // Show a message for simulated/mock emails
          setEmailTestMessage(
            `${result.message}. Email saved to database with ID ${result.emailId}. ` +
            `In production, configure the server-side email sending function for actual delivery.`
          );
          setEmailTestSuccess(true);
        } else {
          setEmailTestMessage(`Test email sent successfully! Please check your inbox.`);
          setEmailTestSuccess(true);
        }
      } else {
        setEmailTestMessage(`Failed to send test email: ${result.message}`);
        setEmailTestSuccess(false);
      }
    } catch (error) {
      console.error('Error testing email system:', error);
      setEmailTestMessage(`Error: ${error.message}`);
      setEmailTestSuccess(false);
    } finally {
      setTestingEmail(false);
    }
  };

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

  const handleProcessEmailQueue = async () => {
    try {
      console.log('Manually processing email queue...');
      await processEmailQueue(supabase);
      alert('Email queue processed successfully. Check console for details.');
    } catch (error) {
      console.error('Error processing email queue:', error);
      alert('Error processing email queue: ' + error.message);
    }
  };

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
        <div className="card-header">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {profile?.role === 'super_admin' ? 'SuperAdmin Dashboard' : 'Admin Dashboard'}
            </h1>
            <div className="text-gray-600">
              {profile?.role === 'super_admin' 
                ? 'Manage escalated requests across all departments' 
                : `Managing ${profile?.departments?.name || 'Department'} requests`}
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:flex-row gap-2">
            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              className="secondary-button flex items-center gap-2"
            >
              {testingEmail ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-opacity-50 border-t-blue-600 rounded-full"></div>
                  Testing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                  Test Email
                </>
              )}
            </button>
            <button
              onClick={handleProcessEmailQueue}
              className="secondary-button flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Process Email Queue
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="danger-button flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
        
        {emailTestMessage && (
          <div className={`mb-4 p-4 rounded-lg ${emailTestSuccess ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {emailTestSuccess ? (
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${emailTestSuccess ? 'text-green-800' : 'text-red-800'}`}>
                  Email Test {emailTestSuccess ? 'Successful' : 'Failed'}
                </h3>
                <div className={`mt-2 text-sm ${emailTestSuccess ? 'text-green-700' : 'text-red-700'}`}>
                  <p>{emailTestMessage}</p>
                </div>
                {!emailTestSuccess && (
                  <div className="mt-4">
                    <div className="-mx-2 -my-1.5 flex">
                      <button
                        onClick={() => {
                          setEmailTestMessage('');
                          setEmailTestSuccess(true);
                        }}
                        className="px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Tab navigation */}
        <div className="flex overflow-x-auto bg-white rounded-lg shadow mb-6">
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
              {profile?.role === 'super_admin' ? 'Escalated Requests' : 'Pending'}
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
              {profile?.role === 'super_admin' ? 'Terminated by Super Admin' : 'Terminated'}
            </div>
          </button>
        </div>
        
        {/* Search input */}
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
                  <th className="data-table-header">Request ID</th>
                  <th className="data-table-header">Title</th>
                  <th className="data-table-header">Student</th>
                  <th className="data-table-header">Department</th>
                  <th className="data-table-header">Date</th>
                  <th className="data-table-header">Status</th>
                  <th className="data-table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="data-table-cell">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {request.id}
                      </span>
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
                      <div className="text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="data-table-cell">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="data-table-cell">
                      <button
                        onClick={() => handleViewDetails(request)}
                        className="primary-button text-sm py-1 px-3"
                      >
                        View & Respond
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                    disabled={submittingResponse || !responseText.trim()}
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
                      disabled={submittingResponse || !responseText.trim()}
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
                    disabled={submittingResponse || !responseText.trim()}
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