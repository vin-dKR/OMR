import React from 'react';
import type { StudentResponse } from '../../types/omr';

interface StudentListProps {
    students: StudentResponse[];
    selectedStudent: number;
    onStudentChange: (index: number) => void;
    base64Images: { answerKey: string; studentFiles: string[] } | null;
}

const StudentList: React.FC<StudentListProps> = ({ students, selectedStudent, onStudentChange, base64Images }) => {
    return (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 sticky top-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg md:text-xl font-semibold text-delft-blue mb-4">Students</h2>
            <div className="space-y-3">
                {students.map((student, index) => (
                    <button
                        key={student.id}
                        onClick={() => onStudentChange(index)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${selectedStudent === index
                            ? 'border-burnt-sienna bg-burnt-sienna/10'
                            : 'border-gray-300 hover:border-cambridge-blue hover:bg-sunset/20'
                            }`}
                    >
                        <div className="w-12 h-16 rounded border overflow-hidden flex-shrink-0">
                            {base64Images?.studentFiles[index] ? (
                                <img
                                    src={`data:image/jpeg;base64,${base64Images.studentFiles[index]}`}
                                    alt={student.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : student.imageFile && student.imageFile.size > 0 ? (
                                <img
                                    src={URL.createObjectURL(student.imageFile)}
                                    alt={student.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">📄</div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 truncate">{student.name}</div>
                            {student.isProcessing ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-yellow-600">Processing...</span>
                                </div>
                            ) : student.responses.length > 0 ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs text-green-600">Ready</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    <span className="text-xs text-gray-500">Pending</span>
                                </div>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StudentList;
