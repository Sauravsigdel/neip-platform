import React from 'react';

export const AlertBanner = ({ type, message }) => {
  const styles = {
    warning: "bg-amber-100 border-l-4 border-amber-500 text-amber-800",
    critical: "bg-red-100 border-l-4 border-red-600 text-red-800",
    info: "bg-sky-100 border-l-4 border-sky-500 text-sky-800"
  };

  if (!message) return null;

  return (
    <div className={`p-4 rounded shadow-sm flex items-center ${styles[type] || styles.info}`}>
      <span className="font-semibold mr-2">{type.toUpperCase()}: </span>
      {message}
    </div>
  );
};

export default AlertBanner;
