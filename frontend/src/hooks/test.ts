import { useEffect, useState } from "react"
import type { TestResponse } from "../types/test"

const TestResponse = () => {
    const [testData, setTestData] = useState<TestResponse>()

    useEffect(() => {
        const fetchTest = async () => {
            const testRes = fetch("http://localhost:3000/api/omr-checker", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    // Add any other necessary headers (e.g., authorization tokens)
                },
                body: JSON.stringify(formData),
            })
        }

        fetchTest()
    }, [])
}
