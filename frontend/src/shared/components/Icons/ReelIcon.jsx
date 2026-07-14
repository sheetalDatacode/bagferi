import React from 'react';

const ReelIcon = ({ className = "", style = {}, ...props }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      className={className}
      style={{ ...style, display: 'block' }}
      {...props}>
      {/* Reel frame - outer rectangle with rounded corners */}
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      {/* Film strip perforations - left side */}
      <circle cx="5" cy="7.5" r="0.7" fill="currentColor" />
      <circle cx="5" cy="10.5" r="0.7" fill="currentColor" />
      <circle cx="5" cy="13.5" r="0.7" fill="currentColor" />
      <circle cx="5" cy="16.5" r="0.7" fill="currentColor" />
      {/* Film strip perforations - right side */}
      <circle cx="19" cy="7.5" r="0.7" fill="currentColor" />
      <circle cx="19" cy="10.5" r="0.7" fill="currentColor" />
      <circle cx="19" cy="13.5" r="0.7" fill="currentColor" />
      <circle cx="19" cy="16.5" r="0.7" fill="currentColor" />
      {/* Play button triangle in center */}
      <path
        d="M10 8.5L15.5 12L10 15.5V8.5Z"
        fill="currentColor"
      />
    </svg>
  );
};

export default ReelIcon;

