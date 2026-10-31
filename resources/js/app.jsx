import './bootstrap';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import MainApp from './MainApp';
import { setupGlobalFormKeyboardNavigation } from './utils/keyboardNavigation';

// Initialize global keyboard navigation (Enter key moves focus across forms, auto-focuses first input)
setupGlobalFormKeyboardNavigation();

const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <BrowserRouter>
                <MainApp />
            </BrowserRouter>
        </React.StrictMode>
    );
}
