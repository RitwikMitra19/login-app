import express from 'express';
import jsforce from 'jsforce';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Middleware to verify JWT token
router.use(verifyToken);

// Get Salesforce accounts
router.get('/accounts', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Initialize Salesforce connection
        const conn = new jsforce.Connection({
            loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com'
        });

        // Login to Salesforce
        await conn.login(
            process.env.SF_USERNAME,
            process.env.SF_PASSWORD + process.env.SF_SECURITY_TOKEN
        );

        // Query accounts with pagination
        const result = await conn.query(
            `SELECT Id, Name, Type, Industry, Phone, Website, AnnualRevenue, 
            BillingCity, BillingState, BillingCountry 
            FROM Account 
            ORDER BY Name 
            LIMIT ${limit} 
            OFFSET ${offset}`
        );

        // Get total count for pagination
        const totalCount = await conn.query('SELECT COUNT() FROM Account');
        
        res.json({
            accounts: result.records,
            pagination: {
                total: totalCount.totalSize,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(totalCount.totalSize / limit)
            }
        });
    } catch (error) {
        console.error('Salesforce error:', error);
        res.status(500).json({ message: 'Error fetching Salesforce accounts' });
    }
});

export default router; 