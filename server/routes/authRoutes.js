import express from 'express'
import {connectToDatabase} from '../lib/db.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import * as jsforce from 'jsforce'

const router = express.Router()

router.post('/register', async (req, res) => {
    const {username, email, password} = req.body;
    try {
        const pool = await connectToDatabase()
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              username VARCHAR(50) NOT NULL,
              email VARCHAR(100) NOT NULL UNIQUE,
              password VARCHAR(100) NOT NULL
            );
          `);
          
        console.log('Users table created successfully');
        console.log("Database connected")
        
        // PostgreSQL uses different query syntax
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
        
        // PostgreSQL returns results differently - no [rows]
        if(result.rows.length > 0) {
            return res.status(409).json({message : "user already existed"})
        }
        
        const hashPassword = await bcrypt.hash(password, 10)
        
        // Using $1, $2, $3 for parameterized queries in PostgreSQL
        await pool.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3)", 
            [username, email, hashPassword])
            
        return res.status(201).json({message: "user created successfully"})
    } catch(err) {
        return res.status(500).json(err.message)
    }
})

router.post('/login', async (req, res) => {
    const {email, password} = req.body;
    try {
        const pool = await connectToDatabase()
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
        
        if(result.rows.length === 0) {
            return res.status(404).json({message : "user not existed"})
        }
        
        const isMatch = await bcrypt.compare(password, result.rows[0].password)
        if(!isMatch) {
            return res.status(401).json({message : "wrong password"})
        }
        
        const token = jwt.sign({id: result.rows[0].id}, process.env.JWT_KEY, {expiresIn: '3h'})
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
        const pool = await connectToDatabase()
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId])
        
        if(result.rows.length === 0) {
            return res.status(404).json({message : "user not existed"})
        }

        return res.status(201).json({user: result.rows[0]})
    } catch(err) {
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