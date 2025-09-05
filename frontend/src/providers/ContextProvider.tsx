import { TestProvider } from "../contexts/TestContext"

const ContextProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <TestProvider>
            {children}
        </TestProvider>
    )
}

export default ContextProvider
