import React from 'react';

interface SubmitVerifiedButtonProps {
    onSubmit: () => void;
    disabled: boolean;
}

const SubmitVerifiedButton: React.FC<SubmitVerifiedButtonProps> = ({ onSubmit, disabled }) => {
    return (
        <button
            onClick={onSubmit}
            disabled={disabled}
            className="mt-6 px-4 py-2 bg-blue-600 rounded-lg hover:bg-delft-blue transition-colors disabled:bg-gray-400 w-full md:w-auto"
        >
            Submit Verified Answers
        </button>
    );
};

export default SubmitVerifiedButton;
