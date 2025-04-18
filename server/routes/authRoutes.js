import express from 'express'
import {connectToDatabase} from '../lib/db.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import * as jsforce from 'jsforce'

const router = express.Router()

router.post('/register', async (req, res) => {
    const {username, email, password} = req.body;
    try {
        const db = await connectToDatabase()
        console.log("Database connected")
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email])
        console.log(rows)
        if(rows.length > 0) {
            return res.status(409).json({message : "user already existed"})
        }
        const hashPassword = await bcrypt.hash(password, 10)
        console.log(hashPassword)
        await db.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", 
            [username, email, hashPassword])
        console.log("user created")
        return res.status(201).json({message: "user created successfully"})
    } catch(err) {
        return res.status(500).json(err.message)
    }
})

router.post('/login', async (req, res) => {
    const {email, password} = req.body;
    try {
        const db = await connectToDatabase()
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email])
        if(rows.length === 0) {
            return res.status(404).json({message : "user not existed"})
        }
        const isMatch = await bcrypt.compare(password, rows[0].password)
        console.log(isMatch)
        if(!isMatch) {
            return res.status(401).json({message : "wrong password"})
        }
        const token = jwt.sign({id: rows[0].id}, process.env.JWT_KEY, {expiresIn: '3h'})
        console.log(token)
        return res.status(201).json({token: token})
    } catch(err) {
        return res.status(500).json(err.message)
    }
})

const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers['authorization'].split(' ')[1];
        if(!token) {
            return res.status(403).json({message: "No Token Provided"})
        }
        const decoded = jwt.verify(token, process.env.JWT_KEY)
        req.userId = decoded.id;
        next()
    }  catch(err) {
        return res.status(500).json({message: "server error"})
    }
}

router.get('/home', verifyToken, async (req, res) => {
    try {
        const db = await connectToDatabase()
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.userId])
        if(rows.length === 0) {
            return res.status(404).json({message : "user not existed"})
        }

        return res.status(201).json({user: rows[0]})
    }catch(err) {
        return res.status(500).json({message: "server error"})
    }
})

router.get('/accounts', verifyToken, async (req, res) => {
    try {
        // Connect to Salesforce using OAuth2
        const conn = new jsforce.Connection({
            loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com'
        });

        // Get security token from environment variable
        const securityToken = process.env.SF_SECURITY_TOKEN || '';
        
        // Login to Salesforce using environment variables
        await conn.login(
            process.env.SF_USERNAME,
            process.env.SF_PASSWORD + securityToken
        );

        console.log("Connected to Salesforce");

        // Query Salesforce accounts
        const result = await conn.query(
            'SELECT Id, Name, Type, Industry, Phone, Website, AnnualRevenue, BillingCity, BillingState, BillingCountry FROM Account ORDER BY Name LIMIT 100'
        );

        // Return only necessary fields and sanitize data
        const accounts = result.records.map(account => ({
            id: account.Id,
            name: account.Name,
            type: account.Type,
            industry: account.Industry,
            phone: account.Phone,
            website: account.Website,
            annualRevenue: account.AnnualRevenue,
            location: {
                city: account.BillingCity,
                state: account.BillingState,
                country: account.BillingCountry
            }
        }));

        return res.status(200).json({
            success: true,
            data: accounts,
            total: result.totalSize
        });

    } catch (error) {
        console.error('Salesforce Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching Salesforce accounts',
            error: error.message
        });
    }
});

export default router;