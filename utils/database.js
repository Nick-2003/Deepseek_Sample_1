// database.js
// For storing stock summary data in a database
// https://claude.ai/chat/125f2bbb-edfa-480b-bbf3-930485f11df7

import mariadb from 'mariadb';
// import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export class StockSummaryDB {
    constructor() {
        // Pool of database connections
        this.pool = mariadb.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'stock_analysis',
            port: process.env.DB_PORT,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true
        });
        
        // Setup when database is first initialized
        this.initializeDatabase();
    }

    async initializeDatabase() {
        try {
            // Create database if it doesn't exist by creating connection
            const connection = await mariadb.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                port: process.env.DB_PORT
            });

            // SQL to create database
            await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'stock_analysis'}`);
            await connection.end();

            // Create table if it doesn't exist
            // Index on ticker to speed up queries
            await this.pool.execute(`
                CREATE TABLE IF NOT EXISTS ${process.env.DB_TB_NAME || 'stock_summaries'} (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ticker VARCHAR(5) NOT NULL UNIQUE,
                    summary TEXT NOT NULL,
                    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_ticker (ticker)
                )
            `);

            console.log('Database initialized successfully');
        } catch (err) {
            console.error('Error initializing database:', err);
            throw err;
        }
    }

    // Get existing summary from database
    async getSummary(ticker) {
        try {
            // SQL query to find the summary for this ticker
            // The ? is a placeholder that gets replaced with the actual ticker (safer than direct insertion)
            // const [rows] = await this.pool.execute( // For mysql2
            const rows = await this.pool.execute(
                `SELECT ticker, summary, generated_at FROM ${process.env.DB_TB_NAME || 'stock_summaries'} WHERE ticker = ?`,
                [ticker.toUpperCase()] // Convert ticker to uppercase
            );

            // If nothing found, return null
            if (rows.length === 0) {
                return null;
            }

            // Otherwise, return the summary and their generation time
            return {
                ticker: rows[0].ticker,
                summary: rows[0].summary,
                generatedAt: rows[0].generated_at
            };
        } catch (err) {
            console.error('Error getting summary:', err);
            return null;
        }
    }

    // Save/update summary to database
    async saveSummary(ticker, summary) {
        try {
            // Save summary; if already exists, update
            await this.pool.execute(`
                INSERT INTO ${process.env.DB_TB_NAME || 'stock_summaries'} (ticker, summary) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE 
                    summary = VALUES(summary),
                    generated_at = CURRENT_TIMESTAMP
            `, [ticker.toUpperCase(), summary]);

            console.log(`Summary saved for ${ticker.toUpperCase()}`);
        } catch (err) {
            console.error('Error saving summary:', err);
            throw err;
        }
    }

    // Check if summary is stale (time between last generated time and now is past threshold)
    async isSummaryStale(summaryData, hoursThreshold = 5) {
        // If no data, counts as stale
        if (!summaryData || !summaryData.generatedAt) {
            return true;
        }

        // Convert generated_at to Date object if it's not already
        const generatedTime = new Date(summaryData.generatedAt);
        const currentTime = new Date();
        
        // Time difference
        const hoursDiff = (currentTime - generatedTime) / (1000 * 60 * 60);
        return (hoursDiff >= hoursThreshold);
    }

    // Get all summaries in descending order
    async getAllSummaries() {
        try {
            // const [rows] = await this.pool.execute(// For mysql2
            const rows = await this.pool.execute(
                `SELECT ticker, summary, generated_at FROM ${process.env.DB_TB_NAME || 'stock_summaries'} ORDER BY generated_at DESC`
            );
            return rows;
        } catch (err) {
            console.error('Error getting all summaries:', err);
            return [];
        }
    }

    // Delete specific summary
    async deleteSummary(ticker) {
        try {
            await this.pool.execute(
                `DELETE FROM ${process.env.DB_TB_NAME || 'stock_summaries'} WHERE ticker = ?`,
                [ticker.toUpperCase()]
            );
            console.log(`Summary deleted for ${ticker.toUpperCase()}`);
        } catch (err) {
            console.error('Error deleting summary:', err);
            throw err;
        }
    }

    // Delete old summaries to free up space; should be run before isSummaryStale()
    async clearOldSummaries(hoursThreshold = 24) {
        try {
            // const [result] = await this.pool.execute( // For mysql2
            const result = await this.pool.execute(
                `DELETE FROM ${process.env.DB_TB_NAME || 'stock_summaries'} WHERE generated_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
                [hoursThreshold]
            );
            console.log(`Cleared ${result.affectedRows} old summaries`);
            return result.affectedRows; // Return number of deleted rows
        } catch (err) {
            console.error('Error clearing old summaries:', err);
            throw err;
        }
    }

    // Get database statistics
    async getStats() {
        try {
            // const [countResult] = await this.pool.execute(`SELECT COUNT(*) as total FROM ${process.env.DB_TB_NAME || 'stock_summaries'}`); // For mysql2
            const countResult = await this.pool.execute(`SELECT COUNT(*) as total FROM ${process.env.DB_TB_NAME || 'stock_summaries'}`);
            // const [recentResult] = await this.pool.execute( // For mysql2
            const recentResult = await this.pool.execute(
                `SELECT COUNT(*) as recent FROM ${process.env.DB_TB_NAME || 'stock_summaries'} WHERE generated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
            );

            return {
                total: countResult[0].total,
                recent: recentResult[0].recent
            };
        } catch (err) {
            console.error('Error getting stats:', err);
            return { total: 0, recent: 0 };
        }
    }

    // Emergency helper method to extract ticker from query (If extractTickerFromQuery() in main.js fails)
    extractTicker(query) {
        // Simple regex patterns for common ticker formats
        const patterns = [
            /\b([A-Z]{1,5})\b/g,  // 1-5 uppercase letters
            /\$([A-Z]{1,5})\b/g,  // $TSLA format
            /ticker[:\s]+([A-Z]{1,5})/gi,  // "ticker: TSLA" format
        ];

        for (const pattern of patterns) {
            const matches = query.match(pattern);
            if (matches) {
                // Return the first match, cleaned up
                return matches[0].replace(/[\$\s:]/g, '').toUpperCase();
            }
        }

        // Fallback: look for common company names
        const companyMap = {
            'tesla': 'TSLA',
            'apple': 'AAPL',
            'microsoft': 'MSFT',
            'amazon': 'AMZN',
            'google': 'GOOGL',
            'alphabet': 'GOOGL',
            'nvidia': 'NVDA',
            'meta': 'META',
            'facebook': 'META',
            'netflix': 'NFLX',
            'spotify': 'SPOT',
            'uber': 'UBER',
            'airbnb': 'ABNB'
        };

        for (const [company, ticker] of Object.entries(companyMap)) {
            if (query.toLowerCase().includes(company)) {
                return ticker;
            }
        }

        return null;
    }

    // Close the database connection
    async close() {
        await this.pool.end();
    }

    // Test database connection
    async testConnection() {
        try {
            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();
            console.log('✅ Database connection successful');
            return true;
        } catch (err) {
            console.error('❌ Database connection failed:', err.message);
            return false;
        }
    }
}

// export const stockDB = new StockSummaryDB();
// stockDB.close();