import React from 'react';
import { Link } from 'react-router-dom';

function ProjectIndex() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-blue-800">SRMIST Examination Control Portal</h1>
              <p className="text-gray-600 mt-2 text-lg">A comprehensive system for managing examination-related requests</p>
            </div>
            <img src="/favicon.ico" alt="SRM Logo" className="w-20 h-20 mt-4 md:mt-0" />
          </div>
          
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/login" className="primary-button">
              Login to Portal
            </Link>
            <a href="https://github.com/yourusername/coe-qr" target="_blank" rel="noopener noreferrer" className="secondary-button flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"></path>
              </svg>
              GitHub Repository
            </a>
          </div>
        </header>
        
        {/* System Overview */}
        <section className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">System Overview</h2>
          <p className="text-gray-700 mb-6">
            The SRMIST Examination Control Portal is a comprehensive platform designed to streamline the process of submitting, tracking, and resolving examination-related requests. The system supports multiple user roles including students, department administrators, and super administrators.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <h3 className="text-lg font-semibold text-blue-800">Student Portal</h3>
              </div>
              <p className="text-gray-600">Submit examination requests, track request status, and view response history.</p>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                <h3 className="text-lg font-semibold text-blue-800">Department Admin</h3>
              </div>
              <p className="text-gray-600">Review and process requests, respond to students, and escalate complex issues to super admins.</p>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
                </svg>
                <h3 className="text-lg font-semibold text-blue-800">Super Admin</h3>
              </div>
              <p className="text-gray-600">Handle escalated requests, manage system settings, and oversee all departments.</p>
            </div>
          </div>
        </section>
        
        {/* Key Features */}
        <section className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-6">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-blue-700 mb-3">Request Management</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>Submit examination-related requests with supporting documents</li>
                <li>Track request status in real-time</li>
                <li>Categorize requests by type, priority, and department</li>
                <li>Automated email notifications for status updates</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-blue-700 mb-3">Admin Dashboard</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>Comprehensive view of all pending requests</li>
                <li>Filter and search capabilities</li>
                <li>Request escalation workflow</li>
                <li>Detailed response history tracking</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-blue-700 mb-3">User Management</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>Role-based access control</li>
                <li>Secure authentication via Supabase</li>
                <li>Profile management with avatar uploads</li>
                <li>Department-specific permissions</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-blue-700 mb-3">Communication</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>Email notifications for request updates</li>
                <li>File attachments for supporting documents</li>
                <li>Serverless email delivery via Supabase Edge Functions</li>
                <li>Beautifully formatted HTML emails</li>
              </ul>
            </div>
          </div>
        </section>
        
        {/* Technology Stack */}
        <section className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">Technology Stack</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Frontend</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• React.js</li>
                <li>• React Router</li>
                <li>• Tailwind CSS</li>
                <li>• Vite</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Backend</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Supabase</li>
                <li>• PostgreSQL</li>
                <li>• Row Level Security</li>
                <li>• Edge Functions</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Authentication</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Supabase Auth</li>
                <li>• JWT Tokens</li>
                <li>• Role-based Access</li>
                <li>• Secure Sessions</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Deployment</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Vercel/Netlify</li>
                <li>• Supabase Cloud</li>
                <li>• CI/CD Pipeline</li>
                <li>• Environment Variables</li>
              </ul>
            </div>
          </div>
        </section>
        
        {/* System Architecture Diagram */}
        <section className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">System Architecture</h2>
          
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 overflow-auto">
            <pre className="text-xs md:text-sm text-blue-800 whitespace-pre">
{`
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │     │                   │
│   React Frontend  │◄────┤   Supabase Auth   │────►│  Supabase Storage │
│                   │     │                   │     │                   │
└─────────┬─────────┘     └───────────────────┘     └───────────────────┘
          │                          ▲                        ▲
          ▼                          │                        │
┌───────────────────┐                │                        │
│                   │                │                        │
│   React Router    │                │                        │
│                   │                │                        │
└─────────┬─────────┘                │                        │
          │                          │                        │
          ▼                          │                        │
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │     │                   │
│  Component Layer  │────►│  Supabase Client  │────►│  Supabase Database│
│                   │     │                   │     │                   │
└───────────────────┘     └─────────┬─────────┘     └───────────────────┘
                                    │                        ▲
                                    ▼                        │
                          ┌───────────────────┐     ┌───────────────────┐
                          │                   │     │                   │
                          │  Edge Functions   │────►│   Email Service   │
                          │                   │     │                   │
                          └───────────────────┘     └───────────────────┘
`}
            </pre>
          </div>
        </section>
        
        {/* Getting Started */}
        <section className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">Getting Started</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-blue-700 mb-2">Installation</h3>
              <div className="bg-gray-800 text-gray-200 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
                  $ git clone https://github.com/yourusername/coe-qr.git<br/>
                  $ cd coe-qr<br/>
                  $ npm install<br/>
                  $ npm run dev
                </pre>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-blue-700 mb-2">Environment Setup</h3>
              <p className="text-gray-700 mb-3">
                Create a <code className="bg-gray-100 px-1 py-0.5 rounded text-blue-600">.env</code> file in the root directory with the following variables:
              </p>
              <div className="bg-gray-800 text-gray-200 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
                  VITE_SUPABASE_URL=your_supabase_url<br/>
                  VITE_SUPABASE_ANON_KEY=your_supabase_anon_key<br/>
                  VITE_BREVO_API_KEY=your_brevo_api_key
                </pre>
              </div>
            </div>
            
            <div className="flex justify-center mt-8">
              <Link to="/login" className="primary-button">
                Access the Portal
              </Link>
            </div>
          </div>
        </section>
        
        {/* Footer */}
        <footer className="mt-12 text-center text-gray-600">
          <p>© {new Date().getFullYear()} SRMIST Examination Control Portal. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default ProjectIndex; 