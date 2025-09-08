import axios from 'axios';
import { createContext, useContext, useState } from 'react';
import type { TestData, TestResponse } from '../types/test';

interface TestContextType {
    loading: boolean;
    error: string | null;
    testData: TestData | null;
    fetchTestResponse: (payload: { testId: string }) => Promise<void>;
    submitVerifiedAnswers: (payload: {
        testId: string;
        answers: { questionId: string; selectedAnswer: string }[];
        name: string;
        rollNumber: string;
        className: string;
    }) => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL;
console.log("api-----", API_URL)

const TestContext = createContext<TestContextType | undefined>(undefined);

export const TestProvider = ({ children }: { children: React.ReactNode }) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [testData, setTestData] = useState<TestData | null>(null);

    const fetchTestResponse = async (payload: { testId: string }) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post<TestResponse>(
                `${API_URL}/api/omr/fetchTestbyId`,
                payload,
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            if (response.status === 200) {
                setTestData(response.data.data);
            } else {
                setError(response.data.error || 'Failed to fetch test response');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'An error occurred while fetching test response');
        } finally {
            setLoading(false);
        }
    };

    const submitVerifiedAnswers = async (payload: {
        testId: string;
        answers: { questionId: string; selectedAnswer: string }[];
        name: string;
        rollNumber: string;
        className: string;
    }) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(
                `${API_URL}/api/omr/checker`,
                payload,
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            if (response.status !== 200) {
                setError(response.data.error || 'Failed to submit verified answers');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'An error occurred while submitting verified answers');
        } finally {
            setLoading(false);
        }
    };

    return (
        <TestContext.Provider value={{ testData, loading, error, fetchTestResponse, submitVerifiedAnswers }}>
            {children}
        </TestContext.Provider>
    );
};

export const useTestContext = () => {
    const context = useContext(TestContext);
    if (!context) {
        throw new Error('useTestContext must be used within a TestProvider');
    }
    return context;
};
