import { useEffect, useState } from "react";

const TestPage = () => {
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('auth-token');
        if (!token) {
            window.location.href = '/auth';
            return;
        }

        fetch('http://127.0.0.1:8000/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if(data.email) {
                setUserEmail(data.email);
            } else {
                localStorage.removeItem('auth-token');
                window.location.href = '/auth';
            }
        });
    }, []);

    return <h1>Witaj, {userEmail}! Logowanie działa.</h1>;
}

export default TestPage;