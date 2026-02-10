import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [isDark, setIsDark] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const actualTheme = localStorage.getItem('actualTheme') || savedTheme;
    
    if (savedTheme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const autoTheme = prefersDark ? 'dark' : 'light';
      setTheme(autoTheme);
      setIsDark(autoTheme === 'dark');
      applyTheme(autoTheme);
    } else {
      setTheme(savedTheme);
      setIsDark(savedTheme === 'dark');
      applyTheme(savedTheme);
    }
  }, []);

  // Apply theme to document
  const applyTheme = (themeName) => {
    if (themeName === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  };

  // Change theme function
  const changeTheme = (newTheme) => {
    if (newTheme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const actualTheme = prefersDark ? 'dark' : 'light';
      setTheme(actualTheme);
      setIsDark(actualTheme === 'dark');
      applyTheme(actualTheme);
      localStorage.setItem('theme', 'auto');
      localStorage.setItem('actualTheme', actualTheme);
      
      // Listen for system changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        if (localStorage.getItem('theme') === 'auto') {
          const newActualTheme = e.matches ? 'dark' : 'light';
          setTheme(newActualTheme);
          setIsDark(newActualTheme === 'dark');
          applyTheme(newActualTheme);
          localStorage.setItem('actualTheme', newActualTheme);
        }
      };
      
      mediaQuery.removeEventListener('change', handleChange);
      mediaQuery.addEventListener('change', handleChange);
    } else {
      setTheme(newTheme);
      setIsDark(newTheme === 'dark');
      applyTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      localStorage.setItem('actualTheme', newTheme);
    }
    
    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { theme: newTheme, isDark: newTheme === 'dark' } 
    }));
  };

  const value = {
    theme,
    isDark,
    setTheme: changeTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};