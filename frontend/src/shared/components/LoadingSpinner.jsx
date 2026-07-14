const LoadingSpinner = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'w-6 h-6 border-2',
        md: 'w-8 h-8 border-4',
        lg: 'w-12 h-12 border-4'
    };

    return (
        <div className={`flex flex-col items-center justify-center min-h-[60vh] ${className}`}>
            <div className={`${sizeClasses[size]} border-primary-600 border-t-transparent rounded-full animate-spin`}></div>
            <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
    );
};

export default LoadingSpinner;

