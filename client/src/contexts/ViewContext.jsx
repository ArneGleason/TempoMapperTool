import React, { createContext, useContext, useState, useRef } from 'react';

const ViewContext = createContext();

export const ViewProvider = ({ children }) => {
    const [pixelsPerSecond, setPixelsPerSecond] = useState(100); // Default zoom
    const [totalDuration, setTotalDuration] = useState(10); // Default 10s, will grow dynamically
    const scrollContainerRef = useRef(null); // Ref to the main scrolling div

    // Scroll function to be called by Nav bar
    const setScroll = (scrollLeft) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollLeft;
        }
    };

    return (
        <ViewContext.Provider value={{
            pixelsPerSecond,
            setPixelsPerSecond,
            totalDuration,
            setTotalDuration,
            scrollContainerRef,
            setScroll
        }}>
            {children}
        </ViewContext.Provider>
    );
};

export const useView = () => useContext(ViewContext);
