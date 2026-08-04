/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import RegistrationPage from './pages/RegistrationPage';
import AdminPage from './pages/AdminPage';
import SuccessPage from './pages/SuccessPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-50 text-neutral-900 selection:bg-neutral-900 selection:text-white flex flex-col font-sans">
        <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<RegistrationPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" aria-label="Notificações" />
      </div>
    </BrowserRouter>
  );
}
