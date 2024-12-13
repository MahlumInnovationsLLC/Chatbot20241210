import React, { useState, useEffect } from 'react';
import MessageBubble from './MessageBubble';

export default function ThinkingBubble() {
    const dotsArray = ['.', '..', '...'];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex(prevIndex => (prevIndex + 1) % dotsArray.length);
        }, 500); // Change dots every 500ms
        return () => clearInterval(interval);
    }, []);

    return (
        <MessageBubble role="assistant" content={dotsArray[index]} />
    );
}