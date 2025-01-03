// LoadingCircle.jsx
import React from 'react';
import { useContext } from 'react';
import { ThemeContext } from '../ThemeContext';

const LoadingCircle = () => {
    const { theme } = useContext(ThemeContext);
    const circleColor = theme === 'dark' ? 'white' : 'black';

    return (
        <div className="loading-circle" style={{ borderColor: circleColor }}></div>
    );
};

export default LoadingCircle;