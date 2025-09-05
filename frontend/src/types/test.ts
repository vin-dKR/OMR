export interface TestResponse {
    message: string;
    error?: string;
    status: number;
    data: TestData;
}

export interface TestData {
    id: string;
    title: string;
    description: string;
    subject: string;
    duration: number;
    totalMarks: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    questions: TestQuestion[];
}

export interface TestQuestion {
    id: string;
    testId: string;
    questionId: string;
    marks: number;
    questionNumber: number;
    createdAt: string;
    updatedAt: string;
    question: QuestionDetails;
}

export interface QuestionDetails {
    id: string;
    question_number: number;
    file_name: string;
    question_text: string;
    isQuestionImage: boolean;
    question_image: string | null;
    isOptionImage: boolean;
    options: string[];
    option_images: string[];
    section_name: string;
    question_type: string;
    topic: string | null;
    exam_name: string;
    subject: string;
    chapter: string;
    answer: string;
    flagged: boolean | null;
    testAnswers: string[];
}

export interface StudentInfo {
    name: string;
    className: string;
    rollNumber: string;
}
