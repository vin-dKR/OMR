import React from 'react';
import type { StudentInfo } from '../../types/test';

interface StudentInfoFormProps {
    studentInfo: StudentInfo;
    onChange: (field: keyof StudentInfo, value: string) => void;
}

const StudentInfoForm: React.FC<StudentInfoFormProps> = ({ studentInfo, onChange }) => {
    return (
        <div className="mb-6">
            <h3 className="text-lg font-semibold text-delft-blue mb-4">Student Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                    <input
                        type="text"
                        value={studentInfo.name}
                        onChange={(e) => onChange('name', e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 text-sm"
                        placeholder="Enter name"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Class</label>
                    <input
                        type="text"
                        value={studentInfo.className}
                        onChange={(e) => onChange('className', e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 text-sm"
                        placeholder="Enter class"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Roll Number</label>
                    <input
                        type="text"
                        value={studentInfo.rollNumber}
                        onChange={(e) => onChange('rollNumber', e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 text-sm"
                        placeholder="Enter roll number"
                    />
                </div>
            </div>
        </div>
    );
};

export default StudentInfoForm;
