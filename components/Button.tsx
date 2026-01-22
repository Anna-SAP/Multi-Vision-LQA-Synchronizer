import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: React.ReactNode;
  active?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  icon, 
  className = '', 
  active = false,
  ...props 
}) => {
  const baseStyle = "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-900";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500",
    secondary: "bg-gray-700 hover:bg-gray-600 text-gray-200 focus:ring-gray-500 border border-gray-600",
    danger: "bg-red-900/50 hover:bg-red-800/50 text-red-200 border border-red-900 focus:ring-red-500",
    ghost: "bg-transparent hover:bg-gray-800 text-gray-400 hover:text-gray-100"
  };

  const activeStyle = active ? "ring-2 ring-blue-500 bg-gray-600 text-white" : "";

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${activeStyle} ${className}`} 
      {...props}
    >
      {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
};