import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchAccounts = async () => {
            try {
                const response = await axios.get('http://localhost:3000/auth/accounts', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                console.log(response.data.data);
                
                setAccounts(response.data.data.map(account => ({
                    id: account.id,
                    name: account.name,
                    type: account.type,
                    industry: account.industry,
                    annualRevenue: account.annualRevenue,
                    phone: account.phone,
                    website: account.website,
                    createdDate: account.createdDate
                })));
                
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
                if (err.response?.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/login');
                }
            }
        };

        fetchAccounts();
    }, [navigate]);

    const formatCurrency = (amount) => {
        if (!amount) return '$0';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-red-500">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Salesforce Accounts</h1>
                <button
                    onClick={() => {
                        localStorage.removeItem('token');
                        navigate('/login');
                    }}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                    Logout
                </button>
            </div>
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Annual Revenue</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {accounts.map((account) => (
                            <tr key={account.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.type || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.industry || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(account.annualRevenue)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.phone || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {account.website ? (
                                        <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                            {account.website}
                                        </a>
                                    ) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(account.createdDate).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Dashboard; 