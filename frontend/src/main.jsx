import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx';
import './index.css';

// Import the MsalProvider and your msalInstance
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './msalConfig'; // Ensure this file and export exist

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        {/* Wrap the App with MsalProvider to provide msalInstance to the app */}
        <MsalProvider instance={msalInstance}>
            <App />
        </MsalProvider>
    </React.StrictMode>
);