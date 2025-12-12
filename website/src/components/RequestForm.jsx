import { useState, useContext, useEffect } from 'react';
import { AuthContext } from './AuthProvider';

const REQUEST_TYPES = [
  { value: 'exam_issue', label: 'Exam Issue' },
  { value: 'clarification', label: 'Clarification' },
  { value: 'reschedule', label: 'Reschedule Request' },
  { value: 'grade_dispute', label: 'Grade Dispute' },
  { value: 'other', label: 'Other' }
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const DEGREE_OPTIONS = [
  { value: 'mtech', label: 'MTech' },
  { value: 'btech', label: 'BTech' },
  { value: 'mtech_int', label: 'MTech (int.)' }
];

function PriorityBadge({ priority }) {
  const colors = {
    low: 'bg-green-100 text-green-800 ring-1 ring-green-300',
    medium: 'bg-blue-100 text-blue-800 ring-1 ring-blue-300',
    high: 'bg-orange-100 text-orange-800 ring-1 ring-orange-300',
    urgent: 'bg-red-100 text-red-800 ring-1 ring-red-300'
  };
  
  const icons = {
    low: (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
    medium: (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l1 1a1 1 0 01-1.414 1.414L10 5.414 8.707 6.707a1 1 0 01-1.414-1.414l1-1A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
    high: (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
    urgent: (
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    )
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[priority]}`}>
      {icons[priority]}
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function RequestForm({ onRequestSubmitted }) {
  const { session, supabase } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requestType, setRequestType] = useState('');
  const [priority, setPriority] = useState('medium');
  const [file, setFile] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState('');
  const [degree, setDegree] = useState('');
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [formTouched, setFormTouched] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [degrees, setDegrees] = useState([]);
  const [filteredDegrees, setFilteredDegrees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [lastRequestId, setLastRequestId] = useState('');
  const [campuses, setCampuses] = useState([]);
  const [campus, setCampus] = useState('');

  useEffect(() => {
    if (!session?.user) return;

    // Fetch departments and degrees
    const fetchData = async () => {
      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return;
        }

        setProfile(profileData);
        if (profileData.department_id) {
          setDepartment(profileData.department_id);
        }
        if (profileData.branch_id) {
          setBranch(profileData.branch_id);
        }

        // Fetch departments
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('*')
          .eq('is_active', true);

        if (deptError) {
          console.error('Error fetching departments:', deptError);
          return;
        }

        setDepartments(deptData);

        // Fetch degrees with department info
        const { data: degreeData, error: degreeError } = await supabase
          .from('degrees')
          .select('*, departments:department_id(*)');

        if (degreeError) {
          console.error('Error fetching degrees:', degreeError);
          return;
        }

        setDegrees(degreeData || []);
        // If profile has a degree_id, preselect it
        if (profileData?.degree_id) {
          setDegree(profileData.degree_id);
        }

        // Fetch branches
        const { data: branchesData, error: branchesError } = await supabase
          .from('branches')
          .select('*');
        if (branchesError) {
          console.error('Error fetching branches:', branchesError);
        } else {
          setBranches(branchesData || []);
          // If profile has a branch but department mismatch, align department to branch's department
          if (profileData?.branch_id && Array.isArray(branchesData)) {
            const br = branchesData.find(b => b.id === profileData.branch_id);
            if (br) {
              if (!profileData.department_id || profileData.department_id !== br.department_id) {
                setDepartment(br.department_id);
              }
              setBranch(br.id);
            }
          }
        }

        // Fetch campuses (schema like ProfileSetup)
        const { data: campusData, error: campusError } = await supabase
          .from('campuses')
          .select('*');
        if (campusError) {
          console.error('Error fetching campuses:', campusError);
        } else {
          setCampuses(campusData || []);
          if (profileData?.campus_id) {
            setCampus(profileData.campus_id.toString());
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      }
    };

    fetchData();
  }, [session, supabase]);

  // Filter degrees and branches when department changes
  useEffect(() => {
    if (department) {
      const filtered = degrees.filter(deg => deg.department_id === parseInt(department));
      setFilteredDegrees(filtered);
      // Reset degree selection if not valid for new department
      if (!filtered.find(deg => deg.id === degree)) {
        setDegree('');
      }
      // If there's exactly one degree for this department, auto-select it
      if (filtered.length === 1) {
        setDegree(filtered[0].id);
      }

      const fb = branches.filter(b => b.department_id === parseInt(department));
      setFilteredBranches(fb);
      if (!fb.find(b => b.id === parseInt(branch))) {
        setBranch('');
      }
      if (fb.length === 1) {
        setBranch(fb[0].id);
      }
    } else {
      setFilteredDegrees([]);
      setDegree('');
      setFilteredBranches([]);
      setBranch('');
    }
  }, [department, degrees, branches]);

  useEffect(() => {
    // Create preview URL for file if selected
    if (file) {
      const fileType = file.type.split('/')[0];
      if (fileType === 'image') {
        const objectUrl = URL.createObjectURL(file);
        setFilePreview(objectUrl);
        
        return () => URL.revokeObjectURL(objectUrl);
      } else {
        setFilePreview(null);
      }
    }
  }, [file]);

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    setCharacterCount(e.target.value.length);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session?.user) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Form validation
      if (!title.trim()) {
        throw new Error('Please enter a request title');
      }
      
      if (!description.trim()) {
        throw new Error('Please provide a description');
      }
      
      if (!requestType) {
        throw new Error('Please select a request type');
      }
      
      if (!department) {
        throw new Error('Please select a department');
      }
      if (!branch) {
        throw new Error('Please select a branch');
      }
      if (!campus) {
        throw new Error('Please select a campus');
      }

      let attachmentUrl = null;

      // Upload file if provided
      if (file) {
        const fileExt = file.name.split('.').pop();
        const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'xls', 'xlsx'];
        
        if (!allowedTypes.includes(fileExt.toLowerCase())) {
          throw new Error('File type not supported. Please upload PDF, Image, or Excel files only.');
        }
        
        const fileName = `${session.user.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('request-attachments')
          .upload(fileName, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('request-attachments')
          .getPublicUrl(fileName);

        attachmentUrl = publicUrl;
      }

      // Get department name for the email
      let departmentName = '';
      if (departments.length > 0) {
        const selectedDept = departments.find(dept => dept.id === department);
        if (selectedDept) {
          departmentName = selectedDept.name;
        }
      }
      let branchName = '';
      if (filteredBranches.length > 0) {
        const selectedBr = filteredBranches.find(b => b.id === parseInt(branch));
        if (selectedBr) branchName = selectedBr.branch_name;
      }

      // Create request record
      const { data: requestData, error: requestError } = await supabase
        .from('examination_requests')
        .insert({
          student_id: session.user.id,
          title,
          description,
          request_type: requestType,
          priority,
          degree,
          department_id: department,
          branch_id: branch,
          campus_id: parseInt(campus),
          attachments: attachmentUrl ? [attachmentUrl] : [],
          status: 'pending'
        })
        .select('id, created_at')
        .single();

      if (requestError) {
        throw requestError;
      }

      // Use Supabase-generated ID directly for reference
      setLastRequestId(requestData.id);

      // Get the request type label for the email
      const requestTypeLabel = REQUEST_TYPES.find(type => type.value === requestType)?.label || requestType;
  const priorityLabel = PRIORITY_LEVELS.find(level => level.value === priority)?.label || priority;
  const degreeObj = degrees.find(d => d.id === parseInt(degree));
  const degreeLabel = degreeObj ? `${degreeObj.name} (${degreeObj.code})` : degree;

      // Success flow (email notifications removed)
      setSuccess(true);
      // clear form
      setTitle('');
      setDescription('');
      setRequestType('');
      setPriority('medium');
      setFile(null);
      setFilePreview(null);
      setCharacterCount(0);
      if (onRequestSubmitted) onRequestSubmitted();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error('Error submitting request:', err);
      setError(err.message);
      // auto-dismiss error after 5s
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {(error || success) && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {error && (
            <div className="px-4 py-3 bg-red-600 text-white rounded-lg shadow-lg flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M5.07 19h13.86A2 2 0 0021 17.07L13.93 3.52a2 2 0 00-3.86 0L3 17.07A2 2 0 005.07 19z"/></svg>
              <span className="font-medium">{error}</span>
            </div>
          )}
          {success && (
            <div className="px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg">
              <div className="font-medium">Request submitted successfully!</div>
              {lastRequestId && (
                <div className="text-xs mt-1">Your Request ID: <span className="font-mono bg-white text-green-800 px-1 py-0.5 rounded">{lastRequestId}</span></div>
              )}
              {/* Email confirmation message removed */}
            </div>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4" onChange={() => setFormTouched(true)}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Request Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
            placeholder="Brief title describing your request"
            required
          />
        </div>
        
        {
        /*
          if needed in future replace the div below the commment with this (uncommenting makes div smaller on the x axis)
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> */
        }
        <div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="form-select"
              required
            >
              <option value="">Select Request Type</option>
              {REQUEST_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* 
          if needed in the future uncomment this (priority selecting field)
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <div className="relative">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="form-select pr-12"
              >
                {PRIORITY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <PriorityBadge priority={priority} />
              </div>
            </div>
          </div> */}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="form-select"
            required
            disabled={departments.length === 0}
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          {departments.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">Loading departments...</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
          <select
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            className="form-select"
            required
            disabled={!department}
          >
            <option value="">Select Your Degree</option>
            {filteredDegrees.map((deg) => (
              <option key={deg.id} value={deg.id}>
                {deg.name} ({deg.code})
              </option>
            ))}
          </select>
          {!department && (
            <p className="text-xs text-gray-500 mt-1">Please select a department first</p>
          )}
          {department && filteredDegrees.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">No degrees available for selected department</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="form-select"
            required
            disabled={!department}
          >
            <option value="">Select Your Branch</option>
            {filteredBranches.map((br) => (
              <option key={br.id} value={br.id}>
                {br.branch_name}
              </option>
            ))}
          </select>
          {!department && (
            <p className="text-xs text-gray-500 mt-1">Please select a department first</p>
          )}
          {department && filteredBranches.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">No branches available for selected department</p>
          )}
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
          <select
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
            className="form-select"
            required
          >
            <option value="">Select Your Campus</option>
            {campuses.map((camp) => (
              <option key={camp.id} value={camp.id}>
                {camp.campus}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <span className={`text-xs ${characterCount > 500 ? 'text-red-500' : 'text-gray-500'}`}>
              {characterCount}/1000 characters
            </span>
          </div>
          <textarea
            value={description}
            onChange={handleDescriptionChange}
            className="form-input min-h-[120px]"
            placeholder="Provide detailed information about your request"
            rows="4"
            maxLength={1000}
            required
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supporting Files (Optional)
          </label>
          <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
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
          
          {file && !filePreview && (
            <div className="mt-2 flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
              <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <div>
                <span className="text-gray-700 text-sm font-medium">{file.name}</span>
                <span className="text-xs text-gray-500 block">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="pt-3">
          <button
            type="submit"
            disabled={loading}
            className={`primary-button w-full flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting Request...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Submit Request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RequestForm;