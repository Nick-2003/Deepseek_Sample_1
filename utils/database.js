// database.js
// For storing stock summary data in a database
// https://claude.ai/chat/125f2bbb-edfa-480b-bbf3-930485f11df7

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export class StockSummaryDB {
    constructor() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'stock_analysis',
            port: process.env.DB_PORT || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true
        });
        
        this.initializeDatabase();
    }

    async initializeDatabase() {
        try {
            // Create database if it doesn't exist
            const connection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                port: process.env.DB_PORT || 3306
            });

            await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'stock_analysis'}`);
            await connection.end();

            // Create table if it doesn't exist
            await this.pool.execute(`
                CREATE TABLE IF NOT EXISTS stock_summaries (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ticker VARCHAR(10) NOT NULL UNIQUE,
                    summary TEXT NOT NULL,
                    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_ticker (ticker),
                    INDEX idx_generated_at (generated_at)
                )
            `);

            console.log('Database initialized successfully');
        } catch (err) {
            console.error('Error initializing database:', err);
            throw err;
        }
    }

    async getSummary(ticker) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT ticker, summary, generated_at FROM stock_summaries WHERE ticker = ?',
                [ticker.toUpperCase()]
            );

            if (rows.length === 0) {
                return null;
            }

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

    async saveSummary(ticker, summary) {
        try {
            await this.pool.execute(`
                INSERT INTO stock_summaries (ticker, summary) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE 
                    summary = VALUES(summary),
                    updated_at = CURRENT_TIMESTAMP
            `, [ticker.toUpperCase(), summary]);

            console.log(`Summary saved for ${ticker.toUpperCase()}`);
        } catch (err) {
            console.error('Error saving summary:', err);
            throw err;
        }
    }

    async isSummaryStale(summaryData, hoursThreshold = 5) {
        if (!summaryData || !summaryData.generatedAt) {
            return true;
        }

        // Convert generated_at to Date object if it's not already
        const generatedTime = new Date(summaryData.generatedAt);
        const currentTime = new Date();
        const hoursDiff = (currentTime - generatedTime) / (1000 * 60 * 60);

        return hoursDiff >= hoursThreshold;
    }

    async getAllSummaries() {
        try {
            const [rows] = await this.pool.execute(
                'SELECT ticker, summary, generated_at FROM stock_summaries ORDER BY generated_at DESC'
            );
            return rows;
        } catch (err) {
            console.error('Error getting all summaries:', err);
            return [];
        }
    }

    async deleteSummary(ticker) {
        try {
            await this.pool.execute(
                'DELETE FROM stock_summaries WHERE ticker = ?',
                [ticker.toUpperCase()]
            );
            console.log(`Summary deleted for ${ticker.toUpperCase()}`);
        } catch (err) {
            console.error('Error deleting summary:', err);
            throw err;
        }
    }

    async clearOldSummaries(hoursThreshold = 24) {
        try {
            const [result] = await this.pool.execute(
                'DELETE FROM stock_summaries WHERE generated_at < DATE_SUB(NOW(), INTERVAL ? HOUR)',
                [hoursThreshold]
            );
            console.log(`Cleared ${result.affectedRows} old summaries`);
            return result.affectedRows;
        } catch (err) {
            console.error('Error clearing old summaries:', err);
            throw err;
        }
    }

    async getStats() {
        try {
            const [countResult] = await this.pool.execute('SELECT COUNT(*) as total FROM stock_summaries');
            const [recentResult] = await this.pool.execute(
                'SELECT COUNT(*) as recent FROM stock_summaries WHERE generated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)'
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

    // Helper method to extract ticker from query
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

    async close() {
        await this.pool.end();
    }

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

export const stockDB = new StockSummaryDB();